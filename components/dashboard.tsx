"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Plus, Edit, Eye, Car, Package, X } from "lucide-react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Header } from "./ui/header"
import VehicleDetails from "./vehicle-details"
import type { Vehicle } from "@/types/vehicle"
import type { UserProfile } from "@/types/user"

interface DashboardProps {
  user: UserProfile
  onSignOut?: () => void
  onBack: () => void
  savedCars?: Vehicle[]
  onViewDetails?: (vehicle: Vehicle) => void
  onViewProfileSettings: () => void
  onViewUploadVehicle: () => void
  onUserUpdate?: (updatedData: Partial<UserProfile>) => void
  onEditListedCar?: (vehicle: Vehicle) => void
  onDeleteListedCar?: (vehicleId: string, reason?: string) => Promise<void>
  listedCars?: Vehicle[]
  onSaveCar?: (vehicle: Vehicle) => void
  onLoginClick: () => void
  onGoHome: () => void
  onShowAllCars: () => void
  onGoToSellPage: () => void
  onNavigateToUpload: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get a usable image src for a vehicle.
 *
 * Priority:
 * 1. First image in images[] array (base64 or Supabase Storage URL)
 * 2. Legacy single `image` field (some old records)
 * 3. Placeholder
 *
 * Filters out empty strings that would cause broken <img> tags.
 */
function getVehicleImage(vehicle: Vehicle | null | undefined): string {
  if (!vehicle) return "/placeholder.svg?height=400&width=600"

  // Check images array — filter empties
  if (Array.isArray(vehicle.images)) {
    const first = vehicle.images.find(
      (img) => img && typeof img === "string" && img.trim().length > 10
    )
    if (first) return first
  }

  // Legacy field
  const legacy = (vehicle as any).image
  if (legacy && typeof legacy === "string" && legacy.trim().length > 10) {
    return legacy
  }

  return "/placeholder.svg?height=400&width=600"
}

/**
 * Returns true if src is a base64 data URI.
 * Used to set unoptimized={true} on Next.js <Image> for base64 sources.
 */
function isBase64(src: string): boolean {
  return src.startsWith("data:")
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard({
  user,
  onSignOut,
  onBack,
  savedCars = [],
  listedCars = [],
  onViewDetails,
  onViewProfileSettings,
  onViewUploadVehicle,
  onSaveCar,
  onEditListedCar,
  onDeleteListedCar,
  onLoginClick,
  onGoHome,
  onShowAllCars,
  onGoToSellPage,
}: DashboardProps) {
  const router = useRouter()
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [currentCarIndex, setCurrentCarIndex] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [customDeleteReason, setCustomDeleteReason] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [uploadBlocked, setUploadBlocked] = useState(false)

  // Filter soft-deleted vehicles
  const safeSavedCars = Array.isArray(savedCars)
    ? savedCars.filter((car) => !car.isDeleted)
    : []
  const safeListedCars = Array.isArray(listedCars)
    ? listedCars.filter((car) => !car.isDeleted)
    : []

  // Debug
  useEffect(() => {
    console.log("📊 Dashboard: savedCars received:", safeSavedCars.length)
    if (safeSavedCars.length > 0) {
      const first = safeSavedCars[0]
      const imgSrc = getVehicleImage(first)
      console.log("📊 Dashboard: first saved car image src (truncated):",
        imgSrc.substring(0, 80),
        "| isBase64:", isBase64(imgSrc))
    }
  }, [safeSavedCars])

  // Auto-rotate carousel
  useEffect(() => {
    if (safeSavedCars.length <= 1) return
    const interval = setInterval(() => {
      setCurrentCarIndex((current) => (current + 1) % safeSavedCars.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [safeSavedCars.length])

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const handleProfileClick = () => {
    if (onViewProfileSettings) {
      onViewProfileSettings()
    } else {
      router.push("/settings")
    }
  }

  const handleUploadClick = () => {
    if (totalListings >= maxFreeListings) {
      setShowUpgradeModal(true)
      setUploadBlocked(true)
      return
    }
    if (onViewUploadVehicle) {
      onViewUploadVehicle()
    } else {
      router.push("/upload-vehicle")
    }
  }

  const handleUpgradeAction = (action: "contact" | "upgrade") => {
    setShowUpgradeModal(false)
    if (action === "contact") {
      window.location.href =
        "mailto:support@imoto.com?subject=Upgrade%20Request&body=Hello,%20I%20would%20like%20to%20upgrade%20my%20account%20to%20list%20more%20vehicles."
    } else if (action === "upgrade") {
      router.push("/upgrade")
    }
    setUploadBlocked(false)
  }

  const handleViewDetails = (vehicle: Vehicle) => {
    try {
      const isOwner = user && vehicle.userId === user.id
      if (isOwner) {
        router.push(`/vehicle-details/${vehicle.id}?edit=true`)
      } else if (onViewDetails) {
        onViewDetails(vehicle)
      } else {
        router.push(`/vehicle-details/${vehicle.id}`)
      }
    } catch (error) {
      console.error("❌ Dashboard: Error in handleViewDetails:", error)
      if (vehicle?.id) router.push(`/vehicle-details/${vehicle.id}`)
    }
  }

  const handleBrowseCars = () => {
    if (onShowAllCars) {
      onShowAllCars()
    } else {
      router.push("/results")
    }
  }

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle)
    setShowDeleteModal(true)
  }

  const handleEditListedCar = (vehicle: Vehicle) => {
    router.push(`/vehicle/${vehicle.id}/edit`)
  }

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete || !onDeleteListedCar) return

    const finalReason =
      deleteReason === "other"
        ? customDeleteReason.trim() || "No reason provided"
        : deleteReason

    if (!finalReason) {
      alert("Please provide a reason for deletion")
      return
    }

    try {
      setIsDeleting(true)
      await onDeleteListedCar(vehicleToDelete.id, finalReason)
      setShowDeleteModal(false)
      setVehicleToDelete(null)
      setDeleteReason("")
      setCustomDeleteReason("")
    } catch (error) {
      console.error("❌ Dashboard: Error deleting vehicle:", error)
      alert("Failed to delete vehicle. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const totalListings = safeListedCars.length
  const maxFreeListings = 3
  const freeListingsRemaining = Math.max(0, maxFreeListings - totalListings)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        User not logged in.
      </div>
    )
  }

  if (selectedVehicle) {
    return (
      <VehicleDetails
        vehicle={selectedVehicle}
        onBack={() => setSelectedVehicle(null)}
        user={user}
        savedCars={safeSavedCars}
        onSaveCar={onSaveCar}
      />
    )
  }

  // ── Saved car carousel image ──────────────────────────────────────────────
  const currentSavedCar = safeSavedCars[currentCarIndex] ?? null
  const carouselImageSrc = getVehicleImage(currentSavedCar)
  const carouselImageIsBase64 = isBase64(carouselImageSrc)

  return (
    <div className="h-screen w-full bg-white flex flex-col overflow-hidden">
      <Header
        user={user}
        onLoginClick={() => {}}
        onDashboardClick={onBack}
        onGoHome={onGoHome}
        onShowAllCars={onShowAllCars}
        onGoToSellPage={handleUploadClick}
      />

      <main className="flex-1 flex flex-col min-h-0 pt-20 bg-white">

        {/* ── DESKTOP LAYOUT ─────────────────────────────────────────────── */}
        <div className="hidden lg:block w-full mx-auto h-full px-6 pb-6 overflow-hidden">
          <div className="flex flex-col h-full">
            <h1 className="text-4xl font-bold mb-6 flex-shrink-0">
              Welcome, {user.firstName}
            </h1>

            <div className="grid grid-cols-12 gap-4 flex-grow min-h-0">

              {/* LEFT — 9 cols */}
              <div className="col-span-9 grid grid-rows-2 gap-4 h-full min-h-0">

                {/* ROW 1: Profile / Metrics / Upload */}
                <div className="grid grid-cols-3 gap-4 min-h-0">
                  {/* Profile Card */}
                  <div className="col-span-1 block min-w-0 h-full">
                    <Card
                      className="rounded-3xl overflow-hidden w-full h-full transition-transform hover:scale-105 cursor-pointer"
                      onClick={handleProfileClick}
                    >
                      <div className="relative w-full h-full">
                        {user.profilePic ? (
                          <Image
                            src={user.profilePic}
                            alt={`${user.firstName}'s profile`}
                            fill
                            unoptimized={isBase64(user.profilePic)}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#2E933C] flex items-center justify-center text-white">
                            <div className="text-center">
                              <div className="text-5xl font-bold mb-2">
                                {user.firstName?.[0]?.toUpperCase() || "U"}
                              </div>
                              <div className="text-sm">{user.firstName}</div>
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                          <h3 className="text-2xl font-bold">{user.firstName}</h3>
                          <div className="mt-2">
                            <span className="inline-block border border-white/50 rounded-full px-4 py-1 text-sm">
                              UPDATE PROFILE
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Metrics Card */}
                  <Card className="col-span-1 rounded-3xl p-5 w-full h-full flex flex-col justify-between bg-gradient-to-br from-white to-gray-50">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold">Metrics</h3>
                      <Eye className="w-6 h-6 text-[#FF6700]" />
                    </div>
                    <div className="flex-grow flex flex-col justify-center my-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold">{totalListings}</span>
                        <span className="text-sm text-gray-500">listings</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div
                          className="bg-[#3E5641] h-2 rounded-full"
                          style={{
                            width: `${Math.min((totalListings / maxFreeListings) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Total Views</span>
                      <span className="font-bold text-black">1.2k</span>
                    </div>
                  </Card>

                  {/* Upload Card */}
                  <Card
                    className={`col-span-1 rounded-3xl p-5 w-full h-full flex flex-col justify-between bg-gradient-to-br from-[#FF6700] to-[#FF9248] text-white cursor-pointer hover:shadow-lg transition-all ${
                      totalListings >= maxFreeListings ? "opacity-90" : ""
                    }`}
                    onClick={handleUploadClick}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold">Vehicle Uploads</h3>
                      {totalListings >= maxFreeListings && (
                        <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                          Limit Reached
                        </span>
                      )}
                      <Car className="w-6 h-6" />
                    </div>
                    <div className="flex-grow flex flex-col justify-center items-center my-4">
                      <div className="bg-white/20 rounded-full p-4 mb-3">
                        <Plus className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {totalListings >= maxFreeListings
                            ? "Upgrade to List More"
                            : "List a New Vehicle"}
                        </p>
                        <p className="text-sm opacity-80">
                          {totalListings >= maxFreeListings
                            ? "Unlock unlimited listings"
                            : "Quick and easy process"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* ROW 2: Subscription + Saved Cars carousel */}
                <div className="grid grid-cols-9 gap-4 min-h-0 h-full">

                  {/* Subscription Card */}
                  <Card className="col-span-3 rounded-3xl w-full h-full flex flex-col overflow-hidden bg-white dark:bg-[#2A352A]">
                    <div className="px-3 pt-3 pb-1.5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-[#3E5641] dark:text-white">
                        Subscription
                      </h3>
                      <Package className="h-3.5 w-3.5 text-[#FF6700]" />
                    </div>
                    <div className="px-3 py-2 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="bg-gray-50 dark:bg-[#1F2B20] rounded-lg p-2">
                        <div className="flex justify-between items-center mb-0.5">
                          <h4 className="text-xs font-semibold text-[#3E5641] dark:text-white">
                            Free Plan
                          </h4>
                          <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] mb-0.5">
                          <span className="text-gray-600 dark:text-gray-400">
                            Vehicle Listings
                          </span>
                          <span className="font-medium text-[#3E5641] dark:text-white">
                            {totalListings}/{maxFreeListings} Used
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mb-0.5">
                          <div
                            className="bg-[#FF6700] h-1 rounded-full"
                            style={{
                              width: `${Math.min((totalListings / maxFreeListings) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {freeListingsRemaining} free{" "}
                          {freeListingsRemaining === 1 ? "listing" : "listings"}{" "}
                          remaining
                        </p>
                      </div>
                      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2">
                        <h4 className="text-xs font-semibold mb-0.5 text-[#3E5641] dark:text-white">
                          Premium Plans
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                          Unlock unlimited listings and premium features
                        </p>
                        <Button
                          variant="outline"
                          className="w-full text-[10px] text-[#FF6700] border-[#FF6700] hover:bg-[#FFF8E0] dark:hover:bg-[#2A352A] bg-transparent h-6"
                          onClick={() => router.push("/upgrade")}
                        >
                          Upgrade Plan
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Saved Cars Carousel */}
                  <Card className="col-span-6 rounded-3xl overflow-hidden w-full h-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10" />

                    {/* Vehicle image — handles both base64 and Supabase Storage URLs */}
                    {carouselImageSrc !== "/placeholder.svg?height=400&width=600" ? (
                      <Image
                        src={carouselImageSrc}
                        alt={
                          currentSavedCar
                            ? `${currentSavedCar.make} ${currentSavedCar.model}`
                            : "Saved vehicle"
                        }
                        fill
                        unoptimized={carouselImageIsBase64}
                        className="object-cover"
                        onError={(e) => {
                          console.warn("⚠️ Dashboard carousel image failed to load")
                          ;(e.target as HTMLImageElement).src =
                            "/placeholder.svg?height=400&width=600"
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <Car className="w-16 h-16 text-gray-600" />
                      </div>
                    )}

                    <div className="relative z-20 h-full flex flex-col justify-between p-6">
                      <div className="flex justify-between">
                        <span
                          onClick={() => router.push("/liked-cars-page")}
                          className="bg-[#FF6700] text-white px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-[#FF7D33] transition-colors"
                        >
                          View Saved Cars
                        </span>
                        {safeSavedCars.length > 0 && (
                          <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                            {safeSavedCars.length} saved{" "}
                            {safeSavedCars.length === 1 ? "car" : "cars"}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-end">
                        {currentSavedCar ? (
                          <>
                            <div
                              className="text-white cursor-pointer"
                              onClick={() => handleViewDetails(currentSavedCar)}
                            >
                              <h3 className="text-2xl font-bold mb-1">
                                {currentSavedCar.year} {currentSavedCar.make}{" "}
                                {currentSavedCar.model}
                              </h3>
                              <p className="text-white/80 mb-2">
                                {currentSavedCar.variant} •{" "}
                                {currentSavedCar.mileage?.toLocaleString()} km
                              </p>
                              <p className="text-xl font-bold text-[#FF6700]">
                                R{currentSavedCar.price?.toLocaleString()}
                              </p>
                            </div>
                            <Button
                              className="bg-white text-[#3E5641] hover:bg-white/90"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetails(currentSavedCar)
                              }}
                            >
                              View Details
                            </Button>
                          </>
                        ) : (
                          <div className="text-white text-center w-full">
                            <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <h3 className="text-xl font-bold mb-1">
                              No Saved Cars
                            </h3>
                            <Button
                              className="bg-white text-[#3E5641] hover:bg-white/90"
                              onClick={handleBrowseCars}
                            >
                              Browse Cars
                            </Button>
                          </div>
                        )}
                      </div>

                      {safeSavedCars.length > 1 && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                          {safeSavedCars.map((_, index) => (
                            <button
                              key={index}
                              className={`w-2 h-2 rounded-full transition-all ${
                                currentCarIndex === index
                                  ? "bg-white w-4"
                                  : "bg-white/40"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentCarIndex(index)
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              {/* RIGHT — 3 cols: Recently Listed */}
              <div className="col-span-3 h-full min-h-0">
                <Card className="rounded-3xl w-full h-full flex flex-col overflow-hidden">
                  <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-semibold">Recently Listed Cars</h3>
                    <Button variant="ghost" size="sm" className="text-[#FF6700]">
                      View All
                    </Button>
                  </div>

                  <div className="flex-grow overflow-auto p-3 scrollbar-thin">
                    {safeListedCars.length > 0 ? (
                      safeListedCars.map((vehicle) => {
                        const imgSrc = getVehicleImage(vehicle)
                        return (
                          <div
                            key={vehicle.id}
                            className="flex items-center gap-3 p-3 mb-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => handleViewDetails(vehicle)}
                          >
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 relative">
                              <Image
                                src={imgSrc}
                                alt={`${vehicle.make} ${vehicle.model}`}
                                fill
                                unoptimized={isBase64(imgSrc)}
                                className="object-cover"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src =
                                    "/placeholder.svg"
                                }}
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="font-medium truncate">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-sm text-gray-500">
                                R{vehicle.price?.toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center ml-2">
                              {onEditListedCar && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditListedCar(vehicle)
                                  }}
                                >
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              {onDeleteListedCar && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteVehicle(vehicle)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No cars listed yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t flex-shrink-0">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={handleUploadClick}
                      disabled={uploadBlocked}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {totalListings >= maxFreeListings
                        ? "Upgrade to List More"
                        : "Add New Listing"}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE LAYOUT ──────────────────────────────────────────────── */}
        <div className="lg:hidden w-full mx-auto h-full overflow-y-auto px-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Welcome, {user.firstName}</h1>

            {/* Metric row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="col-span-1" onClick={handleProfileClick}>
                <Card className="rounded-xl overflow-hidden aspect-square transition-transform hover:scale-105 cursor-pointer">
                  <div className="relative w-full h-full">
                    {user.profilePic ? (
                      <Image
                        src={user.profilePic}
                        alt={`${user.firstName}'s profile`}
                        fill
                        unoptimized={isBase64(user.profilePic)}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#2E933C] flex items-center justify-center text-white">
                        <div className="text-center">
                          <div className="text-3xl font-bold">
                            {user.firstName?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="text-xs">{user.firstName}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <Card className="col-span-1 rounded-xl p-2 flex flex-col items-center justify-center">
                <div className="flex justify-between items-center mb-2 w-full">
                  <h3 className="text-xs font-semibold text-[#3E5641]">Metrics</h3>
                  <Eye className="w-3 h-3 text-[#FF6700]" />
                </div>
                <div className="text-xl font-bold text-[#3E5641]">{totalListings}</div>
                <div className="text-xs text-[#6F7F69]">Listings</div>
              </Card>

              <Card
                className={`col-span-1 rounded-xl p-2 flex flex-col items-center justify-center bg-gradient-to-br from-[#FF6700] to-[#FF9248] text-white cursor-pointer ${
                  totalListings >= maxFreeListings ? "opacity-90" : ""
                }`}
                onClick={handleUploadClick}
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-semibold mt-1">
                  {totalListings >= maxFreeListings ? "Upgrade" : "Upload"}
                </span>
              </Card>

              <Card className="col-span-1 rounded-xl p-2 flex flex-col items-center justify-center">
                <div className="flex justify-between items-center mb-2 w-full">
                  <h3 className="text-xs font-semibold text-[#3E5641]">Plan</h3>
                  <Package className="h-3 w-3 text-[#FF6700]" />
                </div>
                <div className="text-xl font-bold text-[#3E5641]">Free</div>
                <div className="text-xs text-[#6F7F69]">{freeListingsRemaining} left</div>
              </Card>
            </div>

            {/* Mobile Saved Cars */}
            <Card className="rounded-lg overflow-hidden w-full h-40 relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10" />

              {carouselImageSrc !== "/placeholder.svg?height=400&width=600" ? (
                <Image
                  src={carouselImageSrc}
                  alt={
                    currentSavedCar
                      ? `${currentSavedCar.make} ${currentSavedCar.model}`
                      : "Saved vehicle"
                  }
                  fill
                  unoptimized={carouselImageIsBase64}
                  className="object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      "/placeholder.svg?height=400&width=600"
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <Car className="w-10 h-10 text-gray-600" />
                </div>
              )}

              <div className="relative z-20 h-full flex flex-col justify-between p-4">
                <div className="flex justify-between items-start">
                  <span
                    onClick={() => router.push("/liked-cars-page")}
                    className="bg-[#FF6700] text-white px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-[#FF7D33] transition-colors"
                  >
                    View Saved Cars
                  </span>
                  {safeSavedCars.length > 0 && (
                    <span className="bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
                      {safeSavedCars.length} saved
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  {currentSavedCar ? (
                    <div
                      className="text-white cursor-pointer"
                      onClick={() => handleViewDetails(currentSavedCar)}
                    >
                      <h3 className="text-lg font-bold">
                        {currentSavedCar.year} {currentSavedCar.make}{" "}
                        {currentSavedCar.model}
                      </h3>
                      <p className="text-white/80 text-xs mb-1">
                        {currentSavedCar.variant} •{" "}
                        {currentSavedCar.mileage?.toLocaleString()} km
                      </p>
                      <p className="text-lg font-bold text-[#FF6700]">
                        R{currentSavedCar.price?.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="text-white text-center w-full">
                      <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <h3 className="text-base font-bold mb-1">No Saved Cars</h3>
                      <Button
                        className="bg-white text-[#3E5641] hover:bg-white/90 text-xs h-auto py-1.5 px-3"
                        onClick={handleBrowseCars}
                      >
                        Browse Cars
                      </Button>
                    </div>
                  )}
                </div>
                {safeSavedCars.length > 1 && (
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                    {safeSavedCars.map((_, index) => (
                      <button
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          currentCarIndex === index ? "bg-white w-3" : "bg-white/40"
                        }`}
                        onClick={() => setCurrentCarIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Mobile Recently Listed */}
            <Card className="rounded-3xl w-full flex flex-col mb-4">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Recently Listed</h3>
              </div>
              <div className="p-2">
                {safeListedCars.length > 0 ? (
                  safeListedCars.map((vehicle) => {
                    const imgSrc = getVehicleImage(vehicle)
                    return (
                      <div
                        key={vehicle.id}
                        className="flex items-center gap-2 p-2 mb-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetails(vehicle)}
                      >
                        <div className="w-12 h-9 rounded-md overflow-hidden bg-gray-200 flex-shrink-0 relative">
                          <Image
                            src={imgSrc}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            fill
                            unoptimized={isBase64(imgSrc)}
                            className="object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src =
                                "/placeholder.svg"
                            }}
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="font-medium text-sm truncate">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-xs text-gray-500">
                            R{vehicle.price?.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center ml-1">
                          {onEditListedCar && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0 h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditListedCar(vehicle)
                              }}
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {onDeleteListedCar && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0 h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteVehicle(vehicle)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No cars listed yet.</p>
                  </div>
                )}
              </div>
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  className="w-full text-sm bg-transparent"
                  onClick={handleUploadClick}
                  disabled={uploadBlocked}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {totalListings >= maxFreeListings
                    ? "Upgrade to List More"
                    : "Add New Listing"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* ── Delete Modal ─────────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Vehicle Listing</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete your {vehicleToDelete?.year}{" "}
              {vehicleToDelete?.make} {vehicleToDelete?.model} listing?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for deletion:<span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isDeleting}
              >
                <option value="">Select a reason</option>
                <option value="sold">Vehicle has been sold</option>
                <option value="no_longer_selling">No longer selling</option>
                <option value="no_longer_need_service">
                  No longer need the service
                </option>
                <option value="other">Other</option>
              </select>
            </div>
            {deleteReason === "other" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please specify:<span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={customDeleteReason}
                  onChange={(e) => setCustomDeleteReason(e.target.value)}
                  placeholder="Please provide your reason..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={3}
                  disabled={isDeleting}
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setVehicleToDelete(null)
                  setDeleteReason("")
                  setCustomDeleteReason("")
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteVehicle}
                disabled={
                  !deleteReason ||
                  (deleteReason === "other" && !customDeleteReason.trim()) ||
                  isDeleting
                }
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete Listing"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ─────────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl relative">
            <button
              onClick={() => {
                setShowUpgradeModal(false)
                setUploadBlocked(false)
              }}
              className="absolute top-4 right-4 text-[#6F7F69] hover:text-[#3E5641]"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#FF6700] rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#3E5641] mb-2">
                Upgrade Your Plan
              </h3>
              <p className="text-[#6F7F69]">
                You've reached your free listing limit of {maxFreeListings} vehicles.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#3E5641] text-[#3E5641] hover:bg-[#3E5641] hover:text-white bg-transparent"
                onClick={() => handleUpgradeAction("contact")}
              >
                Contact Sales
              </Button>
              <Button
                className="flex-1 bg-[#FF6700] hover:bg-[#FF6700]/90 text-white"
                onClick={() => handleUpgradeAction("upgrade")}
              >
                Upgrade Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}