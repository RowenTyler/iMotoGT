/**
 * lib/admin-config.ts
 *
 * Privileged user configuration.
 * Users listed here bypass the free-tier listing limit and have full access.
 *
 * To add more users, append their email to PRIVILEGED_EMAILS.
 */

export const PRIVILEGED_EMAILS: string[] = [
  "nkosi@gmail.com",
]

/**
 * Returns true if the given email has unlimited/admin access.
 * Comparison is case-insensitive.
 */
export function isPrivilegedUser(email: string | undefined | null): boolean {
  if (!email) return false
  return PRIVILEGED_EMAILS.some(
    (privileged) => privileged.toLowerCase() === email.toLowerCase()
  )
}

/**
 * Returns the effective listing limit for a user.
 * Privileged users get Number.MAX_SAFE_INTEGER (effectively unlimited).
 */
export function getListingLimit(email: string | undefined | null): number {
  return isPrivilegedUser(email) ? Number.MAX_SAFE_INTEGER : 3
}
