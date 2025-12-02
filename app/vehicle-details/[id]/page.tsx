"use client"

import { notFound } from "next/navigation"
import { useEffect, useState } from "react"
import VehicleDetails from "@/components/vehicle-details"
import VehicleDetailsStickyHeader from "@/components/vehicle-details-sticky-header"
import { vehicleService } from "@/lib/vehicle-service"
import { useUser } from "@/components/UserContext"
import type { Vehicle } from "@/types/vehicle"

interface VehicleDetailsPageProps {
  params: {
    id: string
  }
}

export default function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
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
  }, [user?.id, savedVehicles]) // Reload when savedVehicles Set changes

  useEffect(() => {
    async function fetchVehicle() {
      try {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <div className="pt-20 flex items-center justify-center min-h-[50vh]">
          <p className="text-[#3E5641] dark:text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!vehicle) {
    return notFound()
  }

  const isSaved = savedVehicles.has(vehicle.id)

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
      <VehicleDetailsStickyHeader
        vehicle={vehicle}
        isSaved={isSaved}
        onToggleSave={() => toggleSaveVehicle(vehicle)}
        user={user}
      />

      <div className="pt-24 md:pt-28">
        <VehicleDetails
          vehicle={vehicle}
          onBack={() => window.history.back()}
          user={user}
          savedCars={savedVehiclesData}
          onSaveCar={() => toggleSaveVehicle(vehicle)}
        />
      </div>
    </div>
  )
}
