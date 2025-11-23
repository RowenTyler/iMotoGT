"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/components/UserContext"
import Dashboard from "@/components/dashboard"
import type { Vehicle } from "@/types/vehicle"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Ensure deleteListedVehicle is available from your context
  const { user, listedVehicles = [], savedVehicles = [], deleteListedVehicle, refreshVehicles, isLoading } = useUser()
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false)
  const [isDeletingVehicle, setIsDeletingVehicle] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("⚠️ No user found, redirecting to login")
      router.push("/login?redirect=/dashboard")
    }

    const isSignup = searchParams.get("signup")
    if (isSignup === "true" && user) {
      setShowVerificationPrompt(true)
    }
  }, [user, isLoading, router, searchParams])

  const handleEditListedCar = (vehicle: Vehicle) => {
    console.log("✏️ Editing vehicle:", vehicle.id)
    router.push(`/vehicle/${vehicle.id}/edit`)
  }

  // FIXED: Now accepts (vehicleId, reason) and removes the native window.confirm
  const handleDeleteListedCar = async (vehicleId: string, reason?: string) => {
    try {
      console.log("🗑️ Dashboard: Soft deleting vehicle:", vehicleId, "Reason:", reason)
      setIsDeletingVehicle(vehicleId)

      // Pass the reason to the backend function to trigger soft delete
      await deleteListedVehicle(vehicleId, reason)
      console.log("✅ Dashboard: Vehicle deleted successfully")

      // Refresh vehicles to ensure UI is in sync
      await refreshVehicles()
    } catch (error: any) {
      console.error("❌ Dashboard: Error deleting vehicle:", error)
      alert(`Failed to delete listing: ${error.message}`)
    } finally {
      setIsDeletingVehicle(null)
    }
  }

  const handleViewListedCar = (vehicle: Vehicle) => {
    console.log("👁️ Viewing vehicle:", vehicle.id)
    router.push(`/vehicle-details/${vehicle.id}`)
  }

  const handleViewSavedCar = (vehicle: Vehicle) => {
    console.log("👁️ Viewing saved vehicle:", vehicle.id)
    router.push(`/vehicle-details/${vehicle.id}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#6F7F69]">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Dashboard is the sole wrapper, preventing the double-scroll issue
  return (
    <Dashboard
      user={user}
      listedCars={Array.isArray(listedVehicles) ? listedVehicles : []}
      savedCars={Array.isArray(savedVehicles) ? savedVehicles : []}
      onEditListedCar={handleEditListedCar}
      onDeleteListedCar={handleDeleteListedCar}
      onViewDetails={handleViewListedCar}
      onLoginClick={() => router.push("/login")}
      onGoHome={() => router.push("/")}
      onShowAllCars={() => router.push("/cars")}
      onGoToSellPage={() => router.push("/upload-vehicle")}
      onViewProfileSettings={() => router.push("/settings")}
      onViewUploadVehicle={() => router.push("/upload-vehicle")}
      onBack={() => router.back()}
      onSaveCar={() => {}}
      onNavigateToUpload={() => router.push("/upload-vehicle")}
    />
  )
}
