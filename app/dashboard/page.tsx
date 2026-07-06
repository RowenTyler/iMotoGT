"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/components/UserContext"
import Dashboard from "@/components/dashboard"
import EmailVerificationBanner from "@/components/email-verification-banner"
import { DashboardSkeleton } from "@/components/skeletons"
import type { Vehicle } from "@/types/vehicle"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    user,
    authUser,
    isEmailVerified,
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

      // Dynamic import to avoid circular deps
      const { getSavedVehicles } = await import("@/lib/vehicle-service")
      const savedData = await getSavedVehicles(user.id)

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

      const finalReason = reason || "No reason provided"
      await deleteListedVehicle(vehicleId, finalReason)

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
    return <DashboardSkeleton />
  }

  if (!user) return null

  return (
    <>
      <EmailVerificationBanner
        isEmailVerified={isEmailVerified}
        userEmail={authUser?.email}
      />
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
    </>
  )
}