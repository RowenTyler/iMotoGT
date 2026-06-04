import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase-server"
import type { Database } from "@/types/supabase"

const SUPER_ADMIN_EMAILS = new Set([
  "rowenrichardson@gmail.com",
  "richardson.rowen@gmail.com",
  "tyler.rowend@gmail.com",
])

export interface AdminSession {
  userId: string
  email: string
  role: string
}

export async function getServerAdminSession(): Promise<AdminSession | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const { data: roleData } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()

  if (roleData?.role) {
    return {
      userId: user.id,
      email: user.email || "",
      role: roleData.role,
    }
  }

  // Fallback: users on the hard-coded super-admin allowlist are always admins,
  // even if their admin_roles row has not been provisioned yet.
  if (isAllowedSuperAdminEmail(user.email)) {
    return {
      userId: user.id,
      email: user.email || "",
      role: "SUPER_ADMIN",
    }
  }

  return null
}

export async function requireAdminSession(): Promise<AdminSession> {
  const admin = await getServerAdminSession()
  if (!admin) {
    redirect("/login?redirect=/admin")
  }
  return admin
}

export async function requireSuperAdmin(): Promise<AdminSession> {
  const admin = await getServerAdminSession()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/dashboard")
  }
  return admin
}

export function isAllowedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.has(email.toLowerCase())
}