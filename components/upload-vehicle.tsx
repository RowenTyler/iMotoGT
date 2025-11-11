"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useRef, useEffect, type ElementType } from "react"
import { ArrowLeft, Camera, Save, AlertCircle, Edit, Check, Car, Truck, Bike } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/ui/header"
import type { UserProfile } from "@/types/user"
import { useUser } from "@/components/UserContext"

interface HeaderPropsOverride {
  onLoginClick?: () => void
  onDashboardClick?: () => void
  onGoHome?: () => void
  onShowAllCars?: () => void
  onGoToSellPage?: () => void
  onSignOut?: () => void
}

interface UploadVehicleProps {
  user: UserProfile
  onBack: () => void
  onVehicleSubmit: (vehicleData: any) => Promise<void>
  onSaveProfile?: (updatedProfile: Partial<UserProfile>) => Promise<void>
  onSignOut?: () => void
  HeaderPropsOverride?: HeaderPropsOverride
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
  user,
  onBack,
  onVehicleSubmit,
  onSaveProfile,
  onSignOut,
  HeaderPropsOverride,
}: UploadVehicleProps) {
  const router = useRouter()
  // Use userProfile from context for real-time sync
  const { user: authUser, userProfile, loading: userLoading, updateProfile } = useUser()
  // Use userProfile if available, else fallback to user prop
  const profile = userProfile || user
  const isProfileIncomplete =
    !profile.firstName || !profile.lastName || !profile.phone || !profile.suburb || !profile.city || !profile.province

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

  const [vehicleImages, setVehicleImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

  // Auto-populate seller info from user profile
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
<<<<<<< HEAD
    condition: "good",
    sellerName: profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.firstName || profile.lastName || profile.email.split("@")[0],
=======
    sellerName:
      profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile.firstName || profile.lastName || profile.email.split("@")[0],
>>>>>>> 261c80144a5d6af2b0a3a90645e912b994bbb2f0
    sellerEmail: profile.email,
    sellerPhone: profile.phone || "",
    sellerSuburb: profile.suburb || "",
    sellerCity: profile.city || "",
    sellerProvince: profile.province || "",
    sellerProfilePic: profile.profilePic || "",
  })

  const [userClickedEdit, setUserClickedEdit] = useState(false)
  const isEditingSeller = isProfileIncomplete || userClickedEdit
  const [sellerFormData, setSellerFormData] = useState({
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    phone: profile.phone || "",
    suburb: profile.suburb || "",
    city: profile.city || "",
    province: profile.province || "",
    profilePic: profile.profilePic || "",
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
  const [engineCapacitySearch, setEngineCapacitySearch] = useState("")
  const [engineCapacityFiltered, setEngineCapacityFiltered] = useState(engineCapacityOptionsList)
  const [showEngineCapacityDropdown, setShowEngineCapacityDropdown] = useState(false)
  const [bodyTypeSearch, setBodyTypeSearch] = useState("")
  const [bodyTypeFiltered, setBodyTypeFiltered] = useState(bodyTypeOptionsList)
  const [showBodyTypeDropdown, setShowBodyTypeDropdown] = useState(false)

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      sellerName:
        profile.firstName && profile.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : profile.firstName || profile.lastName || profile.email.split("@")[0],
      sellerEmail: profile.email,
      sellerPhone: profile.phone || "",
      sellerSuburb: profile.suburb || "",
      sellerCity: profile.city || "",
      sellerProvince: profile.province || "",
      sellerProfilePic: profile.profilePic || "",
    }))
    setSellerFormData({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone: profile.phone || "",
      suburb: profile.suburb || "",
      city: profile.city || "",
      province: profile.province || "",
      profilePic: profile.profilePic || "",
    })
  }, [profile])

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
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setSubmitError(null)
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

  const handleSellerInputChange = async (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    const updated = { ...sellerFormData, [name]: value }
    setSellerFormData(updated)
    // Auto-save to profile on every change
    try {
      // if (updateProfile) await updateProfile(updated) // Commented out for testing auto-save issue
      // if (onSaveProfile) await onSaveProfile(updated) // Commented out for testing auto-save issue
    } catch (error) {
      console.error("Failed to auto-save seller info:", error)
      setSubmitError("Failed to auto-save seller information. Please try again.")
    }
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

  const handleSaveSellerInfo = async () => {
    try {
      const updatedProfile: Partial<UserProfile> = {
        firstName: sellerFormData.firstName,
        lastName: sellerFormData.lastName,
        phone: sellerFormData.phone,
        suburb: sellerFormData.suburb,
        city: sellerFormData.city,
        province: sellerFormData.province,
        profilePic: sellerFormData.profilePic,
      }
      const newSellerName =
        sellerFormData.firstName && sellerFormData.lastName
          ? `${sellerFormData.firstName} ${sellerFormData.lastName}`
          : sellerFormData.firstName || sellerFormData.lastName
            ? `${sellerFormData.firstName || ""}${sellerFormData.firstName && sellerFormData.lastName ? " " : ""}${sellerFormData.lastName || ""}`.trim()
            : profile.email.split("@")[0]
      setFormData((prev) => ({
        ...prev,
        sellerName: newSellerName,
        sellerPhone: sellerFormData.phone,
        sellerSuburb: sellerFormData.suburb,
        sellerCity: sellerFormData.city,
        sellerProvince: sellerFormData.province,
        sellerProfilePic: sellerFormData.profilePic,
      }))
      // Update profile in context for real-time sync
      if (updateProfile) await updateProfile(updatedProfile)
      if (onSaveProfile) await onSaveProfile(updatedProfile)
      setUserClickedEdit(false)
    } catch (error) {
      console.error("Failed to save seller info:", error)
      setSubmitError("Failed to update seller information. Please try again.")
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

        const img = document.createElement("img") // Use createElement instead of new Image()

        img.onload = () => {
          try {
            // Calculate new dimensions
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
            canvas.width = img.width * ratio
            canvas.height = img.height * ratio

            // Draw and compress
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

            // Update progress
            setImageUploadProgress(((index + 1) / fileArray.length) * 100)

            // Compress image for faster upload with better error handling
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

  const handleDragStart = (index: number) => {
    setIsDragging(true)
    setDraggedIndex(index)
  }
  const handleDragEnter = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) setDropTargetIndex(index)
  }
  const handleDragEnd = () => {
    if (draggedIndex !== null && dropTargetIndex !== null) {
      const newImages = [...vehicleImages]
      const [draggedImage] = newImages.splice(draggedIndex, 1)
      newImages.splice(dropTargetIndex, 0, draggedImage)
      setVehicleImages(newImages)
    }
    setIsDragging(false)
    setDraggedIndex(null)
    setDropTargetIndex(null)
  }

  const handleSubmitVehicle = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    setUploadProgress(0)

    if (isEditingSeller) {
      setSubmitError("Please save your updated seller information before listing a vehicle.")
      setIsSubmitting(false)
      return
    }

    const isProfileStillIncomplete =
      !profile.firstName || !profile.lastName || !profile.phone || !profile.suburb || !profile.city || !profile.province
    if (isProfileStillIncomplete) {
      setSubmitError("Your seller profile is incomplete. Please edit and save your information to proceed.")
      setUserClickedEdit(true)
      setIsSubmitting(false)
      return
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
      setSubmitError("Please fill in all required fields.")
      setIsSubmitting(false)
      return
    }
    if (vehicleImages.length < 5) {
      setSubmitError(`Please upload at least 5 images. You have ${vehicleImages.length}.`)
      setIsSubmitting(false)
      return
    }
    if (vehicleImages.length > 21) {
      setSubmitError(`You can upload a maximum of 21 images. You have ${vehicleImages.length}.`)
      setIsSubmitting(false)
      return
    }

    try {
<<<<<<< HEAD
      // The vehicleData should only contain form data and images.
      // Seller information is automatically fetched on the server-side using the user's session.
      const vehicleData = { ...formData, images: vehicleImages }

      await onVehicleSubmit(vehicleData)
=======
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const vehicleData = { ...formData, images: vehicleImages }
      const vehicleDataWithSeller = {
        ...vehicleData,
        sellerName: formData.sellerName,
        sellerEmail: formData.sellerEmail,
        sellerPhone: formData.sellerPhone,
        sellerSuburb: formData.sellerSuburb,
        sellerCity: formData.sellerCity,
        sellerProvince: formData.sellerProvince,
        sellerProfilePic: formData.sellerProfilePic,
      }

      await onVehicleSubmit(vehicleDataWithSeller)

      clearInterval(progressInterval)
      setUploadProgress(100)

>>>>>>> 261c80144a5d6af2b0a3a90645e912b994bbb2f0
      setSubmitSuccess("Vehicle listed successfully! Redirecting to your dashboard...")
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500) // Reduced redirect delay for faster flow
    } catch (error) {
      console.error("Failed to submit vehicle:", error)
      setSubmitError(error instanceof Error ? error.message : String(error) || "Failed to list vehicle.")
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!authUser || !authUser.email_confirmed_at) {
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
        <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-[#3E5641] dark:text-white">Account Not Verified</h1>
          <p className="max-w-md mb-6 text-gray-600 dark:text-gray-300">
            You must verify your email address before you can list a vehicle for sale. Please check your inbox for a
            verification link sent to <strong>{authUser?.email}</strong>.
          </p>
          <Button
            onClick={onBack}
            className="bg-[#FF6700] text-white hover:bg-[#FF6700]/90 dark:bg-[#FF7D33] dark:hover:bg-[#FF7D33]/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </main>
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
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[#FF6700] dark:text-[#FF7D33]">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-6 text-[#3E5641] dark:text-white">List Your Vehicle</h1>
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
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Uploading vehicle...</span>
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

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3 flex flex-col">
              <Card className="rounded-3xl overflow-hidden p-6 flex flex-col w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A] mb-6">
                <h2 className="text-xl font-bold mb-4 text-[#3E5641] dark:text-white">Vehicle Images</h2>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                      {vehicleImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Vehicle ${index + 1}`}
                            className="w-full h-24 sm:h-32 object-cover rounded-lg"
                            loading="lazy" // Added lazy loading for better performance
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isSubmitting || isProcessingImages}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
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
                          {profile.suburb && `${profile.suburb}, `}
                          {profile.city && `${profile.city}, `}
                          {profile.province || "Not provided"}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
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
                          value={user.email}
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
            </div>
            <div className="lg:w-2/3 flex">
              <Card className="rounded-3xl p-6 w-full border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A]">
                <h2 className="text-xl font-bold mb-6 text-[#3E5641] dark:text-white">Vehicle Details</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#3E5641] dark:text-white">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="make" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Make
                        </Label>
                        <Input
                          id="make"
                          name="make"
                          value={formData.make}
                          onChange={handleInputChange}
                          placeholder="e.g., Toyota"
                          className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="model" className="text-sm font-medium text-[#3E5641] dark:text-gray-300">
                          Model
                        </Label>
                        <Input
                          id="model"
                          name="model"
                          value={formData.model}
                          onChange={handleInputChange}
                          placeholder="e.g., Corolla"
                          className="border-[#9FA791] dark:border-[#4A4D45] focus:border-[#FF6700] dark:focus:border-[#FF7D33] focus:ring-[#FF6700] dark:focus:ring-[#FF7D33] dark:bg-[#1F2B20] dark:text-white"
                          disabled={isSubmitting}
                        />
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
                      {isSubmitting ? "Submitting..." : "List Vehicle"}
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
