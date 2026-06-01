"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import UploadVehicleComponent from "@/components/upload-vehicle"
import { useEffect, useState } from "react"
import { vehicleService } from "@/lib/vehicle-service"
import { authService } from "@/lib/auth"
import { compressImages } from "@/lib/image-utils"
import { uploadProfilePicture } from "@/lib/image-upload"
import type { UserProfile } from "@/types/user"
import type { VehicleFormData } from "@/types/vehicle"

export const dynamic = "force-dynamic"

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
   * Handles vehicle submission.
   *
   * Flow:
   * 1. Compress images (WebP, 75% quality, max 1200px)
   * 2. Pass compressed images to vehicleService.createVehicle
   * 3. createVehicle internally uploads to vehicle-storage bucket
   *    and stores public URLs in the database
   * 4. Redirect to dashboard on success
   *
   * Note: we no longer need to call uploadVehicleImages here directly
   * because vehicle-service.ts → vehicle-operations-with-storage.ts
   * handles the upload automatically inside createVehicle.
   */
  const handleVehicleSubmit = async (vehicleData: VehicleFormData) => {
    console.log("🚀 handleVehicleSubmit - START")
    setIsSubmitting(true)
    setSubmitError(null)

    if (!user || !user.id) {
      console.error("❌ User not authenticated")
      setSubmitError(
        "User is not authenticated. Please refresh the page and try again."
      )
      setIsSubmitting(false)
      return
    }

    try {
      console.log("📝 Submitting vehicle data...")

      // Step 1: Compress images before uploading
      // This reduces file sizes by ~40-60% before they hit the storage bucket
      if (vehicleData.images && vehicleData.images.length > 0) {
        console.log(`🖼️ Compressing ${vehicleData.images.length} images...`)
        vehicleData.images = await compressImages(vehicleData.images)
        console.log("✅ Images compressed")
      }

      // Step 2: Create vehicle
      // createVehicle internally calls createVehicleWithStorage which:
      //   - Uploads compressed images to vehicle-storage bucket
      //   - Stores public URLs in the database
      //   - Falls back to base64 per-image if any upload fails
      const result = await vehicleService.createVehicle(vehicleData, user.id)

      if (!result || !result.id) {
        throw new Error(
          "Invalid response from server. Listing may not have been created."
        )
      }

      console.log("✅ Vehicle created successfully:", result.id)
      setIsSubmitting(false)
      router.push("/dashboard")
    } catch (error: any) {
      console.error("❌ Failed to submit vehicle:", error)
      const errorMessage =
        error?.message || "Failed to create vehicle listing. Please try again."
      setSubmitError(errorMessage)
      setIsSubmitting(false)
    }
  }

  /**
   * Updates user profile data during the vehicle upload process.
   *
   * If the profile picture is a new base64 image, it is uploaded
   * to the profile-picture bucket first and the URL is saved.
   */
  const handleSaveProfile = async (updatedProfile: Partial<UserProfile>) => {
    if (!user?.id) throw new Error("User ID is required to update profile")

    try {
      console.log("💾 Updating profile from upload page...")

      // Upload profile picture to storage if it is a new base64 image
      if (
        updatedProfile.profilePic &&
        updatedProfile.profilePic.startsWith("data:")
      ) {
        console.log("🖼️ Uploading profile picture to storage...")
        updatedProfile.profilePic = await uploadProfilePicture(
          updatedProfile.profilePic,
          user.id
        )
        console.log("✅ Profile picture uploaded:", updatedProfile.profilePic)
      }

      const { error } = await authService.updateUserProfile(
        user.id,
        updatedProfile
      )

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
      if (
        confirm(
          "Vehicle submission is in progress. Are you sure you want to leave?"
        )
      ) {
        router.push("/dashboard")
      }
    } else {
      router.push("/dashboard")
    }
  }

  // ─── Loading / Auth States ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white animate-pulse">
          Loading user data...
        </p>
      </div>
    )
  }

  if (!authUser || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <p className="text-[#3E5641] dark:text-white">
          Redirecting to login...
        </p>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Error banner — shown if submission fails */}
      {submitError && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50">
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg relative"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{submitError}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setSubmitError(null)}
              aria-label="Dismiss error"
            >
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
      />
    </>
  )
}
