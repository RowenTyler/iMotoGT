"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/ui/header"
import AdvancedFilters from "@/components/advanced-filters"
import VehicleCard from "@/components/vehicle-card"
import VehicleDetails from "@/components/vehicle-details"
import { useUser } from "@/components/UserContext"
import type { Vehicle } from "@/types/vehicle"
import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useVehicleList } from "@/components/VehicleProvider" // Add import

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, authUser, savedVehicles, toggleSaveVehicle, logout } = useUser()

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  // Parse filters from URL
  const filters = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    return {
      query: params.get("query") || "",
      minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
      province: params.get("province") || "",
      bodyType: params.getAll("bodyType") || [],
      minYear: params.get("minYear") || "",
      maxYear: params.get("maxYear") || "",
      minMileage: params.get("minMileage") ? Number(params.get("minMileage")) : undefined,
      maxMileage: params.get("maxMileage") ? Number(params.get("maxMileage")) : undefined,
      fuelType: params.getAll("fuelType") || [],
      transmission: params.get("transmission") || "",
      engineCapacityMin: params.get("engineCapacityMin") || "1.0",
      engineCapacityMax: params.get("engineCapacityMax") || "8.0",
    }
  }, [searchParams])

  // Generate cache key based on filters
  const cacheKey = useMemo(() => {
    // Create a stable string representation of filters for cache key
    const filterString = JSON.stringify(filters, (key, value) => {
      // Sort arrays to ensure consistent cache key
      if (Array.isArray(value)) {
        return value.sort()
      }
      return value
    })
    return `results:${filterString}`
  }, [filters])

  // Create fetch function for filtered vehicles
  const fetchFilteredVehicles = useCallback(async () => {
    try {
      const { vehicleService } = await import("@/lib/vehicle-service")
      
      // Check if we have any active filters
      const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === "string") return value.trim() !== "" && value !== "1.0" && value !== "8.0"
        if (typeof value === "number") return value > 0
        return false
      })

      let data
      if (hasActiveFilters) {
        data = await vehicleService.filterVehicles(filters)
      } else {
        // If no filters, get all vehicles
        data = await vehicleService.getVehicles()
      }

      // Ensure we return a VehicleListResponse format
      const vehicles = Array.isArray(data) ? data : data.vehicles || []
      return {
        vehicles,
        totalCount: vehicles.length,
        filters: { ...filters },
        timestamp: Date.now()
      }
    } catch (error) {
      console.error("Error fetching filtered vehicles:", error)
      throw error
    }
  }, [filters])

  // Use the vehicle list hook with caching
  const { 
    data: vehicleData, 
    loading, 
    error 
  } = useVehicleList(
    cacheKey,
    fetchFilteredVehicles,
    {
      enabled: true,
      maxAge: 5 * 60 * 1000, // 5 minutes cache for results
      forceRefresh: false, // Don't force refresh on mount
    }
  )

  // Check if we have any active filters for display
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === "string") return value.trim() !== "" && value !== "1.0" && value !== "8.0"
      if (typeof value === "number") return value > 0
      return false
    })
  }, [filters])

  // Extract vehicles from data
  const filteredVehicles = useMemo(() => {
    return vehicleData?.vehicles || []
  }, [vehicleData])

  const handleFilterChange = useCallback(
    (newFilters: any) => {
      // Create URL params from new filters
      const params = new URLSearchParams()
      Object.entries(newFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v))
        } else if (value) {
          params.set(key, String(value))
        }
      })
      router.push(`/results?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  const handleSignOut = async () => {
    await logout()
    router.push("/home")
  }

  const navigationHandlers = {
    onLoginClick: () => router.push("/login"),
    onDashboardClick: () => router.push("/dashboard"),
    onGoHome: () => router.push("/home"),
    onShowAllCars: () => {
      // Clear filters and show all vehicles
      router.push("/results")
    },
    onGoToSellPage: () => router.push("/upload-vehicle"),
    onSignOut: handleSignOut,
  }

  if (selectedVehicle) {
    return (
      <>
        <Header user={user} {...navigationHandlers} />
        <div className="pt-16 md:pt-20">
          <VehicleDetails
            vehicle={selectedVehicle}
            onBack={() => setSelectedVehicle(null)}
            user={user}
            onSaveCar={() => toggleSaveVehicle(selectedVehicle)}
          />
        </div>
      </>
    )
  }

  const handleApplyMobileFilters = (newFilters: any) => {
    handleFilterChange(newFilters)
    setIsMobileFilterOpen(false)
  }

  const handleResetMobileFilters = () => {
    // Reset all filters
    handleFilterChange({})
  }

  // Handle vehicle click - navigate to details page instead of showing inline
  const handleVehicleClick = (vehicle: Vehicle) => {
    router.push(`/vehicle-details/${vehicle.id}`)
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Header user={user} {...navigationHandlers} />
      <main className="pt-24 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <AdvancedFilters 
                filters={filters} 
                onFilterChange={handleFilterChange} 
                vehicleCount={filteredVehicles.length}
              />
            </div>
          </aside>

          <div className="lg:col-span-3">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {hasActiveFilters ? "Search Results" : "All Vehicles"}
                </h1>
                {hasActiveFilters && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {filters.query && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        Search: {filters.query}
                      </span>
                    )}
                    {filters.province && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Location: {filters.province}
                      </span>
                    )}
                    {/* Add more filter chips as needed */}
                  </div>
                )}
              </div>
              <div className="lg:hidden flex items-center gap-2 w-full justify-between sm:justify-end">
                <p className="text-gray-600 dark:text-gray-400">
                  {loading ? "Loading vehicles..." : `${filteredVehicles.length} vehicle(s) found`}
                </p>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600 hover:text-white"
                  onClick={() => setIsMobileFilterOpen(true)}
                >
                  <SlidersHorizontal className="h-5 w-5" /> Filters
                </Button>
              </div>
            </div>

            {error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <p className="text-red-600 dark:text-red-400 font-medium">
                  Error loading vehicles: {error}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Please try again or adjust your filters.
                </p>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow animate-pulse">
                    <div className="h-48 bg-gray-300 dark:bg-gray-700 rounded-t-lg"></div>
                    <div className="p-4 space-y-4">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVehicles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onViewDetails={() => handleVehicleClick(vehicle)}
                    isSaved={savedVehicles.has(vehicle.id)}
                    onToggleSave={() => toggleSaveVehicle(vehicle)}
                    isLoggedIn={!!authUser}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {hasActiveFilters
                    ? "No Vehicles Found"
                    : "No Vehicles Available"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {hasActiveFilters
                    ? "Try adjusting your search filters to find what you're looking for."
                    : "Vehicles will appear here soon. Check back later or add a new listing!"}
                </p>
                {hasActiveFilters && (
                  <Button
                    onClick={() => handleResetMobileFilters()}
                    className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
          <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Results</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <AdvancedFilters
                filters={filters}
                onFilterChange={handleApplyMobileFilters}
                onResetFilters={handleResetMobileFilters}
                vehicleCount={filteredVehicles.length}
              />
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  )
}
