// lib/vehicle-service.ts
import type { Vehicle, VehicleFormData } from "@/types/vehicle"
import { CacheManager } from "@/lib/cache-manager"

// Import cache-aware functions from optimized module
import {
  getVehicles as originalGetVehicles,
  getVehicleById,
  getUserVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  invalidateCaches
} from "./vehicle-operations-optimized"

// Import non-cached functions from original module
import {
  searchVehicles,
  filterVehicles,
  saveVehicle,
  unsaveVehicle,
  getSavedVehicles,
  isVehicleSaved
} from "./vehicle-operations"

/**
 * Custom error class for vehicle service operations
 */
export class VehicleError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = "VehicleError"
  }
}

/**
 * PRUNING UTILITY: Prevents 12MB LocalStorage Overflow
 * Strips Base64 images from the dataset before caching to keep size < 100KB.
 */
const pruneForCache = (vehicles: Vehicle[]): Vehicle[] => {
  return vehicles.map((v) => ({
    ...v,
    // Keep only the first image to reduce cache size but preserve the original
    // image data (URL or data URI). Avoid replacing with hardcoded placeholder
    // paths which break rendering after reload. If storage becomes a problem
    // we can fallback to compressing or truncating but for now keep the real
    // image so the UI can show original images after reloading.
    images: v.images?.slice(0, 1) || [],
  }))
}

/**
 * Wrapped getVehicles to handle pruning and cache safety
 */
const getVehicles = async (status = 'active') => {
  const vehicles = await originalGetVehicles(status);
  
  // Logic: The originalGetVehicles might have already triggered a cache set.
  // We manually override the cache entry with a PRUNED version to prevent 12MB crashes.
  const prunedData = pruneForCache(vehicles);
  CacheManager.set(`imoto_vehicles_cache_${status}`, prunedData);
  
  return vehicles;
};

/**
 * Map database record to Vehicle type
 */
function mapDatabaseToVehicle(data: any): Vehicle {
  const user = data.users || {}

  return {
    id: data.id,
    userId: data.user_id,
    make: data.make,
    model: data.model,
    variant: data.variant || "",
    year: data.year,
    price: data.price,
    mileage: data.mileage,
    transmission: data.transmission,
    fuel: data.fuel,
    fuelType: data.fuel,
    engineCapacity: data.engine_capacity || "",
    bodyType: data.body_type || "",
    province: data.province,
    city: data.city,
    description: data.description || "",
    images: data.images || [],
    status: data.status || "active",
    sellerName:
      user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || user.email?.split("@")[0] || "",
    sellerEmail: user.email || "",
    sellerPhone: user.phone || "",
    sellerSuburb: user.suburb || "",
    sellerCity: user.city || "",
    sellerProvince: user.province || "",
    sellerProfilePic: user.profile_pic || "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Map VehicleFormData to database format
 */
function mapVehicleToDatabase(vehicleData: VehicleFormData, userId: string): Record<string, any> {
  return {
    user_id: userId,
    make: vehicleData.make,
    model: vehicleData.model,
    variant: vehicleData.variant || "",
    year: vehicleData.year,
    price: vehicleData.price,
    mileage: vehicleData.mileage,
    transmission: vehicleData.transmission,
    fuel: vehicleData.fuel,
    engine_capacity: vehicleData.engineCapacity || "",
    body_type: vehicleData.body_type || "",
    province: vehicleData.province,
    city: vehicleData.city,
    description: vehicleData.description || "",
    images: vehicleData.images || [],
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// Export as object
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
  invalidateCaches
}

// Also export individual functions
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
  invalidateCaches
}
