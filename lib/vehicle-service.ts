// lib/vehicle-service.ts
//
// Central service layer for all vehicle operations.
// Wires together:
//   - Storage-aware create/update/delete (vehicle-operations-with-storage.ts)
//   - Lean list queries that exclude description (vehicle-operations-with-storage.ts)
//   - Full detail query that includes images (vehicle-operations-with-storage.ts)
//   - Search/filter/saved operations (vehicle-operations.ts)
//   - Cache management (cache-manager.ts)

import type { Vehicle, VehicleFormData } from "@/types/vehicle"
import { CacheManager } from "@/lib/cache-manager"

// Storage-aware operations
import {
  createVehicleWithStorage,
  updateVehicleWithStorage,
  deleteVehicleWithStorage,
  getVehiclesLean,
  getUserVehiclesLean,
  getVehicleByIdFull,
} from "./vehicle-operations-with-storage"

// Non-image operations (search, filter, saved vehicles)
import {
  searchVehicles,
  filterVehicles,
  saveVehicle,
  unsaveVehicle,
  getSavedVehicles as getSavedVehiclesFromDB,
  isVehicleSaved,
} from "./vehicle-operations"

// ─── Error Class ──────────────────────────────────────────────────────────────

export class VehicleError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = "VehicleError"
  }
}

// ─── Cache Pruning ────────────────────────────────────────────────────────────

/**
 * Strip images and descriptions before storing list views in localStorage.
 * Single vehicle detail records (getVehicleById) are cached WITH images
 * since they're one record and much smaller.
 */
const pruneForCache = (vehicles: Vehicle[]): Vehicle[] => {
  return vehicles.map((v) => ({
    ...v,
    images: v.images && v.images.length > 0 ? [v.images[0]] : [], // keep only first image for thumbnails
    description: "",
  }))
}

// ─── getVehicles ──────────────────────────────────────────────────────────────

const getVehicles = async (status = "active"): Promise<Vehicle[]> => {
  const cacheKey = `imoto_vehicles_cache_${status}`

  const cached = CacheManager.get<Vehicle[]>(cacheKey)
  if (cached) {
    console.log(`✅ [VehicleService] ${cached.length} vehicles from cache`)

    if (CacheManager.isStale(cacheKey)) {
      getVehiclesLean(status)
        .then((fresh) => {
          CacheManager.set(cacheKey, pruneForCache(fresh))
        })
        .catch((err) =>
          console.error("❌ [VehicleService] Background refresh failed:", err)
        )
    }

    return cached
  }

  console.log(`🔄 [VehicleService] Fetching vehicles (status: ${status})...`)
  const vehicles = await getVehiclesLean(status)

  CacheManager.set(cacheKey, pruneForCache(vehicles))

  return vehicles
}

// ─── getVehicleById ───────────────────────────────────────────────────────────

const getVehicleById = async (id: string): Promise<Vehicle | null> => {
  const cacheKey = `imoto_vehicle_details_${id}`

  const cached = CacheManager.get<Vehicle>(cacheKey)
  if (cached) {
    console.log(`✅ [VehicleService] Vehicle ${id} from cache`)
    return cached
  }

  const vehicle = await getVehicleByIdFull(id)

  if (vehicle) {
    CacheManager.set(cacheKey, vehicle)
  }

  return vehicle
}

// ─── getUserVehicles ──────────────────────────────────────────────────────────

const getUserVehicles = async (
  userId: string,
  forceRefresh = false
): Promise<Vehicle[]> => {
  const cacheKey = `imoto_user_vehicles_${userId}`

  if (!forceRefresh) {
    const cached = CacheManager.get<Vehicle[]>(cacheKey)
    if (cached) {
      if (CacheManager.isStale(cacheKey)) {
        getUserVehiclesLean(userId)
          .then((fresh) => CacheManager.set(cacheKey, pruneForCache(fresh)))
          .catch((err) =>
            console.error("❌ [VehicleService] User vehicle refresh failed:", err)
          )
      }
      return cached
    }
  }

  const vehicles = await getUserVehiclesLean(userId)
  CacheManager.set(cacheKey, pruneForCache(vehicles))
  return vehicles
}

// ─── getSavedVehicles ─────────────────────────────────────────────────────────

/**
 * Fetch saved vehicles for a user.
 *
 * NOT cached — saved vehicles need fresh images every time since they use
 * VEHICLE_DETAIL_QUERY and display in the dashboard carousel and liked-cars-page.
 * Caching here caused stale empty-image arrays to persist after the fix.
 */
const getSavedVehicles = async (userId: string): Promise<Vehicle[]> => {
  console.log(`🔄 [VehicleService] Fetching saved vehicles for ${userId}...`)
  const vehicles = await getSavedVehiclesFromDB(userId)
  console.log(
    `✅ [VehicleService] Got ${vehicles.length} saved vehicles, ` +
    `first image: ${vehicles[0]?.images?.[0]?.substring(0, 60) ?? "none"}`
  )
  return vehicles
}

// ─── createVehicle ────────────────────────────────────────────────────────────

const createVehicle = async (
  vehicleData: VehicleFormData,
  userId: string
): Promise<Vehicle> => {
  const vehicle = await createVehicleWithStorage(vehicleData, userId)
  invalidateCaches(userId)
  return vehicle
}

// ─── updateVehicle ────────────────────────────────────────────────────────────

const updateVehicle = async (
  id: string,
  vehicleData: Partial<VehicleFormData>,
  userId?: string
): Promise<Vehicle | null> => {
  const vehicle = await updateVehicleWithStorage(id, vehicleData)

  if (vehicle) {
    CacheManager.delete(`imoto_vehicle_details_${id}`)
    if (userId) invalidateCaches(userId)
  }

  return vehicle
}

// ─── deleteVehicle ────────────────────────────────────────────────────────────

const deleteVehicle = async (
  id: string,
  userId?: string,
  reason?: string
): Promise<boolean> => {
  const success = await deleteVehicleWithStorage(id, userId || "", reason)

  if (success) {
    CacheManager.delete(`imoto_vehicle_details_${id}`)
    if (userId) invalidateCaches(userId)
  }

  return success
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

export function invalidateCaches(userId?: string): void {
  CacheManager.delete("imoto_vehicles_cache_active")

  if (userId) {
    CacheManager.clearUserCache(userId)
  }
}

// ─── Service Object Export ────────────────────────────────────────────────────

export const vehicleService = {
  getVehicles,
  getVehicleById,
  getUserVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  filterVehicles,
  saveVehicle,
  unsaveVehicle,
  getSavedVehicles,
  isVehicleSaved,
  invalidateCaches,
}

// ─── Named Exports ────────────────────────────────────────────────────────────

export {
  getVehicles,
  getVehicleById,
  getUserVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  filterVehicles,
  saveVehicle,
  unsaveVehicle,
  getSavedVehicles,
  isVehicleSaved,
}