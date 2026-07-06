"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import LikedCarsPage from "@/components/liked-cars-page"
import { VehicleCardSkeleton } from "@/components/skeletons"
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
      <div className="min-h-screen animate-pulse">
        <div className="pt-20 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div className="h-10 w-40 bg-muted rounded" />
            <div className="h-8 w-64 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <VehicleCardSkeleton count={6} />
          </div>
        </div>
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
