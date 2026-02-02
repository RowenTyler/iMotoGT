"use client"

import { notFound, useRouter } from "next/navigation"
import { Header } from "@/components/ui/header"
import { useUser } from "@/components/UserContext"
import VehicleDetails from "@/components/vehicle-details"
import { useVehicle } from "@/context/VehicleProvider" // Updated import
import { Skeleton } from "@/components/ui/skeleton" // Add a skeleton component for loading

interface VehicleDetailsPageProps {
  params: {
    id: string
  }
}

// Remove dynamic = 'force-dynamic' since we're using client-side caching
// export const dynamic = 'force-dynamic'

export default function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
  const router = useRouter()
  const { user, toggleSaveVehicle, savedVehicles: savedVehiclesData } = useUser()
  
  // Use the new useVehicle hook with caching
  const { vehicle, loading, error } = useVehicle(params.id)

  // Handle not found state
  if (!loading && !vehicle && error) {
    console.error("Vehicle not found or error:", error)
    return notFound()
  }

  // Handle loading state with better UI
  if (loading && !vehicle) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <Header user={user} transparent={false} />
        <div className="pt-16 md:pt-20 container mx-auto px-4">
          {/* Back button skeleton */}
          <Skeleton className="h-8 w-24 mb-6" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image skeleton */}
            <div>
              <Skeleton className="h-[400px] w-full rounded-lg mb-4" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded" />
                ))}
              </div>
            </div>
            
            {/* Details skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              
              {/* Specs grid skeleton */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
              
              {/* Description skeleton */}
              <div className="space-y-2 mt-6">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              
              {/* Button skeletons */}
              <div className="flex gap-4 mt-6">
                <Skeleton className="h-12 flex-1 rounded-lg" />
                <Skeleton className="h-12 flex-1 rounded-lg" />
              </div>
            </div>
          </div>
          
          {/* Similar vehicles skeleton */}
          <div className="mt-12">
            <Skeleton className="h-6 w-1/4 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          </div>
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
