"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function AdvancedFilters({ filters, onFilterChange, onResetFilters }: any) {
  const supabase = createClientComponentClient()
  const [cities, setCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)

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
      if (!filters.province) {
        setCities([])
        return
      }

      setLoadingCities(true)
      const { data, error } = await supabase
        .from("users")
        .select("city")
        .eq("province", filters.province)

      if (error) {
        console.error("Error fetching cities:", error)
        setCities([])
        setLoadingCities(false)
        return
      }

      const uniqueCities = Array.from(new Set(data.map((r) => r.city).filter(Boolean)))
      setCities(uniqueCities)
      setLoadingCities(false)
    }

    fetchCities()
  }, [filters.province, supabase])

  const handleProvinceChange = (province: string) => {
    onFilterChange({ ...filters, province, city: "" })
  }

  const handleCityChange = (city: string) => {
    onFilterChange({ ...filters, city })
  }

  return (
    <div className="space-y-6">
      {/* Location Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Location</h3>

        {/* Province Selector */}
        <select
          value={filters.province || ""}
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

        {/* City Selector */}
        {filters.province && (
          <select
            value={filters.city || ""}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select City</option>
            {loadingCities ? (
              <option disabled>Loading cities...</option>
            ) : cities.length > 0 ? (
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

      {/* ...keep your other filters here (price, body type, etc.) */}
    </div>
  )
}
