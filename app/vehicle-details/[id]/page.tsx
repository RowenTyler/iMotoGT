"use client"

import React from "react"
import { notFound, useRouter } from "next/navigation"
import { useEffect, useRef, useState, useMemo } from "react"   // ✅ useMemo added
import { Header } from "@/components/ui/header"
import { useUser } from "@/components/UserContext"
import VehicleDetails from "@/components/vehicle-details"
import { useVehicleContext, useVehicleList } from "@/components/VehicleProvider"
import { useNavigationCache } from "@/components/NavigationCacheHandler"
import { vehicleService } from "@/lib/vehicle-service"
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
  // `params` can be a Promise in Client Components; unwrap with React.use() when available
  const resolvedParams = (React as any).use ? (React as any).use(params) : params

  const router = useRouter()
  const { user, toggleSaveVehicle, savedVehicles: savedVehiclesSet } = useUser()
  
  // Stabilized navigation cache
  const { savePageState, restorePageState } = useNavigationCache()
  
  // Vehicle context
  const { 
    getCachedVehicle, 
    saveForCurrentRoute,
    getCurrentRouteKey,
    addToCache
  } = useVehicleContext()
  
  // Local state
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isInitialMountRef = useRef(true)

  // ------------------------------------------------------------------
  // 1. Fetch vehicle data (replaces broken useVehicle)
  // ------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchVehicle = async () => {
      // Try cache first
      const cached = getCachedVehicle?.(resolvedParams.id)
      if (cached) {
        console.log(`✅ [VehicleDetailsPage] Using cached vehicle: ${cached.make} ${cached.model}`)
        if (isMounted) {
          setVehicle(cached)
          setLoading(false)
          setError(null)
        }
        return
      }

      // Fetch from API
      try {
        console.log(`🔍 [VehicleDetailsPage] Fetching vehicle ${resolvedParams.id} from API...`)
        const res = await fetch(`/api/vehicles/${resolvedParams.id}`, { signal: controller.signal })

        if (!res.ok) {
          // Attempt client-side cache-aware fallback for 404s
          if (res.status === 404) {
            console.warn(`⚠️ [VehicleDetailsPage] API returned 404, trying client cache fallback for ${resolvedParams.id}`)
            try {
              const fallback = await vehicleService.getVehicleById(resolvedParams.id)
              if (fallback) {
                if (isMounted) {
                  setVehicle(fallback)
                  setLoading(false)
                  setError(null)
                }
                return
              }
            } catch (fbErr) {
              console.error("❌ Fallback vehicleService failed:", fbErr)
            }
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        
        if (isMounted) {
          setVehicle(data)
          setLoading(false)
          setError(null)
          
          // Safe calls – context may not provide these functions
          if (typeof addToCache === 'function') {
            addToCache(resolvedParams.id, data, 'vehicleDetails')
          }
          if (typeof saveForCurrentRoute === 'function') {
            saveForCurrentRoute(data, 'detail')
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && isMounted) {
          console.error(`❌ [VehicleDetailsPage] Failed to fetch vehicle:`, err)
          setError(err.message || 'Failed to load vehicle')
          setLoading(false)
        }
      }
    }

    fetchVehicle()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [resolvedParams.id, getCachedVehicle, addToCache, saveForCurrentRoute])

  // ------------------------------------------------------------------
  // 2. Restore page state from navigation cache
  // ------------------------------------------------------------------
  useEffect(() => {
    console.log(`🔍 [VehicleDetailsPage] Mounted for vehicle ID: ${resolvedParams.id}`)
    
    const cachedState = restorePageState?.()
    if (cachedState) {
      console.log(`✅ [VehicleDetailsPage] Restored cached state for route`)
    }
    
    const routeKey = getCurrentRouteKey?.()
    console.log(`📍 [VehicleDetailsPage] Current route key: ${routeKey}`)
    
    return () => {
      console.log(`👋 [VehicleDetailsPage] Unmounting vehicle: ${resolvedParams.id}`)
    }
  }, [resolvedParams.id, restorePageState, getCurrentRouteKey])

  // ------------------------------------------------------------------
  // 3. Save vehicle to caches when loaded
  // ------------------------------------------------------------------
  useEffect(() => {
    if (vehicle && !loading) {
      console.log(`💾 [VehicleDetailsPage] Saving vehicle to cache: ${vehicle.id}`)
      
      if (typeof addToCache === 'function') {
        addToCache(resolvedParams.id, vehicle, 'vehicleDetails')
      }
      if (typeof saveForCurrentRoute === 'function') {
        saveForCurrentRoute(vehicle, 'detail')
      }
      if (typeof savePageState === 'function') {
        savePageState({
          vehicleId: vehicle.id,
          vehicle: vehicle,
          timestamp: Date.now()
        })
      }
    }
  }, [vehicle, loading, resolvedParams.id, addToCache, saveForCurrentRoute, savePageState])

  // ------------------------------------------------------------------
  // 4. Mark initial mount as done
  // ------------------------------------------------------------------
  useEffect(() => {
    isInitialMountRef.current = false
  }, [])

  // ------------------------------------------------------------------
  // 5. Fetch similar vehicles (unchanged)
  // ------------------------------------------------------------------
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

  const { 
    data: similarVehiclesData, 
    loading: similarLoading 
  } = useVehicleList(
    `similar:${resolvedParams.id}`,
    fetchSimilarVehicles,
    {
      enabled: !!vehicle,
      maxAge: 10 * 60 * 1000,
    }
  )

  // ------------------------------------------------------------------
  // 6. Back navigation with state preservation
  // ------------------------------------------------------------------
  const handleBack = () => {
    console.log(`⏪ [VehicleDetailsPage] Back button clicked, saving current state`)
    if (vehicle && typeof savePageState === 'function') {
      savePageState({
        vehicleId: resolvedParams.id,
        vehicle: vehicle,
        timestamp: Date.now()
      })
    }
    router.back()
  }

  // ------------------------------------------------------------------
  // 7. Prepare savedCars array for VehicleDetails
  //    (VehicleDetails expects an array of vehicles, but our context gives a Set of IDs)
  // ------------------------------------------------------------------
  const savedCarsArray = useMemo(() => {
    if (!vehicle) return []
    // savedVehiclesSet is a Set of vehicle IDs (from UserContext)
    const isSaved = savedVehiclesSet?.has?.(vehicle.id) || false
    return isSaved ? [vehicle] : []
  }, [vehicle, savedVehiclesSet])

  // ------------------------------------------------------------------
  // 8. Not found / error handling
  // ------------------------------------------------------------------
  if (!loading && !vehicle && error) {
    console.error("❌ [VehicleDetailsPage] Vehicle not found or error:", error)
    return notFound()
  }

  // ------------------------------------------------------------------
  // 9. Loading skeleton (identical to original)
  // ------------------------------------------------------------------
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
            if (typeof savePageState === 'function') {
              savePageState({ vehicleId: resolvedParams.id, timestamp: Date.now() })
            }
            router.push("/login")
          }}
        />
        <div className="pt-16 md:pt-20 container mx-auto px-4">
          <div className="mb-6">
            <Skeleton className="h-8 w-24" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Skeleton className="h-[400px] w-full rounded-lg mb-4" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded" />
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
              
              <div className="space-y-2 mt-6">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              
              <div className="flex gap-4 mt-6">
                <Skeleton className="h-12 flex-1 rounded-lg" />
                <Skeleton className="h-12 flex-1 rounded-lg" />
              </div>
            </div>
          </div>
          
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

  // ------------------------------------------------------------------
  // 10. Navigation handlers with safe cache calls
  // ------------------------------------------------------------------
  const navigationHandlers = {
    onLoginClick: () => {
      if (typeof savePageState === 'function') {
        savePageState({
          vehicleId: resolvedParams.id,
          vehicle: vehicle,
          timestamp: Date.now()
        })
      }
      router.push("/login")
    },
    onDashboardClick: () => {
      if (typeof savePageState === 'function') {
        savePageState({
          vehicleId: resolvedParams.id,
          vehicle: vehicle,
          timestamp: Date.now()
        })
      }
      router.push("/dashboard")
    },
    onGoHome: () => {
      if (typeof savePageState === 'function') {
        savePageState({
          vehicleId: resolvedParams.id,
          vehicle: vehicle,
          timestamp: Date.now()
        })
      }
      router.push("/home")
    },
    onShowAllCars: () => {
      if (typeof savePageState === 'function') {
        savePageState({
          vehicleId: resolvedParams.id,
          vehicle: vehicle,
          timestamp: Date.now()
        })
      }
      router.push("/results")
    },
    onGoToSellPage: () => {
      if (typeof savePageState === 'function') {
        savePageState({
          vehicleId: resolvedParams.id,
          vehicle: vehicle,
          timestamp: Date.now()
        })
      }
      router.push("/upload-vehicle")
    },
    onSignOut: () => {
      if (typeof savePageState === 'function') {
        savePageState({
          vehicleId: resolvedParams.id,
          timestamp: Date.now()
        })
      }
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
          savedCars={savedCarsArray}        // ✅ now an array, .some works
            onSaveCar={() => {
            toggleSaveVehicle(vehicle)
            if (typeof addToCache === 'function') {
              addToCache(resolvedParams.id, vehicle, 'vehicleDetails')
            }
          }}
          similarVehicles={similarVehiclesData?.vehicles || []}
          similarVehiclesLoading={similarLoading}
          onViewSimilarVehicle={(similarVehicle) => {
            if (typeof savePageState === 'function') {
              savePageState({
                vehicleId: resolvedParams.id,
                vehicle: vehicle,
                timestamp: Date.now()
              })
            }
            router.push(`/vehicle-details/${similarVehicle.id}`)
          }}
        />
      </div>
      
      {/* Minimal dev cache indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-gray-900/80 text-white p-2 rounded-lg text-xs">
            <div>Vehicle Cache: {vehicle ? '✅ Loaded' : '⏳ Loading'}</div>
            <div>Similar Vehicles: {similarVehiclesData?.vehicles?.length || 0}</div>
          </div>
        </div>
      )}
    </div>
  )
}
