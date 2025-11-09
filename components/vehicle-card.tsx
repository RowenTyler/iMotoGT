"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart } from "lucide-react"
import type { Vehicle } from "@/types/vehicle"
import { cn } from "@/lib/utils"

interface VehicleCardProps {
  vehicle: Vehicle
  onViewDetails: () => void
  isSaved: boolean
  onToggleSave: () => void
  isLoggedIn: boolean
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

export default function VehicleCard({ vehicle, onViewDetails, isSaved, onToggleSave, isLoggedIn }: VehicleCardProps) {
  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLoggedIn) {
      onToggleSave()
    } else {
      alert("Please log in to save vehicles.")
    }
  }

  return (
    <Link
      href={`/vehicle-details/${vehicle.id}`}
      className="rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden group h-96"
    >
      {/* Full-height image container */}
      <div className="relative w-full h-full">
        <Image
          src={
            (vehicle.images && vehicle.images.length > 0 ? vehicle.images[0] : vehicle.image) ||
            "/placeholder.svg?height=400&width=300&query=vehicle"
          }
          alt={`${vehicle.make} ${vehicle.model}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Glass gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Save button - top right */}
        {isLoggedIn && (
          <button
            onClick={handleSaveClick}
            className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm p-2 rounded-full text-white hover:bg-orange-500 transition-colors z-10"
            aria-label="Save vehicle"
          >
            <Heart className={cn("w-5 h-5", isSaved ? "fill-current text-orange-500" : "text-white")} />
          </button>
        )}

        {/* Vehicle info overlay - bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-5">
          <h3 className="text-lg font-bold truncate">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.variant && <p className="text-sm text-gray-200 truncate">{vehicle.variant}</p>}

          <p className="text-2xl font-bold text-orange-400 my-2">{formatPriceForDisplay(vehicle.price)}</p>

          <div className="text-sm text-gray-100 space-y-1">
            <p className="truncate">
              {vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : "N/A"} • {vehicle.transmission}
            </p>
            <p className="truncate">
              {vehicle.sellerCity}, {vehicle.sellerProvince}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
