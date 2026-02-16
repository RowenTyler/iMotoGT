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
  const { user, authUser, isLoading, refreshUserProfile } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    // Basic Auth Check
    if (!isLoading && !authUser) {
      console.log("⚠️ No authenticated user, redirecting to login")
      router.push("/login?next=/upload-vehicle")
    }
  }, [authUser, isLoading, router])

  /**
   * Handles the vehicle submission with strict error handling
   */
  const handleVehicleSubmit = async (vehicleData: VehicleFormData) => {
    console.log("🚀 handleVehicleSubmit - START")
    setIsSubmitting(true)
    setSubmitError(null)

    // Validate User and ID
    if (!user || !user.id) {
      console.error("❌ User not authenticated or ID missing")
      setSubmitError("User is not authenticated. Please refresh the page and try again.")
      setIsSubmitting(false)
      return
    }

    try {
      console.log("📝 Submitting vehicle data for user:", user.id)
      
      // vehicleService.createVehicle now throws on failure
      const result = await vehicleService.createVehicle(vehicleData, user.id)

      // Validate result existence
      if (!result || !result.id) {
        throw new Error("Server confirmed creation but returned no ID.")
      }

      console.log("✅ Vehicle created successfully:", {
        vehicleId: result.id,
        make: result.make,
        model: result.model
      })

      setIsSubmitting(false)
      router.push("/dashboard")
      
    } catch (error: any) {
      console.error("❌ Failed to submit vehicle:", {
        error,
        errorMessage: error?.message,
        userId: user?.id
      })

      // Map error to user-friendly message
      const errorMessage = error?.message || "Failed to create vehicle listing. Please try again."
      setSubmitError(errorMessage)
      setIsSubmitting(false)
    }
  }

  /**
   * Handles updating the user profile (e.g., phone or location) during vehicle upload
   */
  const handleSaveProfile = async (updatedProfile: Partial<UserProfile>) => {
    if (!user?.id) throw new Error("User ID is required to update profile")
    
    try {
      console.log("💾 Updating profile from upload page...")
      const { error } = await authService.updateUserProfile(user.id, updatedProfile)

      if (error) throw error

      console.log("✅ Profile updated. Refreshing context...")
      await refreshUserProfile()
    } catch (err: any) {
      console.error("❌ Failed to save profile:", err)
      throw err
    }
  }

  const handleBack = () => {
    if (isSubmitting) {
      if (confirm("Vehicle submission is in progress. Are you sure you want to leave?")) {
        router.push("/dashboard")
      }
    } else {
      router.push("/dashboard")
    }
  }

  // Handle Loading State
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white animate-pulse">Loading user data...</p>
      </div>
    )
  }

  // Handle Missing Profile State
  if (!authUser || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <>
      {/* Error Toast / Alert */}
      {submitError && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg relative" role="alert">
            <strong className="font-bold">Submission Error: </strong>
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
