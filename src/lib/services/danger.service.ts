// ═══════════════════════════════════════════════════════════
// CaseFlow — Danger Service
// Reset + Delete operations. ALL destructive actions require confirmation.
// ═══════════════════════════════════════════════════════════

import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { EventRepository } from "@/lib/repositories/event.repository";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { DomainRepository } from "@/lib/repositories/domain.repository";
import { DomainService } from "@/lib/services/domain.service";
import { EventService } from "@/lib/services/event.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { ServiceResult } from "@/types";

export const DangerService = {
  /**
   * Reset org data: delete interviews, case studies, events.
   * Keep org + billing. Require "RESET" confirmation.
   */
  async reset(orgId: string, confirmation: string): Promise<ServiceResult<void>> {
    if (confirmation !== "RESET") {
      throw new ValidationError('You must type "RESET" to confirm');
    }

    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    // Delete data in order (respect FK constraints)
    await EventRepository.deleteAllByOrg(orgId);
    await CaseStudyRepository.deleteAllByOrg(orgId);
    await InterviewRepository.deleteAllByOrg(orgId);

    // Reset usage counters
    await UsageRepository.reset(orgId);

    // Log the reset itself
    await EventService.track({ orgId, type: "org_reset" as any, metadata: { reason: "Organization data reset" } });

    return { success: true };
  },

  /**
   * Delete entire org: delete EVERYTHING.
   * Cancel Paddle, remove domain. Require "DELETE" confirmation.
   */
  async deleteOrg(orgId: string, confirmation: string): Promise<ServiceResult<void>> {
    if (confirmation !== "DELETE") {
      throw new ValidationError('You must type "DELETE" to confirm');
    }

    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    // Remove domain if exists
    const domain = await DomainRepository.findByOrg(orgId);
    if (domain) {
      await DomainService.remove(orgId);
    }

    // TODO: Cancel Paddle subscription if active
    // if (org.subscription_id) { await PaddleAPI.cancelSubscription(org.subscription_id); }

    // Delete org (cascades to all child tables)
    await OrganizationRepository.delete(orgId);

    return { success: true };
  },
};
