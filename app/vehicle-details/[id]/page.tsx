"use client"

import { notFound, useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { Header } from "@/components/ui/header"
import { useUser } from "@/components/UserContext"
import VehicleDetails from "@/components/vehicle-details"
import { useVehicle, useVehicleContext, useVehicleList } from "@/components/VehicleProvider"
import { useNavigationCache } from "@/components/NavigationCacheHandler"
import { Skeleton } from "@/components/ui/skeleton"

interface VehicleDetailsPageProps {
  params: {
    id: string
  }
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
  const router = useRouter()
  const { user, toggleSaveVehicle, savedVehicles: savedVehiclesData } = useUser()
  
  // Use the navigation cache for state management
  const { 
    saveCurrentState, 
    restoreCurrentState, 
    saveCurrentScrollPosition, 
    restoreCurrentScrollPosition,
    hasCachedData,
    getCachedData
  } = useNavigationCache()
  
  // Use the vehicle context for cache management
  const { 
    getCachedVehicle, 
    saveForCurrentRoute,
    getCurrentRouteKey,
    addToCache,
    getFromCache
  } = useVehicleContext()
  
  // Use the new useVehicle hook with caching
  const { vehicle, loading, error } = useVehicle(params.id)
  
  // Ref to track if we've restored scroll position
  const scrollRestoredRef = useRef(false)
  // Ref to track initial mount
  const isInitialMountRef = useRef(true)

  // Check for cached vehicle data on mount
  useEffect(() => {
    console.log(`🔍 [VehicleDetailsPage] Mounted for vehicle ID: ${params.id}`)
    
    // Check if we have cached vehicle data
    const cachedVehicle = getCachedVehicle(params.id)
    if (cachedVehicle) {
      console.log(`✅ [VehicleDetailsPage] Found cached vehicle: ${cachedVehicle.make} ${cachedVehicle.model}`)
    }
    
    // Check navigation cache for any saved state
    const cachedState = restoreCurrentState()
    if (cachedState) {
      console.log(`✅ [VehicleDetailsPage] Restored cached state for route`)
    }
    
    // Save current route for back navigation
    const routeKey = getCurrentRouteKey()
    console.log(`📍 [VehicleDetailsPage] Current route key: ${routeKey}`)
    
    return () => {
      console.log(`👋 [VehicleDetailsPage] Unmounting vehicle: ${params.id}`)
    }
  }, [params.id, getCachedVehicle, restoreCurrentState, getCurrentRouteKey])

  // Save vehicle data to cache when loaded
  useEffect(() => {
    if (vehicle && !loading) {
      console.log(`💾 [VehicleDetailsPage] Saving vehicle to cache: ${vehicle.id}`)
      
      // Save to vehicle cache
      addToCache(params.id, vehicle, 'vehicleDetails')
      
      // Save to route cache for navigation
      saveForCurrentRoute(vehicle, 'detail')
      
      // Save to navigation cache for back/forward
      saveCurrentState({
        vehicleId: vehicle.id,
        vehicle: vehicle,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      })
    }
  }, [vehicle, loading, params.id, addToCache, saveForCurrentRoute, saveCurrentState])

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      saveCurrentScrollPosition()
    }
    
    // Throttle scroll events to prevent excessive saves
    let scrollTimeout: NodeJS.Timeout
    const throttledScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(handleScroll, 500)
    }
    
    window.addEventListener('scroll', throttledScroll)
    
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [saveCurrentScrollPosition])

  // Restore scroll position on mount (after initial load)
  useEffect(() => {
    if (!isInitialMountRef.current || loading) return
    
    const timer = setTimeout(() => {
      const scrollPosition = restoreCurrentScrollPosition()
      if (scrollPosition !== null && !scrollRestoredRef.current) {
        console.log(`📐 [VehicleDetailsPage] Restoring scroll position: ${scrollPosition}px`)
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        })
        scrollRestoredRef.current = true
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [loading, restoreCurrentScrollPosition])

  // Mark initial mount as complete after first render
  useEffect(() => {
    isInitialMountRef.current = false
  }, [])

  // Fetch similar vehicles for the "More like this" section
  const fetchSimilarVehicles = async () => {
    if (!vehicle) return { vehicles: [], totalCount: 0, timestamp: Date.now() }
    
    try {
      console.log(`🔍 [VehicleDetailsPage] Fetching similar vehicles for: ${vehicle.make} ${vehicle.model}`)
      const response = await fetch(`/api/vehicles/similar/${vehicle.id}?limit=4`)
      if (!response.ok) throw new Error('Failed to fetch similar vehicles')
      
      const data = await response.json()
      return {
        vehicles: data.vehicles || [],
        totalCount: data.totalCount || 0,
        timestamp: Date.now(),
        filters: { similarTo: vehicle.id }
      }
    } catch (error) {
      console.error('❌ [VehicleDetailsPage] Error fetching similar vehicles:', error)
      return { vehicles: [], totalCount: 0, timestamp: Date.now() }
    }
  }

  // Use vehicle list hook for similar vehicles
  const { 
    data: similarVehiclesData, 
    loading: similarLoading 
  } = useVehicleList(
    `similar:${params.id}`,
    fetchSimilarVehicles,
    {
      enabled: !!vehicle,
      maxAge: 10 * 60 * 1000, // 10 minutes cache for similar vehicles
    }
  )

  // Handle back button with cache preservation
  const handleBack = () => {
    console.log(`⏪ [VehicleDetailsPage] Back button clicked, saving current state`)
    
    // Save final state before navigating back
    saveCurrentState({
      vehicleId: params.id,
      vehicle: vehicle,
      timestamp: Date.now(),
      scrollPosition: window.scrollY
    })
    
    // Save scroll position
    saveCurrentScrollPosition()
    
    // Use router.back() to go back to previous page with cache
    router.back()
  }

  // Handle not found state
  if (!loading && !vehicle && error) {
    console.error("❌ [VehicleDetailsPage] Vehicle not found or error:", error)
    return notFound()
  }

  // Handle loading state with better UI
  if (loading && !vehicle) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <Header 
          user={user} 
          transparent={false}
          onLoginClick={() => router.push("/login")}
          onDashboardClick={() => router.push("/dashboard")}
          onGoHome={() => router.push("/home")}
          onShowAllCars={() => router.push("/results")}
          onGoToSellPage={() => router.push("/upload-vehicle")}
          onSignOut={() => {
            // Save state before logout
            saveCurrentState({
              vehicleId: params.id,
              timestamp: Date.now()
            })
            router.push("/login")
          }}
        />
        <div className="pt-16 md:pt-20 container mx-auto px-4">
          {/* Back button skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-24" />
          </div>
          
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

  // Navigation handlers with cache support
  const navigationHandlers = {
    onLoginClick: () => {
      saveCurrentState({
        vehicleId: params.id,
        vehicle: vehicle,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      })
      router.push("/login")
    },
    onDashboardClick: () => {
      saveCurrentState({
        vehicleId: params.id,
        vehicle: vehicle,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      })
      router.push("/dashboard")
    },
    onGoHome: () => {
      saveCurrentState({
        vehicleId: params.id,
        vehicle: vehicle,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      })
      router.push("/home")
    },
    onShowAllCars: () => {
      saveCurrentState({
        vehicleId: params.id,
        vehicle: vehicle,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      })
      router.push("/results")
    },
    onGoToSellPage: () => {
      saveCurrentState({
        vehicleId: params.id,
        vehicle: vehicle,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      })
      router.push("/upload-vehicle")
    },
    onSignOut: () => {
      saveCurrentState({
        vehicleId: params.id,
        timestamp: Date.now()
      })
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
      <Header
        user={user}
        {...navigationHandlers}
        transparent={false}
      />
      <div className="pt-16 md:pt-20">
        <VehicleDetails
          vehicle={vehicle}
          onBack={handleBack}
          user={user}
          savedCars={savedVehiclesData}
          onSaveCar={() => {
            toggleSaveVehicle(vehicle)
            // Save to cache after saving
            addToCache(params.id, vehicle, 'vehicleDetails')
          }}
          similarVehicles={similarVehiclesData?.vehicles || []}
          similarVehiclesLoading={similarLoading}
          onViewSimilarVehicle={(similarVehicle) => {
            // Save current state before navigating to similar vehicle
            saveCurrentState({
              vehicleId: params.id,
              vehicle: vehicle,
              timestamp: Date.now(),
              scrollPosition: window.scrollY
            })
            // Navigate to the similar vehicle
            router.push(`/vehicle/${similarVehicle.id}`)
          }}
        />
      </div>
      
      {/* Cache status indicator (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-gray-900/80 text-white p-2 rounded-lg text-xs">
            <div>Vehicle Cache: {vehicle ? '✅ Loaded' : '⏳ Loading'}</div>
            <div>Similar Vehicles: {similarVehiclesData?.vehicles?.length || 0}</div>
            <div>Scroll Restored: {scrollRestoredRef.current ? '✅' : '❌'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
