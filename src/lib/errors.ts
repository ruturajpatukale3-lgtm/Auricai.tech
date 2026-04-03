// ═══════════════════════════════════════════════════════════
// CaseFlow — Error Classes & API Response Helpers
// ═══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

// ─── Custom Error Classes ──────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class PlanLimitError extends AppError {
  constructor(
    message: string, 
    public metadata?: {
      metric: string;
      limit: number;
      used: number;
      upgrade_required: boolean;
      is_lifetime?: boolean;  // True for free plan lifetime limits
    }
  ) {
    super(message, 402, "LIMIT_REACHED");
    this.name = "PlanLimitError";
  }
}

export class FairUsageLimitError extends AppError {
  constructor(message: string) {
    super(message, 402, "FAIR_USAGE_LIMIT");
    this.name = "FairUsageLimitError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, public retryAfter?: string | number) {
    super(message, 429, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

export class AbuseFlagError extends AppError {
  constructor(message: string) {
    super(message, 429, "ABUSE_FLAG");
    this.name = "AbuseFlagError";
  }
}

export class AbuseBlockActiveError extends AppError {
  constructor(message: string, public retryAfter: number) {
    super(message, 429, "ABUSE_BLOCK_ACTIVE");
    this.name = "AbuseBlockActiveError";
  }
}

export class SystemOverloadError extends AppError {
  constructor(message: string = "System overload. Please try again later.", public retryAfter: number = 30) {
    super(message, 503, "SYSTEM_OVERLOAD");
    this.name = "SystemOverloadError";
  }
}

export class CostGuardrailError extends AppError {
  constructor(message: string = "High usage detected. Please contact support.") {
    super(message, 402, "USAGE_REVIEW_REQUIRED");
    this.name = "CostGuardrailError";
  }
}

export class OrgAccessError extends AppError {
  constructor(message: string = "Organization access denied") {
    super(message, 403, "ORG_ACCESS_DENIED");
    this.name = "OrgAccessError";
  }
}

export class SeatInactiveError extends AppError {
  constructor(message: string = "Your access has been restricted due to plan limits") {
    super(message, 403, "SEAT_INACTIVE");
    this.name = "SeatInactiveError";
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message: string = "Payment required to continue") {
    super(message, 402, "PAYMENT_REQUIRED");
    this.name = "PaymentRequiredError";
  }
}

export class AuthRequiredError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTH_REQUIRED");
    this.name = "AuthRequiredError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string = "Resource") {
    super(`${entity} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

// ─── API Response Builders ─────────────────────────────────

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  status: number,
  message: string,
  code: string = "ERROR"
) {
  return NextResponse.json(
    { success: false, error: message, code },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error("[API Error]", error);

  if (error instanceof PlanLimitError) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code,
        upgrade_required: error.metadata?.upgrade_required || false,
        ...error.metadata 
      }, 
      { status: error.statusCode }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, retry_after: error.retryAfter },
      { 
        status: 429,
        headers: error.retryAfter ? { "Retry-After": error.retryAfter.toString() } : {}
      }
    );
  }

  if (error instanceof AbuseFlagError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, action: "temporary_block" },
      { status: 429 }
    );
  }

  if (error instanceof AbuseBlockActiveError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, retry_after: error.retryAfter },
      { 
        status: 429,
        headers: { "Retry-After": error.retryAfter.toString() }
      }
    );
  }

  if (error instanceof SystemOverloadError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, retry_after: error.retryAfter },
      { 
        status: 503,
        headers: { "Retry-After": error.retryAfter.toString() }
      }
    );
  }

  if (error instanceof CostGuardrailError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: 402 }
    );
  }

  if (error instanceof FairUsageLimitError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, upgrade_required: false },
      { status: 402 }
    );
  }

  if (error instanceof PaymentRequiredError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, upgrade_required: true },
      { status: 402 }
    );
  }

  if (error instanceof AppError) {
    return apiError(error.statusCode, error.message, error.code);
  }

  if (error instanceof Error) {
    return apiError(500, error.message, "INTERNAL_ERROR");
  }

  return apiError(500, "An unexpected error occurred", "INTERNAL_ERROR");
}
