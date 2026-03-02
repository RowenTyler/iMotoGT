"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useRef, useEffect, type ElementType, useCallback } from "react"
import {
  Camera,
  Save,
  AlertCircle,
  XCircle,
  Edit,
  Check,
  Grip,
  Car,
  Truck,
  Bike,
  Maximize2,
  Minimize2,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/ui/header"
import type { UserProfile } from "@/types/user"
import type { Vehicle } from "@/types/vehicle"
import { useUser } from "@/components/UserContext"
import { vehicleService } from "@/lib/vehicle-service"

interface HeaderPropsOverride {
  onLoginClick?: () => void
  onDashboardClick?: () => void
  onGoHome?: () => void
  onShowAllCars?: () => void
  onGoToSellPage?: () => void
  onSignOut?: () => void
}

interface UploadVehicleProps {
  user?: UserProfile
  onBack?: () => void
  onVehicleSubmit?: (vehicleData: any) => Promise<void>
  onSaveProfile?: (updatedProfile: Partial<UserProfile>) => Promise<void>
  onSignOut?: () => void
  HeaderPropsOverride?: HeaderPropsOverride
  editMode?: boolean
  existingVehicle?: Vehicle
  onVehicleUpdate?: (vehicle: Vehicle) => void
  onCancel?: () => void
}

interface VehicleData {
  [make: string]: {
    displayName: string
    models: Array<{
      name: string
      vehicleType: string[]
      fuelTypes: string[]
    }>
  }
}

interface VehicleMake {
  key: string
  displayName: string
}

interface VehicleModel {
  name: string
  vehicleType: string[]
  fuelTypes: string[]
}

const generateEngineCapacityOptions = () => {
  const options = []
  for (let i = 0.8; i <= 8.0; i += 0.1) {
    const value = `${i.toFixed(1)}L`
    options.push({ value, label: value })
  }
  options.push({ value: "8.0L+", label: "8.0L+" })
  return options
}
const engineCapacityOptionsList = generateEngineCapacityOptions()

const bodyTypeOptionsList: { value: string; label: string; IconComponent: ElementType }[] = [
  { value: "Sedan", label: "Sedan", IconComponent: Car },
  { value: "SUV", label: "SUV (Sport Utility Vehicle)", IconComponent: Car },
  { value: "Hatchback", label: "Hatchback", IconComponent: Car },
  { value: "Bakkie", label: "Bakkie / Pick-up", IconComponent: Truck },
  { value: "Double Cab", label: "Double Cab Bakkie", IconComponent: Truck },
  { value: "Extended Cab", label: "Extended Cab Bakkie", IconComponent: Truck },
  { value: "Single Cab", label: "Single Cab Bakkie", IconComponent: Truck },
  { value: "Coupe", label: "Coupe", IconComponent: Car },
  { value: "Convertible", label: "Convertible / Cabriolet", IconComponent: Car },
  { value: "Minivan", label: "Minivan / MPV", IconComponent: Car },
  { value: "Panel Van", label: "Panel Van", IconComponent: Truck },
  { value: "Minibus", label: "Minibus / Kombi", IconComponent: Car },
  { value: "Bus", label: "Bus", IconComponent: Car },
  { value: "Motorcycle", label: "Motorcycle", IconComponent: Bike },
  { value: "Scooter", label: "Scooter", IconComponent: Bike },
  { value: "Off-road", label: "Off-road / 4x4 Vehicle", IconComponent: Car },
  { value: "Station Wagon", label: "Station Wagon", IconComponent: Car },
]

export default function UploadVehicle({
  user: propUser,
  onBack,
  onVehicleSubmit,
  onSaveProfile,
  onSignOut,
  HeaderPropsOverride,
  editMode = false,
  existingVehicle,
  onVehicleUpdate,
  onCancel,
}: UploadVehicleProps) {
  const router = useRouter()
  const { user: authUser, userProfile, isLoading: userLoading, refreshUserProfile } = useUser()
  const user = propUser || userProfile || authUser
  const profile = userProfile || propUser || authUser

  const isProfileIncomplete =
    !profile?.firstName ||
    !profile?.lastName ||
    !profile?.phone ||
    !profile?.suburb ||
    !profile?.city ||
    !profile?.province

  const handleLogin = HeaderPropsOverride?.onLoginClick ?? (() => router.push("/login"))
  const handleDashboard =
    HeaderPropsOverride?.onDashboardClick ?? (() => (user ? router.push("/dashboard") : router.push("/login")))
  const handleGoHome = HeaderPropsOverride?.onGoHome ?? (() => router.push("/"))
  const handleShowAllCars = HeaderPropsOverride?.onShowAllCars ?? (() => router.push("/"))
  const handleGoToSell =
    HeaderPropsOverride?.onGoToSellPage ??
    (() =>
      user
        ? router.push("/upload-vehicle")
        : router.push({ pathname: "/login", query: { next: "/upload-vehicle" } } as any))
  const handleSignOutClick =
    HeaderPropsOverride?.onSignOut ??
    (() => {
      if (onSignOut) onSignOut()
      router.push("/login")
    })

  // State for vehicle data
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null)
  const [makesList, setMakesList] = useState<VehicleMake[]>([])
  const [filteredMakes, setFilteredMakes] = useState<VehicleMake[]>([])
  const [selectedMakeKey, setSelectedMakeKey] = useState<string>("")
  const [modelsList, setModelsList] = useState<VehicleModel[]>([])
  const [filteredModels, setFilteredModels] = useState<VehicleModel[]>([])

  const [vehicleImages, setVehicleImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [isImageCardExpanded, setIsImageCardExpanded] = useState(false)
  const [contactPrivacyEnabled, setContactPrivacyEnabled] = useState(false)

  const imageGridRef = useRef<HTMLDivElement>(null)
  const expandedGridRef = useRef<HTMLDivElement>(null)
  const dragItemRef = useRef<HTMLDivElement | null>(null)

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    price: "",
    mileage: "",
    transmission: "",
    fuel: "",
    engineCapacity: "",
    bodyType: "",
    variant: "",
    description: "",
    condition: "good",
    sellerName:
      profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile?.firstName || profile?.lastName || profile?.email?.split("@")[0] || "",
    sellerEmail: profile?.email || "",
    sellerPhone: profile?.phone || "",
    sellerSuburb: profile?.suburb || "",
    sellerCity: profile?.city || "",
    sellerProvince: profile?.province || "",
    sellerProfilePic: profile?.profilePic || "",
    contactPrivacyEnabled: false,
  })

  const [userClickedEdit, setUserClickedEdit] = useState(false)
  const isEditingSeller = isProfileIncomplete || userClickedEdit
  const [sellerFormData, setSellerFormData] = useState({
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    phone: profile?.phone || "",
    suburb: profile?.suburb || "",
    city: profile?.city || "",
    province: profile?.province || "",
    profilePic: profile?.profilePic || "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const engineCapacityRef = useRef<HTMLDivElement>(null)
  const bodyTypeRef = useRef<HTMLDivElement>(null)
  const makeRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const [engineCapacitySearch, setEngineCapacitySearch] = useState("")
  const [engineCapacityFiltered, setEngineCapacityFiltered] = useState(engineCapacityOptionsList)
  const [showEngineCapacityDropdown, setShowEngineCapacityDropdown] = useState(false)
  const [bodyTypeSearch, setBodyTypeSearch] = useState("")
  const [bodyTypeFiltered, setBodyTypeFiltered] = useState(bodyTypeOptionsList)
  const [showBodyTypeDropdown, setShowBodyTypeDropdown] = useState(false)
  const [showMakeDropdown, setShowMakeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  // Normalize make name for comparison (lowercase, remove special chars, trim)
  const normalizeMakeName = (make: string): string => {
    return make
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim()
  }

  // Normalize model name for comparison
  const normalizeModelName = (model: string): string => {
    return model
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim()
  }

  // Find canonical make from user input
  const findCanonicalMake = (input: string): VehicleMake | null => {
    if (!input.trim() || !vehicleData) return null

    const normalizedInput = normalizeMakeName(input)

    // First try exact key match
    if (vehicleData[normalizedInput]) {
      return { key: normalizedInput, displayName: vehicleData[normalizedInput].displayName }
    }

    // Try case-insensitive match in display names
    for (const [key, data] of Object.entries(vehicleData)) {
      if (normalizeMakeName(data.displayName) === normalizedInput) {
        return { key, displayName: data.displayName }
      }
    }

    // Try fuzzy matching (simple contains check)
    for (const [key, data] of Object.entries(vehicleData)) {
      if (
        data.displayName.toLowerCase().includes(input.toLowerCase()) ||
        key.toLowerCase().includes(input.toLowerCase())
      ) {
        return { key, displayName: data.displayName }
      }
    }

    return null
  }

  // Find canonical model from user input
  const findCanonicalModel = (input: string, makeKey: string): VehicleModel | null => {
    if (!input.trim() || !vehicleData || !vehicleData[makeKey]) return null

    const normalizedInput = normalizeModelName(input)
    const models = vehicleData[makeKey].models

    // First try exact match
    const exactMatch = models.find((model) => normalizeModelName(model.name) === normalizedInput)
    if (exactMatch) return exactMatch

    // Try case-insensitive match
    const caseInsensitiveMatch = models.find((model) => model.name.toLowerCase() === input.toLowerCase())
    if (caseInsensitiveMatch) return caseInsensitiveMatch

    // Try fuzzy matching (contains)
    const fuzzyMatch = models.find((model) => model.name.toLowerCase().includes(input.toLowerCase()))

    return fuzzyMatch || null
  }

  // Load vehicle data on component mount
  useEffect(() => {
    const loadVehicleData = async () => {
      try {
        const response = await fetch("/vehicle-data.json")
        if (!response.ok) throw new Error("Failed to load vehicle data")
        const data = await response.json()
        setVehicleData(data)

        // Create makes list from vehicle data
        const makes = Object.entries(data).map(([key, value]) => ({
          key,
          displayName: (value as any).displayName || key.charAt(0).toUpperCase() + key.slice(1),
        }))
        setMakesList(makes)
        setFilteredMakes(makes)
      } catch (error) {
        console.error("Error loading vehicle data:", error)
        // Fallback to empty data
        setVehicleData({})
        setMakesList([])
        setFilteredMakes([])
      }
    }

    loadVehicleData()
  }, [])

  useEffect(() => {
    if (editMode && existingVehicle) {
      setFormData({
        make: existingVehicle.make || "",
        model: existingVehicle.model || "",
        year: existingVehicle.year?.toString() || "",
        price: existingVehicle.price?.toString() || "",
        mileage: existingVehicle.mileage?.toString() || "",
        transmission: existingVehicle.transmission || "",
        fuel: existingVehicle.fuel || "",
        engineCapacity: existingVehicle.engine_capacity || "",
        bodyType: existingVehicle.body_type || "",
        variant: existingVehicle.variant || "",
        description: existingVehicle.description || "",
        condition: existingVehicle.condition || "good",
        sellerName: existingVehicle.seller_name || "",
        sellerEmail: existingVehicle.seller_email || "",
        sellerPhone: existingVehicle.seller_phone || "",
        sellerSuburb: existingVehicle.seller_suburb || "",
        sellerCity: existingVehicle.seller_city || "",
        sellerProvince: existingVehicle.seller_province || "",
        sellerProfilePic: existingVehicle.seller_profile_pic || "",
        contactPrivacyEnabled: existingVehicle.contact_privacy || false,
      })

      setContactPrivacyEnabled(existingVehicle.contact_privacy || false)

      if (existingVehicle.images && existingVehicle.images.length > 0) {
        setVehicleImages(existingVehicle.images)
      }
    }
  }, [editMode, existingVehicle])

  // When vehicle data loads and we have existing vehicle in edit mode, find the make
  useEffect(() => {
    if (editMode && existingVehicle && vehicleData && formData.make) {
      const canonicalMake = findCanonicalMake(formData.make)
      if (canonicalMake) {
        setSelectedMakeKey(canonicalMake.key)
        setModelsList(vehicleData[canonicalMake.key]?.models || [])
        setFilteredModels(vehicleData[canonicalMake.key]?.models || [])

        // Try to find the model
        if (formData.model && vehicleData[canonicalMake.key]) {
          const canonicalModel = findCanonicalModel(formData.model, canonicalMake.key)
          if (canonicalModel) {
            setFormData((prev) => ({ ...prev, model: canonicalModel.name }))
          }
        }
      }
    }
  }, [editMode, existingVehicle, vehicleData, formData.make, formData.model])

  useEffect(() => {
    if (userProfile) {
      setSellerFormData({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        phone: userProfile.phone || "",
        suburb: userProfile.suburb || "",
        city: userProfile.city || "",
        province: userProfile.province || "",
        profilePic: userProfile.profilePic || "",
      })
      setFormData((prev) => ({
        ...prev,
        sellerName:
          `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() ||
          userProfile.email?.split("@")[0] ||
          "",
        sellerEmail: userProfile.email || "",
        sellerPhone: userProfile.phone || "",
        sellerSuburb: userProfile.suburb || "",
        sellerCity: userProfile.city || "",
        sellerProvince: userProfile.province || "",
        sellerProfilePic: userProfile.profilePic || "",
      }))
    }
  }, [userProfile])

  useEffect(() => {
    const selectedEngineOption = engineCapacityOptionsList.find((opt) => opt.value === formData.engineCapacity)
    setEngineCapacitySearch(selectedEngineOption ? selectedEngineOption.label : formData.engineCapacity || "")
  }, [formData.engineCapacity])

  useEffect(() => {
    const selectedBodyTypeOption = bodyTypeOptionsList.find((opt) => opt.value === formData.bodyType)
    setBodyTypeSearch(selectedBodyTypeOption ? selectedBodyTypeOption.label : formData.bodyType || "")
  }, [formData.bodyType])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (engineCapacityRef.current && !engineCapacityRef.current.contains(event.target as Node)) {
        setShowEngineCapacityDropdown(false)
      }
      if (bodyTypeRef.current && !bodyTypeRef.current.contains(event.target as Node)) {
        setShowBodyTypeDropdown(false)
      }
      if (makeRef.current && !makeRef.current.contains(event.target as Node)) {
        setShowMakeDropdown(false)
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      contactPrivacyEnabled: contactPrivacyEnabled,
    }))
  }, [contactPrivacyEnabled])

  // Handle make input change with autocomplete
  const handleMakeInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value
    setFormData((prev) => ({ ...prev, make: inputValue }))
    setSubmitError(null)

    // Reset model if make changes
    if (selectedMakeKey) {
      setFormData((prev) => ({ ...prev, model: "" }))
      setSelectedMakeKey("")
      setModelsList([])
      setFilteredModels([])
    }

    // Filter makes based on input
    if (inputValue.trim() === "") {
      setFilteredMakes(makesList)
    } else {
      const filtered = makesList.filter(
        (make) =>
          make.displayName.toLowerCase().includes(inputValue.toLowerCase()) ||
          make.key.toLowerCase().includes(inputValue.toLowerCase()),
      )
      setFilteredMakes(filtered)
    }

    setShowMakeDropdown(true)
  }

  // Handle make selection
  const handleMakeSelect = (make: VehicleMake) => {
    setFormData((prev) => ({ ...prev, make: make.displayName }))
    setSelectedMakeKey(make.key)
    setShowMakeDropdown(false)

    // Update models list for selected make
    if (vehicleData && vehicleData[make.key]) {
      const models = vehicleData[make.key].models || []
      setModelsList(models)
      setFilteredModels(models)
    } else {
      setModelsList([])
      setFilteredModels([])
    }

    // Clear model field
    setFormData((prev) => ({ ...prev, model: "" }))
    setSubmitError(null)
  }

  // Handle model input change with autocomplete
  const handleModelInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value
    setFormData((prev) => ({ ...prev, model: inputValue }))
    setSubmitError(null)

    // Filter models based on input
    if (inputValue.trim() === "" || !modelsList.length) {
      setFilteredModels(modelsList)
    } else {
      const filtered = modelsList.filter((model) => model.name.toLowerCase().includes(inputValue.toLowerCase()))
      setFilteredModels(filtered)
    }

    setShowModelDropdown(true)
  }

  // Handle model selection
  const handleModelSelect = (model: VehicleModel) => {
    setFormData((prev) => ({ ...prev, model: model.name }))
    setShowModelDropdown(false)
    setSubmitError(null)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target

    // Handle make and model separately
    if (name === "make") {
      handleMakeInputChange(event as React.ChangeEvent<HTMLInputElement>)
    } else if (name === "model") {
      handleModelInputChange(event as React.ChangeEvent<HTMLInputElement>)
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
      setSubmitError(null)
    }
  }

  const formatPriceForDisplay = (rawValue: string | undefined): string => {
    if (rawValue === undefined || rawValue === null || rawValue.trim() === "") return ""
    if (rawValue === ".") return "R 0."
    const parts = rawValue.split(".")
    const integerPart = parts[0]
    const decimalPart = parts.length > 1 ? parts[1] : ""
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    return `R ${formattedInteger || "0"}.${decimalPart.padEnd(2, "0")}`
  }

  const handlePriceInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value
    const previousRawPrice = formData.price || ""
    let newRawPrice = ""
    const condensedValue = inputValue.replace(/^R\s*/, "").replace(/\s/g, "")

    if (inputValue.trim() === "" || inputValue.trim().toLowerCase() === "r") {
      newRawPrice = ""
    } else if (condensedValue === ".") {
      newRawPrice = "0."
    } else {
      const prevIsInteger = !previousRawPrice.includes(".")
      const escapedPrevRawPrice = previousRawPrice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const pattern = new RegExp(`^${escapedPrevRawPrice}\\.00(\\d)$`)
      const specificMatch = condensedValue.match(pattern)

      if (prevIsInteger && previousRawPrice !== "" && specificMatch && specificMatch[1]) {
        newRawPrice = previousRawPrice + specificMatch[1]
      } else {
        let result = ""
        let decimalSeparatorFound = false
        let decimalDigitsCount = 0
        for (const char of condensedValue) {
          if (char >= "0" && char <= "9") {
            if (decimalSeparatorFound) {
              if (decimalDigitsCount < 2) {
                result += char
                decimalDigitsCount++
              }
            } else {
              result += char
            }
          } else if (char === "." && !decimalSeparatorFound) {
            result += char
            decimalSeparatorFound = true
          }
        }
        if (result.startsWith(".")) newRawPrice = "0" + result
        else if (result === "" && condensedValue !== "") newRawPrice = ""
        else newRawPrice = result
      }
    }
    setFormData((prev) => ({ ...prev, price: newRawPrice }))
    setSubmitError(null)
  }

  const handleSellerInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setSellerFormData((prev) => ({ ...prev, [name]: value }))
    setSubmitError(null)
  }

  const handleEngineCapacitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setEngineCapacitySearch(searchTerm)
    setFormData((prev) => ({ ...prev, engineCapacity: searchTerm }))
    setEngineCapacityFiltered(
      engineCapacityOptionsList.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    setShowEngineCapacityDropdown(true)
  }

  const handleEngineCapacitySelect = (option: { value: string; label: string }) => {
    setFormData((prev) => ({ ...prev, engineCapacity: option.value }))
    setEngineCapacitySearch(option.label)
    setShowEngineCapacityDropdown(false)
    setSubmitError(null)
  }

  const handleBodyTypeSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setBodyTypeSearch(searchTerm)
    setFormData((prev) => ({ ...prev, bodyType: searchTerm }))
    setBodyTypeFiltered(
      bodyTypeOptionsList.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    setShowBodyTypeDropdown(true)
  }

  const handleBodyTypeSelect = (option: { value: string; label: string; IconComponent: ElementType }) => {
    setFormData((prev) => ({ ...prev, bodyType: option.value }))
    setBodyTypeSearch(option.label)
    setShowBodyTypeDropdown(false)
    setSubmitError(null)
  }

  // Auto-correct make on blur
  const handleMakeBlur = () => {
    if (formData.make.trim() && vehicleData) {
      const canonicalMake = findCanonicalMake(formData.make)
      if (canonicalMake && canonicalMake.displayName !== formData.make) {
        setFormData((prev) => ({ ...prev, make: canonicalMake.displayName }))
        setSelectedMakeKey(canonicalMake.key)

        // Update models list for selected make
        if (vehicleData[canonicalMake.key]) {
          const models = vehicleData[canonicalMake.key].models || []
          setModelsList(models)
          setFilteredModels(models)
        }
      }
    }
  }

  // Auto-correct model on blur
  const handleModelBlur = () => {
    if (formData.model.trim() && selectedMakeKey && vehicleData && vehicleData[selectedMakeKey]) {
      const canonicalModel = findCanonicalModel(formData.model, selectedMakeKey)
      if (canonicalModel && canonicalModel.name !== formData.model) {
        setFormData((prev) => ({ ...prev, model: canonicalModel.name }))
      }
    }
  }

  const handleSaveSellerInfo = async () => {
    try {
      if (!sellerFormData.firstName?.trim() || !sellerFormData.lastName?.trim() || !sellerFormData.phone?.trim()) {
        setSubmitError("Please fill in all required fields (First Name, Last Name, Phone)")
        return
      }

      const updatedProfile: Partial<UserProfile> = {
        firstName: sellerFormData.firstName,
        lastName: sellerFormData.lastName,
        phone: sellerFormData.phone,
        suburb: sellerFormData.suburb,
        city: sellerFormData.city,
        province: sellerFormData.province,
        profilePic: sellerFormData.profilePic,
      }

      if (onSaveProfile) {
        await onSaveProfile(updatedProfile)
        await refreshUserProfile()
      }

      setUserClickedEdit(false)
      setSubmitSuccess("Seller information updated successfully!")
      setSubmitError(null)

      setTimeout(() => {
        setSubmitSuccess(null)
      }, 3000)
    } catch (error) {
      console.error("Failed to save seller info:", error)
      setSubmitError("Failed to update seller information. Please try again.")
      setSubmitSuccess(null)
    }
  }

  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Canvas context not available"))
          return
        }

        const img = document.createElement("img")

        img.onload = () => {
          try {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
            canvas.width = img.width * ratio
            canvas.height = img.height * ratio

            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader()
                  reader.onload = () => resolve(reader.result as string)
                  reader.onerror = () => reject(new Error("Failed to read compressed image"))
                  reader.readAsDataURL(blob)
                } else {
                  reject(new Error("Failed to compress image"))
                }
              },
              "image/jpeg",
              quality,
            )
          } catch (error) {
            reject(new Error(`Image processing failed: ${error instanceof Error ? error.message : "Unknown error"}`))
          }
        }

        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = URL.createObjectURL(file)
      } catch (error) {
        reject(new Error(`Image compression setup failed: ${error instanceof Error ? error.message : "Unknown error"}`))
      }
    })
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const fileArray = Array.from(files)

    if (vehicleImages.length + fileArray.length > 21) {
      setSubmitError(`You can upload a maximum of 21 images. You have ${vehicleImages.length} already.`)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setIsProcessingImages(true)
    setImageUploadProgress(0)

    try {
      const processedImages = await Promise.allSettled(
        fileArray.map(async (file, index) => {
          try {
            if (!file.type.startsWith("image/")) {
              throw new Error(`File "${file.name}" is not a valid image.`)
            }

            setImageUploadProgress(((index + 1) / fileArray.length) * 100)

            return await compressImage(file, 1200, 0.85)
          } catch (error) {
            throw new Error(`Processing ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }),
      )

      const newImages: string[] = []
      const errors: string[] = []

      processedImages.forEach((result, index) => {
        if (result.status === "fulfilled") {
          newImages.push(result.value)
        } else {
          errors.push(`Failed to process ${fileArray[index].name}: ${result.reason.message}`)
        }
      })

      if (newImages.length > 0) {
        setVehicleImages((prev) => [...prev, ...newImages])
      }

      if (errors.length > 0) {
        setSubmitError(errors.join(" "))
      } else {
        setSubmitError(null)
      }
    } catch (error) {
      setSubmitError("Failed to process images. Please try again.")
    } finally {
      setIsProcessingImages(false)
      setImageUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const triggerFileInput = () => fileInputRef.current?.click()
  const handleRemoveImage = (index: number) => {
    setVehicleImages((prevImages) => prevImages.filter((_, i) => i !== index))
    setSubmitError(null)
  }

  const handlePointerDown = useCallback((index: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    // Capture pointer to track movement outside element
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setIsDragging(true)
    setDraggedIndex(index)
    setDropTargetIndex(null)
    dragItemRef.current = e.currentTarget
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, gridRef: React.RefObject<HTMLDivElement | null>) => {
      if (draggedIndex === null || !gridRef.current) return

      // Get all draggable items in the grid
      const items = gridRef.current.querySelectorAll("[data-drag-index]")
      const pointerX = e.clientX
      const pointerY = e.clientY

      let newDropTarget: number | null = null

      items.forEach((item) => {
        const rect = item.getBoundingClientRect()
        const index = Number.parseInt(item.getAttribute("data-drag-index") || "-1", 10)

        if (
          pointerX >= rect.left &&
          pointerX <= rect.right &&
          pointerY >= rect.top &&
          pointerY <= rect.bottom &&
          index !== draggedIndex
        ) {
          newDropTarget = index
        }
      })

      setDropTargetIndex(newDropTarget)
    },
    [draggedIndex],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Release pointer capture
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)

      if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
        const newImages = [...vehicleImages]
        const [draggedImage] = newImages.splice(draggedIndex, 1)
        newImages.splice(dropTargetIndex, 0, draggedImage)
        setVehicleImages(newImages)
      }

      setIsDragging(false)
      setDraggedIndex(null)
      setDropTargetIndex(null)
      dragItemRef.current = null
    },
    [draggedIndex, dropTargetIndex, vehicleImages],
  )

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    setIsDragging(false)
    setDraggedIndex(null)
    setDropTargetIndex(null)
    dragItemRef.current = null
  }, [])

  const handleSubmitVehicle = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    setUploadProgress(0)

    console.group("🚗 Vehicle Submission Tracking")
    console.log("📋 Submission Started:", new Date().toISOString())
    console.log("👤 User:", user?.email || "Unknown")
    console.log("✏️ Edit Mode:", editMode)
    console.log("📁 Existing Vehicle ID:", existingVehicle?.id || "New Vehicle")

    // Auto-correct make and model before submission
    if (formData.make.trim() && vehicleData) {
      const canonicalMake = findCanonicalMake(formData.make)
      if (canonicalMake && canonicalMake.displayName !== formData.make) {
        setFormData((prev) => ({ ...prev, make: canonicalMake.displayName }))
      }
    }

    if (formData.model.trim() && selectedMakeKey && vehicleData && vehicleData[selectedMakeKey]) {
      const canonicalModel = findCanonicalModel(formData.model, selectedMakeKey)
      if (canonicalModel && canonicalModel.name !== formData.model) {
        setFormData((prev) => ({ ...prev, model: canonicalModel.name }))
      }
    }

    const formDataForLog = { ...formData }
    console.log("📝 Form Data:", {
      ...formDataForLog,
      images: `[${vehicleImages.length} images - omitted from log]`,
      description: formData.description ? `${formData.description.substring(0, 100)}...` : "Empty",
    })

    console.log("🖼️ Image Details:", {
      imageCount: vehicleImages.length,
      hasImages: vehicleImages.length > 0,
      minRequired: 5,
      maxAllowed: 21,
    })

    console.log("🔒 Privacy Settings:", {
      contactPrivacyEnabled,
      isEditingSeller,
      isProfileIncomplete,
    })
    console.groupEnd()

    if (!editMode && isEditingSeller) {
      console.error("❌ Submission Failed: Seller information needs to be saved first")
      setSubmitError("Please save your updated seller information before listing a vehicle.")
      setIsSubmitting(false)
      return
    }

    if (!editMode) {
      const isProfileStillIncomplete =
        !profile?.firstName ||
        !profile?.lastName ||
        !profile?.phone ||
        !profile?.suburb ||
        !profile?.city ||
        !profile?.province
      if (isProfileStillIncomplete) {
        console.error("❌ Submission Failed: Incomplete seller profile")
        setSubmitError("Your seller profile is incomplete. Please edit and save your information to proceed.")
        setUserClickedEdit(true)
        setIsSubmitting(false)
        return
      }
    }

    if (
      !formData.make ||
      !formData.model ||
      !formData.year ||
      !formData.price ||
      !formData.mileage ||
      !formData.transmission ||
      !formData.fuel ||
      !formData.engineCapacity ||
      !formData.condition
    ) {
      console.error("❌ Submission Failed: Missing required fields")
      setSubmitError("Please fill in all required fields.")
      setIsSubmitting(false)
      return
    }
    if (vehicleImages.length < 5) {
      console.error("❌ Submission Failed: Insufficient images")
      setSubmitError(`Please upload at least 5 images. You have ${vehicleImages.length}.`)
      setIsSubmitting(false)
      return
    }
    if (vehicleImages.length > 21) {
      console.error("❌ Submission Failed: Too many images")
      setSubmitError(`You can upload a maximum of 21 images. You have ${vehicleImages.length}.`)
      setIsSubmitting(false)
      return
    }

    try {
      console.group("🔄 Vehicle Service Call")
      console.log("🛠️ Preparing vehicle data for service...")

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const vehicleDataForSubmit = {
        ...formData,
        images: vehicleImages,
        contactPrivacyEnabled: contactPrivacyEnabled,
        contact_privacy_enabled: contactPrivacyEnabled,
      }

      let result: Vehicle | null

      console.log("📤 Attempting to call vehicle service...")
      console.log("⚙️ Mode:", editMode ? "UPDATE" : "CREATE")

      if (editMode && existingVehicle) {
        console.log(`📝 Updating vehicle ID: ${existingVehicle.id}`)
        console.log(
          "📦 Data being sent (first 500 chars):",
          JSON.stringify(vehicleDataForSubmit).substring(0, 500) + "...",
        )

        try {
          result = await vehicleService.updateVehicle(existingVehicle.id, vehicleDataForSubmit)
          console.log("✅ Update successful! Response:", result)

          if (result && onVehicleUpdate) {
            console.log("🔄 Calling onVehicleUpdate callback")
            onVehicleUpdate(result)
          }
        } catch (updateError) {
          console.error("❌ Vehicle update failed at vehicleService.updateVehicle")
          console.error("📋 Error details:", updateError)
          console.error("📦 Data sent:", {
            id: existingVehicle.id,
            data: vehicleDataForSubmit,
            imageInfo: {
              count: vehicleImages.length,
              firstImagePreview: vehicleImages[0]?.substring(0, 100) + "...",
            },
          })
          throw updateError
        }
      } else {
        console.log("🆕 Creating new vehicle listing")
        console.log(
          "📦 Data being sent (first 500 chars):",
          JSON.stringify(vehicleDataForSubmit).substring(0, 500) + "...",
        )

        if (onVehicleSubmit) {
          console.log("🔄 Using parent-provided onVehicleSubmit callback")
          try {
            await onVehicleSubmit(vehicleDataForSubmit)
            console.log("✅ Parent submission callback successful")
          } catch (parentError) {
            console.error("❌ Parent submission callback failed")
            console.error("📋 Error details:", parentError)
            throw parentError
          }
        } else {
          console.log("🔄 Using vehicleService.createVehicle")
          try {
            result = await vehicleService.createVehicle(vehicleDataForSubmit)
            console.log("✅ Creation successful! Response:", result)
          } catch (createError) {
            console.error("❌ Vehicle creation failed at vehicleService.createVehicle")
            console.error("📋 Error details:", createError)
            console.error("📦 Data sent:", {
              data: vehicleDataForSubmit,
              imageInfo: {
                count: vehicleImages.length,
                firstImagePreview: vehicleImages[0]?.substring(0, 100) + "...",
              },
            })
            throw createError
          }
        }
      }

      console.groupEnd()
      clearInterval(progressInterval)
      setUploadProgress(100)

      const successMessage = editMode
        ? "Vehicle updated successfully! Redirecting..."
        : "Vehicle listed successfully! Redirecting to your dashboard..."

      console.log("🎉 Submission completed successfully:", successMessage)
      setSubmitSuccess(successMessage)

      setTimeout(() => {
        console.log("🔀 Starting redirect...")
        if (editMode && onCancel) {
          console.log("↩️ Canceling edit mode")
          onCancel()
        } else {
          console.log("📊 Redirecting to dashboard")
          router.push("/dashboard")
        }
      }, 1500)
    } catch (error) {
      console.group("❌ VEHICLE SUBMISSION FAILURE")
      console.error("🕒 Timestamp:", new Date().toISOString())
      console.error("👤 User:", user?.email || "Unknown")
      console.error("⚙️ Operation:", editMode ? "UPDATE" : "CREATE")
      console.error("📋 Error:", error)
      console.error("🔍 Error type:", typeof error)
      console.error("📝 Error message:", error instanceof Error ? error.message : String(error))
      console.error("🔗 Error stack:", error instanceof Error ? error.stack : "No stack trace")

      console.error("🎯 Failure point: Vehicle service call")
      console.error("📊 Form state at failure:", {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        price: formData.price,
        imageCount: vehicleImages.length,
        hasRequiredFields: !!(formData.make && formData.model && formData.year && formData.price),
      })

      console.groupEnd()

      setSubmitError(error instanceof Error ? error.message : String(error) || "Failed to list vehicle.")
    } finally {
      console.log("🏁 Submission process ended, cleaning up...")
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] flex items-center justify-center">
        <p className="text-[#3E5641] dark:text-white">Loading...</p>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] flex items-center justify-center">
        <p className="text-[#3E5641] dark:text-white">Redirecting to login...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] flex items-center justify-center">
        <p className="text-[#3E5641] dark:text-white">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] flex flex-col">
      <Header
        user={user}
        onLoginClick={handleLogin}
        onDashboardClick={handleDashboard}
        onGoHome={handleGoHome}
        onShowAllCars={handleShowAllCars}
        onGoToSellPage={handleGoToSell}
        onSignOut={handleSignOutClick}
        transparent={false}
      />
      <main className="flex-1 px-4 sm:px-6 pb-6 overflow-auto pt-20 md:pt-24">
        <h1 className="text-3xl font-bold mb-6 text-[#3E5641] dark:text-white">
          {editMode ? "Edit Vehicle Listing" : "List Your Vehicle"}
        </h1>
        <div className="max-w-6xl mx-auto">
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          {submitSuccess && (
            <Alert className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 mb-4">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription>{submitSuccess}</AlertDescription>
            </Alert>
          )}

          {isProcessingImages && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Processing images...</span>
                <span className="text-sm text-blue-600 dark:text-blue-400">{Math.round(imageUploadProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${imageUploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {isSubmitting && uploadProgress > 0 && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {editMode ? "Updating vehicle..." : "Uploading vehicle..."}
                </span>
                <span className="text-sm text-green-600 dark:text-green-400">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                <div
                  className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Expandable Image Gallery Modal */}
          {isImageCardExpanded && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="relative bg-white dark:bg-[#2A352A] rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-[#9FA791]/20 dark:border-[#4A4D45]/20">
                  <h3 className="text-xl font-bold text-[#3E5641] dark:text-white">
                    Vehicle Images ({vehicleImages.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsImageCardExpanded(false)}
                      className="rounded-full"
                      aria-label="Close expanded view"
                    >
                      <Minimize2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                  <div
                    ref={expandedGridRef}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6 px-4 py-3 sm:p-5 md:p-5 auto-rows-min"
                  >
                    {vehicleImages.map((image, index) => (
                      <div
                        key={index}
                        data-drag-index={index}
                        className={`relative w-full aspect-square overflow-hidden rounded-lg group cursor-move select-none min-h-0 ${
                          draggedIndex === index ? "opacity-50 scale-95" : ""
                        } ${
                          dropTargetIndex === index ? "ring-2 ring-[#FF6700] dark:ring-[#FF7D33]" : ""
                        }`}
                        style={{ touchAction: "none" }}
                        onPointerDown={(e) => handlePointerDown(index, e)}
                        onPointerMove={(e) => handlePointerMove(e, expandedGridRef)}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                      >
                        <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity pointer-events-none">
                          <Grip className="w-5 h-5 text-white" />
                        </div>
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`Vehicle image ${index + 1}`}
                          layout="fill"
                          objectFit="cover"
                          unoptimized
                          className="object-cover pointer-events-none"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveImage(index)
                          }}
                          className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center pointer-events-none">
                            Main Image
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                    Drag to reorder • First image is main • {vehicleImages.length} of 21 images
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3 flex flex-col">
              <Card className="rounded-3xl overflow-hidden p-4 sm:p-6 flex flex-col w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A] mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-[#3E5641] dark:text-white">Vehicle Images</h2>
                  {vehicleImages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsImageCardExpanded(true)}
                      className="text-[#FF6700] dark:text-[#FF7D33]"
                      aria-label={isImageCardExpanded ? "Collapse gallery" : "Expand gallery"}
                    >
                      {isImageCardExpanded ? (
                        <Minimize2 className="h-4 w-4 mr-1" />
                      ) : (
                        <Maximize2 className="h-4 w-4 mr-1" />
                      )}
                      {isImageCardExpanded ? "Collapse" : "Expand"}
                    </Button>
                  )}
                </div>
                <div
                  className="relative w-full aspect-video mb-4 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={triggerFileInput}
                >
                  {vehicleImages.length > 0 ? (
                    <Image
                      src={vehicleImages[0] || "/placeholder.svg"}
                      alt="Vehicle main preview"
                      layout="fill"
                      objectFit="cover"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Camera className="w-12 h-12 mx-auto mb-2" />
                      <span className="text-xl font-bold">Upload Vehicle Images</span>
                      <p className="text-sm mt-1">(Min 5, Max 21)</p>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-2 right-2 rounded-full p-1.5 h-8 w-8 shadow-md z-10 bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerFileInput()
                    }}
                    aria-label="Upload vehicle images"
                  >
                    <Camera className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                      multiple
                      onChange={handleImageUpload}
                    />
                  </Button>
                </div>
                {vehicleImages.length > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-[#3E5641] dark:text-white">
                        Gallery ({vehicleImages.length})
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Drag to reorder • First image is main</p>
                    </div>
                    <div 
                      ref={imageGridRef} 
                      className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-3 sm:gap-4 px-3 sm:px-4 py-3"
                    >
                      {vehicleImages.map((image, index) => (
                        <div
                          key={index}
                          data-drag-index={index}
                          className={`relative aspect-square overflow-hidden rounded-lg group cursor-move select-none min-h-0 ${
                            draggedIndex === index ? "opacity-50 scale-95" : ""
                          } ${
                            dropTargetIndex === index ? "ring-2 ring-[#FF6700] dark:ring-[#FF7D33]" : ""
                          }`}
                          style={{ touchAction: "none" }}
                          onPointerDown={(e) => handlePointerDown(index, e)}
                          onPointerMove={(e) => handlePointerMove(e, imageGridRef)}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerCancel}
                        >
                          <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity pointer-events-none">
                            <Grip className="w-5 h-5 text-white" />
                          </div>
                          <Image
                            src={image || "/placeholder.svg"}
                            alt={`Vehicle image ${index + 1}`}
                            layout="fill"
                            objectFit="cover"
                            unoptimized
                            className="object-cover pointer-events-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveImage(index)
                            }}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center pointer-events-none">
                              Main Image
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {vehicleImages.length > 6 && (
                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Showing {vehicleImages.length} images • Scroll horizontally to view more
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Contact Privacy Settings Card */}
              <Card className="rounded-3xl overflow-hidden p-6 flex flex-col w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A] mb-6">
                <h2 className="text-xl font-bold mb-4 text-[#3E5641] dark:text-white flex items-center">
                  Contact Privacy Settings
                  <div className="relative group ml-2">
                    <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-xs rounded-lg z-10">
                      When enabled, only logged-in users will be able to view your contact information. Guest users will
                      need to sign in to access seller details.
                    </div>
                  </div>
                </h2>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1F2B20] rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-[#3E5641] dark:text-white">
                      {contactPrivacyEnabled ? "Restricted Contact Access" : "Public Contact Access"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {contactPrivacyEnabled
                        ? "Only logged-in users can view contact info"
                        : "All users can view contact information"}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const newValue = !contactPrivacyEnabled
                      setContactPrivacyEnabled(newValue)
                      setFormData((prev) => ({ ...prev, contactPrivacyEnabled: newValue }))
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${contactPrivacyEnabled ? "bg-[#FF6700] dark:bg-[#FF7D33]" : "bg-gray-300 dark:bg-gray-600"}`}
                    aria-label={`Toggle contact privacy. Currently ${contactPrivacyEnabled ? "enabled" : "disabled"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${contactPrivacyEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  {contactPrivacyEnabled
                    ? "Your contact details will only be visible to registered users who are logged in."
                    : "Your contact details will be visible to all users, including guests browsing the site."}
                </p>
              </Card>

              {!editMode && (
                <Card className="rounded-3xl overflow-hidden p-6 flex flex-col w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A]">
                  {isEditingSeller && isProfileIncomplete && (
                    <Alert
                      variant="default"
                      className="mb-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-500/30"
                    >
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        Your seller profile is incomplete. Please fill out all fields and save before listing a vehicle.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[#3E5641] dark:text-white">Seller Information</h2>
                    {!isEditingSeller ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#FF6700] dark:text-[#FF7D33]"
                        onClick={() => setUserClickedEdit(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 dark:text-green-400"
                        onClick={handleSaveSellerInfo}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {!isEditingSeller ? (
                      <>
                        <div className="flex flex-col">
                          <Label className="text-sm font-medium text-[#6F7F69] dark:text-gray-400 mb-1">Name</Label>
                          <div className="text-[#3E5641] dark:text-white font-medium">
                            {formData.sellerName || "Not provided"}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <Label className="text-sm font-medium text-[#6F7F69] dark:text-gray-400 mb-1">Email</Label>
                          <div className="text-[#3E5641] dark:text-white font-medium">{formData.sellerEmail}</div>
                        </div>
                        <div className="flex flex-col">
                          <Label className="text-sm font-medium text-[#6F7F69] dark:text-gray-400 mb-1">Phone</Label>
                          <div className="text-[#3E5641] dark:text-white font-medium">
                            {formData.sellerPhone || "Not provided"}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <Label className="text-sm font-medium text-[#6F7F69] dark:text-gray-400 mb-1">Location</Label>
                          <div className="text-[#3E5641] dark:text-white font-medium">
                            {profile?.suburb && `${profile.suburb}, `}
                            {profile?.city && `${profile.city}, `}
                            {profile?.province || "Not provided"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="firstName"
                              className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                            >
                              First Name
                            </Label>
                            <Input
                              id="firstName"
                              name="firstName"
                              value={sellerFormData.firstName}
                              onChange={handleSellerInputChange}
                              placeholder="First Name"
                              className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="lastName" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                              Last Name
                            </Label>
                            <Input
                              id="lastName"
                              name="lastName"
                              value={sellerFormData.lastName}
                              onChange={handleSellerInputChange}
                              placeholder="Last Name"
                              className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={sellerFormData.phone}
                            onChange={handleSellerInputChange}
                            placeholder="+27 12 345 6789"
                            className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                            Email
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="opacity-70 border-[#9FA791] dark:border-[#4A4D45] dark:bg-[#1F2B20] dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="suburb" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                              Suburb
                            </Label>
                            <Input
                              id="suburb"
                              name="suburb"
                              value={sellerFormData.suburb || ""}
                              onChange={handleSellerInputChange}
                              placeholder="Suburb"
                              className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="city" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                              City
                            </Label>
                            <Input
                              id="city"
                              name="city"
                              value={sellerFormData.city || ""}
                              onChange={handleSellerInputChange}
                              placeholder="City"
                              className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="province" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                            Province
                          </Label>
                          <select
                            id="province"
                            name="province"
                            value={sellerFormData.province || ""}
                            onChange={handleSellerInputChange}
                            className="w-full px-3 py-2 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] appearance-none bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                          >
                            <option value="">Select Province</option>
                            <option value="Eastern Cape">Eastern Cape</option>
                            <option value="Free State">Free State</option>
                            <option value="Gauteng">Gauteng</option>
                            <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                            <option value="Limpopo">Limpopo</option>
                            <option value="Mpumalanga">Mpumalanga</option>
                            <option value="North West">North West</option>
                            <option value="Northern Cape">Northern Cape</option>
                            <option value="Western Cape">Western Cape</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    This information will be visible to potential buyers.
                  </p>
                </Card>
              )}
            </div>
            <div className="lg:w-2/3 flex">
              <Card className="rounded-3xl p-6 w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A]">
                <h2 className="text-xl font-bold mb-6 text-[#3E5641] dark:text-white">Vehicle Details</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#3E5641] dark:text-white">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <div className="relative" ref={makeRef}>
                          <Label htmlFor="make" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                            Make
                          </Label>
                          <Input
                            id="make"
                            name="make"
                            value={formData.make}
                            onChange={handleMakeInputChange}
                            onBlur={handleMakeBlur}
                            onFocus={() => {
                              setShowMakeDropdown(true)
                              if (!formData.make.trim()) {
                                setFilteredMakes(makesList)
                              }
                            }}
                            placeholder="e.g., Toyota"
                            className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                            disabled={isSubmitting}
                            autoComplete="off"
                          />
                          {showMakeDropdown && filteredMakes.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredMakes.map((make) => (
                                <div
                                  key={make.key}
                                  className="px-4 py-2 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer text-[#3E5641] dark:text-white"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleMakeSelect(make)
                                  }}
                                >
                                  {make.displayName}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="relative" ref={modelRef}>
                          <Label htmlFor="model" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                            Model
                          </Label>
                          <Input
                            id="model"
                            name="model"
                            value={formData.model}
                            onChange={handleModelInputChange}
                            onBlur={handleModelBlur}
                            onFocus={() => {
                              if (selectedMakeKey) {
                                setShowModelDropdown(true)
                                if (!formData.model.trim()) {
                                  setFilteredModels(modelsList)
                                }
                              }
                            }}
                            placeholder="e.g., Corolla"
                            className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                            disabled={isSubmitting || !selectedMakeKey}
                            autoComplete="off"
                          />
                          {showModelDropdown && filteredModels.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredModels.map((model) => (
                                <div
                                  key={model.name}
                                  className="px-4 py-2 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer text-[#3E5641] dark:text-white"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleModelSelect(model)
                                  }}
                                >
                                  {model.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="variant" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Variant (Optional)
                        </Label>
                        <Input
                          id="variant"
                          name="variant"
                          value={formData.variant}
                          onChange={handleInputChange}
                          placeholder="e.g., 1.4 TSI"
                          className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#3E5641] dark:text-white">Price, Mileage & Year</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="price" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Price (ZAR)
                        </Label>
                        <Input
                          id="price"
                          name="price"
                          type="text"
                          value={formatPriceForDisplay(formData.price)}
                          onChange={handlePriceInputChange}
                          placeholder="R 0.00"
                          className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSubmitting || isProcessingImages}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="mileage" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Mileage (km)
                        </Label>
                        <Input
                          id="mileage"
                          name="mileage"
                          type="number"
                          value={formData.mileage}
                          onChange={handleInputChange}
                          placeholder="e.g., 50000"
                          className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSubmitting}
                          min="0"
                          step="1000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="year" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Year
                        </Label>
                        <Input
                          id="year"
                          name="year"
                          type="number"
                          value={formData.year}
                          onChange={handleInputChange}
                          placeholder="e.g., 2020"
                          className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSubmitting}
                          min="1900"
                          max={new Date().getFullYear().toString()}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#3E5641] dark:text-white">
                      Technical Specifications
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="transmission" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Transmission
                        </Label>
                        <select
                          id="transmission"
                          name="transmission"
                          value={formData.transmission}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] appearance-none bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                          disabled={isSubmitting}
                        >
                          <option value="">Select Transmission</option>
                          <option value="Manual">Manual</option>
                          <option value="Automatic">Automatic</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="fuel" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Fuel Type
                        </Label>
                        <select
                          id="fuel"
                          name="fuel"
                          value={formData.fuel}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] appearance-none bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                          disabled={isSubmitting}
                        >
                          <option value="">Select Fuel Type</option>
                          <option value="Petrol">Petrol</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <div className="relative" ref={engineCapacityRef}>
                          <Label
                            htmlFor="engineCapacityInput"
                            className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                          >
                            Engine Capacity
                          </Label>
                          <Input
                            id="engineCapacityInput"
                            name="engineCapacity"
                            type="text"
                            value={engineCapacitySearch}
                            onChange={handleEngineCapacitySearchChange}
                            onFocus={() => {
                              setShowEngineCapacityDropdown(true)
                              setEngineCapacityFiltered(
                                engineCapacitySearch
                                  ? engineCapacityOptionsList.filter((option) =>
                                      option.label.toLowerCase().includes(engineCapacitySearch.toLowerCase()),
                                    )
                                  : engineCapacityOptionsList,
                              )
                            }}
                            placeholder="Select Capacity"
                            className="w-full px-3 py-2 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] appearance-none bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                            disabled={isSubmitting}
                            autoComplete="off"
                          />
                          {showEngineCapacityDropdown && engineCapacityFiltered.length > 0 && (
                            <div className="absolute z-10 w-full mt-4 bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {engineCapacityFiltered.map((option) => (
                                <div
                                  key={option.value}
                                  className="px-4 py-2 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer text-[#3E5641] dark:text-white"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleEngineCapacitySelect(option)
                                  }}
                                >
                                  {option.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="relative" ref={bodyTypeRef}>
                          <Label
                            htmlFor="bodyTypeInput"
                            className="text-sm font-medium text-[#3E5641] dark:text-gray-300"
                          >
                            Body Type
                          </Label>
                          <Input
                            id="bodyTypeInput"
                            name="bodyType"
                            type="text"
                            value={bodyTypeSearch}
                            onChange={handleBodyTypeSearchChange}
                            onFocus={() => {
                              setShowBodyTypeDropdown(true)
                              setBodyTypeFiltered(
                                bodyTypeSearch
                                  ? bodyTypeOptionsList.filter((option) =>
                                      option.label.toLowerCase().includes(bodyTypeSearch.toLowerCase()),
                                    )
                                  : bodyTypeOptionsList,
                              )
                            }}
                            placeholder="Select Body Type"
                            className="w-full px-5 py-4 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] appearance-none bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                            disabled={isSubmitting}
                            autoComplete="off"
                          />
                          {showBodyTypeDropdown && bodyTypeFiltered.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1F2B20] border border-[#9FA791] dark:border-[#4A4D45] rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {bodyTypeFiltered.map((option) => (
                                <div
                                  key={option.value}
                                  className="px-4 py-3 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer text-[#3E5641] dark:text-white flex items-center"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleBodyTypeSelect(option)
                                  }}
                                >
                                  <option.IconComponent className="w-4 h-4 mr-2 opacity-70 flex-shrink-0" />
                                  {option.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#3E5641] dark:text-white">Vehicle Condition</h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="condition" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                        Condition
                      </Label>
                      <select
                        id="condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] appearance-none bg-white dark:bg-[#2A352A] text-[#3E5641] dark:text-white"
                        disabled={isSubmitting}
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="needs-work">Needs Work</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#3E5641] dark:text-white">Description</h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                        Vehicle Description (Optional)
                      </Label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe your vehicle, including any special features, condition details, or other information potential buyers should know..."
                        className="w-full px-3 py-2 rounded-lg border border-[#9FA791] dark:border-[#4A4D45] focus:outline-none focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white min-h-[120px]"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 mt-auto">
                    <Button
                      onClick={handleSubmitVehicle}
                      disabled={isSubmitting}
                      className="bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting
                        ? editMode
                          ? "Updating..."
                          : "Submitting..."
                        : editMode
                          ? "Update Vehicle"
                          : "List Vehicle"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
