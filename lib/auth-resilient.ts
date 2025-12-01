/**
 * Resilient Authentication Wrapper
 * Wraps existing auth functions with network resilience and retry logic
 */

import { authService } from "./auth"
import { withNetworkCheck } from "./network-resilience"
import type { AuthUser } from "./auth"

/**
 * Resilient sign in with network error handling and retries
 */
export async function signInResilient(
  email: string,
  password: string,
): Promise<{ user: AuthUser | null; error: Error | null }> {
  try {
    console.log("[Auth Resilience] Attempting sign in with network resilience")
    return await withNetworkCheck(() => authService.signIn(email, password))
  } catch (error: any) {
    console.error("[Auth Resilience] Sign in failed:", error.message)
    return { user: null, error }
  }
}

/**
 * Resilient sign up with network error handling and retries
 */
export async function signUpResilient(
  email: string,
  password: string,
  metadata?: { firstName?: string; lastName?: string },
): Promise<{ user: AuthUser | null; error: Error | null }> {
  try {
    console.log("[Auth Resilience] Attempting sign up with network resilience")
    return await withNetworkCheck(() => authService.signUp(email, password, metadata))
  } catch (error: any) {
    console.error("[Auth Resilience] Sign up failed:", error.message)
    return { user: null, error }
  }
}

/**
 * Resilient session validation
 */
export async function validateSessionResilient(): Promise<boolean> {
  try {
    console.log("[Auth Resilience] Validating session with network resilience")
    return await withNetworkCheck(() => {
      return import("./supabase").then((m) => m.validateSession())
    })
  } catch (error: any) {
    console.warn("[Auth Resilience] Session validation failed:", error.message)
    return false
  }
}

/**
 * Resilient get current user
 */
export async function getCurrentUserResilient(): Promise<AuthUser | null> {
  try {
    console.log("[Auth Resilience] Getting current user with network resilience")
    return await withNetworkCheck(() => authService.getCurrentUser())
  } catch (error: any) {
    console.warn("[Auth Resilience] Get current user failed:", error.message)
    return null
  }
}
