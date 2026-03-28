// lib/vehicle-service.ts
//
// Central service layer for all vehicle operations.
// Wires together:
//   - Storage-aware create/update/delete (file 3)
//   - Lean list queries that exclude images (file 3)
//   - Full detail query that includes images (file 3)
//   - Search/filter/saved operations (original vehicle-operations.ts)
//   - Cache management (cache-manager.ts)

import type { Vehicle, VehicleFormData } from "@/types/vehicle"
import { CacheManager } from "@/lib/cache-manager"

// Storage-aware operations (new)
import {
  createVehicleWithStorage,
  updateVehicleWithStorage,
  deleteVehicleWithStorage,
  getVehiclesLean,
  getUserVehiclesLean,
  getVehicleByIdFull,
} from "./vehicle-operations-with-storage"

// Non-image operations from original (search, filter, saved vehicles)
import {
  searchVehicles,
  filterVehicles,
  saveVehicle,
  unsaveVehicle,
  getSavedVehicles,
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
 * Strip images and descriptions before storing in localStorage cache.
 *
 * Images are the main cause of the 6MB payload issue. Since list views
 * (home, search results, dashboard) never show full images anyway — they
 * show a card thumbnail — we do not need images in the list cache at all.
 *
 * When a user opens a vehicle detail page, getVehicleById fetches the
 * full record including images from Supabase.
 */
const pruneForCache = (vehicles: Vehicle[]): Vehicle[] => {
  return vehicles.map((v) => ({
    ...v,
    images: [],       // Never cache images in list view
    description: "",  // Strip description too — only needed on detail page
  }))
}

// ─── getVehicles ──────────────────────────────────────────────────────────────

/**
 * Fetch all active vehicles for list/home/search views.
 *
 * Uses the lean query (no images) and caches the result.
 * If cache is stale, triggers a background refresh so the
 * user always sees instant results.
 */
const getVehicles = async (status = "active"): Promise<Vehicle[]> => {
  const cacheKey = `imoto_vehicles_cache_${status}`

  // Try cache first
  const cached = CacheManager.get<Vehicle[]>(cacheKey)
  if (cached) {
    console.log(`✅ [VehicleService] ${cached.length} vehicles from cache`)

    // Background refresh if stale — non-blocking
    if (CacheManager.isStale(cacheKey)) {
      console.log("[VehicleService] Cache stale, refreshing in background...")
      getVehiclesLean(status)
        .then((fresh) => {
          CacheManager.set(cacheKey, pruneForCache(fresh))
          console.log("✅ [VehicleService] Background refresh complete")
        })
        .catch((err) =>
          console.error("❌ [VehicleService] Background refresh failed:", err)
        )
    }

    return cached
  }

  // Cache miss — fetch from database
  console.log(`🔄 [VehicleService] Fetching vehicles (status: ${status})...`)
  const vehicles = await getVehiclesLean(status)

  // Cache WITHOUT images to keep localStorage small
  CacheManager.set(cacheKey, pruneForCache(vehicles))
  console.log(
    `✅ [VehicleService] Cached ${vehicles.length} vehicles (images excluded)`
  )

  return vehicles
}

// ─── getVehicleById ───────────────────────────────────────────────────────────

/**
 * Fetch a single vehicle WITH images and full seller details.
 * Only called when a user opens the vehicle detail page.
 *
 * Caches the full vehicle (including images) since it is a single
 * record and much smaller than caching an entire list.
 */
const getVehicleById = async (id: string): Promise<Vehicle | null> => {
  const cacheKey = `imoto_vehicle_details_${id}`

  // Try cache
  const cached = CacheManager.get<Vehicle>(cacheKey)
  if (cached) {
    console.log(`✅ [VehicleService] Vehicle ${id} from cache`)
    return cached
  }

  // Fetch full detail record including images
  console.log(`🔄 [VehicleService] Fetching vehicle ${id}...`)
  const vehicle = await getVehicleByIdFull(id)

  if (vehicle) {
    // Cache single vehicle including images — small enough to store
    CacheManager.set(cacheKey, vehicle)
    console.log(`✅ [VehicleService] Cached vehicle ${id}`)
  }

  return vehicle
}

// ─── getUserVehicles ──────────────────────────────────────────────────────────

/**
 * Fetch all vehicles for a specific user (dashboard listed cars).
 * Uses lean query — no images in the list.
 */
const getUserVehicles = async (
  userId: string,
  forceRefresh = false
): Promise<Vehicle[]> => {
  const cacheKey = `imoto_user_vehicles_${userId}`

  if (!forceRefresh) {
    const cached = CacheManager.get<Vehicle[]>(cacheKey)
    if (cached) {
      console.log(
        `✅ [VehicleService] ${cached.length} user vehicles from cache`
      )

      // Background refresh if stale
      if (CacheManager.isStale(cacheKey)) {
        getUserVehiclesLean(userId)
          .then((fresh) => {
            CacheManager.set(cacheKey, pruneForCache(fresh))
            console.log("✅ [VehicleService] User vehicles refreshed")
          })
          .catch((err) =>
            console.error(
              "❌ [VehicleService] User vehicle refresh failed:",
              err
            )
          )
      }

      return cached
    }
  }

  console.log(`🔄 [VehicleService] Fetching vehicles for user ${userId}...`)
  const vehicles = await getUserVehiclesLean(userId)

  CacheManager.set(cacheKey, pruneForCache(vehicles))
  console.log(`✅ [VehicleService] Cached ${vehicles.length} user vehicles`)

  return vehicles
}

// ─── createVehicle ────────────────────────────────────────────────────────────

/**
 * Create a new vehicle listing.
 *
 * Images are uploaded to vehicle-storage bucket before the DB insert.
 * Public URLs are stored in the database instead of base64 strings.
 * Falls back to base64 per-image if any individual upload fails.
 */
const createVehicle = async (
  vehicleData: VehicleFormData,
  userId: string
): Promise<Vehicle> => {
  const vehicle = await createVehicleWithStorage(vehicleData, userId)

  // Invalidate list caches so new listing appears immediately
  invalidateCaches(userId)

  return vehicle
}

// ─── updateVehicle ────────────────────────────────────────────────────────────

/**
 * Update an existing vehicle listing.
 *
 * Any new base64 images are uploaded to storage.
 * Existing storage URLs are kept unchanged.
 * Cache for this vehicle is cleared so the detail page shows fresh data.
 */
const updateVehicle = async (
  id: string,
  vehicleData: Partial<VehicleFormData>,
  userId?: string
): Promise<Vehicle | null> => {
  const vehicle = await updateVehicleWithStorage(id, vehicleData)

  if (vehicle) {
    // Clear detail cache for this specific vehicle
    CacheManager.delete(`imoto_vehicle_details_${id}`)

    // Invalidate user list cache
    if (userId) invalidateCaches(userId)
  }

  return vehicle
}

// ─── deleteVehicle ────────────────────────────────────────────────────────────

/**
 * Soft-delete a vehicle listing.
 *
 * Sets is_deleted = true and status = inactive in the database.
 * Asynchronously cleans up storage images after the delete completes.
 * Cache is cleared so the vehicle disappears from lists immediately.
 */
const deleteVehicle = async (
  id: string,
  userId?: string
): Promise<boolean> => {
  const success = await deleteVehicleWithStorage(id, userId || "")

  if (success) {
    CacheManager.delete(`imoto_vehicle_details_${id}`)
    if (userId) invalidateCaches(userId)
  }

  return success
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

/**
 * Invalidate all vehicle-related caches.
 * Called after create, update, or delete so lists refresh.
 */
export function invalidateCaches(userId?: string): void {
  console.log("🗑️ [VehicleService] Invalidating caches...")

  CacheManager.delete("imoto_vehicles_cache_active")

  if (userId) {
    CacheManager.clearUserCache(userId)
  }

  console.log("✅ [VehicleService] Cache invalidation complete")
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
// Kept for any files that import functions directly rather than via vehicleService

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