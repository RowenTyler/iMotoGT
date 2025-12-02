"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Heart, Share2, User, LogIn } from "lucide-react"
import type { Vehicle } from "@/types/vehicle"
import type { UserProfile } from "@/types/user"
import { cn } from "@/lib/utils"

interface VehicleDetailsStickyHeaderProps {
  vehicle: Vehicle
  isSaved: boolean
  onToggleSave: () => void
  user: UserProfile | null
}

export default function VehicleDetailsStickyHeader({
  vehicle,
  isSaved,
  onToggleSave,
  user,
}: VehicleDetailsStickyHeaderProps) {
  const router = useRouter()
  const [showShareSidebar, setShowShareSidebar] = useState(false)

  // Format price for display
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

  // Handle share options
  const handleShare = async (platform: string) => {
    const url = window.location.href
    const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    const text = `Check out this ${title} for ${formatPriceForDisplay(vehicle.price)}`

    switch (platform) {
      case "copy":
        try {
          await navigator.clipboard.writeText(url)
          alert("Link copied to clipboard!")
          setShowShareSidebar(false)
        } catch (err) {
          console.error("Failed to copy:", err)
        }
        break
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + "\n\n" + url)}`
        setShowShareSidebar(false)
        break
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank")
        setShowShareSidebar(false)
        break
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank")
        setShowShareSidebar(false)
        break
      case "x":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          "_blank",
        )
        setShowShareSidebar(false)
        break
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowShareSidebar(false)
      }
    }

    if (showShareSidebar) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [showShareSidebar])

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-md z-[999]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left Section - Logo and Vehicle Info */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              {/* Logo */}
              <button
                onClick={handleLogoClick}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                aria-label="Scroll to top"
                title="Click to scroll to top"
              >
                <Image
                  src="/imoto-icon.png"
                  alt="iMoto Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 md:w-10 md:h-10"
                />
              </button>

              {/* Vehicle Details */}
              <div className="hidden md:flex flex-col min-w-0">
                <p className="text-sm font-semibold text-[#3E5641] dark:text-white truncate">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                {vehicle.variant && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{vehicle.variant}</p>
                )}
                <p className="text-sm font-bold text-[#FF6700] dark:text-[#FF7D33]">
                  {formatPriceForDisplay(vehicle.price)}
                </p>
              </div>

              {/* Sponsored Badge */}
              <div className="hidden lg:flex items-center gap-1 ml-auto">
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  Sponsored
                </span>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Share Button */}
              <button
                onClick={() => setShowShareSidebar(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Share vehicle"
                title="Share this vehicle"
              >
                <Share2 className="w-5 h-5 text-[#3E5641] dark:text-white" />
              </button>

              {/* Save Button */}
              <button
                onClick={onToggleSave}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label={isSaved ? "Remove from saved" : "Save vehicle"}
                title={isSaved ? "Remove from saved" : "Save vehicle"}
              >
                <Heart
                  className={cn(
                    "w-5 h-5",
                    isSaved ? "fill-[#FF6700] text-[#FF6700]" : "text-[#3E5641] dark:text-white",
                  )}
                />
              </button>

              {/* User/Login Button - Use router.push for proper Next.js navigation */}
              {user ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Go to dashboard"
                  title="Dashboard"
                >
                  <User className="w-5 h-5 text-[#3E5641] dark:text-white" />
                </button>
              ) : (
                <button
                  onClick={() => router.push("/login")}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Login"
                  title="Login"
                >
                  <LogIn className="w-5 h-5 text-[#3E5641] dark:text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop overlay */}
      {showShareSidebar && (
        <div className="fixed inset-0 bg-black/50 z-[998] md:hidden" onClick={() => setShowShareSidebar(false)} />
      )}

      {/* Sidebar drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 shadow-lg z-[1000] transform transition-transform duration-300 ease-out",
          showShareSidebar ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-[#3E5641] dark:text-white">Share Vehicle</h3>
            <button
              onClick={() => setShowShareSidebar(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close share menu"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          {/* Share Options */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => handleShare("copy")}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-[#3E5641] dark:text-white"
            >
              Copy Link
            </button>
            <button
              onClick={() => handleShare("email")}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-[#3E5641] dark:text-white"
            >
              Email
            </button>
            <button
              onClick={() => handleShare("whatsapp")}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-[#3E5641] dark:text-white"
            >
              WhatsApp
            </button>
            <button
              onClick={() => handleShare("facebook")}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-[#3E5641] dark:text-white"
            >
              Facebook
            </button>
            <button
              onClick={() => handleShare("x")}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-[#3E5641] dark:text-white"
            >
              X (Twitter)
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
