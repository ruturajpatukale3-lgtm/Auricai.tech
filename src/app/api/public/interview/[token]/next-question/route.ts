// ═══════════════════════════════════════════════════════════
// POST /api/public/interview/[token]/next-question
// BULLETPROOF: This endpoint NEVER returns 500.
// If AI fails → fallback question. If DB fails → fallback question.
// The interview ALWAYS continues.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { OrgProfileRepository } from "@/lib/repositories/org-profile.repository";
import { InterviewService } from "@/lib/services/interview.service";
import { QuestionEngine } from "@/lib/ai/question-engine";
import { ContextEngine } from "@/lib/ai/context-engine";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { StateEngine } from "@/lib/ai/state-engine";
import { AnswerProcessor } from "@/lib/ai/answer-processor";
import { MemorySystem } from "@/lib/ai/memory-system";
import { SystemMemoryRepository } from "@/lib/repositories/system-memory.repository";
import { EventService } from "@/lib/services/event.service";
import { validateInput, aiInterviewAnswerSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { AIValidator } from "@/lib/ai/validator";
import { MetricExtractor } from "@/lib/ai/metric-extractor";
import type { InterviewIntent, InterviewStage } from "@/types";

// ─── Step 9: Safe Fallback System ──────────────────────────
function safeFallback(state: any) {
  return QuestionEngine.getFallbackQuestion(state.stage);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // ═══════════════════════════════════════════════════════════
  // OUTER TRY: If ANYTHING crashes, return a fallback question.
  // This endpoint NEVER returns 500.
  // ═══════════════════════════════════════════════════════════
  try {
    const { token } = await params;
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    console.log("[next-question] API hit — token:", token);

    // ─── Rate Limit (non-blocking) ─────────────────────────
    try {
      const limit = await checkRateLimit(`ai_interview_${ip}`, 20, "1 m");
      if (!limit.success) {
        console.warn("[next-question] Rate limit hit for IP:", ip);
        return NextResponse.json(
          { success: false, error: "Rate limit exceeded. Please wait a moment." },
          { status: 429 }
        );
      }
    } catch (rateLimitErr) {
      console.warn("[next-question] Rate limit check failed, bypassing:", rateLimitErr);
      // Continue — don't block the interview
    }

    // ─── Find Interview ────────────────────────────────────
    let interview: any = null;
    try {
      interview = await InterviewRepository.findByToken(token);
    } catch (dbErr) {
      console.error("[next-question] DB lookup failed:", dbErr);
      // Return fallback — we can't find the interview but don't crash
      return NextResponse.json({
        success: true,
        data: { question: "Could you tell me what changed after using the service?", intent: "result", options: [], isFollowUp: false, isComplete: false, questionNumber: 1, totalMax: 6 },
      });
    }

    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    console.log("[next-question] Interview found:", { id: interview.id, status: interview.status });

    // ─── Expiration check (30 days) ────────────────────────
    try {
      const createdDate = new Date(interview.created_at);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (createdDate < thirtyDaysAgo) {
        return NextResponse.json({ success: false, error: "Interview link has expired." }, { status: 410 });
      }
    } catch { /* date parse fail — continue */ }

    // ─── Block if already completed ────────────────────────
    if (interview.status === "completed" || interview.status === "approved" || interview.status === "published") {
      return NextResponse.json(
        { success: false, error: "This interview has already been completed", isComplete: true },
        { status: 400 }
      );
    }

    // ─── Parse body ────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const validation = validateInput(aiInterviewAnswerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { answer, intent } = validation.data;

    // ─── Validate & store answer (non-blocking) ────────────
    let finalAnswerToStore = answer?.trim();
    if (finalAnswerToStore) {
      // AI validation — wrapped, fails open
      try {
        const validationResult = await AIValidator.validateAnswer(
          finalAnswerToStore,
          intent || "business_context"
        );

        if (!validationResult.isValid) {
          return NextResponse.json(
            {
              success: false,
              error: validationResult.rejectionReason || "Could you clarify that a bit?",
              isValidationRejection: true,
            },
            { status: 400 }
          );
        }

        finalAnswerToStore = validationResult.autoCorrectedText || finalAnswerToStore;
      } catch (valErr) {
        console.warn("[next-question] AI validation failed, accepting answer:", valErr);
        // Fail open — accept the answer as-is
      }

      // Classification (Layer 4)
      const classification = AnswerProcessor.classifyAnswer(finalAnswerToStore, intent || "business_context");

      // Structured Metric Extraction (NEW: Layer 4.5)
      let extractedMetrics: any[] = [];
      try {
        extractedMetrics = await MetricExtractor.extract(finalAnswerToStore);
      } catch (extractErr) {
        console.warn("[next-question] Metric extraction failed:", extractErr);
      }

      // Store answer — wrapped
      try {
        await InterviewAnswerRepository.create({
          interview_id: interview.id,
          question: body.question || "",
          answer: finalAnswerToStore,
          extracted: {
            intent: intent || "business_context",
            classification,
            raw_answer: answer,
            metrics: extractedMetrics, // Store locked metrics for future state calculation
          },
        });
      } catch (storeErr) {
        console.error("[next-question] Failed to store answer:", storeErr);
        // Continue — don't crash, question generation can still work
      }

      // Status transition — wrapped
      try {
        if (interview.status === "sent") {
          await InterviewRepository.updateByToken(token, {
            status: "in_progress" as const,
            started_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
          });
          await EventService.interviewStarted(interview.org_id, interview.id);
        } else {
          await InterviewRepository.updateByToken(token, {
            last_activity: new Date().toISOString(),
          });
        }
      } catch (statusErr) {
        console.warn("[next-question] Status update failed, continuing:", statusErr);
      }
    }

    // ─── Load context (non-blocking) ───────────────────────
    let orgProfile: any = null;
    let organization: any = null;
    let existingAnswers: any[] = [];
    let state: any = null;
    let questionCount = 0;
    
    try {
      [orgProfile, organization, existingAnswers] = await Promise.all([
        OrgProfileRepository.findByOrgId(interview.org_id).catch(() => null),
        OrganizationRepository.findById(interview.org_id).catch(() => null),
        InterviewAnswerRepository.findByInterview(interview.id).catch(() => []),
      ]);
      
      questionCount = existingAnswers.length;
      state = StateEngine.calculateState(existingAnswers);
    } catch (ctxErr) {
      console.warn("[next-question] Context loading failed:", ctxErr);
      state = StateEngine.calculateState([]);
    }

    // ─── Step 11 & 12: DETERMINISTIC EXIT LOGIC ────────────
    
    // LOW-INTENT EXIT: 3+ consecutive vague answers
    let consecutiveVague = 0;
    for (let i = existingAnswers.length - 1; i >= 0; i--) {
      if (existingAnswers[i].extracted?.classification === "vague") consecutiveVague++;
      else break;
    }
    const isLowIntent = consecutiveVague >= 3;

    // QUALITY SCORE EXIT: >= 80
    const isHighQuality = state.qualityScore >= 80;

    if (isLowIntent || isHighQuality || questionCount >= 6) {
      console.log("[next-question] DETERTMINISTIC EXIT triggered:", { isLowIntent, isHighQuality, questionCount });
      try {
        await InterviewService.complete(token);
      } catch (e) {}
      return NextResponse.json({
        success: true,
        data: { isComplete: true, questionNumber: questionCount, totalMax: 6 },
      });
    }

    console.log("[next-question] Context:", { hasOrgProfile: !!orgProfile, questionCount, currentStage: state.stage });

    // Exit logic handled above

    // ─── Question Performance Tracking (Layer 7 & Outcome Loop) ────────────
    if (finalAnswerToStore && body.question) {
       const industry = orgProfile?.industry || "other";
       // 1. Record that we used this question
       await MemorySystem.recordUsage(body.question, "question", industry, state.stage, organization?.plan_type);

       // 2. Identify if it produced an 'exact' metric and explicitly increase its priority
       const lastClass = AnswerProcessor.classifyAnswer(finalAnswerToStore, intent || "result");
       if (lastClass === "exact" || lastClass === "estimated") {
           const increment = lastClass === "exact" ? 2 : 1;
           await SystemMemoryRepository.recordOutcome(body.question, "question", increment);
       }
    }

    // ─── Update progress (non-blocking, NEVER crashes) ─────
    try {
      await InterviewRepository.upsertProgress(interview.id, {
        completed_questions: questionCount,
        total_questions: 6,
        last_question_index: Math.max(questionCount - 1, 0),
      });
    } catch (progressErr) {
      console.warn("[next-question] Progress upsert failed, continuing:", progressErr);
      // NEVER let this crash the request
    }

    // ─── Generate next question (with fallback guarantee) ──
    let aiResponse: any = null;

    try {
      console.log("[next-question] Calling QuestionEngine...");
      
      const defaultProfile = {
          industry: "other",
          industry_raw: "General Business",
          service_category: "Professional Services",
          service_type: "Business services",
          target_customer: "Businesses",
      };
      
      const context = ContextEngine.buildContext(orgProfile || defaultProfile, organization?.plan_type || "starter");
      const policy = ContextEngine.getDynamicPolicy(context.industry);

      // Step 10: Metric Retry Logic
      // If currently in metrics state, check attempt count
      if (state.stage === "metrics") {
         const metricAttempts = existingAnswers.filter(a => a.extracted?.intent === "metrics").length;
         if (metricAttempts >= 2) {
            console.log("[next-question] Metric attempts exhausted (2), skipping state.");
            const signals = StateEngine.extractSignals(existingAnswers);
            signals.metrics = true; // Hard force the signal to move on
            state.stage = StateEngine.getNextStateId(signals) as InterviewStage;
         }
      }

      aiResponse = await QuestionEngine.generateNextQuestion(
        context,
        policy,
        state
      );
      
      console.log("[next-question] AI response:", { isComplete: aiResponse?.isComplete, hasQuestion: !!aiResponse?.question });
    } catch (aiErr) {
      console.error("[next-question] QuestionEngine CRASHED:", aiErr);
    }

    if (!aiResponse || (!aiResponse.question && !aiResponse.isComplete)) {
      console.warn("[next-question] AI returned empty — using fallback");
      const fbQ = QuestionEngine.getFallbackQuestion(state.stage);
      aiResponse = { question: fbQ, intent: state.stage, options: [], isFollowUp: false, isComplete: false };
    }

    // ─── Handle completion ─────────────────────────────────
    if (aiResponse.isComplete) {
      console.log("[next-question] Interview complete — triggering completion");
      try {
        await InterviewService.complete(token);
      } catch (completeErr) {
        console.error("[next-question] Completion crashed:", completeErr);
      }

      return NextResponse.json({
        success: true,
        data: {
          isComplete: true,
          questionNumber: questionCount,
          totalMax: 6,
        },
      });
    }

    // ─── Return next question (GUARANTEED to exist) ────────
    console.log("[next-question] Returning question:", aiResponse.question?.substring(0, 60));
    
    // ─── TRIGGER NON-BLOCKING REALTIME SYNC (BACKGROUND) ───
    if (questionCount >= 3 && !aiResponse.isComplete) {
      // Background promise to update the DB, which fires a Supabase Realtime broadcast
      import("@/lib/services/case-study.service").then(({ CaseStudyService }) => {
        console.log("[next-question] Firing background generatePartialPreview for realtime sync...");
        CaseStudyService.generatePartialPreview(interview.org_id, interview.id).catch(e => {
          console.error("[next-question] Background sync failed:", e);
        });
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        question: aiResponse.question,
        intent: aiResponse.intent,
        options: aiResponse.options || [],
        isFollowUp: aiResponse.isFollowUp || false,
        isComplete: false,
        questionNumber: questionCount,
        totalMax: 6,
      },
    });

  } catch (outerError: any) {
    // ═══════════════════════════════════════════════════════
    // ABSOLUTE LAST RESORT: If literally everything crashed,
    // still return a working question. NEVER return 500.
    // ═══════════════════════════════════════════════════════
    console.error("[next-question] CATASTROPHIC FAILURE:", outerError?.message || outerError);
    console.error("[next-question] Stack:", outerError?.stack);

    const fallbackQ = QuestionEngine.getFallbackQuestion("result");
    return NextResponse.json({
      success: true,
      data: {
        question: fallbackQ,
        intent: "result",
        options: [],
        isFollowUp: false,
        isComplete: false,
        questionNumber: 1,
        totalMax: 6,
      },
    });
  }
}
