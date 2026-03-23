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
    if (!isLoading && !authUser) {
      console.log("⚠️ No authenticated user, redirecting to login")
      router.push("/login?next=/upload-vehicle")
    }
  }, [authUser, isLoading, router])

  /**
   * Handles vehicle submission including image compression and database insertion
   */
  const handleVehicleSubmit = async (vehicleData: VehicleFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    if (!user || !user.id) {
      setSubmitError("User is not authenticated. Please refresh the page and try again.")
      setIsSubmitting(false)
      return
    }

    try {
      // Step 1: Create the vehicle record first to get an ID
      const vehicleWithoutImages = { ...vehicleData, images: [] }
      const vehicle = await vehicleService.createVehicle(vehicleWithoutImages, user.id)

      if (!vehicle?.id) throw new Error("Failed to create vehicle record")

      // Step 2: Upload images to Supabase Storage — returns public URLs
      const { uploadAllVehicleImages } = await import('@/lib/image-upload')
      const imageUrls = await uploadAllVehicleImages(vehicleData.images || [], vehicle.id)

      // Step 3: Update the vehicle with storage URLs
      if (imageUrls.length > 0) {
        await vehicleService.updateVehicle(vehicle.id, { images: imageUrls })
      }

      setIsSubmitting(false)
      router.push("/dashboard")
    } catch (error: any) {
      setSubmitError(error.message || "Failed to create listing")
      setIsSubmitting(false)
    }
  }

  /**
   * Updates user profile data during the vehicle upload process
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white animate-pulse">Loading user data...</p>
      </div>
    )
  }

  if (!authUser || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <>
      {submitError && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg relative" role="alert">
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
