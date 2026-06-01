"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import ProfileSettings from "@/components/profile-settings"
import { authService } from "@/lib/auth"
import { uploadProfilePicture } from "@/lib/image-upload"
import type { UserProfile } from "@/types/user"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
  const router = useRouter()
  const { user, authUser, isLoading, refreshUserProfile } = useUser()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !authUser) {
      console.log("⚠️ No authenticated user, redirecting to login")
      router.push("/login?redirect=/settings")
    }
  }, [authUser, isLoading, router])

  /**
   * Save profile updates.
   *
   * Flow:
   * 1. If a new profile picture file is provided, read it as base64
   * 2. Upload the base64 to the profile-picture bucket via uploadProfilePicture
   * 3. Store the returned public URL in the profile update
   * 4. Save all other profile fields to the database
   * 5. Refresh the user context so the header/dashboard update immediately
   *
   * If the profile picture upload fails, uploadProfilePicture returns
   * the original base64 as a fallback so the save never fails silently.
   */
  const handleSave = async (
    updatedProfile: Partial<UserProfile>,
    profilePictureFile?: File
  ) => {
    if (!user) throw new Error("No user found")

    try {
      setIsSaving(true)
      console.log("💾 Saving profile updates...")

      // Handle profile picture upload
      if (profilePictureFile) {
        // Read the file as base64 first
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error("Failed to read image file"))
          reader.readAsDataURL(profilePictureFile)
        })

        // Upload to profile-picture bucket, get back a public URL
        console.log("🖼️ Uploading profile picture to storage...")
        const profilePicUrl = await uploadProfilePicture(base64Image, user.id)
        console.log("✅ Profile picture URL:", profilePicUrl)

        // Replace the base64 in the update with the storage URL
        updatedProfile.profilePic = profilePicUrl
      }

      // Save all profile fields to the database
      const { error } = await authService.updateUserProfile(
        user.id,
        updatedProfile
      )

      if (error) throw new Error(error.message)

      console.log("✅ Profile updated successfully")

      // Refresh context so header avatar and dashboard update immediately
      await refreshUserProfile()

      console.log("✅ User context refreshed")
    } catch (error) {
      console.error("❌ Error saving profile:", error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    router.push("/dashboard")
  }

  const handleSignOut = async () => {
    try {
      const { error } = await authService.signOut()
      if (error) {
        console.error("❌ Sign out error:", error.message)
      }
      router.push("/home")
    } catch (error) {
      console.error("❌ Unexpected error during sign out:", error)
      router.push("/home")
    }
  }

  // ─── Loading / Auth States ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
        <div className="text-center">
          <p className="text-[#6F7F69] dark:text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <ProfileSettings
      user={user}
      onBack={handleBack}
      onSave={handleSave}
      onSignOut={handleSignOut}
      handleLogin={() => router.push("/login")}
      handleDashboard={() => router.push("/dashboard")}
      handleGoHome={() => router.push("/home")}
      handleShowAllCars={() => router.push("/results")}
      handleGoToSell={() => router.push("/upload-vehicle")}
    />
  )
}