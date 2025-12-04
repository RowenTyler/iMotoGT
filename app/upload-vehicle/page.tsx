"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import UploadVehicleComponent from "@/components/upload-vehicle"
import { useEffect } from "react"
import { vehicleService } from "@/lib/vehicle-service"
import { authService } from "@/lib/auth"
import type { UserProfile } from "@/types/user"
import type { VehicleFormData } from "@/types/vehicle"

export const dynamic = 'force-dynamic'


export default function UploadVehiclePage() {
  const router = useRouter()
  const { user, authUser, isEmailVerified, isLoading, refreshUserProfile } = useUser()

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
      throw new Error("User is not authenticated.")
    }

    if (!user.id) {
      console.error("❌ User ID is missing in handleVehicleSubmit")
      console.log("📋 User object structure:", JSON.stringify(user, null, 2))
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
      
      const result = await vehicleService.createVehicle(vehicleData, user.id)
      
      console.log("✅ Vehicle created successfully", {
        result,
        userIdUsed: user.id,
        redirectTo: "/dashboard"
      })
      
      router.push("/dashboard")
    } catch (err) {
      console.error("❌ Failed to submit vehicle:", {
        error: err,
        userIdAtError: user?.id,
        vehicleData: vehicleData,
        errorStack: err instanceof Error ? err.stack : 'No stack trace',
        time: new Date().toISOString()
      })
      throw err
    } finally {
      console.log("🏁 handleVehicleSubmit - END")
    }
  }

  const handleBack = () => {
    router.push("/dashboard")
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
    <UploadVehicleComponent
      user={user as UserProfile}
      onVehicleSubmit={handleVehicleSubmit}
      onBack={handleBack}
      onSaveProfile={handleSaveProfile}
    />
  )
}
