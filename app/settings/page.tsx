"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import ProfileSettings from "@/components/profile-settings"
import { Header } from "@/components/ui/header"
import { authService } from "@/lib/auth"
import type { UserProfile } from "@/types/user"

export default function SettingsPage() {
  const router = useRouter()
  const { user, authUser, isLoading, refreshUserProfile, setUser } = useUser()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !authUser) {
      console.log("⚠️ No authenticated user, redirecting to login")
      router.push("/login?redirect=/settings")
    }
  }, [authUser, isLoading, router])

  const handleSave = async (updatedProfile: Partial<UserProfile>, profilePictureFile?: File) => {
    if (!user || !setUser) {
      throw new Error("User context is not properly initialized.")
    }

    const originalUser = { ...user }
    let temporaryProfilePicUrl: string | undefined

    // --- Optimistic UI Update ---
    try {
      const optimisticUser: UserProfile = { ...originalUser, ...updatedProfile }

      if (profilePictureFile) {
        temporaryProfilePicUrl = URL.createObjectURL(profilePictureFile)
        optimisticUser.profilePic = temporaryProfilePicUrl
      }

      setUser(optimisticUser)
    } catch (e) {
      console.error("Failed to create optimistic user state", e)
      // Don't proceed if we can't even set the optimistic state.
      return
    }
    // --- End Optimistic UI Update ---

    setIsSaving(true)
    try {
      let finalProfilePicUrl = updatedProfile.profilePic

      if (profilePictureFile) {
        finalProfilePicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (error) => reject(error)
          reader.readAsDataURL(profilePictureFile)
        })
      }

      const updatesForDb = {
        ...updatedProfile,
        profilePic: finalProfilePicUrl,
      }

      const { error } = await authService.updateUserProfile(user.id, updatesForDb)

      if (error) {
        throw new Error(error.message)
      }

      console.log("✅ Profile updated successfully in DB")

      await refreshUserProfile()
      console.log("✅ User profile refreshed from context")
    } catch (error) {
      console.error("❌ Error saving profile, reverting UI:", error)
      setUser(originalUser) // Rollback
      throw error // Let the caller handle showing the UI error
    } finally {
      setIsSaving(false)
      if (temporaryProfilePicUrl) {
        URL.revokeObjectURL(temporaryProfilePicUrl) // Clean up blob URL
      }
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

      // Redirect regardless of error since we cleared storage
      router.push("/home")
    } catch (error) {
      console.error("❌ Unexpected error during sign out:", error)
      // Force redirect and clear storage on any error
      router.push("/home")
    }
  }

  if (isLoading) {
    return (
      <>
        <Header user={user} transparent={false} />
        <main className="flex-1 flex items-center justify-center px-4 pt-20 md:pt-24">
          <div className="text-center">
            <p className="text-[#6F7F69] dark:text-gray-400">Loading...</p>
          </div>
        </main>
      </>
    )
  }

  if (!user) {
    return null
  }

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
