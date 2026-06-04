/**
 * Admin Role Management Utilities
 * Handles role checking, permissions verification, and admin operations
 */

import { createClient } from "@/lib/supabase-client"
import type { UserRole, RolePermissions, AdminUser, DealerProfile } from "@/types/admin"
import { ROLE_PERMISSIONS } from "@/types/admin"

const supabase = createClient()

const SUPER_ADMIN_EMAILS = [
  "rowenrichardson@gmail.com",
  "richardson.rowen@gmail.com",
  "tyler.rowend@gmail.com",
]

export class AdminError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "AdminError"
    this.code = code
  }
}

/**
 * Check if a user email is a super admin
 */
export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Get user's role from database
 * NOTE: This uses the client-side auth. For admin checks that require service role,
 * you should use a server action or API route.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    // Check if super admin by email – we need to fetch user email first
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email && isSuperAdminEmail(user.email)) {
      return "SUPER_ADMIN"
    }

    // Check admin_roles table
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", userId)
      .single()

    if (adminRole) {
      return adminRole.role as UserRole
    }

    // Check dealer_employees table
    const { data: dealerRole } = await supabase
      .from("dealer_employees")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .single()

    if (dealerRole) {
      return dealerRole.role as UserRole
    }

    return "USER"
  } catch (error) {
    console.error("Error getting user role:", error)
    return "USER"
  }
}

/**
 * Check if user has a specific permission
 */
export async function userHasPermission(
  userId: string,
  permission: keyof RolePermissions,
): Promise<boolean> {
  const role = await getUserRole(userId)
  const permissions = ROLE_PERMISSIONS[role]
  return permissions[permission] ?? false
}

/**
 * Check if user is an admin (Super Admin or Admin)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === "SUPER_ADMIN" || role === "ADMIN"
}

/**
 * Check if user is a super admin
 */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === "SUPER_ADMIN"
}

/**
 * Grant admin role to a user
 * WARNING: This uses the client-side client, which may lack admin privileges.
 * Consider moving to a server action.
 */
export async function grantAdminRole(
  userId: string,
  role: "SUPER_ADMIN" | "ADMIN",
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("admin_roles").insert({
      user_id: userId,
      role,
    })

    if (error) throw error

    // Log action
    await logAdminAction("grant_role", "admin_roles", userId, { role })

    return { success: true }
  } catch (error) {
    console.error("Error granting admin role:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to grant admin role",
    }
  }
}

/**
 * Revoke admin role from a user
 */
export async function revokeAdminRole(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("admin_roles").delete().eq("user_id", userId)

    if (error) throw error

    await logAdminAction("revoke_role", "admin_roles", userId)

    return { success: true }
  } catch (error) {
    console.error("Error revoking admin role:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke admin role",
    }
  }
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string,
  changes?: Record<string, any>,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
    })
  } catch (error) {
    console.error("Error logging admin action:", error)
  }
}

/**
 * Get all admin users
 * WARNING: Uses supabase.auth.admin, which is not available on client.
 * This function will not work in the browser. Use a server action instead.
 */
export async function getAllAdmins(): Promise<AdminUser[]> {
  console.warn("getAllAdmins requires server-side admin client. Returning empty array.")
  return []
  // Original code would need to be moved to a server route.
}

/**
 * Approve a dealer application
 */
export async function approveDealerApplication(
  applicationId: string,
  businessName: string,
  ownerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create dealer profile
    const { data: dealer, error: dealerError } = await supabase
      .from("dealer_profiles")
      .insert({
        business_name: businessName,
        owner_id: ownerId,
        status: "approved",
      })
      .select()
      .single()

    if (dealerError) throw dealerError

    // Update application status
    const { error: appError } = await supabase
      .from("dealer_applications")
      .update({ status: "approved" })
      .eq("id", applicationId)

    if (appError) throw appError

    // Add owner as dealer employee
    await supabase.from("dealer_employees").insert({
      dealer_id: dealer.id,
      user_id: ownerId,
      role: "DEALER_OWNER",
    })

    await logAdminAction("approve_dealer", "dealer_applications", applicationId)

    return { success: true }
  } catch (error) {
    console.error("Error approving dealer application:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve dealer",
    }
  }
}

/**
 * Reject a dealer application
 */
export async function rejectDealerApplication(
  applicationId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("dealer_applications")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", applicationId)

    if (error) throw error

    await logAdminAction("reject_dealer", "dealer_applications", applicationId, { reason })

    return { success: true }
  } catch (error) {
    console.error("Error rejecting dealer application:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject dealer",
    }
  }
}

/**
 * Suspend a dealer
 */
export async function suspendDealer(
  dealerId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("dealer_profiles")
      .update({ status: "suspended" })
      .eq("id", dealerId)

    if (error) throw error

    await logAdminAction("suspend_dealer", "dealer_profiles", dealerId, { reason })

    return { success: true }
  } catch (error) {
    console.error("Error suspending dealer:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to suspend dealer",
    }
  }
}

/**
 * Restore a dealer
 */
export async function restoreDealer(dealerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("dealer_profiles")
      .update({ status: "approved" })
      .eq("id", dealerId)

    if (error) throw error

    await logAdminAction("restore_dealer", "dealer_profiles", dealerId)

    return { success: true }
  } catch (error) {
    console.error("Error restoring dealer:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore dealer",
    }
  }
}

/**
 * Add dealer employee
 */
export async function addDealerEmployee(
  dealerId: string,
  userId: string,
  role: "DEALER_MANAGER" | "DEALER_EMPLOYEE",
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("dealer_employees").insert({
      dealer_id: dealerId,
      user_id: userId,
      role,
    })

    if (error) throw error

    await logAdminAction("add_dealer_employee", "dealer_employees", `${dealerId}-${userId}`, { role })

    return { success: true }
  } catch (error) {
    console.error("Error adding dealer employee:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add employee",
    }
  }
}

/**
 * Remove dealer employee
 */
export async function removeDealerEmployee(
  employeeId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("dealer_employees").delete().eq("id", employeeId)

    if (error) throw error

    await logAdminAction("remove_dealer_employee", "dealer_employees", employeeId)

    return { success: true }
  } catch (error) {
    console.error("Error removing dealer employee:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove employee",
    }
  }
}

/**
 * Create analytics event
 */
export async function trackAnalyticsEvent(
  eventType: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from("analytics_events").insert({
      user_id: user?.id,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    })
  } catch (error) {
    console.error("Error tracking analytics event:", error)
  }
}