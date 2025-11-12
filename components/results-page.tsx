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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, authUser, savedVehicles, toggleSaveVehicle, logout } = useUser()
  const supabase = createClientComponentClient()

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const [cities, setCities] = useState<string[]>([])

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(searchParams.toString())
    return {
      query: params.get("query") || "",
      minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
      province: params.get("province") || "",
      city: params.get("city") || "",
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
  })

  const provinces = [
    "Gauteng",
    "Western Cape",
    "KwaZulu-Natal",
    "Eastern Cape",
    "Free State",
    "Limpopo",
    "Mpumalanga",
    "North West",
    "Northern Cape",
  ]

  // Fetch cities when province changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!filters.province) return
      const { data, error } = await supabase
        .from("users")
        .select("city")
        .eq("province", filters.province)

      if (error) {
        console.error("Error fetching cities:", error)
        return
      }

      const uniqueCities = Array.from(new Set(data.map((item) => item.city).filter(Boolean)))
      setCities(uniqueCities)
    }

    fetchCities()
  }, [filters.province, supabase])

  // Fetch vehicles
  useEffect(() => {
    const fetchAndSetVehicles = async () => {
      setLoading(true)
      try {
        const { vehicleService } = await import("@/lib/vehicle-service")

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
          data = await vehicleService.getVehicles()
        }

        if (data && Array.isArray(data)) {
          setAllVehicles(data)
        } else {
          setAllVehicles([])
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error)
        setAllVehicles([])
      } finally {
        setLoading(false)
      }
    }
    fetchAndSetVehicles()
  }, [filters])

  const handleFilterChange = useCallback(
    (newFilters: any) => {
      setFilters(newFilters)
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

  const handleProvinceChange = (province: string) => {
    const newFilters = { ...filters, province, city: "" }
    handleFilterChange(newFilters)
  }

  const handleCityChange = (city: string) => {
    const newFilters = { ...filters, city }
    handleFilterChange(newFilters)
  }

  const filteredVehicles = useMemo(() => allVehicles, [allVehicles])

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
            isSaved={savedVehicles.has(selectedVehicle.id)}
            onToggleSave={() => toggleSaveVehicle(selectedVehicle)}
          />
        </div>
      </>
    )
  }

  const handleApplyMobileFilters = (newFilters: any) => {
    handleFilterChange(newFilters)
    setIsMobileFilterOpen(false)
  }

  const handleResetMobileFilters = () => handleFilterChange({})

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Header user={user} {...navigationHandlers} />
      <main className="pt-24 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Location Selector */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Location</h3>
                <select
                  value={filters.province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full border rounded-lg p-2 mb-3"
                >
                  <option value="">Select Province</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>

                {filters.province && (
                  <select
                    value={filters.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">Select City</option>
                    {cities.length > 0 ? (
                      cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))
                    ) : (
                      <option disabled>No cities found</option>
                    )}
                  </select>
                )}
              </div>

              {/* Other filters */}
              <AdvancedFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>
          </aside>

          {/* Main Results */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search Results</h1>
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

            {/* Vehicle Grid */}
            {loading ? (
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
                    onViewDetails={() => router.push(`/vehicle-details/${vehicle.id}`)}
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
                  {Object.values(filters).some(
                    (f) => f && (Array.isArray(f) ? f.length > 0 : f !== "1.0" && f !== "8.0"),
                  )
                    ? "No Vehicles Found"
                    : "No Vehicles Available"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {Object.values(filters).some(
                    (f) => f && (Array.isArray(f) ? f.length > 0 : f !== "1.0" && f !== "8.0"),
                  )
                    ? "Try adjusting your search filters to find what you're looking for."
                    : "Vehicles will appear here soon. Check back later or add a new listing!"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
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
              />
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  )
}
