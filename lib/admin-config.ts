/**
 * lib/admin-config.ts
 *
 * Two-tier privileged access:
 *
 *   SUPER_ADMIN  – 500 listings + full /admin/* access
 *   PLUS_TIER    – 50 listings, no /admin/* access
 *
 * To add a plus-tier user, append their email to PLUS_TIER_EMAILS only.
 * To promote someone to super admin, add to SUPER_ADMIN_EMAILS only.
 */

export const SUPER_ADMIN_EMAILS: string[] = [
  "rowenrichardson@gmail.com",
  "richardson.rowen@gmail.com",
  "tyler.rowend@gmail.com",
]

export const PLUS_TIER_EMAILS: string[] = [
  "nkosinathinathy70@gmail.com",
  // add more plus-tier users here
]

// Combined – used only for generic "is this person non-free?" checks
export const PRIVILEGED_EMAILS: string[] = [
  ...SUPER_ADMIN_EMAILS,
  ...PLUS_TIER_EMAILS,
]

/** True for super admins AND plus-tier users. */
export function isPrivilegedUser(email: string | undefined | null): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return PRIVILEGED_EMAILS.some((e) => e.toLowerCase() === lower)
}

/** True only for super admins – controls /admin/* access. */
export function isSuperAdminUser(email: string | undefined | null): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === lower)
}

/** True only for plus-tier users (50-listing cap, no admin panel). */
export function isPlusTierUser(email: string | undefined | null): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return PLUS_TIER_EMAILS.some((e) => e.toLowerCase() === lower)
}

/**
 * Returns the effective listing limit for a user.
 *
 * super admin  → 500
 * plus tier    → 50
 * free         → 5
 */
export function getListingLimit(email: string | undefined | null): number {
  if (isSuperAdminUser(email)) return 500
  if (isPlusTierUser(email)) return 50
  return 5
}