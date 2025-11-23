"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/components/UserContext"
import Dashboard from "@/components/dashboard"
import type { Vehicle } from "@/types/vehicle"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Added updateListedVehicle to destructuring to handle soft delete (status update)
  const { 
    user, 
    listedVehicles = [], 
    savedVehicles = [], 
    deleteListedVehicle, 
    updateListedVehicle, // <--- Using this for soft delete
    refreshVehicles, 
    isLoading 
  } = useUser()
  
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

  // FIXED: Performs a Soft Delete by updating status to 'deleted'
  const handleDeleteListedCar = async (vehicleId: string, reason?: string) => {
    try {
      console.log("🗑️ Dashboard: Soft deleting vehicle:", vehicleId, "Reason:", reason)
      setIsDeletingVehicle(vehicleId)

      // SOFT DELETE STRATEGY:
      // Since your table has a 'status' column, we UPDATE it to 'deleted' instead of deleting the row.
      if (updateListedVehicle) {
        await updateListedVehicle(vehicleId, { 
          status: 'deleted', 
          deletionReason: reason // Passing the reason for data purposes
        })
      } else {
        // Fallback: If no update function, try delete with payload (if supported)
        console.warn("updateListedVehicle not found, attempting delete with reason payload")
        await deleteListedVehicle(vehicleId, { reason })
      }

      console.log("✅ Dashboard: Vehicle soft deleted successfully")
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
