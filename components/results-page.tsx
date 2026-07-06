"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/ui/header"
import AdvancedFilters from "@/components/advanced-filters"
import VehicleCard from "@/components/vehicle-card"
import VehicleDetails from "@/components/vehicle-details"
import { VehicleCardSkeleton } from "@/components/skeletons"
import { useUser } from "@/components/UserContext"
import type { Vehicle } from "@/types/vehicle"
import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useVehicleList } from "@/components/VehicleProvider"

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, authUser, savedVehicles, toggleSaveVehicle, logout } = useUser()

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  // Parse filters from URL (includes province, city, suburb)
  const filters = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    const allProvinces = params.getAll("province")
    const provinceValue = allProvinces.length > 1 ? allProvinces.join(",") : (params.get("province") || "")
    
    return {
      query: params.get("query") || "",
      minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
      province: provinceValue,
      city: params.get("city") || "",
      suburb: params.get("suburb") || "",
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

  // -----------------------------------------------------------------
  // 1. Fetch FULL vehicle list (unfiltered) for persistent hierarchy
  // -----------------------------------------------------------------
  const fetchAllVehicles = useCallback(async () => {
    try {
      const { getVehicles } = await import("@/lib/vehicle-service")
      const data = await getVehicles()
      const vehicles = Array.isArray(data) ? data : data.vehicles || []
      
      // Build hierarchy and location data from all vehicles
      const modelsMap: Record<string, string[]> = {}
      const citiesMap: Record<string, string[]> = {}
      const suburbsMap: Record<string, string[]> = {}
      
      vehicles.forEach((v: Vehicle) => {
        // Makes & models
        if (v.make && v.model) {
          if (!modelsMap[v.make]) modelsMap[v.make] = []
          if (!modelsMap[v.make].includes(v.model)) modelsMap[v.make].push(v.model)
        }
        // Cities by province (from vehicles)
        if (v.province && v.city) {
          if (!citiesMap[v.province]) citiesMap[v.province] = []
          if (!citiesMap[v.province].includes(v.city)) citiesMap[v.province].push(v.city)
        }
        // Suburbs by city (from sellerSuburb)
        if (v.city && v.sellerSuburb) {
          if (!suburbsMap[v.city]) suburbsMap[v.city] = []
          if (!suburbsMap[v.city].includes(v.sellerSuburb)) suburbsMap[v.city].push(v.sellerSuburb)
        }
      })
      
      // Sort all arrays
      Object.keys(modelsMap).forEach(make => modelsMap[make].sort())
      Object.keys(citiesMap).forEach(prov => citiesMap[prov].sort())
      Object.keys(suburbsMap).forEach(city => suburbsMap[city].sort())
      
      return {
        vehicles,
        hierarchy: { makes: Object.keys(modelsMap).sort(), models: modelsMap },
        citiesByProvince: citiesMap,
        suburbsByCity: suburbsMap,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error("Error fetching all vehicles for hierarchy:", error)
      return {
        vehicles: [],
        hierarchy: { makes: [], models: {} },
        citiesByProvince: {},
        suburbsByCity: {},
        timestamp: Date.now()
      }
    }
  }, [])

  const { data: fullVehicleData, loading: fullLoading } = useVehicleList(
    "all-vehicles-master",
    fetchAllVehicles,
    { enabled: true, maxAge: 5 * 60 * 1000, forceRefresh: false }
  )

  // Derive allMakes, allModels, citiesByProvince, suburbsByCity from the full dataset
  const { allMakes, allModels, citiesByProvince, suburbsByCity } = useMemo(() => {
    const vehicles = fullVehicleData?.vehicles || []
    const modelsMap: Record<string, string[]> = {}
    const citiesMap: Record<string, string[]> = {}
    const suburbsMap: Record<string, string[]> = {}
    
    vehicles.forEach((v: Vehicle) => {
      if (v.make && v.model) {
        if (!modelsMap[v.make]) modelsMap[v.make] = []
        if (!modelsMap[v.make].includes(v.model)) modelsMap[v.make].push(v.model)
      }
      if (v.province && v.city) {
        if (!citiesMap[v.province]) citiesMap[v.province] = []
        if (!citiesMap[v.province].includes(v.city)) citiesMap[v.province].push(v.city)
      }
      if (v.city && v.sellerSuburb) {
        if (!suburbsMap[v.city]) suburbsMap[v.city] = []
        if (!suburbsMap[v.city].includes(v.sellerSuburb)) suburbsMap[v.city].push(v.sellerSuburb)
      }
    })
    
    Object.keys(modelsMap).forEach(make => modelsMap[make].sort())
    Object.keys(citiesMap).forEach(prov => citiesMap[prov].sort())
    Object.keys(suburbsMap).forEach(city => suburbsMap[city].sort())
    
    return {
      allMakes: Object.keys(modelsMap).sort(),
      allModels: modelsMap,
      citiesByProvince: citiesMap,
      suburbsByCity: suburbsMap,
    }
  }, [fullVehicleData])

  // -----------------------------------------------------------------
  // 2. Fetch FILTERED vehicles (excluding suburb, which is client-side)
  // -----------------------------------------------------------------
  const cacheKey = useMemo(() => {
    const filterString = JSON.stringify(filters, (key, value) => {
      if (Array.isArray(value)) return value.sort()
      return value
    })
    return `results:${filterString}`
  }, [filters])

  const fetchFilteredVehicles = useCallback(async () => {
    try {
      const { getVehicles, filterVehicles } = await import("@/lib/vehicle-service")

      const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === "suburb") return false // suburb filtered client-side
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === "string") return value.trim() !== "" && value !== "1.0" && value !== "8.0"
        if (typeof value === "number") return value > 0
        return false
      })

      let data
      if (hasActiveFilters) {
        // Build DB filters without suburb
        const dbFilters = { ...filters }
        delete dbFilters.suburb
        data = await filterVehicles(dbFilters)
      } else {
        data = await getVehicles()
      }

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

  const { data: vehicleData, loading: resultsLoading, error } = useVehicleList(
    cacheKey,
    fetchFilteredVehicles,
    { enabled: true, maxAge: 5 * 60 * 1000, forceRefresh: false }
  )

  // -----------------------------------------------------------------
  // 3. Apply client-side suburb filter (since suburb lives on users table)
  // -----------------------------------------------------------------
  const filteredVehicles = useMemo(() => {
    let vehicles = vehicleData?.vehicles || []
    if (filters.suburb && filters.suburb.trim()) {
      const suburbTerms = filters.suburb.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (suburbTerms.length > 0) {
        vehicles = vehicles.filter(v => 
          v.sellerSuburb && suburbTerms.some(term => v.sellerSuburb.toLowerCase().includes(term))
        )
      }
    }
    return vehicles
  }, [vehicleData, filters.suburb])

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === "string") return value.trim() !== "" && value !== "1.0" && value !== "8.0"
      if (typeof value === "number") return value > 0
      return false
    })
  }, [filters])

  const handleFilterChange = useCallback(
    (newFilters: any) => {
      const params = new URLSearchParams()
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v))
        } else {
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
    onShowAllCars: () => router.push("/results"),
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
    handleFilterChange({})
  }

  const handleVehicleClick = (vehicle: Vehicle) => {
    router.push(`/vehicle-details/${vehicle.id}`)
  }

  const loading = resultsLoading || fullLoading

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
                allMakes={allMakes}
                allModels={allModels}
                citiesByProvince={citiesByProvince}
                suburbsByCity={suburbsByCity}
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
                        Province: {filters.province}
                      </span>
                    )}
                    {filters.city && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        City: {filters.city}
                      </span>
                    )}
                    {filters.suburb && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        Suburb: {filters.suburb}
                      </span>
                    )}
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
                <VehicleCardSkeleton count={6} />
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
                  {hasActiveFilters ? "No Vehicles Found" : "No Vehicles Available"}
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
                allMakes={allMakes}
                allModels={allModels}
                citiesByProvince={citiesByProvince}
                suburbsByCity={suburbsByCity}
              />
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  )
}