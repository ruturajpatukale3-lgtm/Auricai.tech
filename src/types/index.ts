// ═══════════════════════════════════════════════════════════
// Auricai — Core Type Definitions
// Single source of truth for all data shapes in the system.
// ═══════════════════════════════════════════════════════════

// ─── Enums / Union Types ───────────────────────────────────

export type PlanType = "free" | "trial" | "starter" | "growth" | "enterprise";

export type InterviewStatus =
  | "sent"
  | "in_progress"
  | "completed"
  | "review_ready"
  | "approved"
  | "published";

export type CaseStudyStatus = "draft" | "pending" | "live" | "complete";



export type DealStatus = "open" | "closed_won" | "closed_lost";

export type TeamRole = "owner" | "admin" | "editor";

export type MemberStatus = "invited" | "active" | "inactive";

export type DomainStatus = "pending" | "verified";

export type SSLStatus = "pending" | "active" | "failed";

export type EventType =
  | "interview_sent"
  | "interview_opened"
  | "interview_started"
  | "interview_completed"
  | "case_study_created"
  | "case_study_viewed"
  | "case_study_published"
  | "case_study_shared"
  | "used_in_deal"
  | "deal_created"
  | "deal_status_changed"
  | "deal_attributed"
  | "ai_generation_failed"
  | "reminder_sent"
  | "team_invited"
  | "team_removed"
  | "domain_added"
  | "domain_verified"
  | "domain_removed"
  | "org_reset"
  | "org_deleted"
  | "settings_updated"
  | "branding_uploaded"
  | "notification_created"
  | "plan_upgraded"
  | "plan_downgraded"
  | "payment_failed"
  | "subscription_cancelled"
  | "grace_usage"
  | "seat_deactivated"
  | "sync_correction"
  | "workspace_deleted"
  | "workspace_hard_deleted";

// ─── Database Row Types ────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  plan_type: PlanType;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  domain: string | null;
  logo_url: string | null;
  brand_color: string | null;
  ga4_measurement_id: string | null;
  deleted_at: string | null;
  created_at: string;
}

// ─── Org Profile (Business Context) ────────────────────────

export type IndustryOption =
  | "marketing_agency"
  | "saas"
  | "ecommerce"
  | "consulting"
  | "other";

/* PrimaryGoal removed */

export interface OrgProfile {
  id: string;
  org_id: string;
  industry: IndustryOption;
  industry_raw: string | null;
  service_category: string;
  service_type: string;
  target_customer: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessContextRequest {
  industry: IndustryOption;
  custom_industry?: string;
  service_category: string;
  service_type: string;
  target_customer: string;
}

// ─── AI Interview Types ───────────────────────────────────

export type InterviewIntent =
  | "business_context"
  | "problem"
  | "result"
  | "metrics"
  | "timeframe"
  | "testimonial";

export const ALL_INTENTS: InterviewIntent[] = [
  "business_context",
  "problem",
  "result",
  "metrics",
  "timeframe",
  "testimonial",
];

export interface StructuredAnswers {
  business_context?: string;
  problem?: string;
  result?: string;
  metrics?: string;
  timeframe?: string;
  testimonial?: string;
}

export interface AIQuestionResponse {
  question: string;
  intent: InterviewIntent;
  isFollowUp: boolean;
  isComplete: boolean;
}

export interface AICaseStudyOutput {
  headline: string;
  summary: string;
  before: string;
  after: string;
  metrics: string;
  testimonial: string;
  confidenceScore?: number;
}

export interface TeamMember {
  id: string;
  org_id: string;
  user_id: string | null;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  invited_at: string;
  joined_at: string | null;
}

export interface Interview {
  id: string;
  org_id: string;
  client_email: string;
  client_name: string | null;
  status: InterviewStatus;
  token: string;
  started_at: string | null;
  completed_at: string | null;
  last_activity: string | null;
  sent_at: string;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  reminder_stage: number;
  created_at: string;
}

export interface InterviewAnswer {
  id: string;
  interview_id: string;
  question: string;
  answer: string;
  extracted: Record<string, unknown> | null;
  created_at: string;
}

export interface CaseStudy {
  id: string;
  org_id: string;
  interview_id: string | null;
  company_name: string;
  headline: string | null;
  metric_type: string | null;
  before_value: string | null;
  after_value: string | null;
  delta_percent: number | null;
  timeframe: string | null;
  pipeline_value: number;
  deals_influenced: number;
  views: number;
  status: CaseStudyStatus;
  slug: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  org_id: string;
  name: string;
  value: number;
  status: DealStatus;
  created_at: string;
}

export interface DealAttribution {
  id: string;
  org_id: string;
  deal_id: string;
  case_study_id: string;
  influence_weight: number;
  created_at: string;
}

export interface Usage {
  org_id: string;
  interviews_used: number;
  interviews_limit: number;
  case_studies_used: number;
  case_studies_limit: number;
}

export interface Subscription {
  org_id: string;
  plan_name: string;
  interviews_limit: number;
  interviews_used: number;
  lifetime_interviews_used: number;  // Free plan only — NEVER resets
  team_seat_limit: number;
  current_period_start: string;
  current_period_end: string;
  next_plan: string | null;
  payment_status: "active" | "past_due" | "cancelled" | "refunded" | "inactive";
  trial_end: string | null;
  trial_consumed: boolean;  // Prevent repeat trials
  access_blocked: boolean;
  refunded_at: string | null;
  last_synced_at: string | null;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
  updated_at: string;
}

// ─── Notifications ─────────────────────────────────────────

export type NotificationType =
  | "interview_completed"
  | "case_study_ready"
  | "deal_won"
  | "usage_warning"
  | "usage_limit_reached"
  | "system";

export interface Notification {
  id: string;
  org_id: string;
  type: NotificationType;
  message: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface Domain {
  id: string;
  org_id: string;
  domain: string;
  status: DomainStatus;
  ssl_status: SSLStatus;
  created_at: string;
}

export interface Event {
  id: string;
  org_id: string;
  type: EventType;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}


export interface Activity {
  id: string;
  org_id: string;
  message: string;
  deal_value: number | null;
  created_at: string;
}

// ─── Service Response Types ────────────────────────────────

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ─── Plan Limits ───────────────────────────────────────────

export interface PlanLimits {
  interviews: number;
  caseStudies: number;
  teamSeats: number;
  customDomain: boolean;
  watermark: boolean;
  isSoftUnlimited?: boolean;
}

// ─── Analytics Types ───────────────────────────────────────

export interface DashboardMetrics {
  totalViews: number;
  totalShares: number;
  totalUsage: number;
  uniqueVisitors: number;
  interviewsSent: number;
  interviewsCompleted: number;
  stalledInterviews: number;
  caseStudiesLive: number;
  conversionRate: number;
}

export interface SmartInsight {
  type: "opportunity" | "warning" | "achievement";
  title: string;
  description: string;
  value: string | number;
  action?: string;
}

export interface ActivityFeedItem {
  id: string;
  type: EventType;
  message: string;
  deal_value: number | null;
  created_at: string;
}

// ─── State Intelligence Types ──────────────────────────────

/** Funnel = progression clarity. Each field is an EXACT count for that stage. */
export interface FunnelStageMetrics {
  total: number;
  opened: number;
  completed: number;
  approved: number;
  published: number;
  conversionRates: {
    sentToOpened: number;
    openedToCompleted: number;
    completedToApproved: number;
    approvedToPublished: number;
    total: number;
  };
}

/** Breakdown = state intelligence. Multi-state view, NOT mixed into funnel. */
export interface PipelineBreakdown {
  notStarted: number;
  inProgress: number;
  completed: number;
  approved: number;
  published: number;
}

/** Duplicate flag — informational only, never blocks creation. */
export interface DuplicateFlag {
  interviewId: string;
  email: string;
  orgId: string;
  existingCount: number;
  windowDays: number;
}

/** Combined response from the refactored getFunnelMetrics */
export interface StateIntelligenceMetrics {
  funnel: FunnelStageMetrics;
  breakdown: PipelineBreakdown;
  duplicates: DuplicateFlag[];
  meta: {
    avgCompletionTimeMs: number | null;
    dropOffRate: number;
  };
}

// ─── API Request Types ─────────────────────────────────────

export interface CreateInterviewRequest {
  client_email: string;
  client_name?: string;
}

export interface SubmitAnswerRequest {
  question: string;
  answer: string;
}

export interface TeamInviteRequest {
  email: string;
  role: TeamRole;
}

export interface AddDomainRequest {
  domain: string;
}

export interface UpdateSettingsRequest {
  name?: string;
  brand_color?: string;
}

export interface DangerConfirmation {
  confirmation: string;
}

export interface CreateDealRequest {
  name: string;
  value: number;
  status?: DealStatus;
}

export interface AttributeDealRequest {
  deal_id: string;
  case_study_id: string;
}

export interface SubmitInterviewRequest {
  token: string;
  question: string;
  answer: string;
  currentIndex?: number;
  totalQuestions?: number;
}

// ─── Paddle Webhook Types ──────────────────────────────────

export interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: {
    id: string;
    status: string;
    customer_id?: string;
    custom_data?: {
      org_id?: string;
    };
    items?: Array<{
      price: {
        id: string;
      };
    }>;
    current_billing_period?: {
      ends_at: string;
    };
    next_billed_at?: string;  // Paddle trial end = first billing date
  };
}
