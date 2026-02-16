"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { Search, X, ChevronDown, ChevronRight, Truck, CarIcon, Bike, Facebook, Instagram, Twitter } from "lucide-react"
import VehicleDetails from "./vehicle-details"
import LocationPage from "./location-page"
import { vehicleService } from "@/lib/vehicle-service"
import type { Vehicle } from "@/types/vehicle"
import { useUser } from "@/components/UserContext"
import { Header } from "./ui/header"
import VehicleCard from "./vehicle-card"
import { useVehicleList, useVehicleContext } from "@/components/VehicleProvider"
import { useNavigationCache } from "@/components/NavigationCacheHandler"

// Common South African car make abbreviations
const MAKE_ABBREVIATIONS: Record<string, string> = {
  vw: "Volkswagen",
  bmw: "BMW",
  merc: "Mercedes Benz",
  benz: "Mercedes Benz",
  toy: "Toyota",
  ford: "Ford",
  chev: "Chevrolet",
  caddy: "Cadillac",
  audi: "Audi",
  tata: "Tata Motors",
  maz: "Mazda",
  suz: "Suzuki",
  hyundai: "Hyundai",
  kia: "Kia",
  ren: "Renault",
  nissan: "Nissan",
  honda: "Honda",
  opel: "Opel",
  fiat: "Fiat",
  jeep: "Jeep",
  jag: "Jaguar",
  landy: "Land Rover",
  lr: "Land Rover",
  lex: "Lexus",
  dacia: "Dacia",
  mini: "MINI",
}

interface VehicleHierarchy {
  [make: string]: string[] // models only
}

// Interface for cached form state
interface CachedFormState {
  selectedTerms: string[]
  bodyType: string
  engineCapacityRange: [number, number]
  searchTerm: string
  currentSliderEngineValues: [number, number]
  showMoreOptions: boolean
  expandedMakes: string[]
  // Filter values
  minPrice?: string
  maxPrice?: string
  location?: string
  minYear?: string
  maxYear?: string
  minMileage?: string
  maxMileage?: string
  fuelType?: string
  transmission?: string
  condition?: string
}

export default function CarMarketplace() {
  const router = useRouter()
  const { user, setUser, savedVehicles, toggleSaveVehicle } = useUser()
  
  // Use the vehicle context for cache management
  const { getCachedList, saveForCurrentRoute } = useVehicleContext()
  
  // Use navigation cache for form state - STABILIZED CONTEXT
  const { savePageState, restorePageState } = useNavigationCache()
  
  const [search, setSearch] = useState("")
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [isSearchPage, setIsSearchPage] = useState(true)
  const [savedVehiclesData, setSavedVehiclesData] = useState<Vehicle[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTerms, setSelectedTerms] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [bodyType, setBodyType] = useState("")
  const [showBodyTypes, setShowBodyTypes] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const engineCapacityRef = useRef<HTMLDivElement>(null)

  // State for hierarchical dropdown (makes → models only)
  const [vehicleHierarchy, setVehicleHierarchy] = useState<VehicleHierarchy>({})
  const [expandedMakes, setExpandedMakes] = useState<Set<string>>(new Set())

  // State for Engine Capacity Slider
  const [engineCapacityRange, setEngineCapacityRange] = useState<[number, number]>([1.0, 8.0])
  const [showEngineCapacitySlider, setShowEngineCapacitySlider] = useState(false)
  const [currentSliderEngineValues, setCurrentSliderEngineValues] = useState<[number, number]>([1.0, 8.0])

  // Refs for form inputs
  const minPriceInputRef = useRef<HTMLInputElement>(null)
  const maxPriceInputRef = useRef<HTMLInputElement>(null)
  const locationSelectRef = useRef<HTMLSelectElement>(null)
  const fuelTypeSelectRef = useRef<HTMLSelectElement>(null)
  const transmissionSelectRef = useRef<HTMLSelectElement>(null)
  const minYearSelectRef = useRef<HTMLSelectElement>(null)
  const maxYearSelectRef = useRef<HTMLSelectElement>(null)
  const minMileageInputRef = useRef<HTMLInputElement>(null)
  const maxMileageInputRef = useRef<HTMLInputElement>(null)
  const conditionSelectRef = useRef<HTMLSelectElement>(null)

  // Define the fetch function for useVehicleList
  const fetchVehicles = useCallback(async () => {
    console.log("🔄 [CarMarketplace] Fetching vehicles...")
    try {
      const result = await vehicleService.getVehicles()
      console.log("✅ [CarMarketplace] getVehicles returned:", result)
      
      let vehicles: Vehicle[] = []
      if (Array.isArray(result)) {
        vehicles = result
      } else if (result && typeof result === 'object' && result.vehicles) {
        vehicles = result.vehicles
      }
      
      console.log(`✅ [CarMarketplace] Parsed ${vehicles.length} vehicles`)
      
      // Build hierarchy from vehicles
      const hierarchy: VehicleHierarchy = {}
      vehicles.forEach(vehicle => {
        const { make, model } = vehicle
        
        if (make && model) {
          if (!hierarchy[make]) {
            hierarchy[make] = []
          }
          
          if (!hierarchy[make].includes(model)) {
            hierarchy[make].push(model)
          }
        }
      })
      
      // Sort models alphabetically
      Object.keys(hierarchy).forEach(make => {
        hierarchy[make].sort()
      })
      
      console.log("✅ [CarMarketplace] Built hierarchy:", Object.keys(hierarchy).length, "makes")
      
      return {
        vehicles,
        hierarchy,
        totalCount: vehicles.length,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error("❌ [CarMarketplace] Failed to fetch vehicles:", error)
      // Return empty structure instead of throwing
      return {
        vehicles: [],
        hierarchy: {},
        totalCount: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, [])

  // Use the vehicle list hook with caching
  const { 
    data: vehicleData, 
    loading, 
    error 
  } = useVehicleList(
    'home', // Cache key for home page
    fetchVehicles,
    {
      enabled: true,
      maxAge: 5 * 60 * 1000, // 5 minutes cache
      forceRefresh: false,
    }
  )

  console.log("📊 [CarMarketplace] useVehicleList state:", { 
    loading, 
    error, 
    dataLength: vehicleData?.vehicles?.length || 0,
    hasData: !!vehicleData,
    vehicleData
  })

  // Update local state when vehicleData changes
  useEffect(() => {
    if (vehicleData && vehicleData.hierarchy) {
      console.log("🔄 [CarMarketplace] Updating vehicleHierarchy from vehicleData")
      setVehicleHierarchy(vehicleData.hierarchy)
    }
  }, [vehicleData])

  // Check cache on mount to see if we have data
  useEffect(() => {
    const cachedData = getCachedList('home')
    if (cachedData && cachedData.hierarchy) {
      console.log("📦 [CarMarketplace] Found cached data, setting hierarchy")
      setVehicleHierarchy(cachedData.hierarchy)
    }
  }, [getCachedList])

  // Load saved vehicles data from database
  useEffect(() => {
    const loadSavedVehiclesData = async () => {
      if (!user?.id) return
      
      try {
        console.log("🔄 HomePage: Loading saved vehicles data for user:", user.id)
        const savedData = await vehicleService.getSavedVehicles(user.id)
        console.log("✅ HomePage: Loaded saved vehicles:", savedData)
        setSavedVehiclesData(savedData)
      } catch (error) {
        console.error("❌ HomePage: Error loading saved vehicles:", error)
        setSavedVehiclesData([])
      }
    }

    loadSavedVehiclesData()
  }, [user?.id, savedVehicles])

  // Restore cached form state on mount
  useEffect(() => {
    console.log("🔄 [CarMarketplace] Attempting to restore cached form state")
    
    const restored = restorePageState()
    if (restored) {
      console.log("✅ [CarMarketplace] Restored cached form state:", restored)
      
      // Restore form state from cache
      if (restored.selectedTerms) setSelectedTerms(restored.selectedTerms)
      if (restored.bodyType) setBodyType(restored.bodyType)
      if (restored.engineCapacityRange) {
        setEngineCapacityRange(restored.engineCapacityRange)
        setCurrentSliderEngineValues(restored.engineCapacityRange)
      }
      if (restored.searchTerm) setSearchTerm(restored.searchTerm)
      if (restored.currentSliderEngineValues) setCurrentSliderEngineValues(restored.currentSliderEngineValues)
      if (restored.showMoreOptions) setShowMoreOptions(restored.showMoreOptions)
      if (restored.expandedMakes) setExpandedMakes(new Set(restored.expandedMakes))
      
      // Restore input values
      if (restored.minPrice && minPriceInputRef.current) minPriceInputRef.current.value = restored.minPrice
      if (restored.maxPrice && maxPriceInputRef.current) maxPriceInputRef.current.value = restored.maxPrice
      if (restored.location && locationSelectRef.current) locationSelectRef.current.value = restored.location
      if (restored.fuelType && fuelTypeSelectRef.current) fuelTypeSelectRef.current.value = restored.fuelType
      if (restored.transmission && transmissionSelectRef.current) transmissionSelectRef.current.value = restored.transmission
      if (restored.minYear && minYearSelectRef.current) minYearSelectRef.current.value = restored.minYear
      if (restored.maxYear && maxYearSelectRef.current) maxYearSelectRef.current.value = restored.maxYear
      if (restored.minMileage && minMileageInputRef.current) minMileageInputRef.current.value = restored.minMileage
      if (restored.maxMileage && maxMileageInputRef.current) maxMileageInputRef.current.value = restored.maxMileage
      if (restored.condition && conditionSelectRef.current) conditionSelectRef.current.value = restored.condition
    }
  }, [restorePageState])

  // Save form state to cache when it changes
  useEffect(() => {
    if (!isSearchPage) return
    
    const formState: CachedFormState = {
      selectedTerms,
      bodyType,
      engineCapacityRange,
      searchTerm,
      currentSliderEngineValues,
      showMoreOptions,
      expandedMakes: Array.from(expandedMakes),
      // Capture current input values
      minPrice: minPriceInputRef.current?.value || '',
      maxPrice: maxPriceInputRef.current?.value || '',
      location: locationSelectRef.current?.value || '',
      fuelType: fuelTypeSelectRef.current?.value || '',
      transmission: transmissionSelectRef.current?.value || '',
      minYear: minYearSelectRef.current?.value || '',
      maxYear: maxYearSelectRef.current?.value || '',
      minMileage: minMileageInputRef.current?.value || '',
      maxMileage: maxMileageInputRef.current?.value || '',
      condition: conditionSelectRef.current?.value || ''
    }
    
    console.log("💾 [CarMarketplace] Saving form state to cache")
    savePageState(formState)
  }, [
    selectedTerms,
    bodyType,
    engineCapacityRange,
    searchTerm,
    currentSliderEngineValues,
    showMoreOptions,
    expandedMakes,
    isSearchPage,
    savePageState
  ])

  // Save vehicle data to route cache using the stabilized navigation cache
  useEffect(() => {
    if (vehicleData && vehicleData.vehicles && vehicleData.vehicles.length > 0) {
      console.log("💾 [CarMarketplace] Saving vehicle data to route cache")
      savePageState({
        vehicles: vehicleData.vehicles,
        hierarchy: vehicleData.hierarchy,
        lastUpdated: Date.now()
      })
    }
  }, [vehicleData, vehicleData?.hierarchy, savePageState])

  // Handle click outside for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setShowBodyTypes(false)
      }
      if (engineCapacityRef.current && !engineCapacityRef.current.contains(event.target as Node)) {
        if (showEngineCapacitySlider) {
          setEngineCapacityRange(currentSliderEngineValues)
          setShowEngineCapacitySlider(false)
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEngineCapacitySlider, currentSliderEngineValues])

  // Check if a make is selected
  const isMakeSelected = (make: string): boolean => {
    return selectedTerms.includes(make)
  }

  // Check if a model is selected
  const isModelSelected = (make: string, model: string): boolean => {
    return selectedTerms.includes(`${make} ${model}`)
  }

  // Hierarchical search functions (makes → models only)
  const toggleMakeExpansion = (make: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setExpandedMakes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(make)) {
        newSet.delete(make)
      } else {
        newSet.add(make)
      }
      return newSet
    })
  }

  const handleMakeSelect = (make: string) => {
    const term = make
    if (selectedTerms.includes(term)) {
      // Remove make and all its models
      const termsToRemove = [term, ...(vehicleHierarchy[make] || []).map(model => `${make} ${model}`)]
      setSelectedTerms(selectedTerms.filter(t => !termsToRemove.includes(t)))
    } else {
      // Add make only
      setSelectedTerms([...selectedTerms, term])
    }
    setSearchTerm("")
    setShowSuggestions(false)
  }

  const handleModelSelect = (make: string, model: string) => {
    const term = `${make} ${model}`
    if (selectedTerms.includes(term)) {
      // Remove model
      setSelectedTerms(selectedTerms.filter(t => t !== term))
      
      // If make was selected individually, keep it
      if (selectedTerms.includes(make)) {
        // Make remains selected
      }
    } else {
      // Add model
      setSelectedTerms([...selectedTerms, term])
      
      // If make was selected individually, remove it (since we're selecting specific models)
      if (selectedTerms.includes(make)) {
        setSelectedTerms(prev => prev.filter(t => t !== make).concat(term))
      }
    }
    setSearchTerm("")
    setShowSuggestions(false)
  }

  // Generate suggestions with hierarchy support
  const generateSuggestions = (input: string) => {
    if (!input.trim() || !vehicleData?.vehicles) {
      setSuggestions([])
      return
    }

    const lowerInput = input.toLowerCase()
    const uniqueSuggestions = new Set<string>()
    const abbrFull = MAKE_ABBREVIATIONS[lowerInput]

    vehicleData.vehicles.forEach((vehicle) => {
      if (vehicle.make && (
        vehicle.make.toLowerCase().includes(lowerInput) ||
        (abbrFull && vehicle.make.toLowerCase() === abbrFull.toLowerCase())
      )) {
        uniqueSuggestions.add(vehicle.make)
      }
      if (vehicle.make && vehicle.model) {
        const modelTerm = `${vehicle.make} ${vehicle.model}`
        if (
          modelTerm.toLowerCase().includes(lowerInput) ||
          (abbrFull && modelTerm.toLowerCase().includes(abbrFull.toLowerCase()))
        ) {
          uniqueSuggestions.add(modelTerm)
        }
      }
    })

    if (abbrFull && !uniqueSuggestions.has(abbrFull)) {
      uniqueSuggestions.add(abbrFull)
    }

    const filteredSuggestions = [...uniqueSuggestions].filter((s) => !selectedTerms.includes(s))
    setSuggestions(filteredSuggestions.slice(0, 5))
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    generateSuggestions(value)
    setShowSuggestions(true)
  }

  const removeSelectedTerm = (term: string) => {
    setSelectedTerms(selectedTerms.filter((t) => t !== term))
  }

  const handleSearch = () => {
    // Save current state before navigation
    console.log("💾 [CarMarketplace] Saving state before search navigation")
    savePageState({
      selectedTerms,
      bodyType,
      engineCapacityRange,
      searchTerm,
      currentSliderEngineValues,
      showMoreOptions,
      expandedMakes: Array.from(expandedMakes),
      minPrice: minPriceInputRef.current?.value || '',
      maxPrice: maxPriceInputRef.current?.value || '',
      location: locationSelectRef.current?.value || '',
      fuelType: fuelTypeSelectRef.current?.value || '',
      transmission: transmissionSelectRef.current?.value || '',
      minYear: minYearSelectRef.current?.value || '',
      maxYear: maxYearSelectRef.current?.value || '',
      minMileage: minMileageInputRef.current?.value || '',
      maxMileage: maxMileageInputRef.current?.value || '',
      condition: conditionSelectRef.current?.value || ''
    })

    const queryParams = new URLSearchParams()

    if (selectedTerms.length > 0) queryParams.set("query", selectedTerms.join(" "))
    if (minPriceInputRef.current?.value) queryParams.set("minPrice", minPriceInputRef.current.value.replace(/\D/g, ""))
    if (maxPriceInputRef.current?.value) queryParams.set("maxPrice", maxPriceInputRef.current.value.replace(/\D/g, ""))
    if (locationSelectRef.current?.value) queryParams.set("province", locationSelectRef.current.value)
    if (bodyType) queryParams.set("bodyType", bodyType)
    if (minYearSelectRef.current?.value) queryParams.set("minYear", minYearSelectRef.current.value)
    if (maxYearSelectRef.current?.value) queryParams.set("maxYear", maxYearSelectRef.current.value)
    if (minMileageInputRef.current?.value) queryParams.set("minMileage", minMileageInputRef.current.value.replace(/\D/g, ""))
    if (maxMileageInputRef.current?.value) queryParams.set("maxMileage", maxMileageInputRef.current.value.replace(/\D/g, ""))
    if (fuelTypeSelectRef.current?.value && fuelTypeSelectRef.current.value !== "All") queryParams.set("fuelType", fuelTypeSelectRef.current.value)
    if (transmissionSelectRef.current?.value && transmissionSelectRef.current.value !== "All")
      queryParams.set("transmission", transmissionSelectRef.current.value)
    queryParams.set("engineCapacityMin", engineCapacityRange[0].toFixed(1))
    queryParams.set("engineCapacityMax", engineCapacityRange[1].toFixed(1))

    router.push(`/results?${queryParams.toString()}`)
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (!selectedTerms.includes(suggestion)) {
      setSelectedTerms([...selectedTerms, suggestion])
    }
    setSearchTerm("")
    setSuggestions([])
    setShowSuggestions(false)
  }

  const formatEngineCapacityDisplay = (range: [number, number]): string => {
    if (range[0] === 1.0 && range[1] === 8.0) {
      return "All"
    }
    return `${range[0].toFixed(1)}L - ${range[1].toFixed(1)}L`
  }

  const handleApplyEngineCapacity = () => {
    setEngineCapacityRange(currentSliderEngineValues)
    setShowEngineCapacitySlider(false)
  }

  const handleMinEngineInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMin = Number.parseFloat(e.target.value)
    if (isNaN(newMin)) newMin = 1.0
    newMin = Math.max(1.0, Math.min(newMin, 8.0))
    setCurrentSliderEngineValues((prev) => [newMin, Math.max(newMin, prev[1])])
  }

  const handleMaxEngineInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMax = Number.parseFloat(e.target.value)
    if (isNaN(newMax)) newMax = 8.0
    newMax = Math.min(8.0, Math.max(newMax, 1.0))
    setCurrentSliderEngineValues((prev) => [Math.min(newMax, prev[0]), newMax])
  }

  const handleSliderValueChange = (newValues: number[]) => {
    setCurrentSliderEngineValues(newValues as [number, number])
  }

  const bodyTypes = [
    { name: "All body types", icon: CarIcon },
    { name: "Sedan", icon: CarIcon },
    { name: "SUV", icon: CarIcon },
    { name: "Truck", icon: Truck },
    { name: "Motorcycle", icon: Bike },
    { name: "Hatchback", icon: CarIcon },
    { name: "Convertible", icon: CarIcon },
  ]

  const handleSignOut = () => {
    setUser(null)
    router.push("/home")
  }

  // Navigation handlers using Next.js routing
  const navigationHandlers = useMemo(() => ({
    onLoginClick: () => router.push("/login"),
    onDashboardClick: () => router.push("/dashboard"),
    onGoHome: () => {
      setIsSearchPage(true)
      setSelectedVehicle(null)
      setSelectedProvince(null)
      // Save state when going home
      savePageState({
        selectedTerms,
        bodyType,
        engineCapacityRange,
        searchTerm,
        currentSliderEngineValues,
        showMoreOptions,
        expandedMakes: Array.from(expandedMakes)
      })
    },
    onShowAllCars: () => {
      // Save current form state before navigating
      savePageState({
        selectedTerms,
        bodyType,
        engineCapacityRange,
        searchTerm,
        currentSliderEngineValues,
        showMoreOptions,
        expandedMakes: Array.from(expandedMakes)
      })
      router.push("/results")
    },
    onGoToSellPage: () => {
      // Save state before navigating to sell page
      savePageState({
        selectedTerms,
        bodyType,
        engineCapacityRange,
        searchTerm,
        currentSliderEngineValues,
        showMoreOptions,
        expandedMakes: Array.from(expandedMakes)
      })
      router.push("/upload-vehicle")
    },
    onSignOut: handleSignOut,
  }), [router, selectedTerms, bodyType, engineCapacityRange, searchTerm, currentSliderEngineValues, showMoreOptions, expandedMakes, savePageState])

  // Handle vehicle selection with cache saving
  const handleVehicleSelect = (vehicle: Vehicle) => {
    // Save current form state before showing vehicle details
    savePageState({
      selectedTerms,
      bodyType,
      engineCapacityRange,
      searchTerm,
      currentSliderEngineValues,
      showMoreOptions,
      expandedMakes: Array.from(expandedMakes),
      minPrice: minPriceInputRef.current?.value || '',
      maxPrice: maxPriceInputRef.current?.value || '',
      location: locationSelectRef.current?.value || '',
      fuelType: fuelTypeSelectRef.current?.value || '',
      transmission: transmissionSelectRef.current?.value || '',
      minYear: minYearSelectRef.current?.value || '',
      maxYear: maxYearSelectRef.current?.value || '',
      minMileage: minMileageInputRef.current?.value || '',
      maxMileage: maxMileageInputRef.current?.value || '',
      condition: conditionSelectRef.current?.value || ''
    })
    
    // Set selected vehicle
    setSelectedVehicle(vehicle)
    setIsSearchPage(false)
  }

  // Handle province selection with cache saving
  const handleProvinceSelect = (province: string) => {
    // Save current form state before showing location page
    savePageState({
      selectedTerms,
      bodyType,
      engineCapacityRange,
      searchTerm,
      currentSliderEngineValues,
      showMoreOptions,
      expandedMakes: Array.from(expandedMakes)
    })
    
    // Set selected province
    setSelectedProvince(province)
    setIsSearchPage(false)
  }

  // Handle back from vehicle details or location page
  const handleBackFromDetail = () => {
    setSelectedVehicle(null)
    setSelectedProvince(null)
    setIsSearchPage(true)
    
    // Restore form state when coming back
    const restored = restorePageState()
    if (restored) {
      console.log("✅ [CarMarketplace] Restored form state after back navigation")
    }
  }

  // Routing Logic
  if (selectedProvince) {
    return (
      <>
        <Header user={user} {...navigationHandlers} />
        <div className="pt-16 md:pt-20">
          <LocationPage
            province={selectedProvince}
            vehicles={vehicleData?.vehicles || []}
            onBack={handleBackFromDetail}
            user={user}
            {...navigationHandlers}
          />
        </div>
      </>
    )
  }

  if (selectedVehicle) {
    return (
      <>
        <Header user={user} {...navigationHandlers} />
        <div className="pt-16 md:pt-20">
          <VehicleDetails
            vehicle={selectedVehicle}
            onBack={handleBackFromDetail}
            user={user}
            savedCars={savedVehiclesData}
            onSaveCar={() => toggleSaveVehicle(selectedVehicle)}
          />
        </div>
      </>
    )
  }

  // Render hierarchical dropdown with visual indicators and make selection
  const renderHierarchicalDropdown = () => {
    const makes = Object.keys(vehicleHierarchy).sort()
    
    return (
      <div className="absolute z-20 w-full bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
        {makes.map((make) => (
          <div key={make} className="border-b border-[#9FA791]/20 dark:border-[#4A4D45]/20 last:border-b-0">
            {/* Make Level */}
            <div 
              className="flex items-center justify-between px-4 py-3 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer"
              onClick={() => handleMakeSelect(make)}
            >
              <div className="flex items-center">
                {/* Visual indicator for make selection */}
                <div className="w-4 h-4 flex items-center justify-center mr-3">
                  {isMakeSelected(make) ? (
                    <div className="w-3 h-3 bg-[#FF6700] dark:bg-[#FF7D33] rounded-sm" />
                  ) : (
                    <div className="w-3 h-3 border border-[#9FA791] dark:border-[#4A4D45] rounded-sm" />
                  )}
                </div>
                <span className="font-medium text-[#3E5641] dark:text-white">{make}</span>
              </div>
              <div 
                className="flex items-center"
                onClick={(e) => toggleMakeExpansion(make, e)}
              >
                <span className="text-sm text-[#6F7F69] dark:text-gray-400 mr-2">
                  Models
                </span>
                <ChevronRight 
                  className={`w-4 h-4 transition-transform ${expandedMakes.has(make) ? 'rotate-90' : ''}`} 
                />
              </div>
            </div>
            
            {/* Models Level */}
            {expandedMakes.has(make) && (
              <div className="ml-6 border-l border-[#9FA791]/20 dark:border-[#4A4D45]/20">
                {vehicleHierarchy[make].map((model) => (
                  <div 
                    key={model}
                    className="flex items-center px-4 py-2 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleModelSelect(make, model)
                    }}
                  >
                    {/* Visual indicator for model selection */}
                    <div className="w-4 h-4 flex items-center justify-center mr-3">
                      {isModelSelected(make, model) ? (
                        <div className="w-2 h-2 bg-[#FF6700] dark:bg-[#FF7D33] rounded-full" />
                      ) : (
                        <div className="w-2 h-2 border border-[#9FA791] dark:border-[#4A4D45] rounded-full" />
                      )}
                    </div>
                    <span className="text-[#3E5641] dark:text-white">{model}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {makes.length === 0 && !loading && (
          <div className="px-4 py-3 text-[#6F7F69] dark:text-gray-400 text-center">
            No vehicles found in database
          </div>
        )}
        
        {loading && (
          <div className="px-4 py-3 text-[#6F7F69] dark:text-gray-400 text-center">
            Loading vehicles...
          </div>
        )}
      </div>
    )
  }

  // Main Search Page or Results Page
  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
      <Header user={user} {...navigationHandlers} transparent={isSearchPage} />

      {isSearchPage ? (
        // Search Page View
        <div className="flex flex-col">
          {/* Hero Search Section with Background Image & Glass Card */}
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative">
            {/* Background Image with Rounded Bottom */}
            <div className="absolute inset-0 overflow-hidden rounded-b-[50px]">
              <img 
                src="/home-page.png" 
                alt="Car marketplace hero" 
                className="w-full h-full object-cover"
              />
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60"></div>
            </div>

            {/* Content - Now positioned above the image */}
            <div className="relative z-10 text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
                Find Your Perfect Car
              </h1>
              <p className="text-xl opacity-90 text-white drop-shadow-md">
                Search from thousands of vehicles across South Africa
              </p>
            </div>

            {/* Search Card with Glass Effect */}
            <div className="relative z-10 bg-white/80 dark:bg-[#1F2B20]/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-xl max-w-3xl w-full border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
              {/* Search Input with Hierarchical Dropdown */}
              <div className="mb-4 relative" ref={searchRef}>
                <label htmlFor="search-input" className="sr-only">
                  Search Make, Model and Variant
                </label>
                <div className="flex flex-wrap items-center gap-2 p-3 border border-[#9FA791] dark:border-[#4A4D45] rounded-lg focus-within:border-[#FF6700] dark:focus-within:border-[#FF7D33] mb-2 bg-white dark:bg-[#2A352A]">
                  {selectedTerms.map((term, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-[#FFF8E0] dark:bg-[#3E5641] px-3 py-1.5 rounded-full text-sm text-[#3E5641] dark:text-white"
                    >
                      <span>{term}</span>
                      <button
                        onClick={() => removeSelectedTerm(term)}
                        className="ml-2 hover:text-[#FF6700] dark:hover:text-[#FF7D33] focus:outline-none"
                        aria-label={`Remove ${term}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <input
                    id="search-input"
                    type="text"
                    placeholder={selectedTerms.length > 0 ? "" : "Search Make, Model, Variant..."}
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    className="flex-1 min-w-[150px] px-2 py-1 focus:outline-none bg-transparent text-[#3E5641] dark:text-white placeholder-[#6F7F69] dark:placeholder-gray-400"
                  />
                </div>

                {/* Hierarchical Dropdown */}
                {showSuggestions && renderHierarchicalDropdown()}

                {/* Fallback to old suggestions if no hierarchy data */}
                {showSuggestions && suggestions.length > 0 && Object.keys(vehicleHierarchy).length === 0 && (
                  <div className="absolute z-20 w-full bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer text-[#3E5641] dark:text-white"
                        onClick={() => handleSuggestionClick(suggestion)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filters & Buttons - Responsive Layout */}
              <div className="flex flex-col">
                {/* Button Row (always visible, order controlled for desktop) */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 order-1 sm:order-2">
                  <button
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    className="border border-[#FF6700] text-[#FF6700] dark:border-[#FF7D33] dark:text-[#FF7D33] px-4 py-3 rounded-lg w-full sm:w-auto sm:flex-1 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] transition-colors font-medium"
                    aria-controls="more-options-section"
                    aria-expanded={showMoreOptions}
                  >
                    {showMoreOptions ? "Fewer Options" : "More Options"}
                  </button>
                  <button
                    onClick={handleSearch}
                    className="bg-[#FF6700] text-white dark:bg-[#FF7D33] px-4 py-3 rounded-lg w-full sm:w-auto sm:flex-[2] hover:bg-[#FF6700]/90 dark:hover:bg-[#FF7D33]/90 transition-colors flex items-center justify-center font-medium"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Search Cars
                  </button>
                </div>

                {/* Filters Grid (hidden on mobile unless showMoreOptions is true) */}
                <div 
                  className={`
                    grid grid-cols-1 md:grid-cols-4 gap-4 mb-6
                    ${showMoreOptions ? 'block' : 'hidden'} 
                    sm:grid order-2 sm:order-1
                  `}
                >
                  <input
                    ref={minPriceInputRef}
                    id="min-price-input"
                    type="number"
                    placeholder="Min Price"
                    className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white text-sm"
                    min="0"
                    step="1000"
                  />
                  <input
                    ref={maxPriceInputRef}
                    id="max-price-input"
                    type="number"
                    placeholder="Max Price"
                    className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white text-sm"
                    min="0"
                    step="1000"
                  />
                  <select
                    ref={locationSelectRef}
                    id="location-select"
                    className="w-full px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] appearance-none bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                    defaultValue=""
                  >
                    <option value="">Location (All)</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="Gauteng">Gauteng</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="North West">North West</option>
                    <option value="Northern Cape">Northern Cape</option>
                    <option value="Limpopo">Limpopo</option>
                  </select>
                  {/* Body Type Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBodyTypes(!showBodyTypes)}
                      className="w-full px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] text-left flex justify-between items-center bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                      aria-haspopup="listbox"
                      aria-expanded={showBodyTypes}
                    >
                      {bodyType || "All body types"}
                      <ChevronDown className={`w-4 h-4 transition-transform ${showBodyTypes ? "rotate-180" : ""}`} />
                    </button>

                    {showBodyTypes && (
                      <div
                        className="absolute z-20 w-full bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto"
                        role="listbox"
                      >
                        {bodyTypes.map((type, index) => (
                          <div
                            key={index}
                            className="px-4 py-3 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer flex items-center text-[#3E5641] dark:text-white"
                            onClick={() => {
                              setBodyType(type.name === "All body types" ? "" : type.name)
                              setShowBodyTypes(false)
                            }}
                            role="option"
                            aria-selected={bodyType === type.name}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <type.icon className="w-4 h-4 mr-2 opacity-70" />
                            {type.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* More Options Section (advanced filters) */}
                {showMoreOptions && (
                  <div
                    id="more-options-section"
                    className="border-t border-[#9FA791]/20 dark:border-[#4A4D45]/20 pt-6 order-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* Min/Max Year */}
                      <div className="flex flex-col">
                        <label
                          htmlFor="min-year-select"
                          className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300"
                        >
                          Min Year
                        </label>
                        <select
                          ref={minYearSelectRef}
                          id="min-year-select"
                          className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                        >
                          <option value="">Any</option>
                          {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label
                          htmlFor="max-year-select"
                          className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300"
                        >
                          Max Year
                        </label>
                        <select
                          ref={maxYearSelectRef}
                          id="max-year-select"
                          className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                        >
                          <option value="">Any</option>
                          {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Min/Max Mileage */}
                      <div className="flex flex-col">
                        <label
                          htmlFor="min-mileage-input"
                          className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300"
                        >
                          Min Mileage
                        </label>
                        <input
                          ref={minMileageInputRef}
                          id="min-mileage-input"
                          type="number"
                          placeholder="e.g., 10000"
                          min="0"
                          step="1000"
                          className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white placeholder-[#6F7F69] dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label
                          htmlFor="max-mileage-input"
                          className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300"
                        >
                          Max Mileage
                        </label>
                        <input
                          ref={maxMileageInputRef}
                          id="max-mileage-input"
                          type="number"
                          placeholder="e.g., 100000"
                          min="0"
                          step="1000"
                          className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white placeholder-[#6F7F69] dark:placeholder-gray-400"
                        />
                      </div>
                      {/* Fuel Type */}
                      <div className="flex flex-col">
                        <label
                          htmlFor="fuel-type-select"
                          className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300"
                        >
                          Fuel Type
                        </label>
                        <select
                          ref={fuelTypeSelectRef}
                          id="fuel-type-select"
                          className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                        >
                          <option value="All">All</option>
                          <option value="Petrol">Petrol</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>
                      {/* Engine Capacity Slider */}
                      <div className="relative flex flex-col" ref={engineCapacityRef}>
                        <label className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300">
                          Engine Capacity
                        </label>
                        <button
                          onClick={() => {
                            setCurrentSliderEngineValues(engineCapacityRange)
                            setShowEngineCapacitySlider(!showEngineCapacitySlider)
                          }}
                          className="w-full px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] text-left flex justify-between items-center bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                          aria-haspopup="true"
                          aria-expanded={showEngineCapacitySlider}
                        >
                          {formatEngineCapacityDisplay(engineCapacityRange)}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${showEngineCapacitySlider ? "rotate-180" : ""}`}
                          />
                        </button>

                        {showEngineCapacitySlider && (
                          <div className="absolute z-30 mt-1 w-full md:w-[320px] bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-lg shadow-xl p-5 top-full right-0 md:left-0 md:right-auto">
                            <div className="mb-4 text-center">
                              <span className="font-bold text-xl text-[#3E5641] dark:text-white">
                                {currentSliderEngineValues[0].toFixed(1)}L
                              </span>
                              <span className="text-xl text-[#6F7F69] dark:text-gray-400"> - </span>
                              <span className="font-bold text-xl text-[#3E5641] dark:text-white">
                                {currentSliderEngineValues[1].toFixed(1)}L
                              </span>
                            </div>

                            <SliderPrimitive.Root
                              value={currentSliderEngineValues}
                              onValueChange={handleSliderValueChange}
                              min={1.0}
                              max={8.0}
                              step={0.1}
                              minStepsBetweenThumbs={0}
                              className="relative flex w-full touch-none select-none items-center h-10"
                            >
                              <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[#9FA791]/40 dark:bg-[#4A4D45]/60">
                                <SliderPrimitive.Range className="absolute h-full bg-[#FF6700] dark:bg-[#FF7D33]" />
                              </SliderPrimitive.Track>
                              {[0, 1].map((thumbIndex) => (
                                <SliderPrimitive.Thumb
                                  key={thumbIndex}
                                  aria-label={thumbIndex === 0 ? "Minimum engine capacity" : "Maximum engine capacity"}
                                  className="block h-6 w-6 rounded-full border-2 border-[#FF6700] dark:border-[#FF7D33] bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6700]/50 dark:focus-visible:ring-[#FF7D33]/50 focus-visible:ring-offset-2 cursor-grab active:cursor-grabbing"
                                />
                              ))}
                            </SliderPrimitive.Root>

                            <div className="mt-5 flex gap-4">
                              <input
                                id="min-engine-input"
                                type="number"
                                value={currentSliderEngineValues[0].toFixed(1)}
                                onChange={handleMinEngineInputChange}
                                min="1.0"
                                max="8.0"
                                step="0.1"
                                className="w-full px-3 py-2 rounded-md border border-[#9FA791] dark:border-[#4A4D45] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white text-sm focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33]"
                                placeholder="Min L"
                              />
                              <input
                                id="max-engine-input"
                                type="number"
                                value={currentSliderEngineValues[1].toFixed(1)}
                                onChange={handleMaxEngineInputChange}
                                min="1.0"
                                max="8.0"
                                step="0.1"
                                className="w-full px-3 py-2 rounded-md border border-[#9FA791] dark:border-[#4A4D45] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white text-sm focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33]"
                                placeholder="Max L"
                              />
                            </div>

                            <button
                              onClick={handleApplyEngineCapacity}
                              className="mt-5 w-full bg-[#FF6700] text-white dark:bg-[#FF7D33] px-4 py-2.5 rounded-lg hover:bg-[#FF6700]/90 dark:hover:bg-[#FF7D33]/90 transition-colors font-medium text-sm"
                            >
                              Apply Range
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Transmission */}
                      <div className="flex flex-col">
                        <label
                          htmlFor="transmission-select"
                          className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300"
                        >
                          Transmission
                        </label>
                        <select
                          ref={transmissionSelectRef}
                          id="transmission-select"
                          className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                        >
                          <option value="All">All</option>
                          <option value="Manual">Manual</option>
                          <option value="Automatic">Automatic</option>
                        </select>
                      </div>
                      {/* Condition */}
                      <div className="flex flex-col">
                        <label
                          htmlFor="condition-select"
                          className="mb-1 font-medium text-sm text-[#6F7F69] dark:text-gray-300"
                        >
                          Condition
                        </label>
                        <select
                          ref={conditionSelectRef}
                          id="condition-select"
                          className="px-4 py-3 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                        >
                          <option value="All">All</option>
                          <option value="New">New</option>
                          <option value="Used">Used</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Featured Vehicles Section */}
          <div className="py-16 px-4 bg-white dark:bg-[#1F2B20]">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4 text-[#3E5641] dark:text-white">Featured Vehicles</h2>
                <p className="text-lg opacity-80 max-w-2xl mx-auto text-[#6F7F69] dark:text-gray-300">
                  Discover our handpicked selection of premium vehicles available across South Africa
                </p>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6700]"></div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-lg text-red-500">Error loading vehicles: {error}</p>
                </div>
              ) : vehicleData?.vehicles && vehicleData.vehicles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {vehicleData.vehicles
                    .slice(0, 8)
                    .map((vehicle) => (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        onViewDetails={() => handleVehicleSelect(vehicle)}
                        isSaved={savedVehiclesData.some((saved) => saved.id === vehicle.id)}
                        onToggleSave={() => toggleSaveVehicle(vehicle)}
                        isLoggedIn={!!user}
                      />
                    ))}
                </div>
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-lg text-[#6F7F69] dark:text-gray-300">
                    {loading ? "Loading vehicles..." : "No vehicles available at the moment."}
                  </p>
                </div>
              )}

              <div className="text-center mt-12">
                <button
                  onClick={() => navigationHandlers.onShowAllCars()}
                  className="bg-[#3E5641] dark:bg-[#4A4D45] text-white px-6 py-3 rounded-lg hover:bg-[#3E5641]/90 dark:hover:bg-[#4A4D45]/90 transition-colors font-medium"
                >
                  View All Vehicles
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-[#3E5641] dark:bg-[#1F2B20] py-8 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-4 text-[#FF6700] dark:text-[#FF7D33]">imoto</h3>
                  <p className="text-sm text-gray-300">The simplest way to buy or sell your car in South Africa.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-gray-200">Quick Links</h4>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => {
                          setIsSearchPage(true)
                          window.scrollTo(0, 0)
                          // Save current state
                          savePageState({
                            selectedTerms,
                            bodyType,
                            engineCapacityRange,
                            searchTerm,
                            currentSliderEngineValues,
                            showMoreOptions,
                            expandedMakes: Array.from(expandedMakes)
                          })
                        }}
                        className="text-sm text-gray-300 hover:text-[#FF7D33] text-left"
                      >
                        Buy a Car
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigationHandlers.onGoToSellPage()}
                        className="text-sm text-gray-300 hover:text-[#FF7D33] text-left"
                      >
                        Sell a Car
                      </button>
                    </li>
                    <li>
                      <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">
                        Value My Car
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">
                        Car Finance
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-gray-200">About Us</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">
                        Our Story
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">
                        Careers
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">
                        Press
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-sm text-[#FF7D33]">
                        Contact Us
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-gray-200">Connect With Us</h4>
                  <div className="flex space-x-4">
                    <a href="#" className="text-gray-300 hover:text-[#FF7D33]">
                      <Facebook className="w-6 h-6" />
                    </a>
                    <a href="#" className="text-gray-300 hover:text-[#FF7D33]">
                      <Instagram className="w-6 h-6" />
                    </a>
                    <a href="#" className="text-gray-300 hover:text-[#FF7D33]">
                      <Twitter className="w-6 h-6" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-[#576B55]/50 dark:border-[#2A352A]/50 text-center text-sm text-gray-400">
                <p>&copy; {new Date().getFullYear()} imoto. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      ) : null}
    </div>
  )
}
