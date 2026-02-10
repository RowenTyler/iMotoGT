"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/ui/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"
import { authService, AuthError } from "@/lib/auth"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isRequestMode, setIsRequestMode] = useState(true)
  const [hasValidToken, setHasValidToken] = useState(false)
  
  const token = searchParams.get('token')
  const type = searchParams.get('type')

  useEffect(() => {
    // Check if we have a valid reset token
    if (token && type === 'recovery') {
      setHasValidToken(true)
      setIsRequestMode(false)
    } else {
      setHasValidToken(false)
      setIsRequestMode(true)
    }
  }, [token, type])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError("Please enter your email address.")
      return
    }
    
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      console.log("🔐 Requesting password reset for:", email)
      
      const { error: resetError } = await authService.requestPasswordReset(email)
      
      if (resetError) {
        throw resetError
      }
      
      setSuccessMessage("Password reset instructions have been sent to your email. Please check your inbox (and spam folder).")
    } catch (e) {
      console.error("❌ Forgot password error:", e)
      if (e instanceof AuthError) {
        if (e.message.includes("rate limit")) {
          setError("Too many attempts. Please try again in a few minutes.")
        } else if (e.message.includes("user not found")) {
          setError("No account found with this email address.")
        } else {
          setError(e.message)
        }
      } else {
        setError("Failed to send reset email. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      
      const { error: resetError } = await authService.resetPassword(newPassword)
      
      if (resetError) {
        throw resetError
      }
      
      setSuccessMessage("Password reset successfully! You can now sign in with your new password.")
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (e) {
      console.error("❌ Reset password error:", e)
      if (e instanceof AuthError) {
        if (e.message.includes("session") || e.message.includes("expired")) {
          setError("Reset link has expired. Please request a new password reset.")
          setIsRequestMode(true)
        } else if (e.message.includes("weak")) {
          setError("Password is too weak. Please use a stronger password.")
        } else {
          setError(e.message)
        }
      } else {
        setError("Failed to reset password. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push("/login")
  }

  // Request reset password form (when no token)
  if (isRequestMode) {
    return (
      <>
        <Header user={null} transparent={false} />
        <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h1 className="text-4xl font-bold text-[#3E5641] dark:text-white">Reset Password</h1>
              <p className="text-[#6F7F69] dark:text-gray-400 mt-2">
                Enter your email address to receive password reset instructions.
              </p>
            </div>

            <div className="bg-white dark:bg-[#2A352A] p-8 rounded-3xl shadow-lg border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
              <form onSubmit={handleRequestReset} className="space-y-6">
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

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
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
                  <strong>Note:</strong> Password reset links expire after 24 hours.
                </p>
                <p>If you don't receive an email within a few minutes, check your spam folder.</p>
                <p className="mt-4">
                  Don't have an account?{" "}
                  <button
                    onClick={() => router.push("/login")}
                    className="text-[#FF6700] hover:underline dark:text-[#FF7D33]"
                  >
                    Sign up here
                  </button>
                </p>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  // Reset password form (when token is present)
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
            <form onSubmit={handleResetPassword} className="space-y-6">
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
                  <AlertCircle className="h-4 w-4 inline mr-2" />
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
