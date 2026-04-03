// ═══════════════════════════════════════════════════════════
// POST /api/public/interview/[token]/next-question
// Public endpoint — AI-powered dynamic interview flow.
// No auth. Token-based access only. Rate-limited.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { OrgProfileRepository } from "@/lib/repositories/org-profile.repository";
import { InterviewService } from "@/lib/services/interview.service";
import { QuestionEngine } from "@/lib/ai/question-engine";
import { CaseStudyGenerator } from "@/lib/ai/case-study-generator";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { EventService } from "@/lib/services/event.service";
import { validateInput, aiInterviewAnswerSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { AIValidator } from "@/lib/ai/validator";
import { AIScorer } from "@/lib/ai/scorer";
import type { InterviewIntent } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // Rate limit: 20 requests per minute per IP (generous for interview flow)
    const limit = await checkRateLimit(`ai_interview_${ip}`, 20, "1 m");
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      );
    }

    // 1. Validate token → find interview
    const interview = await InterviewRepository.findByToken(token);
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    // Expiration check (30 days)
    const createdDate = new Date(interview.created_at);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (createdDate < thirtyDaysAgo) {
      return NextResponse.json({ success: false, error: "Interview link has expired." }, { status: 410 });
    }

    // Block if already completed
    if (interview.status === "completed" || interview.status === "approved" || interview.status === "published") {
      return NextResponse.json(
        { success: false, error: "This interview has already been completed", isComplete: true },
        { status: 400 }
      );
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const validation = validateInput(aiInterviewAnswerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { answer, intent } = validation.data;

    // 3. If answer provided, validate and store it
    let finalAnswerToStore = answer?.trim();
    if (finalAnswerToStore) {
      // Run semantic validation
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

      // Use the auto-corrected text if provided
      finalAnswerToStore = validationResult.autoCorrectedText || finalAnswerToStore;

      await InterviewAnswerRepository.create({
        interview_id: interview.id,
        question: body.question || "",  // Echo back the question that was answered
        answer: finalAnswerToStore,
        extracted: { 
          intent: intent || "business_context",
          raw_answer: answer // Data Protection: Store the original organically typed string
        },
      });

      // Transition to in_progress on first answer
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
    }

    // 4. Load context
    const [orgProfile, structuredAnswers] = await Promise.all([
      OrgProfileRepository.findByOrgId(interview.org_id),
      InterviewService.getStructuredAnswers(interview.id),
    ]);

    // Count existing answers
    const existingAnswers = await InterviewAnswerRepository.findByInterview(interview.id);
    const questionCount = existingAnswers.length;

    // Update progress
    await InterviewRepository.upsertProgress(interview.id, {
      completed_questions: questionCount,
      total_questions: 6,
      last_question_index: Math.max(questionCount - 1, 0),
    });

    // 5. Generate next question (or determine completion)
    if (!orgProfile) {
      // Fallback: use question engine without context (will use fallback questions)
      console.warn("[next-question] No org profile found, using fallbacks");
    }

    const aiResponse = await QuestionEngine.generateNextQuestion(
      structuredAnswers,
      orgProfile || ({
        industry: "other",
        industry_raw: "General Business",
        service_category: "Professional Services",
        service_type: "Business services",
        target_customer: "Businesses",
      } as any),
      questionCount,
      answer || undefined,
      (intent as InterviewIntent) || undefined
    );

    // 6. Handle completion
    if (aiResponse.isComplete) {
      const completeResult = await InterviewService.complete(token);
      if (!completeResult.success) {
        return NextResponse.json({ success: false, error: completeResult.error }, { status: 400 });
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

    // 7. Return next question
    return NextResponse.json({
      success: true,
      data: {
        question: aiResponse.question,
        intent: aiResponse.intent,
        isFollowUp: aiResponse.isFollowUp,
        isComplete: false,
        questionNumber: questionCount + 1,
        totalMax: 6,
      },
    });
  } catch (error) {
    console.error("[POST next-question] Error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
