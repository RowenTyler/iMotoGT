"use client"

import type React from "react"

import { useState } from "react"
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
  availableMakes?: string[]
  availableModels?: Record<string, string[]>
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
  availableMakes = [],
  availableModels = {},
}: AdvancedFiltersProps) {
  // Helper to convert empty strings from props to "any" for Select display
  const getSelectValue = (value: string | undefined, defaultValue = "any") => {
    if (value === undefined || value === null || value === "") return defaultValue
    return value
  }

  // State for hierarchical make/model selection
  const [selectedTerms, setSelectedTerms] = useState<string[]>(() => {
    if (!filters.query) return []
    return filters.query.split(',').map((t: string) => t.trim()).filter(Boolean)
  })
  const [makeSearch, setMakeSearch] = useState('')
  const [expandedMakes, setExpandedMakes] = useState<Set<string>>(new Set())
  
  // Province and city selection
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(() => {
    if (!filters.province) return []
    return filters.province.split(',').map((p: string) => p.trim()).filter(Boolean)
  })
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    if (!filters.city) return []
    return filters.city.split(',').map((c: string) => c.trim()).filter(Boolean)
  })
  const [cityInputs, setCityInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    selectedProvinces.forEach((province, idx) => {
      if (selectedCities[idx]) initial[province] = selectedCities[idx]
    })
    return initial
  })
  
  // Other filter values – convert empty strings to "any" for Select components
  const [localFilters, setLocalFilters] = useState({
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    minYear: getSelectValue(filters.minYear),
    maxYear: getSelectValue(filters.maxYear),
    minMileage: filters.minMileage || '',
    maxMileage: filters.maxMileage || '',
    fuelType: filters.fuelType || [],
    transmission: getSelectValue(filters.transmission),
    engineCapacityMin: filters.engineCapacityMin || '1.0',
    engineCapacityMax: filters.engineCapacityMax || '8.0',
    bodyType: filters.bodyType || [],
    model: filters.model || '',
  })

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

  // Apply filters – convert "any" values to empty string for backend
  const handleApplyFilters = () => {
    const allCities = Object.values(cityInputs).filter(Boolean)
    const updatedFilters = {
      query: selectedTerms.length > 0 ? selectedTerms.join(',') : '',
      minPrice: localFilters.minPrice,
      maxPrice: localFilters.maxPrice,
      province: selectedProvinces.join(','),
      city: allCities.join(','),
      bodyType: localFilters.bodyType,
      minYear: localFilters.minYear === 'any' ? '' : localFilters.minYear,
      maxYear: localFilters.maxYear === 'any' ? '' : localFilters.maxYear,
      minMileage: localFilters.minMileage,
      maxMileage: localFilters.maxMileage,
      fuelType: localFilters.fuelType,
      transmission: localFilters.transmission === 'any' ? '' : localFilters.transmission,
      engineCapacityMin: localFilters.engineCapacityMin,
      engineCapacityMax: localFilters.engineCapacityMax,
      model: localFilters.model,
    }
    onFilterChange(updatedFilters)
  }

  const handleResetFilters = () => {
    setSelectedTerms([])
    setSelectedProvinces([])
    setCityInputs({})
    setMakeSearch('')
    setExpandedMakes(new Set())
    const resetState = {
      minPrice: '',
      maxPrice: '',
      province: '',
      city: '',
      bodyType: [],
      minYear: 'any',
      maxYear: 'any',
      minMileage: '',
      maxMileage: '',
      fuelType: [],
      transmission: 'any',
      engineCapacityMin: '1.0',
      engineCapacityMax: '8.0',
      model: '',
    }
    setLocalFilters(resetState)
    if (onResetFilters) {
      onResetFilters()
    } else {
      onFilterChange({
        query: '',
        ...resetState,
        province: '',
        city: '',
      })
    }
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Advanced Filters</h3>
      {vehicleCount !== undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{vehicleCount} vehicle(s) found</p>
      )}
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3", "item-4", "item-5", "item-6"]}>
        {/* KEYWORDS – hierarchical make/model selection */}
        <AccordionItem value="item-1">
          <AccordionTrigger>Keywords</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <Input
              placeholder="Search makes..."
              value={makeSearch}
              onChange={e => setMakeSearch(e.target.value)}
              className="w-full"
            />
            
            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
              {availableMakes
                .filter(make => make.toLowerCase().includes(makeSearch.toLowerCase()))
                .map(make => {
                  const isMakeSelected = selectedTerms.includes(make)
                  const isExpanded = expandedMakes.has(make)
                  const makeModels = availableModels[make] || []
                  
                  return (
                    <div key={make}>
                      <div className="flex items-center justify-between py-1 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`make-${make}`}
                            checked={isMakeSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTerms(prev => [...prev.filter(t => !t.startsWith(make + ' ')), make])
                              } else {
                                setSelectedTerms(prev => prev.filter(t => t !== make && !t.startsWith(make + ' ')))
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
                            onClick={() => setExpandedMakes(prev => {
                              const next = new Set(prev)
                              next.has(make) ? next.delete(make) : next.add(make)
                              return next
                            })}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      
                      {isExpanded && makeModels.length > 0 && (
                        <div className="ml-6 space-y-1 mt-1">
                          {makeModels.map(model => {
                            const term = `${make} ${model}`
                            const isModelSelected = selectedTerms.includes(term)
                            return (
                              <div key={model} className="flex items-center gap-2 py-0.5 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                                <Checkbox
                                  id={`model-${make}-${model}`}
                                  checked={isModelSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTerms(prev => {
                                        const withoutMakeOnly = prev.filter(t => t !== make)
                                        return [...withoutMakeOnly, term]
                                      })
                                    } else {
                                      setSelectedTerms(prev => prev.filter(t => t !== term))
                                    }
                                  }}
                                />
                                <Label htmlFor={`model-${make}-${model}`} className="cursor-pointer text-sm text-gray-700 dark:text-gray-300">
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
              {availableMakes.length === 0 && (
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

        {/* LOCATION – province checkboxes with city inputs */}
        <AccordionItem value="item-3">
          <AccordionTrigger>Location</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Select provinces (expand for cities)</p>
            <div className="space-y-2">
              {allProvinces.map(province => {
                const isChecked = selectedProvinces.includes(province)
                return (
                  <div key={province}>
                    <div className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`province-${province}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProvinces(prev => [...prev, province])
                          } else {
                            setSelectedProvinces(prev => prev.filter(p => p !== province))
                            setCityInputs(prev => { const n = { ...prev }; delete n[province]; return n })
                          }
                        }}
                      />
                      <Label htmlFor={`province-${province}`} className="cursor-pointer font-medium text-sm">
                        {province}
                      </Label>
                    </div>
                    {isChecked && (
                      <div className="ml-6 mt-1">
                        <Input
                          placeholder={`City in ${province}...`}
                          value={cityInputs[province] || ''}
                          onChange={e => setCityInputs(prev => ({ ...prev, [province]: e.target.value }))}
                          className="text-sm h-8"
                        />
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
              <Select value={localFilters.minYear} onValueChange={(value) => handleSelectChange("minYear", value)}>
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
              <Select value={localFilters.maxYear} onValueChange={(value) => handleSelectChange("maxYear", value)}>
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
                value={localFilters.transmission}
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