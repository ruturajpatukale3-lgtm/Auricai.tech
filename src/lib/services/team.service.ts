// ═══════════════════════════════════════════════════════════
// CaseFlow — Team Service
// Manages org members, invites, and role enforcement.
// ═══════════════════════════════════════════════════════════

import { TeamRepository } from "@/lib/repositories/team.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { SubscriptionService } from "@/lib/services/subscription.service";
import { EmailService } from "@/lib/services/email.service";
import { EventService } from "@/lib/services/event.service";
import { PlanLimitError, NotFoundError, OrgAccessError, ConflictError } from "@/lib/errors";
import type { TeamMember, TeamRole, ServiceResult } from "@/types";

export const TeamService = {
  /**
   * Invite a new team member
   */
  async invite(
    orgId: string,
    email: string,
    role: TeamRole,
    inviterName: string = "Your team"
  ): Promise<ServiceResult<TeamMember>> {
    // 1. Get org
    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    // 2. Check for duplicate
    const existing = await TeamRepository.findByEmail(orgId, email);
    if (existing) {
      throw new ConflictError("This email is already on the team");
    }

    // 3. Check seat limit (Hardened)
    await SubscriptionService.checkTeamSeatAccess(orgId);

    // 4. Cannot invite as owner
    if (role === "owner") {
      throw new OrgAccessError("Cannot invite as owner");
    }

    // 5. Create member
    const member = await TeamRepository.create(orgId, { email, role });

    // 6. Send invite email
    await EmailService.sendTeamInvite(email, org.name, inviterName);

    // 7. Log event
    await EventService.teamInvited(orgId, email);

    return { success: true, data: member };
  },

  /**
   * Accept team invite — attach Clerk user_id and activate
   */
  async acceptInvite(
    orgId: string,
    memberId: string,
    userId: string
  ): Promise<ServiceResult<TeamMember>> {
    const member = await TeamRepository.findById(orgId, memberId);
    if (!member) throw new NotFoundError("Team invitation");

    if (member.status === "active") {
      return { success: false, error: "Invitation already accepted", code: "ALREADY_ACTIVE" };
    }

    const activated = await TeamRepository.activate(orgId, memberId, userId);
    return { success: true, data: activated };
  },

  /**
   * Remove a team member
   */
  async remove(
    orgId: string,
    memberId: string,
    requestorUserId: string
  ): Promise<ServiceResult<void>> {
    // Get the member to be removed
    const member = await TeamRepository.findById(orgId, memberId);
    if (!member) throw new NotFoundError("Team member");

    // Cannot remove owner
    if (member.role === "owner") {
      throw new OrgAccessError("Cannot remove the organization owner");
    }

    // Verify requestor has permission (owner or admin)
    const requestor = await TeamRepository.findByUserId(requestorUserId);
    if (!requestor || requestor.org_id !== orgId) {
      throw new OrgAccessError();
    }
    if (requestor.role !== "owner" && requestor.role !== "admin") {
      throw new OrgAccessError("Only owners and admins can remove members");
    }

    // Remove
    await TeamRepository.remove(orgId, memberId);

    // Log event
    await EventService.teamRemoved(orgId, member.email);

    return { success: true };
  },

  /**
   * List all team members
   */
  async getMembers(orgId: string): Promise<TeamMember[]> {
    return TeamRepository.findByOrg(orgId);
  },
};
