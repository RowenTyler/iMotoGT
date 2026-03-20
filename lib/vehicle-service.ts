import type { Vehicle, VehicleFormData } from "@/types/vehicle" // Assuming Vehicle and VehicleFormData are declared in a types file

// Import cache-aware functions from optimized module
import {
  getVehicles,
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
    // Get seller information from joined users table
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
    body_type: vehicleData.bodyType || "",
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
