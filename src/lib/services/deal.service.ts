// ═══════════════════════════════════════════════════════════
// Auricai — Deal Service
// Orchestrates deal creation, attribution, and status updates.
// All mutations are atomic with event logging.
// ═══════════════════════════════════════════════════════════

import { DealRepository } from "@/lib/repositories/deal.repository";
import { DealAttributionRepository } from "@/lib/repositories/deal-attribution.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { EventService } from "@/lib/services/event.service";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { NotificationService } from "@/lib/services/notification.service";
import type { Deal, DealAttribution, DealStatus, ServiceResult } from "@/types";

export const DealService = {
  /**
   * Create a new deal for the organization.
   */
  async create(
    orgId: string,
    input: { name: string; value: number; status?: DealStatus }
  ): Promise<ServiceResult<Deal>> {
    const deal = await DealRepository.create(orgId, input);

    await EventService.track({
      orgId,
      type: "deal_created",
      entityId: deal.id,
      metadata: {
        deal_name: deal.name,
        deal_value: deal.value,
        deal_status: deal.status,
      },
    });

    return { success: true, data: deal };
  },

  /**
   * Attribute a case study to a deal (the core operation).
   * - Validates ownership of both entities
   * - Prevents duplicate attribution via DB constraint
   * - Logs event for activity feed
   * - Updates case_study denormalized counters
   */
  async attribute(
    orgId: string,
    dealId: string,
    caseStudyId: string
  ): Promise<ServiceResult<DealAttribution>> {
    // 1. Validate deal ownership
    const deal = await DealRepository.findById(orgId, dealId);
    if (!deal) throw new NotFoundError("Deal");

    // 2. Validate case study ownership
    const cs = await CaseStudyRepository.findById(orgId, caseStudyId);
    if (!cs) throw new NotFoundError("Case Study");

    // 3. Create attribution (DB constraint prevents duplicates)
    let attribution: DealAttribution;
    try {
      attribution = await DealAttributionRepository.create(
        orgId,
        dealId,
        caseStudyId
      );
    } catch (err: any) {
      if (err.message === "DUPLICATE_ATTRIBUTION") {
        throw new ConflictError(
          "This case study is already attributed to this deal."
        );
      }
      throw err;
    }

    // 4. Update denormalized counters on case_study
    await CaseStudyRepository.recordDeal(orgId, caseStudyId, deal.value);

    // 5. Log attribution event
    await EventService.track({
      orgId,
      type: "deal_attributed",
      entityId: caseStudyId,
      metadata: {
        deal_id: dealId,
        case_study_id: caseStudyId,
        deal_value: deal.value,
        deal_name: deal.name,
        company_name: cs.company_name,
      },
    });

    return { success: true, data: attribution };
  },

  /**
   * Attribute a case study to an external HubSpot deal
   */
  async attributeExternal(
    orgId: string,
    externalDealId: string,
    caseStudyId: string
  ): Promise<ServiceResult<DealAttribution>> {
    const { HubSpotRepository } = await import("@/lib/repositories/hubspot.repository");
    const deal = await HubSpotRepository.getExternalDealById(orgId, externalDealId);
    if (!deal) throw new NotFoundError("External Deal");

    const cs = await CaseStudyRepository.findById(orgId, caseStudyId);
    if (!cs) throw new NotFoundError("Case Study");

    let attribution: DealAttribution;
    try {
      attribution = await DealAttributionRepository.create(
        orgId,
        null, // dealId
        caseStudyId,
        1,
        externalDealId,
        "hubspot"
      );
    } catch (err: any) {
      if (err.message === "DUPLICATE_ATTRIBUTION") {
        throw new ConflictError("This case study is already attributed to this deal.");
      }
      throw err;
    }

    await CaseStudyRepository.recordDeal(orgId, caseStudyId, deal.amount);

    await EventService.track({
      orgId,
      type: "deal_attributed",
      entityId: caseStudyId,
      metadata: {
        external_deal_id: externalDealId,
        case_study_id: caseStudyId,
        deal_value: deal.amount,
        deal_name: deal.name,
        company_name: cs.company_name,
        source: "hubspot"
      },
    });

    return { success: true, data: attribution };
  },

  /**
   * Create a deal AND attribute it to a case study in one flow.
   * Used by the "Used in Deal → Quick Create" modal.
   */
  async createAndAttribute(
    orgId: string,
    input: { name: string; value: number; status?: DealStatus },
    caseStudyId: string
  ): Promise<ServiceResult<{ deal: Deal; attribution: DealAttribution }>> {
    // 1. Create the deal
    const createResult = await this.create(orgId, input);
    if (!createResult.success || !createResult.data) {
      return { success: false, error: "Failed to create deal" };
    }

    // 2. Attribute it
    const attrResult = await this.attribute(
      orgId,
      createResult.data.id,
      caseStudyId
    );
    if (!attrResult.success || !attrResult.data) {
      return { success: false, error: "Failed to attribute deal" };
    }

    return {
      success: true,
      data: { deal: createResult.data, attribution: attrResult.data },
    };
  },

  /**
   * Update deal status (open → closed_won, etc.)
   */
  async updateStatus(
    orgId: string,
    dealId: string,
    status: DealStatus
  ): Promise<ServiceResult<Deal>> {
    const deal = await DealRepository.findById(orgId, dealId);
    if (!deal) throw new NotFoundError("Deal");

    const updated = await DealRepository.updateStatus(orgId, dealId, status);

    await EventService.track({
      orgId,
      type: "deal_status_changed",
      entityId: dealId,
      metadata: {
        deal_name: deal.name,
        deal_value: deal.value,
        old_status: deal.status,
        new_status: status,
      },
    });

    // Notify on deal won
    if (status === "closed_won") {
      try {
        await NotificationService.notifyDealWon(orgId, deal.name, deal.value, dealId);
      } catch (e) {
        console.warn("[DealService] Notification failed:", (e as Error).message);
      }
    }

    return { success: true, data: updated };
  },

  /**
   * List deals for an org (with optional status filter)
   */
  async getByOrg(
    orgId: string,
    filters?: { status?: DealStatus; limit?: number }
  ): Promise<Deal[]> {
    return DealRepository.findByOrg(orgId, filters);
  },

  /**
   * Get a single deal with its attributions
   */
  async getById(
    orgId: string,
    dealId: string
  ): Promise<ServiceResult<{ deal: Deal; attributions: DealAttribution[] }>> {
    const deal = await DealRepository.findById(orgId, dealId);
    if (!deal) throw new NotFoundError("Deal");

    const attributions = await DealAttributionRepository.findByDeal(
      orgId,
      dealId
    );

    return { success: true, data: { deal, attributions } };
  },

  /**
   * Delete a deal and its attributions
   */
  async delete(orgId: string, dealId: string): Promise<ServiceResult<void>> {
    const deal = await DealRepository.findById(orgId, dealId);
    if (!deal) throw new NotFoundError("Deal");

    // Clean up attributions first
    await DealAttributionRepository.deleteByDeal(orgId, dealId);
    await DealRepository.delete(orgId, dealId);

    return { success: true };
  },

  // ─── Analytics Queries ──────────────────────────────────────

  /**
   * Pipeline Influenced = SUM(value) from all attributed deals
   */
  async getPipelineInfluenced(orgId: string): Promise<number> {
    return DealRepository.sumAttributedPipeline(orgId);
  },

  /**
   * Verifiable Revenue = SUM(value) from closed_won attributed deals
   */
  async getVerifiableRevenue(orgId: string): Promise<number> {
    return DealRepository.sumVerifiableRevenue(orgId);
  },

  /**
   * Total distinct deals influenced
   */
  async getDealsInfluenced(orgId: string): Promise<number> {
    return DealRepository.countAttributedDeals(orgId);
  },
};
