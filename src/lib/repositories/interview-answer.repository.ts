// ═══════════════════════════════════════════════════════════
// CaseFlow — Interview Answer Repository
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { InterviewAnswer } from "@/types";

const TABLE = "interview_answers";

export const InterviewAnswerRepository = {
  async findByInterview(interviewId: string): Promise<InterviewAnswer[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Failed to fetch answers: ${error.message}`);
    return (data || []) as InterviewAnswer[];
  },

  async create(input: {
    interview_id: string;
    question: string;
    answer: string;
    extracted?: Record<string, unknown>;
  }): Promise<InterviewAnswer> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        interview_id: input.interview_id,
        question: input.question,
        answer: input.answer,
        extracted: input.extracted || null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create answer: ${error.message}`);
    return data as InterviewAnswer;
  },

  async createMany(
    answers: Array<{
      interview_id: string;
      question: string;
      answer: string;
      extracted?: Record<string, unknown>;
    }>
  ): Promise<InterviewAnswer[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(answers)
      .select();
    if (error) throw new Error(`Failed to create answers: ${error.message}`);
    return (data || []) as InterviewAnswer[];
  },

  async countByInterview(interviewId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("interview_id", interviewId);
    if (error) throw new Error(`Failed to count answers: ${error.message}`);
    return count || 0;
  },
};
