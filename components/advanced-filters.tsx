"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronRight, ChevronDown } from "lucide-react"

interface AdvancedFiltersProps {
  filters: any
  onFilterChange: (filters: any) => void
  onResetFilters?: () => void
  vehicleCount?: number
  /** Full list of all makes (unfiltered) – keeps checkboxes visible after filtering */
  allMakes?: string[]
  /** Full model hierarchy (unfiltered) */
  allModels?: Record<string, string[]>
  /** List of cities grouped by province (for location dropdowns) */
  citiesByProvince?: Record<string, string[]>
  /** List of suburbs grouped by city */
  suburbsByCity?: Record<string, string[]>
}

const bodyTypes = ["Sedan", "SUV", "Truck", "Motorcycle", "Hatchback", "Convertible"]
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid"]
const allProvinces = [
  "Western Cape",
  "Gauteng",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Limpopo",
]
const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

export default function AdvancedFilters({
  filters,
  onFilterChange,
  onResetFilters,
  vehicleCount,
  allMakes = [],
  allModels = {},
  citiesByProvince = {},
  suburbsByCity = {},
}: AdvancedFiltersProps) {
  // Helper for Select components – never return empty string
  const toSelectValue = (val: string | undefined) => (val && val !== "" ? val : "any")

  // --------------------------------------------------------------
  // Make / Model hierarchical selection (using full, unfiltered lists)
  // --------------------------------------------------------------
  const [selectedTerms, setSelectedTerms] = useState<string[]>(() => {
    if (!filters.query) return []
    return filters.query.split(",").map((t: string) => t.trim()).filter(Boolean)
  })
  const [makeSearch, setMakeSearch] = useState("")
  const [expandedMakes, setExpandedMakes] = useState<Set<string>>(new Set())

  // --------------------------------------------------------------
  // Location hierarchical selection (province → city → suburb)
  // --------------------------------------------------------------
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(() => {
    if (!filters.province) return []
    return filters.province.split(",").map((p: string) => p.trim()).filter(Boolean)
  })
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    if (!filters.city) return []
    return filters.city.split(",").map((c: string) => c.trim()).filter(Boolean)
  })
  const [selectedSuburbs, setSelectedSuburbs] = useState<string[]>(() => {
    if (!filters.suburb) return []
    return filters.suburb.split(",").map((s: string) => s.trim()).filter(Boolean)
  })
  // UI expansion states for location hierarchy
  const [expandedProvinces, setExpandedProvinces] = useState<Set<string>>(new Set())
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set())

  // --------------------------------------------------------------
  // Other filters
  // --------------------------------------------------------------
  const [localFilters, setLocalFilters] = useState({
    minPrice: filters.minPrice || "",
    maxPrice: filters.maxPrice || "",
    minYear: toSelectValue(filters.minYear),
    maxYear: toSelectValue(filters.maxYear),
    minMileage: filters.minMileage || "",
    maxMileage: filters.maxMileage || "",
    fuelType: filters.fuelType || [],
    transmission: toSelectValue(filters.transmission),
    engineCapacityMin: filters.engineCapacityMin || "1.0",
    engineCapacityMax: filters.engineCapacityMax || "8.0",
    bodyType: filters.bodyType || [],
    model: filters.model || "",
  })

  // Sync local state when external filters change (e.g., browser back/forward)
  useEffect(() => {
    setLocalFilters((prev) => ({
      ...prev,
      minPrice: filters.minPrice || "",
      maxPrice: filters.maxPrice || "",
      minYear: toSelectValue(filters.minYear),
      maxYear: toSelectValue(filters.maxYear),
      minMileage: filters.minMileage || "",
      maxMileage: filters.maxMileage || "",
      fuelType: filters.fuelType || [],
      transmission: toSelectValue(filters.transmission),
      engineCapacityMin: filters.engineCapacityMin || "1.0",
      engineCapacityMax: filters.engineCapacityMax || "8.0",
      bodyType: filters.bodyType || [],
      model: filters.model || "",
    }))
    setSelectedTerms(filters.query ? filters.query.split(",").map((t: string) => t.trim()).filter(Boolean) : [])
    setSelectedProvinces(filters.province ? filters.province.split(",").map((p: string) => p.trim()).filter(Boolean) : [])
    setSelectedCities(filters.city ? filters.city.split(",").map((c: string) => c.trim()).filter(Boolean) : [])
    setSelectedSuburbs(filters.suburb ? filters.suburb.split(",").map((s: string) => s.trim()).filter(Boolean) : [])
  }, [filters])

  // --------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setLocalFilters((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setLocalFilters((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, value: string) => {
    setLocalFilters((prev: any) => {
      const existing: string[] = prev[name] || []
      const newValues = existing.includes(value) ? existing.filter((v) => v !== value) : [...existing, value]
      return { ...prev, [name]: newValues }
    })
  }

  const handleSliderChange = (values: number[]) => {
    setLocalFilters((prev: any) => ({
      ...prev,
      engineCapacityMin: values[0].toFixed(1),
      engineCapacityMax: values[1].toFixed(1),
    }))
  }

  // Location hierarchical handlers
  const toggleProvinceSelection = (province: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(province) ? prev.filter((p) => p !== province) : [...prev, province]
    )
  }

  const toggleCitySelection = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    )
  }

  const toggleSuburbSelection = (suburb: string) => {
    setSelectedSuburbs((prev) =>
      prev.includes(suburb) ? prev.filter((s) => s !== suburb) : [...prev, suburb]
    )
  }

  const toggleProvinceExpansion = (province: string) => {
    setExpandedProvinces((prev) => {
      const next = new Set(prev)
      next.has(province) ? next.delete(province) : next.add(province)
      return next
    })
  }

  const toggleCityExpansion = (city: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev)
      next.has(city) ? next.delete(city) : next.add(city)
      return next
    })
  }

  // Apply filters – build query string and location strings
  const handleApplyFilters = () => {
    const updatedFilters = {
      query: selectedTerms.length > 0 ? selectedTerms.join(",") : "",
      minPrice: localFilters.minPrice,
      maxPrice: localFilters.maxPrice,
      province: selectedProvinces.join(","),
      city: selectedCities.join(","),
      suburb: selectedSuburbs.join(","),
      bodyType: localFilters.bodyType,
      minYear: localFilters.minYear === "any" ? "" : localFilters.minYear,
      maxYear: localFilters.maxYear === "any" ? "" : localFilters.maxYear,
      minMileage: localFilters.minMileage,
      maxMileage: localFilters.maxMileage,
      fuelType: localFilters.fuelType,
      transmission: localFilters.transmission === "any" ? "" : localFilters.transmission,
      engineCapacityMin: localFilters.engineCapacityMin,
      engineCapacityMax: localFilters.engineCapacityMax,
      model: localFilters.model,
    }
    onFilterChange(updatedFilters)
  }

  const handleResetFilters = () => {
    setSelectedTerms([])
    setSelectedProvinces([])
    setSelectedCities([])
    setSelectedSuburbs([])
    setExpandedProvinces(new Set())
    setExpandedCities(new Set())
    setMakeSearch("")
    setExpandedMakes(new Set())
    setLocalFilters({
      minPrice: "",
      maxPrice: "",
      minYear: "any",
      maxYear: "any",
      minMileage: "",
      maxMileage: "",
      fuelType: [],
      transmission: "any",
      engineCapacityMin: "1.0",
      engineCapacityMax: "8.0",
      bodyType: [],
      model: "",
    })
    if (onResetFilters) {
      onResetFilters()
    } else {
      onFilterChange({
        query: "",
        minPrice: "",
        maxPrice: "",
        province: "",
        city: "",
        suburb: "",
        bodyType: [],
        minYear: "",
        maxYear: "",
        minMileage: "",
        maxMileage: "",
        fuelType: [],
        transmission: "",
        engineCapacityMin: "1.0",
        engineCapacityMax: "8.0",
        model: "",
      })
    }
  }

  const safeSelectValue = (value: string) => (value === undefined || value === null || value === "" ? "any" : value)

  // Use full lists for makes/models (keep checkboxes visible even after filtering)
  const displayMakes = allMakes.length ? allMakes : (filters.availableMakes || [])
  const displayModels = Object.keys(allModels).length ? allModels : (filters.availableModels || {})

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Advanced Filters</h3>
      {vehicleCount !== undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{vehicleCount} vehicle(s) found</p>
      )}
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3", "item-4", "item-5", "item-6"]}>
        {/* KEYWORDS - Make/Model (persistent) */}
        <AccordionItem value="item-1">
          <AccordionTrigger>Keywords</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <Input
              placeholder="Search makes..."
              value={makeSearch}
              onChange={(e) => setMakeSearch(e.target.value)}
              className="w-full"
            />
            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
              {displayMakes
                .filter((make) => make.toLowerCase().includes(makeSearch.toLowerCase()))
                .map((make) => {
                  const isMakeSelected = selectedTerms.includes(make)
                  const isExpanded = expandedMakes.has(make)
                  const makeModels = displayModels[make] || []
                  return (
                    <div key={make}>
                      <div className="flex items-center justify-between py-1 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`make-${make}`}
                            checked={isMakeSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTerms((prev) => [...prev.filter((t) => !t.startsWith(make + " ")), make])
                              } else {
                                setSelectedTerms((prev) =>
                                  prev.filter((t) => t !== make && !t.startsWith(make + " "))
                                )
                              }
                            }}
                          />
                          <Label htmlFor={`make-${make}`} className="cursor-pointer font-medium text-sm">
                            {make}
                          </Label>
                        </div>
                        {makeModels.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMakes((prev) => {
                                const next = new Set(prev)
                                next.has(make) ? next.delete(make) : next.add(make)
                                return next
                              })
                            }
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      {isExpanded && makeModels.length > 0 && (
                        <div className="ml-6 space-y-1 mt-1">
                          {makeModels.map((model) => {
                            const term = `${make} ${model}`
                            const isModelSelected = selectedTerms.includes(term)
                            return (
                              <div
                                key={model}
                                className="flex items-center gap-2 py-0.5 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                              >
                                <Checkbox
                                  id={`model-${make}-${model}`}
                                  checked={isModelSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTerms((prev) => {
                                        const withoutMakeOnly = prev.filter((t) => t !== make)
                                        return [...withoutMakeOnly, term]
                                      })
                                    } else {
                                      setSelectedTerms((prev) => prev.filter((t) => t !== term))
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`model-${make}-${model}`}
                                  className="cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                                >
                                  {model}
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              {displayMakes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Loading makes...</p>
              )}
            </div>
            <Input
              name="model"
              placeholder="Search model (free text)..."
              value={localFilters.model}
              onChange={handleInputChange}
              className="w-full"
            />
          </AccordionContent>
        </AccordionItem>

        {/* PRICE */}
        <AccordionItem value="item-2">
          <AccordionTrigger>Price</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Input
              name="minPrice"
              type="number"
              placeholder="Min Price"
              value={localFilters.minPrice}
              onChange={handleInputChange}
            />
            <Input
              name="maxPrice"
              type="number"
              placeholder="Max Price"
              value={localFilters.maxPrice}
              onChange={handleInputChange}
            />
          </AccordionContent>
        </AccordionItem>

        {/* LOCATION - hierarchical dropdown checkboxes */}
        <AccordionItem value="item-3">
          <AccordionTrigger>Location</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Select provinces, then cities, then suburbs</p>
            <div className="max-h-96 overflow-y-auto space-y-1 border rounded-md p-2">
              {allProvinces.map((province) => {
                const isProvinceSelected = selectedProvinces.includes(province)
                const isProvinceExpanded = expandedProvinces.has(province)
                const cities = citiesByProvince[province] || []
                const hasCities = cities.length > 0
                return (
                  <div key={province}>
                    <div className="flex items-center justify-between py-1 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`loc-province-${province}`}
                          checked={isProvinceSelected}
                          onCheckedChange={() => toggleProvinceSelection(province)}
                        />
                        <Label htmlFor={`loc-province-${province}`} className="cursor-pointer font-medium text-sm">
                          {province}
                        </Label>
                      </div>
                      {hasCities && (
                        <button
                          type="button"
                          onClick={() => toggleProvinceExpansion(province)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                        >
                          {isProvinceExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    {isProvinceExpanded && hasCities && (
                      <div className="ml-6 space-y-1 mt-1">
                        {cities.map((city) => {
                          const isCitySelected = selectedCities.includes(city)
                          const isCityExpanded = expandedCities.has(city)
                          const suburbs = suburbsByCity[city] || []
                          const hasSuburbs = suburbs.length > 0
                          return (
                            <div key={city}>
                              <div className="flex items-center justify-between py-1 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`loc-city-${city}`}
                                    checked={isCitySelected}
                                    onCheckedChange={() => toggleCitySelection(city)}
                                  />
                                  <Label htmlFor={`loc-city-${city}`} className="cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                                    {city}
                                  </Label>
                                </div>
                                {hasSuburbs && (
                                  <button
                                    type="button"
                                    onClick={() => toggleCityExpansion(city)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                                  >
                                    {isCityExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                              {isCityExpanded && hasSuburbs && (
                                <div className="ml-6 space-y-1 mt-1">
                                  {suburbs.map((suburb) => (
                                    <div key={suburb} className="flex items-center gap-2 py-0.5 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                                      <Checkbox
                                        id={`loc-suburb-${suburb}`}
                                        checked={selectedSuburbs.includes(suburb)}
                                        onCheckedChange={() => toggleSuburbSelection(suburb)}
                                      />
                                      <Label htmlFor={`loc-suburb-${suburb}`} className="cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                                        {suburb}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* BODY TYPE */}
        <AccordionItem value="item-4">
          <AccordionTrigger>Body Type</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {bodyTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`body-${type}`}
                  checked={localFilters.bodyType?.includes(type) || false}
                  onCheckedChange={() => handleCheckboxChange("bodyType", type)}
                />
                <Label htmlFor={`body-${type}`}>{type}</Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* YEAR & MILEAGE */}
        <AccordionItem value="item-5">
          <AccordionTrigger>Year & Mileage</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="flex gap-2">
              <Select
                value={safeSelectValue(localFilters.minYear)}
                onValueChange={(value) => handleSelectChange("minYear", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Min Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={safeSelectValue(localFilters.maxYear)}
                onValueChange={(value) => handleSelectChange("maxYear", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Max Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                name="minMileage"
                type="number"
                placeholder="Min Mileage"
                value={localFilters.minMileage}
                onChange={handleInputChange}
              />
              <Input
                name="maxMileage"
                type="number"
                placeholder="Max Mileage"
                value={localFilters.maxMileage}
                onChange={handleInputChange}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SPECIFICATIONS */}
        <AccordionItem value="item-6">
          <AccordionTrigger>Specifications</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <Label className="font-semibold">Fuel Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {fuelTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fuel-${type}`}
                      checked={localFilters.fuelType?.includes(type) || false}
                      onCheckedChange={() => handleCheckboxChange("fuelType", type)}
                    />
                    <Label htmlFor={`fuel-${type}`}>{type}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-semibold">Transmission</Label>
              <Select
                value={safeSelectValue(localFilters.transmission)}
                onValueChange={(value) => handleSelectChange("transmission", value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="Automatic">Automatic</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-semibold">
                Engine: {localFilters.engineCapacityMin}L - {localFilters.engineCapacityMax}L
              </Label>
              <Slider
                value={[
                  Number.parseFloat(localFilters.engineCapacityMin || "1.0"),
                  Number.parseFloat(localFilters.engineCapacityMax || "8.0"),
                ]}
                onValueChange={handleSliderChange}
                min={1}
                max={8}
                step={0.1}
                className="mt-2"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8 flex flex-col gap-2">
        <Button onClick={handleApplyFilters} className="w-full bg-orange-500 hover:bg-orange-600">
          Apply Filters
        </Button>
        <Button onClick={handleResetFilters} variant="outline" className="w-full bg-transparent">
          Reset Filters
        </Button>
      </div>
    </div>
  )
}