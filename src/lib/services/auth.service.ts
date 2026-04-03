// ═══════════════════════════════════════════════════════════
// CaseFlow — Auth Service
// Resolves Clerk userId → org_id via team_members.
// Zero trust: always verify org membership server-side.
// ═══════════════════════════════════════════════════════════

import { TeamRepository } from "@/lib/repositories/team.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { AuthRequiredError, OrgAccessError } from "@/lib/errors";
import type { TeamRole, Organization } from "@/types";

export const AuthService = {
  /**
   * Resolve a Clerk userId to their org_id.
   * Returns null if user has no org membership.
   */
  async getOrgIdForUser(userId: string): Promise<string | null> {
    const member = await TeamRepository.findByUserId(userId);
    if (!member) return null;
    return member.org_id;
  },

  /**
   * Get org_id or throw. Use in API routes that require org.
   */
  async requireOrg(userId: string): Promise<{
    orgId: string;
    role: TeamRole;
    memberId: string;
  }> {
    const { OrgAccessError, SeatInactiveError } = await import("@/lib/errors");
    if (!userId) {
      const { AuthRequiredError } = await import("@/lib/errors");
      throw new AuthRequiredError();
    }

    const member = await TeamRepository.findByUserId(userId);
    if (!member) {
      throw new OrgAccessError("No organization found. Please create or join an organization.");
    }

    if (member.status === "inactive") {
      throw new SeatInactiveError();
    }

    // Block access to soft-deleted workspaces
    const org = await OrganizationRepository.findById(member.org_id);
    if (!org || (org as any).deleted_at) {
      throw new OrgAccessError("This workspace has been deleted and is no longer accessible.");
    }

    return {
      orgId: member.org_id,
      role: member.role as TeamRole,
      memberId: member.id,
    };
  },

  /**
   * Verify user has one of the required roles in the org.
   */
  async requireRole(
    userId: string,
    orgId: string,
    allowedRoles: TeamRole[]
  ): Promise<void> {
    const member = await TeamRepository.findByUserId(userId);
    if (!member || member.org_id !== orgId) {
      throw new OrgAccessError();
    }
    if (!allowedRoles.includes(member.role as TeamRole)) {
      throw new OrgAccessError(
        `Insufficient permissions. Required: ${allowedRoles.join(" or ")}`
      );
    }
  },

  /**
   * Onboard a new user: create org + owner member + usage row.
   * Called when a user signs up and doesn't have an org yet.
   */
  async onboardUser(
    userId: string,
    email: string,
    orgName: string
  ): Promise<Organization> {
    // Create the organization
    const org = await OrganizationRepository.create({ name: orgName });

    // Add user as owner
    await TeamRepository.create(org.id, {
      email,
      role: "owner",
      user_id: userId,
      status: "active",
    });

    // Initialize tracking (handled by OrganizationRepository.create already)
    // await UsageRepository.create(org.id);

    return org;
  },
};
