"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/components/UserContext"
import Dashboard from "@/components/dashboard"
import type { Vehicle } from "@/types/vehicle"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    user,
    listedVehicles = [],
    savedVehicles, // Set<string> of IDs — used only for triggering reloads
    deleteListedVehicle,
    refreshVehicles,
    isLoading,
    refreshUserProfile,
  } = useUser()

  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false)
  const [isDeletingVehicle, setIsDeletingVehicle] = useState<string | null>(null)
  const [savedVehiclesData, setSavedVehiclesData] = useState<Vehicle[]>([])
  const [savedVehiclesLoading, setSavedVehiclesLoading] = useState(false)

  // ── Load saved vehicles data (full Vehicle objects with images) ──────────────
  //
  // KEY FIX: dependency array only contains user?.id — NOT the savedVehicles Set.
  // The Set changes reference on every context update causing an infinite loop.
  // Instead, expose a manual refresh callback for use after save/unsave actions.
  //
  const loadSavedVehiclesData = useCallback(async () => {
    if (!user?.id) return

    try {
      setSavedVehiclesLoading(true)
      console.log("🔄 DashboardPage: Loading saved vehicles for user:", user.id)

      // Dynamic import to avoid circular deps
      const { getSavedVehicles } = await import("@/lib/vehicle-service")
      const savedData = await getSavedVehicles(user.id)

      console.log("✅ DashboardPage: Loaded saved vehicles:", savedData.length,
        "first image:", savedData[0]?.images?.[0]?.substring(0, 60) ?? "none")

      setSavedVehiclesData(savedData)
    } catch (error) {
      console.error("❌ DashboardPage: Error loading saved vehicles:", error)
      // Do NOT setSavedVehiclesData([]) here — keep whatever we had before
    } finally {
      setSavedVehiclesLoading(false)
    }
  }, [user?.id]) // ← only user?.id, NOT savedVehicles Set

  // Load on mount and when user changes
  useEffect(() => {
    loadSavedVehiclesData()
  }, [loadSavedVehiclesData])

  // ── Auth & verification redirects ────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("⚠️ No user found, redirecting to login")
      router.push("/login?redirect=/dashboard")
    }

    const isSignup = searchParams.get("signup")
    if (isSignup === "true" && user) {
      setShowVerificationPrompt(true)
    }
  }, [user, isLoading, router, searchParams])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleEditListedCar = (vehicle: Vehicle) => {
    router.push(`/vehicle/${vehicle.id}/edit`)
  }

  const handleDeleteListedCar = async (vehicleId: string, reason?: string) => {
    try {
      setIsDeletingVehicle(vehicleId)
      console.log("🗑️ DashboardPage: Soft deleting vehicle:", { vehicleId, reason })

      const finalReason = reason || "No reason provided"
      await deleteListedVehicle(vehicleId, finalReason)

      console.log("✅ DashboardPage: Soft delete completed")
      await refreshVehicles()
    } catch (error: any) {
      console.error("❌ DashboardPage: Soft delete failed:", error)
      alert(`Failed to delete listing: ${error.message}`)
    } finally {
      setIsDeletingVehicle(null)
    }
  }

  const handleViewListedCar = (vehicle: Vehicle) => {
    router.push(`/vehicle-details/${vehicle.id}`)
  }

  // Refresh saved vehicles — called after toggling save on a vehicle
  const refreshSavedVehicles = useCallback(async () => {
    await loadSavedVehiclesData()
  }, [loadSavedVehiclesData])

  // ── Derived state ─────────────────────────────────────────────────────────────
  const activeListedVehicles = Array.isArray(listedVehicles)
    ? listedVehicles.filter((vehicle) => !vehicle.isDeleted)
    : []

  const activeSavedVehicles = savedVehiclesData.filter((vehicle) => !vehicle.isDeleted)

  // ── Loading / no-user guards ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#6F7F69]">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <Dashboard
      user={user}
      listedCars={activeListedVehicles}
      savedCars={activeSavedVehicles}
      onEditListedCar={handleEditListedCar}
      onDeleteListedCar={handleDeleteListedCar}
      onViewDetails={handleViewListedCar}
      onLoginClick={() => router.push("/login")}
      onGoHome={() => router.push("/")}
      onShowAllCars={() => router.push("/results")}
      onGoToSellPage={() => router.push("/upload-vehicle")}
      onViewProfileSettings={() => router.push("/settings")}
      onViewUploadVehicle={() => router.push("/upload-vehicle")}
      onBack={() => router.back()}
      onSaveCar={refreshSavedVehicles}
      onNavigateToUpload={() => router.push("/upload-vehicle")}
    />
  )
}
