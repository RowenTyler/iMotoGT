"use client"

import type React from "react"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/ui/header"
import type { UserProfile } from "@/types/user"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileSettingsProps {
  user: UserProfile
  onBack: () => void
  onSave: (
    updatedProfile: Partial<UserProfile>,
    profilePictureFile?: File
  ) => Promise<void>
  onSignOut: () => void
  handleLogin: () => void
  handleDashboard: () => void
  handleGoHome: () => void
  handleShowAllCars: () => void
  handleGoToSell: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (
  user: UserProfile | null,
  formData: Partial<UserProfile>
): string => {
  return (
    (formData.firstName?.[0] || "") +
    (formData.lastName?.[0] || "") ||
    user?.email?.[0] ||
    ""
  ).toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileSettings({
  user,
  onBack,
  onSave,
  onSignOut,
  handleLogin,
  handleDashboard,
  handleGoHome,
  handleShowAllCars,
  handleGoToSell,
}: ProfileSettingsProps) {
  const router = useRouter()

  // ─── Profile Picture State ──────────────────────────────────────────────────
  //
  // profileImagePreview: what is shown in the UI (either the existing
  //   profilePic URL/base64, or a fresh preview of a newly picked file)
  //
  // profilePictureFile: the actual File object for a newly picked image.
  //   This is passed to onSave so the parent (app/settings/page.tsx) can
  //   upload it to the profile-picture bucket before saving to the DB.
  //
  // We do NOT convert the file to base64 here — that happens in the parent.
  // This component only needs the preview URL for display purposes.

  const [profileImagePreview, setProfileImagePreview] = useState<
    string | undefined
  >(user.profilePic || undefined)
  const [profilePictureFile, setProfilePictureFile] = useState<
    File | undefined
  >(undefined)

  // ─── Personal Info State ────────────────────────────────────────────────────

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    suburb: user.suburb,
    city: user.city,
    province: user.province,
  })

  // ─── Security State ─────────────────────────────────────────────────────────

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ─── UI State ───────────────────────────────────────────────────────────────

  const [isSavingPersonal, setIsSavingPersonal] = useState(false)
  const [isSavingSecurity, setIsSavingSecurity] = useState(false)
  const [personalError, setPersonalError] = useState<string | null>(null)
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null)
  const [securityError, setSecurityError] = useState<string | null>(null)
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Sync form when user prop changes ──────────────────────────────────────

  useEffect(() => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      suburb: user.suburb,
      city: user.city,
      province: user.province,
    })
    // Update preview if the user's profile pic changed externally
    // (e.g. after a successful save refreshes the context)
    if (user.profilePic && !profilePictureFile) {
      setProfileImagePreview(user.profilePic)
    }
  }, [user])

  // ─── Input Handlers ─────────────────────────────────────────────────────────

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setPersonalError(null)
    setPersonalSuccess(null)
  }

  /**
   * Handle profile picture selection.
   *
   * Stores the File object so the parent can upload it to Supabase Storage.
   * Creates a local object URL for immediate preview in the UI without
   * any base64 conversion — faster and uses less memory.
   */
  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setPersonalError("Please select a valid image file.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPersonalError("Profile picture must be smaller than 5MB.")
      return
    }

    // Store the raw File — parent will handle upload to Supabase Storage
    setProfilePictureFile(file)

    // Create a local preview URL (no base64, no upload yet)
    const previewUrl = URL.createObjectURL(file)
    setProfileImagePreview(previewUrl)
    setPersonalError(null)
  }

  const handleImageError = () => {
    setProfileImagePreview(undefined)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // ─── Save Personal Info ─────────────────────────────────────────────────────

  /**
   * Save personal info and profile picture.
   *
   * Passes profilePictureFile (the raw File object) to onSave.
   * The parent (app/settings/page.tsx) reads it as base64 then
   * uploads it to the profile-picture Supabase Storage bucket,
   * replacing profilePic with the returned public URL before
   * saving to the database.
   */
  const handleSavePersonalInfo = async () => {
    try {
      setIsSavingPersonal(true)
      setPersonalError(null)
      setPersonalSuccess(null)

      const updatedProfile: Partial<UserProfile> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        suburb: formData.suburb,
        city: formData.city,
        province: formData.province,
      }

      // Pass the raw File to the parent — it handles the upload
      await onSave(updatedProfile, profilePictureFile)

      // Clear the pending file after successful save
      setProfilePictureFile(undefined)

      setPersonalSuccess("Profile updated successfully!")
      setTimeout(() => setPersonalSuccess(null), 4000)
    } catch (error) {
      console.error("Failed to save personal info:", error)
      setPersonalError(
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again."
      )
    } finally {
      setIsSavingPersonal(false)
    }
  }

  // ─── Save Security ──────────────────────────────────────────────────────────

  const handleSaveSecurityChanges = async () => {
    setIsSavingSecurity(true)
    setSecurityError(null)
    setSecuritySuccess(null)

    if (!currentPassword) {
      setSecurityError("Please enter your current password.")
      setIsSavingSecurity(false)
      return
    }

    if (newPassword.length < 6) {
      setSecurityError("New password must be at least 6 characters long.")
      setIsSavingSecurity(false)
      return
    }

    if (newPassword.length > 72) {
      setSecurityError("New password must be less than 72 characters.")
      setIsSavingSecurity(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setSecurityError("New passwords do not match.")
      setIsSavingSecurity(false)
      return
    }

    try {
      // Password change via Supabase auth
      const { error } = await import("@/lib/auth").then((m) =>
        m.authService.updatePassword(newPassword)
      )

      if (error) throw new Error(error.message)

      setSecuritySuccess("Password updated successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setSecuritySuccess(null), 4000)
    } catch (error) {
      console.error("Password change failed:", error)
      setSecurityError(
        error instanceof Error
          ? error.message
          : "Failed to update password. Please try again."
      )
    } finally {
      setIsSavingSecurity(false)
    }
  }

  const handleSignOutButton = () => {
    onSignOut()
    router.push("/home")
  }

  // ─── Guard ───────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-gray-500 dark:text-gray-300">
        User not found or not logged in.
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] flex flex-col">
      <Header
        user={user}
        onLoginClick={handleLogin}
        onDashboardClick={handleDashboard}
        onGoHome={handleGoHome}
        onShowAllCars={handleShowAllCars}
        onGoToSellPage={handleGoToSell}
        onSignOut={handleSignOutButton}
        transparent={false}
      />

      <main className="flex-1 px-4 sm:px-6 pb-6 overflow-auto pt-20 md:pt-24">
        <h1 className="text-3xl font-bold mb-6 text-[#3E5641] dark:text-white">
          Profile Settings
        </h1>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Left Column: Profile Card ─────────────────────────────── */}
            <div className="lg:w-1/3 flex">
              <Card className="rounded-3xl overflow-hidden p-6 flex flex-col w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A]">

                {/* Profile Picture */}
                <div className="relative w-full aspect-square mb-4 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden">
                  {profileImagePreview ? (
                    <Image
                      src={profileImagePreview}
                      alt="Profile"
                      fill
                      // Use unoptimized for blob preview URLs and base64
                      // Use Next.js optimisation for Supabase Storage URLs
                      unoptimized={
                        profileImagePreview.startsWith("blob:") ||
                        profileImagePreview.startsWith("data:")
                      }
                      className="object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <span className="text-5xl font-bold text-gray-500 dark:text-gray-400 select-none">
                      {getInitials(user, formData)}
                    </span>
                  )}

                  {/* Camera button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-2 right-2 rounded-full p-1.5 h-8 w-8 shadow-md z-10 bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black"
                    onClick={triggerFileInput}
                    aria-label="Change profile picture"
                  >
                    <Camera className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </Button>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                  />
                </div>

                {/* Profile picture pending indicator */}
                {profilePictureFile && (
                  <p className="text-xs text-center text-[#FF6700] dark:text-[#FF7D33] mb-2">
                    New photo selected — save to upload
                  </p>
                )}

                {/* User Info */}
                <div className="text-center flex-grow flex flex-col justify-center">
                  <h2 className="text-2xl font-bold text-[#3E5641] dark:text-white">
                    {formData.firstName} {formData.lastName}
                  </h2>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-center items-center text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0 text-[#6F7F69] dark:text-gray-500" />
                      <span className="truncate">{formData.email}</span>
                    </div>
                    {formData.phone && (
                      <div className="flex justify-center items-center text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0 text-[#6F7F69] dark:text-gray-500" />
                        <span>{formData.phone}</span>
                      </div>
                    )}
                    {(formData.suburb || formData.city || formData.province) && (
                      <div className="flex justify-center items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-[#6F7F69] dark:text-gray-500" />
                        <span className="truncate">
                          {[formData.suburb, formData.city, formData.province]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Logged in via: {user.loginMethod || "email"}
                  </div>

                  {/* Sign Out */}
                  <div className="mt-6">
                    <Button
                      variant="destructive"
                      onClick={handleSignOutButton}
                      className="w-full"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Right Column: Tabs ────────────────────────────────────── */}
            <div className="lg:w-2/3 flex">
              <Card className="rounded-3xl p-6 w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A]">
                <Tabs defaultValue="personal" className="w-full flex flex-col h-full">
                  <TabsList className="grid grid-cols-2 mb-6 bg-gray-100 dark:bg-[#1F2B20] rounded-lg">
                    <TabsTrigger
                      value="personal"
                      className="data-[state=active]:bg-[#FF6700] dark:data-[state=active]:bg-[#FF7D33] data-[state=active]:text-white rounded-md"
                    >
                      Personal Info
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="data-[state=active]:bg-[#FF6700] dark:data-[state=active]:bg-[#FF7D33] data-[state=active]:text-white rounded-md"
                    >
                      Security
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Personal Info Tab ───────────────────────────────── */}
                  <TabsContent value="personal" className="space-y-4 flex-grow">

                    {personalError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{personalError}</AlertDescription>
                      </Alert>
                    )}

                    {personalSuccess && (
                      <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          {personalSuccess}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Name Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="firstName"
                          className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                        >
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName || ""}
                          onChange={handleInputChange}
                          placeholder="Enter first name"
                          className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSavingPersonal}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="lastName"
                          className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                        >
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName || ""}
                          onChange={handleInputChange}
                          placeholder="Enter last name"
                          className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSavingPersonal}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email || ""}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        disabled={user.loginMethod !== "email" || isSavingPersonal}
                        className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white disabled:opacity-70"
                      />
                      {user.loginMethod !== "email" && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Email cannot be changed for{" "}
                          {user.loginMethod} logins.
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                      >
                        Phone *
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone || ""}
                        onChange={handleInputChange}
                        placeholder="+27 12 345 6789"
                        className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white"
                        disabled={isSavingPersonal}
                      />
                    </div>

                    {/* Suburb */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="suburb"
                        className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                      >
                        Suburb / Area *
                      </Label>
                      <Input
                        id="suburb"
                        name="suburb"
                        value={formData.suburb || ""}
                        onChange={handleInputChange}
                        placeholder="e.g., Green Point"
                        className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white"
                        disabled={isSavingPersonal}
                      />
                    </div>

                    {/* City / Province Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="city"
                          className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                        >
                          City *
                        </Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city || ""}
                          onChange={handleInputChange}
                          placeholder="e.g., Cape Town"
                          className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSavingPersonal}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="province"
                          className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                        >
                          Province *
                        </Label>
                        <Input
                          id="province"
                          name="province"
                          value={formData.province || ""}
                          onChange={handleInputChange}
                          placeholder="e.g., Western Cape"
                          className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSavingPersonal}
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSavePersonalInfo}
                        disabled={isSavingPersonal}
                        className="bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSavingPersonal ? "Saving..." : "Save Personal Info"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── Security Tab ────────────────────────────────────── */}
                  <TabsContent
                    value="security"
                    className="space-y-6 flex-grow flex flex-col"
                  >
                    {securityError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{securityError}</AlertDescription>
                      </Alert>
                    )}

                    {securitySuccess && (
                      <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          {securitySuccess}
                        </AlertDescription>
                      </Alert>
                    )}

                    {user.loginMethod === "email" ? (
                      <>
                        <h3 className="text-lg font-semibold border-b border-[#9FA791]/20 dark:border-[#4A4D45]/20 pb-2 text-[#3E5641] dark:text-white">
                          Change Password
                        </h3>

                        <div className="space-y-3">
                          {/* Current Password */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="currentPassword"
                              className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                            >
                              Current Password
                            </Label>
                            <div className="relative">
                              <Input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => {
                                  setCurrentPassword(e.target.value)
                                  setSecurityError(null)
                                  setSecuritySuccess(null)
                                }}
                                className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white pr-10"
                                disabled={isSavingSecurity}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowCurrentPassword((p) => !p)
                                }
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* New Password */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="newPassword"
                              className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                            >
                              New Password
                            </Label>
                            <div className="relative">
                              <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => {
                                  setNewPassword(e.target.value)
                                  setSecurityError(null)
                                  setSecuritySuccess(null)
                                }}
                                className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white pr-10"
                                disabled={isSavingSecurity}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword((p) => !p)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">
                              Must be at least 6 characters
                            </p>
                          </div>

                          {/* Confirm New Password */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="confirmPassword"
                              className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                            >
                              Confirm New Password
                            </Label>
                            <div className="relative">
                              <Input
                                id="confirmPassword"
                                type={
                                  showConfirmPassword ? "text" : "password"
                                }
                                value={confirmPassword}
                                onChange={(e) => {
                                  setConfirmPassword(e.target.value)
                                  setSecurityError(null)
                                  setSecuritySuccess(null)
                                }}
                                className="border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white pr-10"
                                disabled={isSavingSecurity}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowConfirmPassword((p) => !p)
                                }
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Update Password Button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={handleSaveSecurityChanges}
                            disabled={
                              isSavingSecurity ||
                              (!currentPassword && !newPassword)
                            }
                            className="bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSavingSecurity
                              ? "Updating..."
                              : "Update Password"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      // OAuth users cannot change password here
                      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-[#1F2B20]">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Password management is handled through your{" "}
                          <span className="font-medium capitalize">
                            {user.loginMethod}
                          </span>{" "}
                          account.
                        </p>
                      </div>
                    )}

                    {/* Account Security Section */}
                    <div className="space-y-4 pt-4 mt-auto">
                      <h3 className="text-lg font-semibold border-b border-[#9FA791]/20 dark:border-[#4A4D45]/20 pb-2 text-[#3E5641] dark:text-white">
                        Account Security
                      </h3>
                      <div className="flex items-center justify-between p-4 border border-[#9FA791]/20 dark:border-[#4A4D45]/20 rounded-lg bg-gray-50 dark:bg-[#1F2B20]">
                        <div>
                          <p className="font-medium text-[#3E5641] dark:text-white">
                            Two-Factor Authentication
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add an extra layer of security (coming soon).
                          </p>
                        </div>
                        <Button variant="outline" disabled>
                          Enable
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}