"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import UploadVehicleComponent from "@/components/upload-vehicle"
import { useEffect, useState } from "react"
import { vehicleService } from "@/lib/vehicle-service"
import { authService } from "@/lib/auth"
import type { UserProfile } from "@/types/user"
import type { VehicleFormData } from "@/types/vehicle"

export const dynamic = 'force-dynamic'


export default function UploadVehiclePage() {
  const router = useRouter()
  const { user, authUser, isEmailVerified, isLoading, refreshUserProfile } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    console.log("🔍 Upload Vehicle Page - Current State:", {
      isLoading,
      hasAuthUser: !!authUser,
      hasUser: !!user,
      isEmailVerified,
      email: authUser?.email,
      email_confirmed_at: authUser?.email_confirmed_at,
      userId: user?.id,
      authUserId: authUser?.id,
    })
    
    // Log detailed user context structure
    console.log("📋 User Context Analysis:", {
      userType: user ? typeof user : 'null',
      userKeys: user ? Object.keys(user) : [],
      authUserType: authUser ? typeof authUser : 'null',
      authUserKeys: authUser ? Object.keys(authUser) : [],
    })

    if (!isLoading && !authUser) {
      console.log("⚠️ No authenticated user, redirecting to login")
      router.push("/login?next=/upload-vehicle")
    }
  }, [authUser, isLoading, router, isEmailVerified, user])

  // Show loading state while checking authentication
  if (isLoading) {
    console.log("⏳ Upload page: Loading user data...")
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white">Loading...</p>
      </div>
    )
  }

  // Redirect if no auth user
  if (!authUser) {
    console.log("⚠️ Upload page: No auth user, should redirect")
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white">Redirecting to login...</p>
      </div>
    )
  }

  // Wait for user profile to load
  if (!user) {
    console.log("⏳ Upload page: Waiting for user profile...")
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white">Loading profile...</p>
      </div>
    )
  }

  console.log("✅ Upload page: All checks passed, showing upload form")
  console.log("👤 User Profile Data:", {
    userId: user.id,
    userFullObject: user,
    idType: typeof user.id,
    idLength: user.id?.length,
    isUuid: user.id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) ? 'Valid UUID' : 'Invalid format',
    comparison: {
      user_id: user.id,
      authUser_id: authUser.id,
      match: user.id === authUser.id
    }
  })

  const handleVehicleSubmit = async (vehicleData: VehicleFormData) => {
    console.log("🚀 handleVehicleSubmit - START")
    setIsSubmitting(true)
    setSubmitError(null)
    
    console.log("🔍 User Context Before Submission:", {
      userExists: !!user,
      userId: user?.id,
      user: user,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\n').slice(0, 5).join('\n')
    })
    
    if (!user) {
      console.error("❌ User is null/undefined in handleVehicleSubmit")
      console.log("📊 Current State Dump:", {
        authUser,
        isLoading,
        isEmailVerified,
        localStorageUser: typeof window !== 'undefined' ? localStorage.getItem('user') : 'SSR'
      })
      setIsSubmitting(false)
      setSubmitError("User is not authenticated. Please refresh the page and try again.")
      throw new Error("User is not authenticated.")
    }

    if (!user.id) {
      console.error("❌ User ID is missing in handleVehicleSubmit")
      console.log("📋 User object structure:", JSON.stringify(user, null, 2))
      setIsSubmitting(false)
      setSubmitError("User ID is missing. Please refresh the page and try again.")
      throw new Error("User ID is missing from user profile.")
    }

    console.log("📤 Preparing to submit with:", {
      vehicleDataKeys: Object.keys(vehicleData),
      userId: user.id,
      userIdFormat: user.id,
      vehicleServiceMethod: typeof vehicleService.createVehicle,
      dataFlow: 'page.tsx → vehicleService.createVehicle',
      payload: {
        ...vehicleData,
        userId: user.id
      }
    })

    try {
      console.log("📝 Submitting vehicle data:", {
        vehicleData,
        userId: user.id,
        userProfileId: user.profile_id,
        submissionTime: new Date().toISOString()
      })
      
      // Log the exact call being made
      console.log("🔧 Calling vehicleService.createVehicle with:", {
        vehicleDataArg: vehicleData,
        userIdArg: user.id,
        callSignature: `vehicleService.createVehicle(vehicleData, "${user.id}")`
      })
      
      // Create an abort controller to handle request timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      // Try the request with retry logic
      let retryCount = 0
      const maxRetries = 2
      let lastError = null
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`🔄 Attempt ${retryCount + 1} of ${maxRetries + 1}`)
          
          const result = await vehicleService.createVehicle(vehicleData, user.id)
          clearTimeout(timeoutId)
          
          console.log("✅ Vehicle created successfully", {
            result,
            userIdUsed: user.id,
            redirectTo: "/dashboard"
          })
          
          setIsSubmitting(false)
          router.push("/dashboard")
          return
        } catch (err) {
          lastError = err
          console.error(`❌ Attempt ${retryCount + 1} failed:`, {
            error: err,
            errorType: err?.constructor?.name,
            errorMessage: err?.message,
            isAbortError: err?.name === 'AbortError' || err?.message?.includes('AbortError'),
            userIdAtError: user?.id,
            time: new Date().toISOString()
          })
          
          // Check if it's an abort error
          const isAbortError = err?.name === 'AbortError' || err?.message?.includes('AbortError')
          
          if (isAbortError) {
            console.warn("⚠️ AbortError detected. This is usually a network or timeout issue.")
            
            // For abort errors, provide specific guidance
            if (retryCount < maxRetries) {
              console.log(`⏱️ Waiting 2 seconds before retry ${retryCount + 2}...`)
              await new Promise(resolve => setTimeout(resolve, 2000))
              retryCount++
              continue
            } else {
              setSubmitError("Request timed out. The server is taking too long to respond. Please check your network connection and try again.")
              throw new Error("Request timed out after multiple attempts. Please try again later.")
            }
          }
          
          // For other errors, don't retry
          break
        }
      }
      
      // If we've exhausted retries or got a non-abort error
      if (lastError) {
        const errorMessage = lastError?.message || 'Unknown error occurred'
        
        // Provide user-friendly error messages
        if (lastError?.message?.includes('AbortError')) {
          setSubmitError("Network request was cancelled. Please check your internet connection and try again.")
        } else if (lastError?.message?.includes('timeout')) {
          setSubmitError("Request timed out. Please try again or contact support if the issue persists.")
        } else if (lastError?.message?.includes('network')) {
          setSubmitError("Network error. Please check your internet connection and try again.")
        } else {
          setSubmitError(`Failed to create vehicle: ${errorMessage}`)
        }
        
        throw lastError
      }
      
    } catch (err) {
      console.error("❌ Failed to submit vehicle:", {
        error: err,
        userIdAtError: user?.id,
        vehicleData: vehicleData,
        errorStack: err instanceof Error ? err.stack : 'No stack trace',
        time: new Date().toISOString(),
        isSubmitting,
        userAuthenticated: !!authUser
      })
      
      setIsSubmitting(false)
      
      // Don't throw if we've already set a user-friendly error
      if (!submitError) {
        throw err
      }
    } finally {
      setIsSubmitting(false)
      console.log("🏁 handleVehicleSubmit - END")
    }
  }

  const handleBack = () => {
    if (isSubmitting) {
      console.warn("⚠️ Attempted to navigate away while submission is in progress")
      if (confirm("Vehicle submission is in progress. Are you sure you want to leave?")) {
        router.push("/dashboard")
      }
    } else {
      router.push("/dashboard")
    }
  }

  const handleSaveProfile = async (updatedProfile: Partial<UserProfile>) => {
    console.log("💾 handleSaveProfile - START")
    console.log("🔍 Context Before Profile Save:", {
      user,
      userId: user?.id,
      updatedProfileKeys: Object.keys(updatedProfile)
    })
    
    if (!user) {
      console.error("❌ User not found in handleSaveProfile")
      throw new Error("User not found")
    }
    
    try {
      console.log("📝 Updating profile from upload-vehicle page:", {
        userId: user.id,
        updatedProfile,
        fullUser: user
      })
      
      const { error } = await authService.updateUserProfile(user.id, updatedProfile)

      if (error) {
        console.error("❌ Profile update error:", {
          error,
          userId: user.id,
          serviceResponse: { error }
        })
        throw new Error(error.message)
      }

      console.log("✅ Profile updated successfully from upload-vehicle page", {
        userId: user.id,
        timestamp: new Date().toISOString()
      })
      
      // Refresh the user profile in context so both pages are in sync
      console.log("🔄 Refreshing user profile in context...")
      await refreshUserProfile()
      console.log("✅ User profile refreshed in context", {
        userId: user.id,
        refreshedAt: new Date().toISOString()
      })

    } catch (err) {
      console.error("❌ Failed to save profile:", {
        error: err,
        userId: user?.id,
        context: 'upload-vehicle page'
      })
      throw err
    } finally {
      console.log("💾 handleSaveProfile - END")
    }
  }

  return (
    <>
      {submitError && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{submitError}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setSubmitError(null)}
            >
              <span className="sr-only">Dismiss</span>
              &times;
            </button>
          </div>
        </div>
      )}
      <UploadVehicleComponent
        user={user as UserProfile}
        onVehicleSubmit={handleVehicleSubmit}
        onBack={handleBack}
        onSaveProfile={handleSaveProfile}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
