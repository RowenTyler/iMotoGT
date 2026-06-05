"use client"

import React from "react"
import { notFound, useRouter } from "next/navigation"
import { useEffect, useRef, useState, useMemo } from "react"
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

// Helper: check if vehicle has complete seller contact information
const hasCompleteSellerInfo = (v: any): boolean => {
  return v && v.sellerName && v.sellerEmail && v.sellerPhone && v.sellerSuburb
}

export default function VehicleDetailsClientPage({ params }: VehicleDetailsPageProps) {
  // `params` can be a Promise in Client Components; unwrap with React.use() when available
  const resolvedParams = (React as any).use ? (React as any).use(params) : params

  const router = useRouter()
  // BUG FIX: also destructure authUser and isLoading for fast user resolution
  const { user, authUser, isLoading: userLoading, toggleSaveVehicle, savedVehicles: savedVehiclesSet } = useUser()
  
  // Stabilized navigation cache
  const { savePageState, restorePageState } = useNavigationCache()
  
  // Vehicle context
  const { 
    getCachedVehicle, 
    saveForCurrentRoute,
    getCurrentRouteKey,
    addToCache
  } = useVehicleContext()
  
  // Local state initialized securely with synchronous cache extraction
  // ONLY use cached vehicle if it has complete seller info; otherwise force fetch
  const [vehicle, setVehicle] = useState<any>(() => {
    const ctxCached = getCachedVehicle?.(resolvedParams.id)
    if (ctxCached && hasCompleteSellerInfo(ctxCached)) {
      return ctxCached
    }
    return null
  })

  // Start with loading true only if we found no vehicle instantly
  const [loading, setLoading] = useState(!vehicle)
  const [error, setError] = useState<string | null>(null)

  const isInitialMountRef = useRef(true)

  // ------------------------------------------------------------------
  // 1. Fetch vehicle data (ensuring full seller info)
  // ------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchVehicle = async () => {
      const cached = getCachedVehicle?.(resolvedParams.id)
      // If we have a cached vehicle with complete seller info, use it and skip fetch
      if (cached && hasCompleteSellerInfo(cached)) {
        if (isMounted) {
          setVehicle(cached)
          setLoading(false)
          setError(null)
        }
        return
      }

      // Otherwise fetch fresh from API
      try {
        const res = await fetch(`/api/vehicles/${resolvedParams.id}`, { signal: controller.signal })

        if (!res.ok) {
          if (res.status === 404) {
            try {
              const fallback = await vehicleService.getVehicleById(resolvedParams.id)
              if (fallback && hasCompleteSellerInfo(fallback)) {
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
    const cachedState = restorePageState?.()
    if (cachedState) {
      // State restored (no console log kept)
    }
    const routeKey = getCurrentRouteKey?.()
    return () => {}
  }, [resolvedParams.id, restorePageState, getCurrentRouteKey])

  // ------------------------------------------------------------------
  // 3. Save vehicle to caches when loaded
  // ------------------------------------------------------------------
  useEffect(() => {
    if (vehicle && !loading) {
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
  // 5. Fetch similar vehicles
  // ------------------------------------------------------------------
  const fetchSimilarVehicles = async () => {
    if (!vehicle) return { vehicles: [], totalCount: 0, timestamp: Date.now() }
    
    try {
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
  // ------------------------------------------------------------------
  const savedCarsArray = useMemo(() => {
    if (!vehicle) return []
    const isSaved = savedVehiclesSet?.has?.(vehicle.id) || false
    return isSaved ? [vehicle] : []
  }, [vehicle, savedVehiclesSet])

  // ------------------------------------------------------------------
  // 8. Derive effectiveUser for fast contact privacy resolution
  // ------------------------------------------------------------------
  const effectiveUser = user || (authUser ? {
    id: authUser.id,
    email: authUser.email || "",
    firstName: "",
    lastName: "",
    loginMethod: "email" as const,
  } : null)

  // ------------------------------------------------------------------
  // 9. Not found / error handling
  // ------------------------------------------------------------------
  if (!loading && !vehicle && error) {
    return notFound()
  }

  // ------------------------------------------------------------------
  // 10. Loading skeleton (unchanged)
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
  // 11. Navigation handlers with safe cache calls
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
        user={user}   // Header still uses the full UserProfile (avatar, name)
        {...navigationHandlers}
        transparent={false}
      />
      <div className="pt-16 md:pt-20">
        <VehicleDetails
          vehicle={vehicle}
          onBack={handleBack}
          user={effectiveUser}           // ← BUG FIX: use effectiveUser for fast privacy resolution
          savedCars={savedCarsArray}
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
      
      {/* Removed development cache indicator as requested */}
    </div>
  )
}