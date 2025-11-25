"use client"

import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import VehicleDetails from "@/components/vehicle-details"
import { vehicleService } from "@/lib/vehicle-service"
import { Header } from "@/components/ui/header"
import { useUser } from "@/components/UserContext"
import type { Vehicle } from "@/types/vehicle"

interface VehicleDetailsPageProps {
  params: {
    id: string
  }
}

export default function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
  const router = useRouter()
  const { user, savedVehicles, toggleSaveVehicle } = useUser()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

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
        <VehicleDetails
          vehicle={vehicle}
          onBack={() => router.back()}
          user={user}
          savedCars={[]}
          onSaveCar={() => toggleSaveVehicle(vehicle)}
        />
      </div>
    </div>
  )
}
