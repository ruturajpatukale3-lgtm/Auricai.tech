// ═══════════════════════════════════════════════════════════
// Auricai — Core Type Definitions
// Single source of truth for all data shapes in the system.
// ═══════════════════════════════════════════════════════════

// ─── Enums / Union Types ───────────────────────────────────

export type PlanType = "free" | "trial" | "starter" | "growth" | "enterprise";

export type InterviewStatus =
  | "sent"
  | "opened"
  | "in_progress"
  | "completed"
  | "review_ready"
  | "approved"
  | "published";

export type CaseStudyStatus = "draft" | "pending" | "live";

export type CaseStudyTemplate = "minimal" | "dark" | "agency" | "enterprise";

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

export type AITone = "professional" | "conversational" | "technical";
export type AIOutputStyle = "concise" | "detailed";
export type AICaseStudyStyle = "story_driven" | "metric_driven";
export type FontPreset = "sans" | "serif" | "mono";

export interface OrgProfile {
  id: string;
  org_id: string;
  industry: IndustryOption;
  industry_raw: string | null;
  service_category: string;
  service_type: string;
  target_customer: string;
  ai_tone: AITone;
  ai_output_style: AIOutputStyle;
  ai_case_study_style: AICaseStudyStyle;
  font_preset: FontPreset;
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

export type InterviewStage =
  | "business_context"
  | "problem"
  | "result"
  | "metrics"
  | "timeframe"
  | "testimonial";

export const ALL_STAGES: InterviewStage[] = [
  "business_context",
  "problem",
  "result",
  "metrics",
  "timeframe",
  "testimonial"
];

export interface InterviewSignals {
  problem: boolean;
  result: boolean;
  metrics: boolean;
  timeframe: boolean;
  testimonial: boolean;
}


export type AnswerClassification = "exact" | "estimated" | "vague" | "qualitative";

export interface InterviewMetric {
  type: string;
  status: "complete" | "estimated";
  value: string;
  before?: string;
  after?: string;
  timeframe?: string;
  confidence: number;
  isLocked?: boolean;
}

export interface InterviewState {
  stage: InterviewStage;
  answers: { stage: InterviewStage, answer: string, classification: AnswerClassification }[];
  metrics: InterviewMetric[];
  extractedMetrics: string[];
  confidenceScore: number;
  qualityScore: number;
}

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
  stage?: InterviewStage;
  isFollowUp: boolean;
  expectedAnswerType?: AnswerClassification;
  options?: string[]; // 2-5 suggested chips/buttons
  suggestedType?: "choice" | "range" | "text"; // UI hint
  fallbackQuestion?: string;
  isComplete: boolean;
}

export interface AICaseStudyOutput {
  headline: string;
  summary?: string;
  story?: string;
  before: string;
  after: string;
  metrics?: string | string[];
  quote?: string;
  client_name?: string;
  company?: string;
  timeframe?: string;
  confidenceScore?: number;
}

export interface TeamMember {
  id: string;
  org_id: string;
  user_id: string | null;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  disabled_at: string | null;
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
  opened_at: string | null;
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
  summary: string | null;
  story: string | null;
  quote: string | null;
  client_name: string | null;
  template_id: CaseStudyTemplate;
  metrics: string[] | null;
  metric_type: string | null;
  before_value: string | null;
  after_value: string | null;
  delta_percent: number | null;
  timeframe: string | null;
  views: number;
  clicks: number;
  total_read_time: number;
  status: CaseStudyStatus;
  slug: string | null;
  pipeline_value: number | null;
  deals_influenced: number | null;
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
  lifetime_interviews_used: number;
  team_seat_limit: number;
  current_period_start: string;
  current_period_end: string;
  next_plan: string | null;
  payment_status: "active" | "past_due" | "cancelled" | "refunded" | "inactive";
  trial_end: string | null;
  trial_consumed: boolean;
  access_blocked: boolean;
  refunded_at: string | null;
  last_synced_at: string | null;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
  billing_cycle: "monthly" | "yearly" | null;
  updated_at: string;
}

export type NotificationType =
  | "interview_completed"
  | "case_study_ready"
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
  created_at: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PlanLimits {
  interviews: number;
  caseStudies: number;
  teamSeats: number;
  customDomain: boolean;
  watermark: boolean;
  isSoftUnlimited?: boolean;
}

export interface DashboardMetrics {
  totalViews: number;
  totalShares: number;
  totalClicks: number;
  avgReadTime: number;
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
  created_at: string;
}

export interface FunnelStageMetrics {
  total: number;
  opened: number;
  inProgress: number;
  completed: number;
  approved: number;
  published: number;
  conversionRates: {
    sentToOpened: number;
    openedToInProgress: number;
    inProgressToCompleted: number;
    completedToApproved: number;
    approvedToPublished: number;
    total: number;
  };
}

export interface ResponseFlow {
  notStarted: number;
  opened: number;
  inProgress: number;
  completed: number;
  approved: number;
  published: number;
}

export interface DuplicateFlag {
  interviewId: string;
  email: string;
  orgId: string;
  existingCount: number;
  windowDays: number;
}

export interface StateIntelligenceMetrics {
  funnel: FunnelStageMetrics;
  breakdown: ResponseFlow;
  duplicates: DuplicateFlag[];
  meta: {
    avgCompletionTimeMs: number | null;
    dropOffRate: number;
  };
}

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

export interface SubmitInterviewRequest {
  token: string;
  question: string;
  answer: string;
  currentIndex?: number;
  totalQuestions?: number;
}

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
    next_billed_at?: string;
  };
}
