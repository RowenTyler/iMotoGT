"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/components/UserContext"
import Dashboard from "@/components/dashboard"
import type { Vehicle } from "@/types/vehicle"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { 
    user, 
    listedVehicles = [], 
    savedVehicles, // This is a Set<string> of IDs
    deleteListedVehicle, 
    refreshVehicles, 
    isLoading,
    refreshUserProfile // We'll use this to reload saved vehicles
  } = useUser()
  
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false)
  const [isDeletingVehicle, setIsDeletingVehicle] = useState<string | null>(null)
  const [savedVehiclesData, setSavedVehiclesData] = useState<Vehicle[]>([])

  // Load saved vehicles data
  useEffect(() => {
    const loadSavedVehiclesData = async () => {
      if (!user?.id) return
      
      try {
        console.log("🔄 DashboardPage: Loading saved vehicles data for user:", user.id)
        // We need to fetch the actual vehicle objects for the saved IDs
        const { getSavedVehicles } = await import("@/lib/vehicle-service")
        const savedData = await getSavedVehicles(user.id)
        console.log("✅ DashboardPage: Loaded saved vehicles:", savedData)
        setSavedVehiclesData(savedData)
      } catch (error) {
        console.error("❌ DashboardPage: Error loading saved vehicles:", error)
        setSavedVehiclesData([])
      }
    }

    loadSavedVehiclesData()
  }, [user?.id, savedVehicles]) // Reload when savedVehicles Set changes

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

  const handleDeleteListedCar = async (vehicleId: string, reason?: string) => {
    try {
      setIsDeletingVehicle(vehicleId)
      console.log("🗑️ Dashboard requesting delete:", vehicleId, "Reason:", reason)
      
      await deleteListedVehicle(vehicleId, reason)
      
      console.log("✅ Delete request successful")
      await refreshVehicles()
    } catch (error: any) {
      console.error("❌ Delete failed:", error)
      alert(`Failed to delete listing: ${error.message}`)
    } finally {
      setIsDeletingVehicle(null)
    }
  }

  const handleViewListedCar = (vehicle: Vehicle) => {
    router.push(`/vehicle-details/${vehicle.id}`)
  }

  // Refresh saved vehicles when needed
  const refreshSavedVehicles = async () => {
    if (user?.id) {
      try {
        const { getSavedVehicles } = await import("@/lib/vehicle-service")
        const savedData = await getSavedVehicles(user.id)
        setSavedVehiclesData(savedData)
      } catch (error) {
        console.error("Error refreshing saved vehicles:", error)
      }
    }
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
      savedCars={savedVehiclesData} // Pass the actual vehicle objects
      onEditListedCar={handleEditListedCar}
      onDeleteListedCar={handleDeleteListedCar}
      onViewDetails={handleViewListedCar}
      onLoginClick={() => router.push("/login")}
      onGoHome={() => router.push("/")}
      onShowAllCars={() => router.push("/results")}
      onGoToSellPage={() => router.push("/upload-vehicle")}
      onViewProfileSettings={() => router.push("/settings")}
      onViewUploadVehicle={() => router.push("/upload-vehicle")}
      onBack={() => router.back()}
      onSaveCar={refreshSavedVehicles} // Refresh when a vehicle is saved
      onNavigateToUpload={() => router.push("/upload-vehicle")}
    />
  )
}
