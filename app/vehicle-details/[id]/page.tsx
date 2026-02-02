"use client"

import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import VehicleDetails from "@/components/vehicle-details"
import { Header } from "@/components/ui/header"
import { useUser } from "@/components/UserContext"
import { useVehicleContext } from "@/components/VehicleProvider"
import type { Vehicle } from "@/types/vehicle"

interface VehicleDetailsPageProps {
  params: {
    id: string
  }
}

export const dynamic = 'force-dynamic'

export default function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
  const router = useRouter()
  const { user, toggleSaveVehicle, savedVehicles: savedVehiclesData } = useUser()
  const { getVehicleById, loadVehicles } = useVehicleContext()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchVehicle() {
      setLoading(true)
      try {
        const v = await getVehicleById(params.id)
        if (!v) {
          notFound()
          return
        }
        if (!cancelled) setVehicle(v)
      } catch (error) {
        console.error("Error fetching vehicle:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchVehicle()

    loadVehicles().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [params.id, getVehicleById, loadVehicles])

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
          savedCars={savedVehiclesData}
          onSaveCar={() => toggleSaveVehicle(vehicle)}
        />
      </div>
    </div>
  )
}
