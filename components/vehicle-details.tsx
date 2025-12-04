"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import type React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Car, Shield, Phone, Mail, X, Star, UploadCloud, Search, MapPin } from "lucide-react"
import type { Vehicle } from "@/types/vehicle"
import type { UserProfile } from "@/types/user"
import { Heart, ChevronLeft, ChevronRight } from "lucide-react"

interface VehicleDetailsProps {
  vehicle: Vehicle
  onBack: () => void
  user?: UserProfile
  onSaveCar?: (vehicle: Vehicle) => void
  savedCars?: Vehicle[]
  isEditMode?: boolean
  onUpdateVehicle?: (updatedVehicle: Vehicle) => void
}

export default function VehicleDetails({
  vehicle,
  onBack,
  user,
  onSaveCar,
  savedCars = [],
  isEditMode = false,
  onUpdateVehicle,
}: VehicleDetailsProps) {
  const router = useRouter()
  
  // Add helper functions for masking
  const maskEmail = (email: string) => {
    if (!email) return ""
    const [name, domain] = email.split('@')
    if (name && domain) {
      return `${name[0]}***@${domain}`
    }
    return email
  }

  const maskPhone = (phone: string) => {
    if (!phone) return ""
    return phone.replace(/\d(?=\d{4})/g, '*')
  }

  // SAFE access with fallback
  const isContactPrivate = vehicle.contactPrivacyEnabled ?? false
  const shouldMaskContact = isContactPrivate && !user

  console.log("VehicleDetails vehicle:", vehicle)
  console.log("Vehicle details:", {
    sellerName: vehicle.sellerName,
    sellerEmail: vehicle.sellerEmail,
    sellerPhone: vehicle.sellerPhone,
    sellerSuburb: vehicle.sellerSuburb,
    sellerCity: vehicle.sellerCity,
    sellerProvince: vehicle.sellerProvince,
    contactPrivacyEnabled: vehicle.contactPrivacyEnabled,
    isContactPrivate,
    shouldMaskContact,
  })
  console.log("Vehicle Details:", {
    sellerName: vehicle.sellerName,
    sellerEmail: vehicle.sellerEmail,
    sellerPhone: vehicle.sellerPhone,
    sellerSuburb: vehicle.sellerSuburb,
    sellerCity: vehicle.sellerCity,
    sellerProvince: vehicle.sellerProvince,
    userId: vehicle.userId,
  })
  
  const [showContactForm, setShowContactForm] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isSaved, setIsSaved] = useState(false)

  const [touchStartX, setTouchStartX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const nextImage = () => {
    if (allDisplayableImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % allDisplayableImages.length)
    }
  }

  const prevImage = () => {
    if (allDisplayableImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + allDisplayableImages.length) % allDisplayableImages.length)
    }
  }

  const toggleSave = () => {
    setIsSaved(!isSaved)
  }

  const openFullGallery = () => {
    setSelectedImageIndex(0)
    setIsImageModalOpen(true)
    document.body.style.overflow = "hidden"
  }
  
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [imageError, setImageError] = useState(false)

  const [editableData, setEditableData] = useState<Partial<Vehicle>>({ ...vehicle })
  const [editableImages, setEditableImages] = useState<string[]>(
    vehicle.images && vehicle.images.length > 0 ? [...vehicle.images] : vehicle.image ? [vehicle.image] : [],
  )
  const imageUploadRef = useRef<HTMLInputElement>(null)

  const galleryContainerRef = useRef<HTMLDivElement>(null)
  const [activeGallery, setActiveGallery] = useState(0)

  const formatPriceForDisplay = (rawValue: string | number | undefined | null): string => {
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
      return "R 0.00"
    }

    let numericString = String(rawValue).replace(/[^\d.]/g, "")

    if (numericString.startsWith(".")) {
      numericString = "0" + numericString
    }

    const parts = numericString.split(".")
    let integerPart = parts[0]
    let decimalPart = parts.length > 1 ? parts[1] : ""

    if (integerPart === "" && decimalPart !== "") {
      integerPart = "0"
    }

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")

    if (decimalPart.length === 0) {
      decimalPart = "00"
    } else if (decimalPart.length === 1) {
      decimalPart += "0"
    } else if (decimalPart.length > 2) {
      decimalPart = decimalPart.substring(0, 2)
    }
    return `R ${formattedInteger || "0"}.${decimalPart}`
  }

  useEffect(() => {
    let initialPrice = vehicle.price
    if (initialPrice !== undefined && initialPrice !== null) {
      let rawPrice = String(initialPrice).replace(/[^\d.]/g, "")
      const parts = rawPrice.split(".")
      if (parts.length > 1) {
        rawPrice = parts[0] + "." + parts.slice(1).join("").substring(0, 2)
      }
      if (rawPrice === ".") rawPrice = "0."
      else if (rawPrice.startsWith(".")) rawPrice = "0" + rawPrice
      initialPrice = rawPrice
    }

    setEditableData({ ...vehicle, price: initialPrice })
    setEditableImages(
      vehicle.images && vehicle.images.length > 0 ? [...vehicle.images] : vehicle.image ? [vehicle.image] : [],
    )
  }, [vehicle, isEditMode])

  useEffect(() => {
    setIsSaved(savedCars.some((car) => car.id === vehicle.id))
  }, [savedCars, vehicle.id])

  useEffect(() => {
    setIsZoomed(false)
    setImageError(false)
  }, [selectedImageIndex])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouchStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = Math.abs(currentX - touchStartX)
    const deltaY = Math.abs(currentY - touchStartY)

    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY

    setIsDragging(false)

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (selectedImageIndex !== null) {
        navigateImage(deltaX > 0 ? "prev" : "next")
      } else {
        navigateMainGallery(deltaX > 0 ? "prev" : "next")
      }
    }
  }

  const navigateMainGallery = (direction: "prev" | "next") => {
    const totalImages = allDisplayableImages.length
    if (direction === "prev") {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1))
    } else {
      setCurrentImageIndex((prev) => (prev < totalImages - 1 ? prev + 1 : 0))
    }
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const handleContactClick = () => {
    if (shouldMaskContact) {
      router.push(`/login?redirect=/vehicle-details/${vehicle.id}`)
    } else {
      if (isMobile) {
        window.location.href = `tel:${vehicle.sellerPhone.replace(/\s+/g, "")}`
      } else {
        setShowContactForm(true)
      }
    }
  }

  const sellerAddressDisplay = useMemo(() => {
    const parts = []
    if (vehicle.sellerSuburb) {
      parts.push(vehicle.sellerSuburb.trim())
    }
    if (vehicle.sellerCity) {
      parts.push(vehicle.sellerCity.trim())
    }
    if (vehicle.sellerProvince) {
      parts.push(vehicle.sellerProvince.trim())
    }

    if (parts.length === 0) {
      if (vehicle.city) parts.push(vehicle.city.trim())
      if (vehicle.province) parts.push(vehicle.province.trim())
    }

    return parts.filter((part) => part && part.length > 0).join(", ") || "Location not available"
  }, [vehicle.sellerSuburb, vehicle.sellerCity, vehicle.sellerProvince, vehicle.city, vehicle.province])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Message sent to ${vehicle.sellerEmail}!\n\nFrom: ${email}\nMessage: ${message}`)
    setShowContactForm(false)
    setEmail("")
    setMessage("")
  }

  const handleSaveClick = () => {
    if (!user) {
      alert("Please log in to save vehicles")
      return
    }

    setIsSaved(!isSaved)
    if (onSaveCar) {
      onSaveCar(vehicle)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    let processedValue: string | number | undefined = value

    if (name === "year" || name === "mileage") {
      processedValue = value === "" ? undefined : Number.parseInt(value.replace(/\D/g, ""), 10)
      if (isNaN(processedValue as number)) processedValue = undefined
    } else if (name === "price") {
      let rawPrice = String(value).replace(/[^\d.]/g, "")
      const parts = rawPrice.split(".")
      if (parts.length > 1) {
        rawPrice = parts[0] + "." + parts.slice(1).join("").substring(0, 2)
      }
      if (rawPrice === ".") {
        rawPrice = "0."
      } else if (rawPrice.startsWith(".")) {
        rawPrice = "0" + rawPrice
      }
      processedValue = rawPrice
    }

    setEditableData((prev) => ({ ...prev, [name]: processedValue }))
  }

  const handleSaveChanges = () => {
    if (onUpdateVehicle) {
      const finalVehicleData: Vehicle = {
        ...vehicle,
        ...editableData,
        images: editableImages,
        image: editableImages.length > 0 ? editableImages[0] : vehicle.image,
      }
      onUpdateVehicle(finalVehicleData)
    }
  }

  const allDisplayableImages = useMemo(() => {
    return isEditMode
      ? editableImages
      : vehicle.images && vehicle.images.length > 0
        ? vehicle.images
        : vehicle.image
          ? [vehicle.image]
          : []
  }, [vehicle.images, vehicle.image, isEditMode, editableImages])

  const handleImageDelete = (indexToDelete: number) => {
    if (!isEditMode) return
    setEditableImages((prev) => prev.filter((_, index) => index !== indexToDelete))
    if (selectedImageIndex === indexToDelete) {
      closeImageModal()
    } else if (selectedImageIndex !== null && indexToDelete < selectedImageIndex) {
      setSelectedImageIndex((prev) => (prev !== null ? prev - 1 : null))
    }
  }

  const getGalleryOneImages = () => {
    return allDisplayableImages.slice(0, 5)
  }

  const getGalleryTwoImages = () => {
    return allDisplayableImages.slice(5, 13)
  }

  const getGalleryThreeImages = () => {
    return allDisplayableImages.slice(13, 21)
  }

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index)
    setIsImageModalOpen(true)
    document.body.style.overflow = "hidden"
  }

  const closeImageModal = () => {
    setIsImageModalOpen(false)
    setSelectedImageIndex(null)
    document.body.style.overflow = "auto"
  }

  const navigateImage = (direction: "prev" | "next") => {
    if (selectedImageIndex === null) return

    const totalImages = allDisplayableImages.length
    if (direction === "prev") {
      setSelectedImageIndex((prev) => (prev !== null ? (prev > 0 ? prev - 1 : totalImages - 1) : null))
    } else {
      setSelectedImageIndex((prev) => (prev !== null ? (prev < totalImages - 1 ? prev + 1 : 0) : null))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isImageModalOpen || selectedImageIndex === null) return

      if (e.key === "Escape") {
        closeImageModal()
      } else if (e.key === "ArrowLeft") {
        navigateImage("prev")
      } else if (e.key === "ArrowRight") {
        navigateImage("next")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isImageModalOpen, selectedImageIndex, allDisplayableImages.length])

  const handleTriggerImageUpload = () => {
    if (imageUploadRef.current) {
      imageUploadRef.current.click()
    }
  }

  const handleImageFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      const currentImageCount = editableImages.length
      const remainingSlots = 21 - currentImageCount

      if (remainingSlots <= 0) {
        alert("You have reached the maximum limit of 21 images.")
        return
      }

      const filesToUpload = filesArray.slice(0, remainingSlots)
      const newImageUrlsPromises = filesToUpload.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      })

      Promise.all(newImageUrlsPromises).then((newUrls) => {
        setEditableImages((prev) => [...prev, ...newUrls])
      })

      if (imageUploadRef.current) imageUploadRef.current.value = ""
    }
  }

  const navigateToGallery = (galleryIndex: number) => {
    if (galleryContainerRef.current) {
      const container = galleryContainerRef.current
      const scrollAmount = container.clientWidth * galleryIndex
      container.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      })
      setActiveGallery(galleryIndex)
    }
  }

  const handleGalleryScroll = () => {
    if (galleryContainerRef.current) {
      const container = galleryContainerRef.current
      const scrollPosition = container.scrollLeft
      const containerWidth = container.clientWidth
      const newActiveGallery = Math.round(scrollPosition / containerWidth)
      setActiveGallery(newActiveGallery)
    }
  }

  const galleryOneDisplayImages = getGalleryOneImages()
  const galleryTwoDisplayImages = getGalleryTwoImages()
  const galleryThreeDisplayImages = getGalleryThreeImages()

  const hasGalleryOne = galleryOneDisplayImages.length > 0
  const hasGalleryTwo = galleryTwoDisplayImages.length > 0
  const hasGalleryThree = galleryThreeDisplayImages.length > 0
  const totalGalleries = [hasGalleryOne, hasGalleryTwo, hasGalleryThree].filter(Boolean).length

  return (
    <div className="min-h-screen">
      <section className="px-6 pt-6 md:pt-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {isEditMode ? (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-[#FF6700] dark:text-[#FF7D33] text-2xl md:text-3xl font-bold">$</span>
              <input
                type="text"
                name="price"
                value={editableData.price || ""}
                onChange={handleInputChange}
                className="text-[#FF6700] dark:text-[#FF7D33] text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-[#FF6700]/50 focus:border-[#FF6700] dark:focus:border-[#FF7D33] outline-none p-1 text-right w-48"
                placeholder="Enter Price"
              />
            </div>
          ) : (
            <p className="text-[#FF6700] dark:text-[#FF7D33] text-2xl md:text-3xl font-bold">
              {formatPriceForDisplay(vehicle.price)}
            </p>
          )}
        </div>
        {isEditMode && (
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-7xl mx-auto mt-1">
            You are in edit mode. Click on fields to edit them.
          </p>
        )}
      </section>

      {allDisplayableImages.length === 0 ? (
        <div className="px-6 max-w-7xl mx-auto mt-4 h-[400px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500">No images available for this vehicle.</p>
        </div>
      ) : isEditMode ? (
        <div className="px-6 max-w-7xl mx-auto mt-4">
          <h3 className="text-xl font-semibold mb-2 text-[#3E5641] dark:text-white">
            Edit Images ({editableImages.length}/21)
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4">
            {editableImages.map((imgSrc, index) => (
              <div key={`edit-img-${index}`} className="relative aspect-square group">
                <img
                  src={imgSrc || "/placeholder.svg"}
                  alt={`Editable view ${index + 1}`}
                  className="w-full h-full object-cover rounded-md"
                />
                <button
                  onClick={() => handleImageDelete(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {editableImages.length < 21 && (
              <button
                onClick={handleTriggerImageUpload}
                className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <UploadCloud className="w-8 h-8 mb-1" /> <span className="text-xs">Add Image</span>
              </button>
            )}
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            ref={imageUploadRef}
            onChange={handleImageFilesUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can upload up to 21 images. The first image will be the main display image. Drag and drop to reorder
            (feature coming soon).
          </p>
        </div>
      ) : (
        <div className="px-6 max-w-7xl mx-auto mt-4 relative">
          <div className="block md:hidden">
            <div className="relative h-[33vh] w-full overflow-hidden rounded-lg">
              <div
                className="flex transition-transform duration-300 ease-in-out h-full"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {allDisplayableImages.map((imgSrc, index) => (
                  <div
                    key={`mobile-img-${index}`}
                    className="w-full h-full flex-shrink-0 relative cursor-pointer"
                    onClick={() => openImageModal(index)}
                  >
                    <Image
                      src={imgSrc || "/placeholder.svg"}
                      alt={`${vehicle.make} ${vehicle.model} view ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>

              <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                {currentImageIndex + 1} / {allDisplayableImages.length}
              </div>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {allDisplayableImages.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex ? "bg-white" : "bg-white/50"
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>

              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black/50 px-2 py-1 rounded-full animate-pulse">
                Swipe to browse
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="gallery-container relative flex items-center">
              <div 
                ref={galleryContainerRef}
                className="gallery-scroll flex overflow-x-auto snap-x snap-mandatory w-full [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={handleGalleryScroll}
              >
                <style jsx>{`
                  .gallery-scroll::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                    background: transparent;
                  }
                `}</style>
                
                {hasGalleryOne && (
                  <section className="gallery-section flex-shrink-0 w-full snap-center grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px]">
                    <div 
                      className="md:col-span-2 h-full overflow-hidden rounded-lg group relative m-0 p-0 cursor-pointer"
                      onClick={() => openImageModal(0)}
                    >
                      <Image
                        src={galleryOneDisplayImages[0] || "/placeholder.svg"}
                        alt={`${vehicle.make} ${vehicle.model} main view`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white/80 rounded-full p-2">
                          <Search className="w-6 h-6 text-[#3E5641]" />
                        </div>
                      </div>
                    </div>
                    {galleryOneDisplayImages.length > 1 && (
                      <div className="grid grid-cols-2 gap-4 h-full">
                        {galleryOneDisplayImages.slice(1, 5).map((imgSrc, index) => (
                          <div
                            key={`g1-thumb-${index}`}
                            className="aspect-square overflow-hidden rounded-lg group relative m-0 p-0 cursor-pointer"
                            onClick={() => openImageModal(index + 1)}
                          >
                            <Image
                              src={imgSrc || "/placeholder.svg"}
                              alt={`${vehicle.make} ${vehicle.model} view ${index + 2}`}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="bg-white/80 rounded-full p-2">
                                <Search className="w-4 h-4 text-[#3E5641]" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {hasGalleryTwo && (
                  <section className="gallery-section flex-shrink-0 w-full snap-center grid grid-cols-2 sm:grid-cols-4 gap-4 h-[400px]">
                    {galleryTwoDisplayImages.map((imgSrc, index) => (
                      <div 
                        key={`g2-img-${index}`} 
                        className="w-full h-full overflow-hidden rounded-lg group relative cursor-pointer"
                        onClick={() => openImageModal(index + 5)}
                      >
                        <Image
                          src={imgSrc || "/placeholder.svg"}
                          alt={`${vehicle.make} ${vehicle.model} additional view ${index + 6}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/80 rounded-full p-2">
                            <Search className="w-4 h-4 text-[#3E5641]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {hasGalleryThree && (
                  <section className="gallery-section flex-shrink-0 w-full snap-center grid grid-cols-2 sm:grid-cols-4 gap-4 h-[400px]">
                    {galleryThreeDisplayImages.map((imgSrc, index) => (
                      <div 
                        key={`g3-img-${index}`} 
                        className="w-full h-full overflow-hidden rounded-lg group relative cursor-pointer"
                        onClick={() => openImageModal(index + 13)}
                      >
                        <Image
                          src={imgSrc || "/placeholder.svg"}
                          alt={`${vehicle.make} ${vehicle.model} additional view ${index + 14}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/80 rounded-full p-2">
                            <Search className="w-4 h-4 text-[#3E5641]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            </div>

            {totalGalleries > 1 && (
              <div className="flex justify-center mt-4 space-x-3">
                {hasGalleryOne && (
                  <button
                    onClick={() => navigateToGallery(0)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      activeGallery === 0 
                        ? 'bg-[#FF6700] dark:bg-[#FF7D33] scale-110' 
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    aria-label="Go to gallery 1"
                  />
                )}
                {hasGalleryTwo && (
                  <button
                    onClick={() => navigateToGallery(1)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      activeGallery === 1 
                        ? 'bg-[#FF6700] dark:bg-[#FF7D33] scale-110' 
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    aria-label="Go to gallery 2"
                  />
                )}
                {hasGalleryThree && (
                  <button
                    onClick={() => navigateToGallery(2)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      activeGallery === 2 
                        ? 'bg-[#FF6700] dark:bg-[#FF7D33] scale-110' 
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    aria-label="Go to gallery 3"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isImageModalOpen && selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image view"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors z-50"
            aria-label="Close image"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="absolute inset-0 flex items-center justify-between px-4">
            <button
              onClick={() => navigateImage("prev")}
              className="text-white bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors z-50"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigateImage("next")}
              className="text-white bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors z-50"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="relative max-h-[90vh] max-w-[90vw] w-full h-full flex items-center justify-center">
            {imageError ? (
              <div className="text-white text-center p-4">
                <p>Failed to load image</p>
                <button onClick={() => setImageError(false)} className="mt-2 text-sm text-[#FF6700] hover:underline">
                  Try again
                </button>
              </div>
            ) : (
              <div
                className={`relative w-full h-full transition-transform duration-300 ${
                  isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
              >
                <Image
                  src={allDisplayableImages[selectedImageIndex] || "/placeholder.svg"}
                  alt={`${vehicle.make} ${vehicle.model} enlarged view`}
                  fill
                  className={`object-contain transition-transform duration-300 ${isZoomed ? "scale-150" : "scale-100"}`}
                  priority
                  onError={() => setImageError(true)}
                  onDoubleClick={() => setIsZoomed(!isZoomed)}
                />
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImageIndex + 1} / {allDisplayableImages.length}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 max-w-7xl mx-auto mt-4">
        <div className="flex justify-between items-center mb-2">
          {isEditMode ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <input
                type="number"
                name="year"
                placeholder="Year"
                value={editableData.year || ""}
                onChange={handleInputChange}
                className="form-input-edit text-xl font-bold"
              />
              <input
                type="text"
                name="make"
                placeholder="Make"
                value={editableData.make || ""}
                onChange={handleInputChange}
                className="form-input-edit text-xl font-bold"
              />
              <input
                type="text"
                name="model"
                placeholder="Model"
                value={editableData.model || ""}
                onChange={handleInputChange}
                className="form-input-edit text-xl font-bold"
              />
              <input
                type="text"
                name="variant"
                placeholder="Variant (Optional)"
                value={editableData.variant || ""}
                onChange={handleInputChange}
                className="form-input-edit text-xl"
              />
            </div>
          ) : (
            <h2 className="text-2xl md:text-3xl font-bold text-[#3E5641] dark:text-white">
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.variant}
            </h2>
          )}
          <div className="flex gap-4 items-center">
            {isEditMode && (
              <button
                onClick={handleSaveChanges}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            )}
            {!isEditMode && (
              <>
                <div className="bg-[#9FA791]/20 dark:bg-[#4A4D45]/40 px-3 py-1.5 rounded-full text-sm text-[#3E5641] dark:text-white">
                  Sponsored
                </div>
                <button
                  onClick={handleSaveClick}
                  className="text-[#3E5641] dark:text-white px-3 py-1.5 rounded-full text-sm flex items-center space-x-1 hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${isSaved ? "text-purple-600 fill-purple-600" : "text-[#FF6700] dark:text-[#FF7D33]"}`}
                  />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {isEditMode ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input
              type="number"
              name="mileage"
              placeholder="Mileage (km)"
              value={editableData.mileage || ""}
              onChange={handleInputChange}
              className="form-input-edit-sm"
            />
            <input
              type="text"
              name="transmission"
              placeholder="Transmission"
              value={editableData.transmission || ""}
              onChange={handleInputChange}
              className="form-input-edit-sm"
            />
            <input
              type="text"
              name="fuel"
              placeholder="Fuel Type"
              value={editableData.fuel || ""}
              onChange={handleInputChange}
              className="form-input-edit-sm"
            />
            <input
              type="text"
              name="engineCapacity"
              placeholder="Engine (e.g., 2.0L)"
              value={editableData.engineCapacity || ""}
              onChange={handleInputChange}
              className="form-input-edit-sm"
            />
          </div>
        ) : (
          <p className="text-[#6F7F69] dark:text-gray-300 mb-2">
            Mileage: {vehicle.mileage} km | Transmission: {vehicle.transmission} | Fuel: {vehicle.fuel} | Engine:{" "}
            {vehicle.engineCapacity}
          </p>
        )}
      </div>

      <div className="border-b border-[#9FA791]/20 dark:border-[#4A4D45]/20 mt-4">
        <div className="px-6 max-w-7xl mx-auto flex space-x-8">
          <button
            className={`py-3 font-medium ${activeTab === "details" ? "border-b-2 border-[#FF6700] dark:border-[#FF7D33] text-[#3E5641] dark:text-white" : "text-[#6F7F69] dark:text-gray-400 hover:text-[#3E5641] dark:hover:text-white"}`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {activeTab === "details" && (
              <>
                <h2 className="text-2xl font-bold mb-4 text-[#3E5641] dark:text-white">Description</h2>
                {isEditMode ? (
                  <textarea
                    name="description"
                    value={editableData.description || ""}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[150px] text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700] dark:focus:ring-[#FF7D33]"
                    placeholder="Enter vehicle description..."
                  />
                ) : vehicle.description ? (
                  <p className="text-[#6F7F69] dark:text-gray-300 mb-6 whitespace-pre-wrap">{vehicle.description}</p>
                ) : (
                  <p className="text-[#6F7F69] dark:text-gray-300 mb-6">
                    No specific description provided by the seller. General details: {vehicle.year} {vehicle.make}{" "}
                    {vehicle.model} {vehicle.variant}, {vehicle.mileage} km, {vehicle.transmission}, {vehicle.fuel}{" "}
                    engine. Located in {vehicle.sellerSuburb || "N/A"}, {vehicle.sellerCity || "N/A"}, {vehicle.sellerProvince || "N/A"}.
                  </p>
                )}

                <div className="mt-6">
                  <h3 className="text-xl font-bold mb-4 text-[#3E5641] dark:text-white">Technical Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {isEditMode ? (
                      <>
                        <EditableField
                          label="Make"
                          name="make"
                          value={editableData.make}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Model"
                          name="model"
                          value={editableData.model}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Variant"
                          name="variant"
                          value={editableData.variant}
                          onChange={handleInputChange}
                          placeholder="Optional"
                        />
                        <EditableField
                          label="Year"
                          name="year"
                          type="number"
                          value={editableData.year}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Mileage (km)"
                          name="mileage"
                          type="number"
                          value={editableData.mileage}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Transmission"
                          name="transmission"
                          value={editableData.transmission}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Fuel Type"
                          name="fuel"
                          value={editableData.fuel}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Engine Capacity"
                          name="engineCapacity"
                          value={editableData.engineCapacity}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Body Type"
                          name="bodyType"
                          value={editableData.bodyType}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="City"
                          name="city"
                          value={editableData.city}
                          onChange={handleInputChange}
                        />
                        <EditableField
                          label="Province"
                          name="province"
                          value={editableData.province}
                          onChange={handleInputChange}
                        />
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="detail-label">Make</p>
                          <p className="detail-value">{vehicle.make}</p>
                        </div>
                        <div>
                          <p className="detail-label">Model</p>
                          <p className="detail-value">
                            {vehicle.model} {vehicle.variant}
                          </p>
                        </div>
                        <div>
                          <p className="detail-label">Year</p>
                          <p className="detail-value">{vehicle.year}</p>
                        </div>
                        <div>
                          <p className="detail-label">Mileage</p>
                          <p className="detail-value">{vehicle.mileage} km</p>
                        </div>
                        <div>
                          <p className="detail-label">Transmission</p>
                          <p className="detail-value">{vehicle.transmission}</p>
                        </div>
                        <div>
                          <p className="detail-label">Fuel</p>
                          <p className="detail-value">{vehicle.fuel}</p>
                        </div>
                        <div>
                          <p className="detail-label">Engine</p>
                          <p className="detail-value">{vehicle.engineCapacity}</p>
                        </div>
                        <div>
                          <p className="detail-label">Body Type</p>
                          <p className="detail-value">{vehicle.bodyType}</p>
                        </div>
                        <div>
                        <p className="detail-label">Suburb</p>
                        <p className="detail-value">{vehicle.sellerSuburb}</p>
                        </div>
                        <div>
                          <p className="detail-label">City</p>
                          <p className="detail-value">{vehicle.sellerCity}</p>
                        </div>
                        <div>
                          <p className="detail-label">Province</p>
                          <p className="detail-value">{vehicle.sellerProvince}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-[#3E5641]/80 dark:bg-[#1F2B20]/80 backdrop-blur-lg rounded-xl shadow-lg p-8 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {isEditMode ? "Edit Seller Information" : "Contact Seller"}
                </h3>
                {vehicle.sellerProfilePic && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#FF6700]/20">
                    <Image
                      src={vehicle.sellerProfilePic || "/placeholder-user.jpg"}
                      alt={vehicle.sellerName || "Seller"}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-full"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <div className="border-b border-white/10 pb-4">
                  <p className="text-gray-300 text-sm mb-2">Seller</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-white text-lg font-medium">{vehicle.sellerName}</p>
                    {user && user.id === vehicle.userId && (
                      <span className="bg-[#FF6700]/20 text-[#FF6700] text-xs px-2 py-1 rounded-full">You</span>
                    )}
                  </div>
                </div>
                <div className="border-b border-white/10 pb-4">
                  <p className="text-gray-300 text-sm mb-2">Contact Information</p>
                  <div className="space-y-2">
                    {vehicle.sellerPhone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-[#FF6700]" />
                        {shouldMaskContact ? (
                          <span className="text-white">{maskPhone(vehicle.sellerPhone)}</span>
                        ) : (
                          <a
                            href={`tel:${vehicle.sellerPhone.replace(/\s+/g, "")}`}
                            className="text-white hover:text-[#FF6700] transition-colors"
                          >
                            {vehicle.sellerPhone}
                          </a>
                        )}
                      </div>
                    )}
                    {vehicle.sellerEmail && (
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-[#FF6700]" />
                        {shouldMaskContact ? (
                          <span className="text-white">{maskEmail(vehicle.sellerEmail)}</span>
                        ) : (
                          <a
                            href={`mailto:${vehicle.sellerEmail}`}
                            className="text-white hover:text-[#FF6700] transition-colors break-all"
                          >
                            {vehicle.sellerEmail}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-gray-300 text-sm mb-2">Location</p>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-[#FF6700] flex-shrink-0" />
                    <p className="text-white">{sellerAddressDisplay}</p>
                  </div>
                </div>
                {!isEditMode && user?.id !== vehicle.userId && (
                  <button
                    onClick={handleContactClick}
                    className="w-full mt-4 bg-[#FF6700] hover:bg-[#FF7D33] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Contact Seller
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl overflow-hidden h-[150px] w-full shadow-lg">
              <iframe
                title="Seller Location"
                className="w-full h-full"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  sellerAddressDisplay || `${vehicle.city}, ${vehicle.province}`,
                )}&output=embed&hl=en`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const EditableField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  textWhite = false,
  isTextarea = false,
}: {
  label: string
  name: keyof Vehicle
  value: any
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  type?: string
  placeholder?: string
  textWhite?: boolean
  isTextarea?: boolean
}) => (
  <div>
    <label
      htmlFor={name}
      className={`block text-sm font-medium ${textWhite ? "text-gray-300" : "text-[#6F7F69] dark:text-gray-300"} mb-1 text-white`}
    >
      {label}
    </label>
    {isTextarea ? (
      <textarea
        id={name}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder || label}
        className={`form-input-edit w-full min-h-[80px] ${textWhite ? "bg-[#576B55] dark:bg-[#2A352A] text-white placeholder-gray-400" : ""}`}
      />
    ) : (
      <input
        type={type}
        id={name}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder || label}
        className={`form-input-edit w-full ${textWhite ? "bg-[#576B55] dark:bg-[#2A352A] text-white placeholder-gray-400" : ""}`}
      />
    )
  }
  </div>
)
