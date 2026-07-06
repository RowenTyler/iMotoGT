import { createClient } from "@/lib/supabase-client"  // ← cookie-based client npnm test updates
import type { UserProfile } from "@/types/user"
import { syncUserToEditors, syncUserToPublic } from "./userSync"

const supabase = createClient()  // ← creates the cookie-based client

export interface AuthUser {
  id: string
  email: string
  email_confirmed_at?: string
  name?: string
  avatar?: string
}

export class AuthError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "AuthError"
    this.code = code
  }
}

function clearAllStorage() {
  try {
    localStorage.clear()
    sessionStorage.clear()

    const cookies = document.cookie.split(";")
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i]
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
    }

  } catch (error) {
    console.error("❌ Error clearing storage:", error)
  }
}

async function signUp(
  email: string,
  password: string,
  metadata?: { firstName?: string; lastName?: string },
): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  try {

    const emailRedirectTo = `${window.location.origin}/dashboard`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          first_name: metadata?.firstName || "",
          last_name: metadata?.lastName || "",
          name: `${metadata?.firstName || ""} ${metadata?.lastName || ""}`.trim() || email.split("@")[0],
        },
      },
    })

    if (error) {
      console.error("❌ Sign up error:", error)
      return { user: null, error: new AuthError(error.message, error.name) }
    }

    if (!data.user) {
      return { user: null, error: new AuthError("Failed to create user", "SIGNUP_FAILED") }
    }


    await createUserProfile(data.user.id, email, metadata?.firstName, metadata?.lastName)

    await syncUserToPublic(data.user)

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email!,
      email_confirmed_at: data.user.email_confirmed_at,
      name: data.user.user_metadata?.name,
      avatar: data.user.user_metadata?.avatar_url,
    }

    return { user: authUser, error: null }
  } catch (error: any) {
    console.error("❌ Error in signUp:", error)
    return { user: null, error: new AuthError(error.message, "UNKNOWN_ERROR") }
  }
}

async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  try {

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("❌ Sign in error:", error)
      return { user: null, error: new AuthError(error.message, error.name) }
    }

    if (!data.user) {
      return { user: null, error: new AuthError("Failed to sign in", "SIGNIN_FAILED") }
    }


    await syncUserToPublic(data.user)
    await syncUserToEditors(data.user)

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email!,
      email_confirmed_at: data.user.email_confirmed_at,
      name: data.user.user_metadata?.name,
      avatar: data.user.user_metadata?.avatar_url,
    }

    return { user: authUser, error: null }
  } catch (error: any) {
    console.error("❌ Error in signIn:", error)
    return { user: null, error: new AuthError(error.message, "UNKNOWN_ERROR") }
  }
}

async function signOut(): Promise<{ error: AuthError | null }> {
  try {

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("❌ Sign out error:", error)
        if (error.message?.includes("session") || error.message?.includes("Auth session")) {
        }
      }
    } catch (authError: any) {
      console.error("❌ Supabase auth error:", authError)
    }

    clearAllStorage()

    return { error: null }
  } catch (error: any) {
    console.error("❌ Error in signOut:", error)
    clearAllStorage()
    return { error: new AuthError(error.message, "UNKNOWN_ERROR") }
  }
}

async function forceLogoutAll(): Promise<void> {
  try {
    await supabase.auth.signOut()
    clearAllStorage()
    window.location.href = "/home"
  } catch (error) {
    console.error("❌ Error in forceLogoutAll:", error)
    clearAllStorage()
    window.location.href = "/home"
  }
}

async function getCurrentUser(): Promise<AuthUser | null> {
  try {

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }


    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      email_confirmed_at: user.email_confirmed_at,
      name: user.user_metadata?.name,
      avatar: user.user_metadata?.avatar_url,
    }

    return authUser
  } catch (error) {
    console.error("❌ Error getting current user:", error)
    return null
  }
}

async function isEmailVerified(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) return false

    const isVerified = !!user.email_confirmed_at
    return isVerified
  } catch (error) {
    console.error("❌ Error checking email verification:", error)
    return false
  }
}

async function getSession() {
  try {

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return null
    }

    return session
  } catch (error) {
    console.error("❌ Error getting session:", error)
    return null
  }
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("❌ Get user profile error:", error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    const userData = data[0]

    console.log("✅ User profile fetched:", {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
    })

    const profile: UserProfile = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name || "",
      lastName: userData.last_name || "",
      phone: userData.phone || "",
      profilePic: userData.profile_pic || "",
      suburb: userData.suburb || "",
      city: userData.city || "",
      province: userData.province || "",
      loginMethod: userData.login_method || "email",
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    }

    return profile
  } catch (error) {
    console.error("❌ Error in getUserProfile:", error)
    return null
  }
}

async function createUserProfile(
  userId: string,
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<{ error: AuthError | null }> {
  try {

    const existing = await getUserProfile(userId)
    if (existing) {
      return { error: null }
    }

    const dbData = {
      id: userId,
      email: email,
      first_name: firstName || "",
      last_name: lastName || "",
      phone: "",
      profile_pic: "",
      suburb: "",
      city: "",
      province: "",
      login_method: "email",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("users").insert([dbData])

    if (error) {
      if (error.code === "23505" || error.code === "42501") {
        return { error: null }
      }

      console.error("❌ Create user profile error:", error)
      return { error: new AuthError(error.message, "CREATE_PROFILE_FAILED") }
    }

    return { error: null }
  } catch (error: any) {
    console.error("❌ Error in createUserProfile:", error)
    return { error: null }
  }
}

async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: AuthError | null }> {
  try {

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone
    if (updates.profilePic !== undefined) dbUpdates.profile_pic = updates.profilePic
    if (updates.suburb !== undefined) dbUpdates.suburb = updates.suburb
    if (updates.city !== undefined) dbUpdates.city = updates.city
    if (updates.province !== undefined) dbUpdates.province = updates.province


    const { error } = await supabase
      .from("users")
      .update(dbUpdates)
      .eq("id", userId)

    if (error) {
      console.error("❌ Update user profile error:", error)

      if (error.code === '42501') {
        return { error: new AuthError(
          "Permission denied. Please ensure you're logged in and trying to update your own profile.",
          "PERMISSION_DENIED"
        )}
      }

      if (error.code === 'PGRST301') {
        return { error: new AuthError(
          "Database connection error. Please try again.",
          "CONNECTION_ERROR"
        )}
      }

      return { error: new AuthError(error.message, "UPDATE_PROFILE_FAILED") }
    }

    return { error: null }
  } catch (error: any) {
    console.error("❌ Error in updateUserProfile:", error)
    return { error: new AuthError(error.message, "UNKNOWN_ERROR") }
  }
}

async function requestPasswordReset(email: string): Promise<{ error: AuthError | null }> {
  try {

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      console.error("❌ Password reset request error:", error)
      return { error: new AuthError(error.message, error.name) }
    }

    return { error: null }
  } catch (error: any) {
    console.error("❌ Error in requestPasswordReset:", error)
    return { error: new AuthError(error.message, "UNKNOWN_ERROR") }
  }
}

async function resetPassword(newPassword: string): Promise<{ error: AuthError | null }> {
  try {

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error("❌ Reset password error:", error)
      return { error: new AuthError(error.message, error.name) }
    }

    return { error: null }
  } catch (error: any) {
    console.error("❌ Error in resetPassword:", error)
    return { error: new AuthError(error.message, "UNKNOWN_ERROR") }
  }
}

async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  try {

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error("❌ Update password error:", error)
      return { error: new AuthError(error.message, error.name) }
    }

    return { error: null }
  } catch (error: any) {
    console.error("❌ Error in updatePassword:", error)
    return { error: new AuthError(error.message, "UNKNOWN_ERROR") }
  }
}

async function resendVerificationEmail(email: string): Promise<void> {
  try {

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    })

    if (error) {
      console.error("❌ Resend verification error:", error)
      throw new AuthError(error.message, "RESEND_VERIFICATION_ERROR")
    }

  } catch (error: any) {
    console.error("❌ Error in resendVerificationEmail:", error)
    throw error
  }
}

async function signInWithOAuth(provider: "google" | "facebook" | "apple"): Promise<void> {
  try {

    // ✅ Updated redirect URL to match your callback route
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      }
    })

    if (error) {
      console.error("❌ OAuth sign in error:", error)
      throw new AuthError(error.message, error.name)
    }

  } catch (error: any) {
    console.error("❌ Error in signInWithOAuth:", error)
    throw error
  }
}

function onAuthStateChange(callback: (user: AuthUser | null) => void) {

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {

    if (session?.user) {

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        email_confirmed_at: session.user.email_confirmed_at,
        name: session.user.user_metadata?.name,
        avatar: session.user.user_metadata?.avatar_url,
      }
      callback(authUser)
    } else {
      callback(null)
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}

export const authService = {
  signUp,
  signIn,
  signOut,
  forceLogoutAll,
  getCurrentUser,
  isEmailVerified,
  getSession,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  requestPasswordReset,
  resetPassword,
  updatePassword,
  resendVerificationEmail,
  signInWithOAuth,
  onAuthStateChange,
  clearAllStorage,
}

export {
  signUp,
  signIn,
  signOut,
  forceLogoutAll,
  getCurrentUser,
  isEmailVerified,
  getSession,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  requestPasswordReset,
  resetPassword,
  updatePassword,
  resendVerificationEmail,
  signInWithOAuth,
  onAuthStateChange,
  clearAllStorage,
}