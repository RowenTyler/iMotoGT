"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import type { UserProfile } from "@/types/user"

interface UploadVehicleProps {
  onSaveProfile?: (profile: Partial<UserProfile>) => Promise<void>
  refreshUserProfile?: () => Promise<void>
  initialUser?: UserProfile | null
}

export default function UploadVehicle({
  onSaveProfile,
  refreshUserProfile,
  initialUser,
}: UploadVehicleProps) {
  const [sellerFormData, setSellerFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    suburb: "",
    city: "",
    province: "",
    profilePic: "",
  })

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialUser) {
      setSellerFormData({
        firstName: initialUser.firstName || "",
        lastName: initialUser.lastName || "",
        phone: initialUser.phone || "",
        suburb: initialUser.suburb || "",
        city: initialUser.city || "",
        province: initialUser.province || "",
        profilePic: initialUser.profilePic || "",
      })
    }
  }, [initialUser])

  const handleSellerInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target
    setSellerFormData((prev) => ({ ...prev, [name]: value }))
    setSubmitError(null)
  }

  const handleSaveSellerInfo = async () => {
    try {
      setIsSaving(true)
      setSubmitError(null)

      const updatedProfile: Partial<UserProfile> = {
        firstName: sellerFormData.firstName,
        lastName: sellerFormData.lastName,
        phone: sellerFormData.phone,
        suburb: sellerFormData.suburb,
        city: sellerFormData.city,
        province: sellerFormData.province,
        profilePic: sellerFormData.profilePic,
      }

      if (onSaveProfile) {
        await onSaveProfile(updatedProfile)
      }

      if (refreshUserProfile) {
        await refreshUserProfile()
      }

      toast.success("Seller information saved successfully.")
      console.log("✅ Seller info saved successfully.")
    } catch (error) {
      console.error("❌ Error saving seller info:", error)
      setSubmitError("Failed to save seller information. Please try again.")
      toast.error("Failed to save seller information.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Seller Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={sellerFormData.firstName}
                onChange={handleSellerInputChange}
              />
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={sellerFormData.lastName}
                onChange={handleSellerInputChange}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={sellerFormData.phone}
                onChange={handleSellerInputChange}
              />
            </div>

            <div>
              <Label htmlFor="suburb">Suburb</Label>
              <Input
                id="suburb"
                name="suburb"
                value={sellerFormData.suburb}
                onChange={handleSellerInputChange}
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={sellerFormData.city}
                onChange={handleSellerInputChange}
              />
            </div>

            <div>
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                name="province"
                value={sellerFormData.province}
                onChange={handleSellerInputChange}
              />
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}

          <div className="pt-4 flex justify-end">
            <Button
              onClick={handleSaveSellerInfo}
              disabled={isSaving}
              className="min-w-[140px]"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
