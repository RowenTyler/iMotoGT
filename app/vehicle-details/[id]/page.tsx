"use client"

import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import VehicleDetails from "@/components/vehicle-details"
import { vehicleService } from "@/lib/vehicle-service"
import { CacheManager, CACHE_CONFIG } from "@/lib/cache-manager"
import { Header } from "@/components/ui/header"
import { useUser } from "@/components/UserContext"
import type { Vehicle } from "@/types/vehicle"

interface VehicleDetailsPageProps {
  params: {
    id: string
  }
}

export const dynamic = 'force-dynamic'

export default function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
  const router = useRouter()
  const { user, savedVehicles, toggleSaveVehicle } = useUser()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedVehiclesData, setSavedVehiclesData] = useState<Vehicle[]>([])

  // Load saved vehicles data
  useEffect(() => {
    const loadSavedVehiclesData = async () => {
      if (!user?.id) return
      
      try {
        console.log("🔄 VehicleDetailsPage: Loading saved vehicles data")
        const savedData = await vehicleService.getSavedVehicles(user.id)
        console.log("✅ VehicleDetailsPage: Loaded saved vehicles:", savedData)
        setSavedVehiclesData(savedData)
      } catch (error) {
        console.error("❌ VehicleDetailsPage: Error loading saved vehicles:", error)
        setSavedVehiclesData([])
      }
    }

    loadSavedVehiclesData()
  }, [user?.id]) // Only reload when user changes, not on every save toggle

  useEffect(() => {
    async function fetchVehicle() {
      try {
        // Check if vehicle exists in the vehicles list cache first
        const cachedVehicles = CacheManager.get<Vehicle[]>(`${CACHE_CONFIG.VEHICLES_KEY}_active`)
        if (cachedVehicles) {
          const cachedVehicle = cachedVehicles.find(v => v.id === params.id)
          if (cachedVehicle) {
            setVehicle(cachedVehicle)
            setLoading(false)
            return
          }
        }
        
        // Fallback to fetching from service (which also checks cache)
        const data = await vehicleService.getVehicleById(params.id)
        if (!data) {
          notFound()
        }
        setVehicle(data)
      } catch (error) {
        console.error("Error fetching vehicle:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchVehicle()
  }, [params.id])

  // Debug logging
  useEffect(() => {
    console.log("🔍 VehicleDetailsPage - savedVehiclesData:", savedVehiclesData)
    console.log("🔍 VehicleDetailsPage - user:", user)
  }, [savedVehiclesData, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <Header user={user} transparent={false} />
        <div className="pt-16 md:pt-20 flex items-center justify-center min-h-[50vh]">
          <p className="text-[#3E5641] dark:text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!vehicle) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
      <Header
        user={user}
        onLoginClick={() => router.push("/login")}
        onDashboardClick={() => router.push("/dashboard")}
        onGoHome={() => router.push("/home")}
        onShowAllCars={() => router.push("/results")}
        onGoToSellPage={() => router.push("/upload-vehicle")}
        onSignOut={() => router.push("/login")}
        transparent={false}
      />
      <div className="pt-16 md:pt-20">
        {/* FIXED: Pass actual saved vehicles data instead of empty array */}
        <VehicleDetails
          vehicle={vehicle}
          onBack={() => router.back()}
          user={user}
          savedCars={savedVehiclesData} // ← THIS IS THE CRITICAL FIX
          onSaveCar={() => toggleSaveVehicle(vehicle)}
        />
      </div>
    </div>
  )
}
