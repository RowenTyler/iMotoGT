"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/components/UserContext"
import Dashboard from "@/components/dashboard"
// Remove Header import, it is handled inside Dashboard
import type { Vehicle } from "@/types/vehicle"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
    router.push(`/vehicle/${vehicle.id}/edit`)
  }

  const handleDeleteListedCar = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) {
      return
    }

    try {
      setIsDeletingVehicle(vehicleId)
      await deleteListedVehicle(vehicleId)
      await refreshVehicles()
    } catch (error: any) {
      alert(`Failed to delete listing: ${error.message}`)
    } finally {
      setIsDeletingVehicle(null)
    }
  }

  const handleViewListedCar = (vehicle: Vehicle) => {
    router.push(`/vehicle-details/${vehicle.id}`)
  }

  const handleViewSavedCar = (vehicle: Vehicle) => {
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

  // FIXED: Removed <Header> and <main> wrapper. 
  // Dashboard is now the sole root element controlling the height.
  return (
    <Dashboard
      user={user}
      listedCars={Array.isArray(listedVehicles) ? listedVehicles : []}
      savedCars={Array.isArray(savedVehicles) ? savedVehicles : []}
      onEditListedCar={handleEditListedCar}
      onDeleteListedCar={handleDeleteListedCar}
      onViewDetails={handleViewListedCar} // Mapped to the generic detail viewer
      onLoginClick={() => router.push("/login")}
      onGoHome={() => router.push("/")}
      onShowAllCars={() => router.push("/cars")}
      onGoToSellPage={() => router.push("/upload-vehicle")}
      onViewProfileSettings={() => router.push("/settings")}
      onViewUploadVehicle={() => router.push("/upload-vehicle")}
      onBack={() => router.back()}
      onSaveCar={() => {}} // Add appropriate handler if needed
      onNavigateToUpload={() => router.push("/upload-vehicle")}
    />
  )
}
