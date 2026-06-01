"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import LikedCarsPage from "@/components/liked-cars-page"
import { useEffect, useState } from "react"
import { vehicleService } from "@/lib/vehicle-service"
import type { Vehicle } from "@/types/vehicle"

export const dynamic = "force-dynamic"

export default function LikedCarsRoute() {
  const router = useRouter()
  const { user, authUser, isLoading, toggleSaveVehicle } = useUser()
  const [likedVehicles, setLikedVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)

  useEffect(() => {
    if (!isLoading && !authUser) {
      router.push("/login?redirect=/liked-cars-page")
    }
  }, [authUser, isLoading, router])

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      try {
        setLoadingVehicles(true)
        const saved = await vehicleService.getSavedVehicles(user.id)
        setLikedVehicles(saved)
      } catch (err) {
        console.error("Failed to load liked vehicles:", err)
        setLikedVehicles([])
      } finally {
        setLoadingVehicles(false)
      }
    }
    load()
  }, [user?.id])

  if (isLoading || loadingVehicles) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading your saved cars...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <LikedCarsPage
      likedVehicles={likedVehicles}
      onBack={() => router.push("/dashboard")}
      user={user}
      onGoHome={() => router.push("/home")}
      onShowAllCars={() => router.push("/results")}
      onNavigateToUpload={() => router.push("/upload-vehicle")}
      onSignOut={() => router.push("/login")}
      onViewDetails={(vehicle) => router.push(`/vehicle-details/${vehicle.id}`)}
    />
  )
}
