import { supabase } from "./supabase"
import type { Vehicle, VehicleFormData } from "@/types/vehicle"

// Lightweight query for list views (no images, no description)
const VEHICLE_LIST_QUERY = `
  id,
  user_id,
  make,
  model,
  variant,
  year,
  price,
  mileage,
  transmission,
  fuel,
  engine_capacity,
  body_type,
  province,
  city,
  status,
  contact_privacy_enabled,
  created_at,
  updated_at,
  users(id, first_name, last_name, profile_pic, city, province)
`

// Full query for detail views (includes images, description, and seller contact info)
const VEHICLE_DETAIL_QUERY = `
  id,
  user_id,
  make,
  model,
  variant,
  year,
  price,
  mileage,
  transmission,
  fuel,
  engine_capacity,
  body_type,
  province,
  city,
  description,
  images,
  status,
  contact_privacy_enabled,
  created_at,
  updated_at,
  users(id, email, first_name, last_name, phone, profile_pic, suburb, city, province)
`

// Keep original for compatibility if needed (point to detail query)
const VEHICLE_SELECT_QUERY = VEHICLE_DETAIL_QUERY

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
    fuelType: data.fuel, // ensuring compatibility if interface uses both
    engineCapacity: data.engine_capacity || "",
    bodyType: data.body_type || "",
    condition: data.condition || "Used",
    province: data.province,
    city: data.city,
    description: data.description || "",
    images: data.images || [],
    status: data.status || "active",
    // ENSURE backward compatibility - default to false if missing
    contactPrivacyEnabled: data.contact_privacy_enabled ?? false,
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
 * Fetch all vehicles from Supabase with seller information
 * Optionally filter by status
 */
export async function getVehicles(status = "active"): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_LIST_QUERY)
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching vehicles:", error)
      return []
    }

    return (data || []).map(mapDatabaseToVehicle)
  } catch (error) {
    console.error("[v0] Exception fetching vehicles:", error)
    return []
  }
}

/**
 * Get a single vehicle by ID with seller information
 */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_DETAIL_QUERY)
      .eq("id", id)
      .single()

    if (error) {
      console.error("[v0] Error fetching vehicle:", error)
      return null
    }

    return data ? mapDatabaseToVehicle(data) : null
  } catch (error) {
    console.error("[v0] Exception fetching vehicle:", error)
    return null
  }
}

/**
 * Get all vehicles for a specific user
 */
export async function getUserVehicles(userId: string): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_LIST_QUERY)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching user vehicles:", error)
      return []
    }

    return (data || []).map(mapDatabaseToVehicle)
  } catch (error) {
    console.error("[v0] Exception fetching user vehicles:", error)
    return []
  }
}

/**
 * Search vehicles by make, model, year, or registration
 * Uses .ilike for case-insensitive partial matches
 */
export async function searchVehicles(query: string): Promise<Vehicle[]> {
  if (!query || query.trim().length === 0) {
    return getVehicles()
  }

  try {
    const searchTerm = `%${query}%`

    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_LIST_QUERY)
      .or(`make.ilike.${searchTerm},model.ilike.${searchTerm},variant.ilike.${searchTerm}`)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error searching vehicles:", error)
      return []
    }

    return (data || []).map(mapDatabaseToVehicle)
  } catch (error) {
    console.error("[v0] Exception searching vehicles:", error)
    return []
  }
}

/**
 * Filter vehicles by various criteria
 */
export interface VehicleFilters {
  query?: string
  minPrice?: number | string
  maxPrice?: number | string
  minYear?: number | string
  maxYear?: number | string
  priceMin?: number
  priceMax?: number
  fuelType?: string | string[]
  transmission?: string
  bodyType?: string | string[]
  engineCapacityMin?: string | number
  engineCapacityMax?: string | number
  province?: string
  city?: string
  minMileage?: number | string
  maxMileage?: number | string
  mileageMin?: number
  mileageMax?: number
}

export async function filterVehicles(filters: VehicleFilters): Promise<Vehicle[]> {
  try {
    let query = supabase
      .from("vehicles")
      .select(VEHICLE_LIST_QUERY)
      .eq("status", "active")

    if (filters.query && filters.query.trim()) {
      const searchTerm = `%${filters.query}%`
      query = query.or(`make.ilike.${searchTerm},model.ilike.${searchTerm},variant.ilike.${searchTerm}`)
    }

    const minPrice = filters.minPrice !== undefined ? Number(filters.minPrice) : filters.priceMin
    const maxPrice = filters.maxPrice !== undefined ? Number(filters.maxPrice) : filters.priceMax

    if (minPrice && !isNaN(minPrice)) {
      query = query.gte("price", minPrice)
    }
    if (maxPrice && !isNaN(maxPrice)) {
      query = query.lte("price", maxPrice)
    }

    const minYear = filters.minYear ? Number(filters.minYear) : undefined
    const maxYear = filters.maxYear ? Number(filters.maxYear) : undefined

    if (minYear && !isNaN(minYear) && minYear > 0) {
      query = query.gte("year", minYear)
    }
    if (maxYear && !isNaN(maxYear) && maxYear > 0) {
      query = query.lte("year", maxYear)
    }

    const minMileage = filters.minMileage !== undefined ? Number(filters.minMileage) : filters.mileageMin
    const maxMileage = filters.maxMileage !== undefined ? Number(filters.maxMileage) : filters.mileageMax

    if (minMileage && !isNaN(minMileage)) {
      query = query.gte("mileage", minMileage)
    }
    if (maxMileage && !isNaN(maxMileage)) {
      query = query.lte("mileage", maxMileage)
    }

    if (filters.fuelType) {
      if (Array.isArray(filters.fuelType) && filters.fuelType.length > 0) {
        const fuelFilters = filters.fuelType.map((f) => `fuel.ilike.%${f}%`).join(",")
        query = query.or(fuelFilters)
      } else if (typeof filters.fuelType === "string" && filters.fuelType.trim()) {
        query = query.ilike("fuel", `%${filters.fuelType}%`)
      }
    }

    if (filters.transmission && filters.transmission.trim() && filters.transmission.toLowerCase() !== "all") {
      query = query.ilike("transmission", `%${filters.transmission}%`)
    }

    if (filters.bodyType) {
      if (Array.isArray(filters.bodyType) && filters.bodyType.length > 0) {
        const bodyFilters = filters.bodyType.map((b) => `body_type.ilike.%${b}%`).join(",")
        query = query.or(bodyFilters)
      } else if (typeof filters.bodyType === "string" && filters.bodyType.trim()) {
        query = query.ilike("body_type", `%${filters.bodyType}%`)
      }
    }

    const engineMin = filters.engineCapacityMin ? Number(filters.engineCapacityMin) : undefined
    const engineMax = filters.engineCapacityMax ? Number(filters.engineCapacityMax) : undefined

    if (engineMin !== undefined && !isNaN(engineMin) && engineMin > 1.0) {
      query = query.gte("engine_capacity", engineMin)
    }
    if (engineMax !== undefined && !isNaN(engineMax) && engineMax < 8.0) {
      query = query.lte("engine_capacity", engineMax)
    }

    if (filters.province && filters.province.trim()) {
      query = query.ilike("province", `%${filters.province}%`)
    }
    if (filters.city && filters.city.trim()) {
      query = query.ilike("city", `%${filters.city}%`)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error filtering vehicles:", error)
      return []
    }

    return (data || []).map(mapDatabaseToVehicle)
  } catch (error) {
    console.error("[v0] Exception filtering vehicles:", error)
    return []
  }
}

/**
 * Create a new vehicle listing with enhanced validation and error handling
 */
export async function createVehicle(vehicleData: VehicleFormData, userId: string): Promise<Vehicle> {
  console.log("[Vehicle Create] Starting creation process...")

  try {
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Authentication required. Please log in again.")
    }

    if (user.id !== userId) {
      throw new Error("User ID mismatch. Please refresh and try again.")
    }

    // Prepare database record
    const dbData = {
      user_id: userId,
      make: vehicleData.make,
      model: vehicleData.model,
      variant: vehicleData.variant || null,
      year: Number(vehicleData.year),
      price: Number(vehicleData.price),
      mileage: Number(vehicleData.mileage),
      transmission: vehicleData.transmission,
      fuel: vehicleData.fuel,
      engine_capacity: vehicleData.engineCapacity || null,
      body_type: vehicleData.bodyType || null,
      condition: vehicleData.condition || "Used",
      province: vehicleData.province,
      city: vehicleData.city,
      description: vehicleData.description || null,
      images: vehicleData.images || [],
      contact_privacy_enabled: vehicleData.contactPrivacyEnabled ?? vehicleData.contactPrivacy ?? false,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[Vehicle Create] Inserting into database...")

    const { data, error } = await supabase
      .from("vehicles")
      .insert([dbData])
      .select(VEHICLE_DETAIL_QUERY)
      .single()

    // Handle errors - THROW instead of returning null
    if (error) {
      let userMessage = "Failed to create vehicle listing."

      if (error.code === '42501') {
        userMessage = "Permission denied. Please log out and log back in."
      } else if (error.message?.toLowerCase().includes('abort')) {
        userMessage = "Request timed out. Please check your internet connection and try again."
      } else if (error.message?.toLowerCase().includes('network')) {
        userMessage = "Network error. Please check your connection and try again."
      }

      console.error("[Vehicle Create] Error:", error)
      throw new Error(userMessage)
    }

    if (!data) {
      throw new Error("No data returned from database. Please try again.")
    }

    const vehicle = mapDatabaseToVehicle(data)

    if (!vehicle) {
      throw new Error("Failed to process vehicle data. Please try again.")
    }

    console.log("[Vehicle Create] ✅ Vehicle created successfully:", vehicle.id)
    return vehicle

  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) {
      throw new Error("Request was cancelled. Please check your internet connection and try again.")
    }
    throw error instanceof Error ? error : new Error("Failed to create vehicle")
  }
}

/**
 * Update an existing vehicle listing
 */
export async function updateVehicle(id: string, vehicleData: Partial<VehicleFormData>): Promise<Vehicle | null> {
  try {
    const dbData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (vehicleData.make) dbData.make = vehicleData.make
    if (vehicleData.model) dbData.model = vehicleData.model
    if (vehicleData.variant !== undefined) dbData.variant = vehicleData.variant
    if (vehicleData.year) dbData.year = vehicleData.year
    if (vehicleData.price !== undefined) dbData.price = vehicleData.price
    if (vehicleData.mileage !== undefined) dbData.mileage = vehicleData.mileage
    if (vehicleData.transmission) dbData.transmission = vehicleData.transmission
    if (vehicleData.fuel) dbData.fuel = vehicleData.fuel
    if (vehicleData.engineCapacity !== undefined) dbData.engine_capacity = vehicleData.engineCapacity
    if (vehicleData.bodyType !== undefined) dbData.body_type = vehicleData.bodyType
    if (vehicleData.condition !== undefined) dbData.condition = vehicleData.condition
    if (vehicleData.province) dbData.province = vehicleData.province
    if (vehicleData.city) dbData.city = vehicleData.city
    if (vehicleData.description !== undefined) dbData.description = vehicleData.description
    if (vehicleData.images) dbData.images = vehicleData.images
    if (vehicleData.contactPrivacyEnabled !== undefined) dbData.contact_privacy_enabled = vehicleData.contactPrivacyEnabled

    const { data, error } = await supabase
      .from("vehicles")
      .update(dbData)
      .eq("id", id)
      .select(VEHICLE_DETAIL_QUERY)
      .single()

    if (error) {
      console.error("[v0] Error updating vehicle:", error)
      return null
    }

    return data ? mapDatabaseToVehicle(data) : null
  } catch (error) {
    console.error("[v0] Exception updating vehicle:", error)
    return null
  }
}

/**
 * Delete a vehicle listing
 */
export async function deleteVehicle(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("vehicles").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting vehicle:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Exception deleting vehicle:", error)
    return false
  }
}

// ============================================================================
// SAVED VEHICLES OPERATIONS
// ============================================================================

/**
 * Save a vehicle for a user
 */
export async function saveVehicle(userId: string, vehicleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_vehicles')
      .insert([{ user_id: userId, vehicle_id: vehicleId }])

    if (error) {
      console.error('[v0] Error saving vehicle:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[v0] Exception saving vehicle:', error)
    return false
  }
}

/**
 * Unsave a vehicle for a user
 */
export async function unsaveVehicle(userId: string, vehicleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_vehicles')
      .delete()
      .eq('user_id', userId)
      .eq('vehicle_id', vehicleId)

    if (error) {
      console.error('[v0] Error unsaving vehicle:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[v0] Exception unsaving vehicle:', error)
    return false
  }
}

/**
 * Get all saved vehicles for a user
 */
export async function getSavedVehicles(userId: string): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase
      .from('saved_vehicles')
      .select(`
        vehicle_id,
        vehicles (${VEHICLE_LIST_QUERY})
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('[v0] Error fetching saved vehicles:', error)
      return []
    }

    return (data || [])
      .map(item => item.vehicles)
      .filter(vehicle => vehicle !== null)
      .map(mapDatabaseToVehicle)
  } catch (error) {
    console.error('[v0] Exception fetching saved vehicles:', error)
    return []
  }
}

/**
 * Check if a vehicle is saved by a user
 */
export async function isVehicleSaved(userId: string, vehicleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('saved_vehicles')
      .select('id')
      .eq('user_id', userId)
      .eq('vehicle_id', vehicleId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('[v0] Error checking saved vehicle:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('[v0] Exception checking saved vehicle:', error)
    return false
  }
}