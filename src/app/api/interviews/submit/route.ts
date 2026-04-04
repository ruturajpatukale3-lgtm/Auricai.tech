// ═══════════════════════════════════════════════════════════
// POST /api/interviews/submit — Public endpoint for client answers
// No auth required. Token-based access only.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { InterviewService } from "@/lib/services/interview.service";
import { validateInput, submitAnswerSchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Extended schema for public submission (includes token)
const publicSubmitSchema = z.object({
  token: z.string().min(1, "Token required"),
  question: z.string().min(1, "Question required").max(500),
  answer: z.string().min(1, "Answer required").max(5000),
  currentIndex: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 30 submissions per minute per IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limit = await checkRateLimit(`public_submit:${ip}`, 30, "1 m");
    if (!limit.success) {
      return apiError(429, "Too many submissions. Please slow down.", "RATE_LIMIT");
    }

    const body = await req.json();
    const validation = validateInput(publicSubmitSchema, body);
    if (!validation.success) {
      return apiError(400, validation.error, "VALIDATION_ERROR");
    }

    const { token, question, answer, currentIndex, totalQuestions } = validation.data;

    const result = await InterviewService.submitAnswer(
      token,
      question,
      answer,
      currentIndex !== undefined && totalQuestions !== undefined
        ? { currentIndex, totalQuestions }
        : undefined
    );

    if (!result.success) {
      return apiError(400, result.error!, result.code);
    }

    return apiSuccess(result.data, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── Complete Interview (Token-based) ──────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return apiError(400, "Token required", "VALIDATION_ERROR");
    }

    const result = await InterviewService.complete(token);

    if (!result.success) {
      return apiError(400, result.error!, result.code);
    }

    return apiSuccess(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}
