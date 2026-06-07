"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, LogIn, UserPlus, Mail, CheckCircle, RefreshCw, AlertCircle, ArrowRight, Key, Lock, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/ui/header"
import { createClient } from "@/lib/supabase-client"
import type { UserProfile } from "@/types/user"

// Custom error class to mimic old AuthError
class AuthError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

interface LoginPageProps {
  onLoginSuccess?: (userProfile: UserProfile) => void
  onSignUpSuccess?: (userProfile: UserProfile) => void
  onCancel?: () => void
  loginContext?: "default" | "checkout" | "sell"
}

type ViewMode = "login" | "signup" | "forgot-password" | "reset-password" | "verification" | "existing-user"

export default function LoginPage({
  onLoginSuccess,
  onSignUpSuccess,
  onCancel,
  loginContext = "default",
}: LoginPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [verificationType, setVerificationType] = useState<"signup" | "reset">("signup")
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect')
  const resetToken = searchParams.get('token')
  const recoveryType = searchParams.get('type')

  // Initialize Supabase client
  const supabase = createClient()

  // Check for reset token on mount
  useEffect(() => {
    if (resetToken && recoveryType === 'recovery') {
      setViewMode("reset-password")
    }
  }, [resetToken, recoveryType])

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setFirstName("")
    setLastName("")
    setNewPassword("")
    setConfirmPassword("")
    setError(null)
    setSuccessMessage(null)
    setShowPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setVerificationEmail("")
    setVerificationType("signup")
    setResendSuccess(false)
  }

  const handleSignUp = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }
    
    if (password.length > 72) {
      setError("Password must be less than 72 characters.")
      return
    }
    
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      console.log("📝 Signing up with:", { email, firstName, lastName })

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        console.log("✅ Sign up successful, redirecting directly to dashboard (email verification is non‑blocking)")
        
        // Build user profile from metadata
        const userProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || "",
          firstName: data.user.user_metadata?.first_name || "",
          lastName: data.user.user_metadata?.last_name || "",
          profilePic: data.user.user_metadata?.avatar_url || "",
        }
        
        // Call the success callback immediately – no verification screen
        if (onSignUpSuccess) {
          onSignUpSuccess(userProfile)
        } else {
          // Default redirect to dashboard
          router.push("/dashboard")
        }
      }
    } catch (e: any) {
      console.error("❌ Sign up error:", e)
      // Handle known error codes
      if (e.message?.includes("already registered") || e.message?.includes("User already registered")) {
        setViewMode("existing-user")
      } else if (e.message?.includes("email")) {
        setError("Invalid email address. Please check and try again.")
      } else {
        setError(e.message || "An unexpected error occurred during sign up.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setIsResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
      })
      if (error) throw error
      setResendSuccess(true)
      setSuccessMessage("Verification email sent successfully!")
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (e: any) {
      setError(e.message || "Failed to resend verification email. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }
    
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      console.log("🔑 Attempting sign in for:", email)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      const user = data.user
      if (!user) {
        console.error("❌ No user returned from sign in")
        setError("Sign in failed. Please try again.")
        return
      }

      console.log("✅ Sign in successful:", user.email)
      // Email verification is no longer a blocker – even unverified users can sign in

      // Fetch user profile from metadata
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || "",
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        profilePic: user.user_metadata?.avatar_url || "",
      }

      console.log("✅ Profile loaded:", userProfile.firstName, userProfile.lastName)
      if (onLoginSuccess) {
        onLoginSuccess(userProfile)
      } else {
        if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.push("/dashboard")
        }
      }
    } catch (e: any) {
      console.error("❌ Sign in error:", e)
      // We no longer treat "Email not confirmed" as a special case because the Supabase dashboard setting
      // "Confirm email" is disabled, so this error should not be thrown. But if it appears, treat it as a generic error.
      if (e.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.")
      } else {
        setError(e.message || "An unexpected error occurred during sign in.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address.")
      return
    }
    
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      console.log("🔐 Requesting password reset for:", email)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      })
      
      if (error) throw error
      
      setVerificationEmail(email)
      setVerificationType("reset")
      setViewMode("verification")
      setSuccessMessage("Password reset instructions have been sent to your email. Please check your inbox (and spam folder).")
    } catch (e: any) {
      console.error("❌ Forgot password error:", e)
      setError(e.message || "Failed to send reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.")
      return
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }
    
    if (newPassword.length > 72) {
      setError("Password must be less than 72 characters.")
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.")
      return
    }
    
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      console.log("🔐 Resetting password...")
      
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      
      if (error) throw error
      
      setSuccessMessage("Password reset successfully! You can now sign in with your new password.")
      
      setTimeout(() => {
        resetForm()
        setViewMode("login")
      }, 3000)
    } catch (e: any) {
      console.error("❌ Reset password error:", e)
      if (e.message?.includes("session") || e.message?.includes("expired")) {
        setError("Reset link has expired. Please request a new password reset.")
        setViewMode("forgot-password")
      } else {
        setError(e.message || "Failed to reset password. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: "google" | "facebook" | "apple") => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw error
      // No need to setLoading false because redirect happens
    } catch (e: any) {
      setError(e.message || `An unexpected error occurred with ${provider} sign in.`)
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (viewMode === "signup") {
      handleSignUp()
    } else if (viewMode === "login") {
      handleSignIn()
    } else if (viewMode === "forgot-password") {
      handleForgotPassword()
    } else if (viewMode === "reset-password") {
      handleResetPassword()
    }
  }

  const handleBackToSignUp = () => {
    resetForm()
    setViewMode("signup")
  }

  const handleBackToLogin = () => {
    resetForm()
    setViewMode("login")
  }

  const handleBackToForgotPassword = () => {
    resetForm()
    setViewMode("forgot-password")
  }

  // Existing User View
  if (viewMode === "existing-user") {
    return (
      <>
        <Header user={null} transparent={false} />
        <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-4xl font-bold text-[#3E5641] dark:text-white">Account Already Exists</h1>
              <p className="text-[#6F7F69] dark:text-gray-400 mt-2">
                You already have an account with this email address.
              </p>
            </div>

            <div className="bg-white dark:bg-[#2A352A] p-8 rounded-3xl shadow-lg border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
              <div className="text-center space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Email address:</strong>
                  </p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mt-1">{email}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    This email is already registered in our system.
                  </p>
                </div>

                <div className="text-left space-y-2 text-sm text-[#6F7F69] dark:text-gray-400">
                  <p>
                    <strong>What you can do:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Sign in with your existing password</li>
                    <li>Use "Forgot Password" if you don't remember it</li>
                    <li>Try signing in with Google if you used that before</li>
                  </ul>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    onClick={handleBackToLogin}
                    className="w-full bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                  >
                    <>
                      Continue to Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      resetForm()
                      setViewMode("signup")
                    }} 
                    className="w-full bg-transparent"
                  >
                    Try Different Email
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-[#6F7F69] dark:text-gray-400">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          </div>
        </main>
      </>
    )
  }

  // Verification View – now ONLY used for password reset flow (not for signup)
  if (viewMode === "verification") {
    const isReset = verificationType === "reset" // This will always be true because signup never goes here
    
    return (
      <>
        <Header user={null} transparent={false} />
        <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-4xl font-bold text-[#3E5641] dark:text-white">
                Check Your Email
              </h1>
              <p className="text-[#6F7F69] dark:text-gray-400 mt-2">
                {isReset
                  ? "We've sent password reset instructions to your email address."
                  : "We've sent a verification link to your email address."}
              </p>
            </div>

            <div className="bg-white dark:bg-[#2A352A] p-8 rounded-3xl shadow-lg border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
              <div className="text-center space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>{isReset ? "Reset email sent to:" : "Verification email sent to:"}</strong>
                  </p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mt-1">{verificationEmail}</p>
                </div>

                {resendSuccess && !isReset && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                    <p className="text-sm text-green-800 dark:text-green-200">Verification email sent successfully!</p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                <div className="text-left space-y-2 text-sm text-[#6F7F69] dark:text-gray-400">
                  <p>
                    <strong>Next steps:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    {isReset ? (
                      <>
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the password reset link in the email</li>
                        <li>Create a new password and sign in</li>
                      </>
                    ) : (
                      <>
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the verification link in the email</li>
                        <li>Return here to sign in to your account</li>
                      </>
                    )}
                  </ol>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    onClick={handleBackToLogin}
                    className="w-full bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                  >
                    <>
                      Continue to Sign In
                      <LogIn className="ml-2 h-4 w-4" />
                    </>
                  </Button>

                  {/* Only show resend button for sign‑up verification – but since isReset is always true here, this button is hidden */}
                  {!isReset && (
                    <Button
                      variant="outline"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="w-full bg-transparent"
                    >
                      <>
                        {isResending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Resend Verification Email
                          </>
                        )}
                      </>
                    </Button>
                  )}

                  <Button variant="outline" onClick={handleBackToSignUp} className="w-full bg-transparent">
                    Back to Sign Up
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-xs text-[#6F7F69] dark:text-gray-400 space-y-2">
                <p>
                  <strong>Troubleshooting:</strong>
                </p>
                <ul className="text-left space-y-1 max-w-sm mx-auto">
                  <li>Check your spam/junk folder</li>
                  <li>Wait a few minutes for email delivery</li>
                  <li>Make sure you entered the correct email</li>
                  {!isReset && <li>Try using the "Resend" button above</li>}
                </ul>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  // Forgot Password View
  if (viewMode === "forgot-password") {
    return (
      <>
        <Header user={null} transparent={false} />
        <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                <Key className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h1 className="text-4xl font-bold text-[#3E5641] dark:text-white">Reset Password</h1>
              <p className="text-[#6F7F69] dark:text-gray-400 mt-2">
                Enter your email address to receive password reset instructions.
              </p>
            </div>

            <div className="bg-white dark:bg-[#2A352A] p-8 rounded-3xl shadow-lg border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="forgot-email" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                    Email Address
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    {successMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                  disabled={isLoading}
                >
                  <>
                    {isLoading ? "Sending..." : "Send Reset Instructions"}
                    {!isLoading && <Key className="ml-2 h-4 w-4" />}
                  </>
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full bg-transparent"
                >
                  <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                  Back to Sign In
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-xs text-[#6F7F69] dark:text-gray-400 space-y-2">
                <p>
                  <strong>Note:</strong> Password reset links expire after 24 hours.
                </p>
                <p>If you don't receive an email within a few minutes, check your spam folder.</p>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  // Reset Password View
  if (viewMode === "reset-password") {
    return (
      <>
        <Header user={null} transparent={false} />
        <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-4xl font-bold text-[#3E5641] dark:text-white">Create New Password</h1>
              <p className="text-[#6F7F69] dark:text-gray-400 mt-2">
                Please enter and confirm your new password.
              </p>
            </div>

            <div className="bg-white dark:bg-[#2A352A] p-8 rounded-3xl shadow-lg border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="new-password" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                    New Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                    Confirm Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    {successMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                  disabled={isLoading}
                >
                  <>
                    {isLoading ? "Resetting..." : "Reset Password"}
                    {!isLoading && <Lock className="ml-2 h-4 w-4" />}
                  </>
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full bg-transparent"
                >
                  <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                  Back to Sign In
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-xs text-[#6F7F69] dark:text-gray-400 space-y-2">
                <p>
                  <strong>Password Tips:</strong>
                </p>
                <ul className="text-left space-y-1 max-w-sm mx-auto">
                  <li>Use at least 6 characters</li>
                  <li>Include numbers and special characters for stronger security</li>
                  <li>Avoid common words or personal information</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  // Main Login/Signup View
  const isSignUp = viewMode === "signup"
  
  return (
    <>
      <Header user={null} transparent={false} />
      <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#3E5641] dark:text-white">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-[#6F7F69] dark:text-gray-400 mt-2">
              {isSignUp ? "Join the community to buy and sell cars." : "Sign in to manage your listings."}
            </p>
          </div>

          <div className="bg-white dark:bg-[#2A352A] p-8 rounded-3xl shadow-lg border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="firstName" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required={isSignUp}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="lastName" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required={isSignUp}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                    Password
                  </Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setViewMode("forgot-password")}
                      className="text-xs text-[#FF6700] hover:underline dark:text-[#FF7D33]"
                    >
                      <HelpCircle className="h-3 w-3 inline mr-1" />
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {isSignUp && (
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  {successMessage}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                disabled={isLoading}
              >
                <>
                  {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                  {isSignUp ? <UserPlus className="ml-2 h-4 w-4" /> : <LogIn className="ml-2 h-4 w-4" />}
                </>
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-[#2A352A] text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center"
                >
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Google</span>
                  </>
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-[#6F7F69] dark:text-gray-400">
                {isSignUp ? (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => setViewMode("login")}
                      className="text-[#FF6700] hover:underline dark:text-[#FF7D33]"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => setViewMode("signup")}
                      className="text-[#FF6700] hover:underline dark:text-[#FF7D33]"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
          
          {onCancel && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={onCancel}
                className="bg-transparent"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}