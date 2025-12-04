"use client"

import { useState, useMemo, useRef } from "react"
import type React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, X, UploadCloud } from "lucide-react"
import type { Vehicle } from "@/types/vehicle"
import type { VehicleFormData } from "@/types/vehicle"
import { vehicleService } from "@/lib/vehicle-service"

interface VehicleEditDetailsProps {
  vehicle: Vehicle
  onBack: () => void
}

export default function VehicleEditDetails({ vehicle, onBack }: VehicleEditDetailsProps) {
  const router = useRouter()
  const [editableData, setEditableData] = useState<Partial<Vehicle>>({ ...vehicle })
  const [editableImages, setEditableImages] = useState<string[]>(
    vehicle.images && vehicle.images.length > 0 ? [...vehicle.images] : vehicle.image ? [vehicle.image] : [],
  )
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [contactPrivacyEnabled, setContactPrivacyEnabled] = useState(
    vehicle.contactPrivacyEnabled || false
  )
  const imageUploadRef = useRef<HTMLInputElement>(null)

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
    setError(null)
  }

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
        setError("You have reached the maximum limit of 21 images.")
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

  const handleImageDelete = (indexToDelete: number) => {
    setEditableImages((prev) => prev.filter((_, index) => index !== indexToDelete))
    if (selectedImageIndex === indexToDelete) {
      closeImageModal()
    } else if (selectedImageIndex !== null && indexToDelete < selectedImageIndex) {
      setSelectedImageIndex((prev) => (prev !== null ? prev - 1 : null))
    }
  }

  // Drag and drop functions for image rearrangement
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const newImages = [...editableImages]
    const draggedImage = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(targetIndex, 0, draggedImage)

    setEditableImages(newImages)
    setDraggedIndex(null)
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

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const updateData: Partial<VehicleFormData> = {
        make: editableData.make,
        model: editableData.model,
        variant: editableData.variant,
        year: editableData.year,
        price: editableData.price,
        mileage: editableData.mileage,
        transmission: editableData.transmission,
        fuel: editableData.fuel,
        engineCapacity: editableData.engineCapacity,
        bodyType: editableData.bodyType,
        city: editableData.city,
        province: editableData.province,
        description: editableData.description,
        images: editableImages,
        contactPrivacyEnabled: contactPrivacyEnabled, // ADD THIS
      }

      await vehicleService.updateVehicle(vehicle.id, updateData, vehicle.userId)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Error saving vehicle:", err)
      setError(err.message || "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const allDisplayableImages = useMemo(() => {
    return editableImages
  }, [editableImages])

  return (
    <div className="min-h-screen">
      {/* Header Section with Back Button and Price */}
      <section className="px-6 pt-6 md:pt-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-[#3E5641] dark:text-white hover:text-[#FF6700]">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-end">
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Price</label>
            <div className="flex items-center gap-2">
              <span className="text-[#FF6700] dark:text-[#FF7D33] text-2xl md:text-3xl font-bold">R</span>
              <input
                type="text"
                name="price"
                value={editableData.price || ""}
                onChange={handleInputChange}
                className="text-[#FF6700] dark:text-[#FF7D33] text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-[#FF6700]/50 focus:border-[#FF6700] dark:focus:border-[#FF7D33] outline-none p-1 text-right w-48"
              />
            </div>
          </div>
        </div>
        {error && <div className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</div>}
      </section>

      {/* Image Gallery Editor */}
      <div className="px-6 max-w-7xl mx-auto mt-4">
        <h3 className="text-xl font-semibold mb-2 text-[#3E5641] dark:text-white">
          Edit Images ({editableImages.length}/21)
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4">
          {editableImages.map((imgSrc, index) => (
            <div 
              key={`edit-img-${index}`} 
              className="relative aspect-square group"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <img
                src={imgSrc || "/placeholder.svg"}
                alt={`Editable view ${index + 1}`}
                className="w-full h-full object-cover rounded-md cursor-pointer hover:opacity-90"
                onClick={() => openImageModal(index)}
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
      </div>

      {/* Contact Privacy Settings */}
      <div className="px-6 max-w-7xl mx-auto mt-6">
        <div className="rounded-3xl p-6 border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
          <h3 className="text-xl font-semibold mb-4 text-[#3E5641] dark:text-white">Contact Privacy Settings</h3>
          {/* Privacy toggle component - same as upload page */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Enable Contact Privacy</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                When enabled, your contact details will be hidden from the public listing.
              </p>
            </div>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6700] focus:ring-offset-2 ${
                contactPrivacyEnabled ? 'bg-[#FF6700]' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              onClick={() => setContactPrivacyEnabled(!contactPrivacyEnabled)}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  contactPrivacyEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle Title and Details Form */}
      <div className="px-6 max-w-7xl mx-auto mt-4">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Year</label>
            <input
              type="number"
              name="year"
              value={editableData.year || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Make</label>
            <input
              type="text"
              name="make"
              value={editableData.make || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Model</label>
            <input
              type="text"
              name="model"
              value={editableData.model || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Variant (Optional)</label>
            <input
              type="text"
              name="variant"
              value={editableData.variant || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Mileage (km)</label>
            <input
              type="number"
              name="mileage"
              value={editableData.mileage || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Transmission</label>
            <input
              type="text"
              name="transmission"
              value={editableData.transmission || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Fuel Type</label>
            <input
              type="text"
              name="fuel"
              value={editableData.fuel || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Engine (e.g., 2.0L)</label>
            <input
              type="text"
              name="engineCapacity"
              value={editableData.engineCapacity || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Description</label>
          <textarea
            name="description"
            value={editableData.description || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[150px] text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
          />
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Body Type</label>
            <input
              type="text"
              name="bodyType"
              value={editableData.bodyType || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">City</label>
            <input
              type="text"
              name="city"
              value={editableData.city || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3E5641] dark:text-white mb-2">Province</label>
            <input
              type="text"
              name="province"
              value={editableData.province || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[#3E5641] dark:text-white bg-white dark:bg-[#2A352A] focus:ring-2 focus:ring-[#FF6700]"
            />
          </div>
        </div>

        {/* Image Modal */}
        {isImageModalOpen && selectedImageIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 p-2 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="absolute inset-0 flex items-center justify-between px-4">
              <button
                onClick={() => navigateImage("prev")}
                className="text-white bg-black/50 hover:bg-black/70 p-2 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => navigateImage("next")}
                className="text-white bg-black/50 hover:bg-black/70 p-2 rounded-full"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="relative max-h-[90vh] max-w-[90vw] w-full h-full flex items-center justify-center">
              <Image
                src={allDisplayableImages[selectedImageIndex] || "/placeholder.svg"}
                alt={`${editableData.make} ${editableData.model}`}
                fill
                className="object-contain"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {allDisplayableImages.length}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onBack}
            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
