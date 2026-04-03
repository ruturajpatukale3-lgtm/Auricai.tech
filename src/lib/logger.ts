// ═══════════════════════════════════════════════════════════
// CaseFlow — Structured Logger
// JSON output designed for Datadog / Vercel Log Drains
// ═══════════════════════════════════════════════════════════

export type LogEvent = 
  | "INTERVIEW_CREATED"
  | "LIMIT_BLOCKED"
  | "ABUSE_FLAG"
  | "RATE_LIMIT"
  | "FAIR_USAGE_LIMIT"
  | "TRANSACTION_FAILURE"
  | "SYSTEM_OVERLOAD"
  | "COST_GUARDRAIL_HIT"
  | "ENFORCE_SEAT_LIMITS_FAILED";

export interface LogPayload {
  event: LogEvent;
  orgId: string;
  metadata?: Record<string, unknown>;
  error?: string | Error;
}

const formatLog = (level: "INFO" | "WARN" | "ERROR", payload: LogPayload) => {
  const logObj = {
    level,
    timestamp: new Date().toISOString(),
    event: payload.event,
    org_id: payload.orgId,
    metadata: payload.metadata || {},
    ...(payload.error && { error: payload.error instanceof Error ? payload.error.message : payload.error })
  };

  return JSON.stringify(logObj);
};

export const logger = {
  info: (payload: LogPayload) => {
    console.log(formatLog("INFO", payload));
  },
  
  warn: (payload: LogPayload) => {
    console.warn(formatLog("WARN", payload));
  },
  
  error: (payload: LogPayload) => {
    console.error(formatLog("ERROR", payload));
  }
};
