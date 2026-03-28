/**
 * lib/vehicle-operations.ts
 *
 * Core Supabase operations for vehicles.
 * 
 * This file handles:
 *   - Search and filter queries (used by results page)
 *   - Saved vehicles CRUD (save, unsave, get, check)
 *
 * Create, update, delete and list fetches have moved to
 * vehicle-operations-with-storage.ts which handles
 * Supabase Storage image uploads and lean queries.
 *
 * The VEHICLE_LIST_QUERY now includes images for thumbnails,
 * but excludes description to keep search/filter payloads small.
 */

import { supabase } from "./supabase"
import type { Vehicle } from "@/types/vehicle"

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Lean query for list/search/filter views.
 * Includes images for thumbnails (cache layer prunes to first image).
 * No description — it's only needed on the detail page.
 */
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
  images,
  status,
  contact_privacy_enabled,
  created_at,
  updated_at,
  users(id, first_name, last_name, profile_pic, city, province)
`

/**
 * Full detail query used for vehicle detail pages and saved vehicles.
 * Includes images and complete seller information.
 */
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

/**
 * Full query used only for saved vehicles display.
 * (Kept for backward compatibility – use VEHICLE_DETAIL_QUERY for new code.)
 */
const VEHICLE_SAVED_QUERY = `
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
  images,
  status,
  contact_privacy_enabled,
  created_at,
  updated_at,
  users(id, email, first_name, last_name, phone, profile_pic, suburb, city, province)
`

// ─── Mapper ───────────────────────────────────────────────────────────────────

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
    contactPrivacyEnabled: data.contact_privacy_enabled ?? false,
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

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Search vehicles by make, model, or variant.
 * Returns lean results — no description.
 */
export async function searchVehicles(query: string): Promise<Vehicle[]> {
  if (!query || query.trim().length === 0) {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select(VEHICLE_LIST_QUERY)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[VehicleOps] searchVehicles error:", error)
        return []
      }
      return (data || []).map(mapDatabaseToVehicle)
    } catch (error) {
      console.error("[VehicleOps] searchVehicles exception:", error)
      return []
    }
  }

  try {
    const searchTerm = `%${query.trim()}%`

    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_LIST_QUERY)
      .or(
        `make.ilike.${searchTerm},model.ilike.${searchTerm},variant.ilike.${searchTerm}`
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[VehicleOps] searchVehicles error:", error)
      return []
    }

    return (data || []).map(mapDatabaseToVehicle)
  } catch (error) {
    console.error("[VehicleOps] searchVehicles exception:", error)
    return []
  }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

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

/**
 * Filter vehicles by multiple criteria.
 * Returns lean results — no description.
 * Used by the results page.
 */
export async function filterVehicles(
  filters: VehicleFilters
): Promise<Vehicle[]> {
  try {
    let query = supabase
      .from("vehicles")
      .select(VEHICLE_LIST_QUERY)
      .eq("status", "active")

    // Text search across make, model, variant
    if (filters.query && filters.query.trim()) {
      const searchTerm = `%${filters.query.trim()}%`
      query = query.or(
        `make.ilike.${searchTerm},model.ilike.${searchTerm},variant.ilike.${searchTerm}`
      )
    }

    // Price range
    const minPrice =
      filters.minPrice !== undefined
        ? Number(filters.minPrice)
        : filters.priceMin
    const maxPrice =
      filters.maxPrice !== undefined
        ? Number(filters.maxPrice)
        : filters.priceMax

    if (minPrice && !isNaN(minPrice)) query = query.gte("price", minPrice)
    if (maxPrice && !isNaN(maxPrice)) query = query.lte("price", maxPrice)

    // Year range
    const minYear = filters.minYear ? Number(filters.minYear) : undefined
    const maxYear = filters.maxYear ? Number(filters.maxYear) : undefined

    if (minYear && !isNaN(minYear) && minYear > 0)
      query = query.gte("year", minYear)
    if (maxYear && !isNaN(maxYear) && maxYear > 0)
      query = query.lte("year", maxYear)

    // Mileage range
    const minMileage =
      filters.minMileage !== undefined
        ? Number(filters.minMileage)
        : filters.mileageMin
    const maxMileage =
      filters.maxMileage !== undefined
        ? Number(filters.maxMileage)
        : filters.mileageMax

    if (minMileage && !isNaN(minMileage))
      query = query.gte("mileage", minMileage)
    if (maxMileage && !isNaN(maxMileage))
      query = query.lte("mileage", maxMileage)

    // Fuel type — supports single string or array
    if (filters.fuelType) {
      if (Array.isArray(filters.fuelType) && filters.fuelType.length > 0) {
        const fuelFilters = filters.fuelType
          .map((f) => `fuel.ilike.%${f}%`)
          .join(",")
        query = query.or(fuelFilters)
      } else if (
        typeof filters.fuelType === "string" &&
        filters.fuelType.trim()
      ) {
        query = query.ilike("fuel", `%${filters.fuelType}%`)
      }
    }

    // Transmission
    if (
      filters.transmission &&
      filters.transmission.trim() &&
      filters.transmission.toLowerCase() !== "all"
    ) {
      query = query.ilike("transmission", `%${filters.transmission}%`)
    }

    // Body type — supports single string or array
    if (filters.bodyType) {
      if (Array.isArray(filters.bodyType) && filters.bodyType.length > 0) {
        const bodyFilters = filters.bodyType
          .map((b) => `body_type.ilike.%${b}%`)
          .join(",")
        query = query.or(bodyFilters)
      } else if (
        typeof filters.bodyType === "string" &&
        filters.bodyType.trim()
      ) {
        query = query.ilike("body_type", `%${filters.bodyType}%`)
      }
    }

    // Engine capacity range
    const engineMin = filters.engineCapacityMin
      ? Number(filters.engineCapacityMin)
      : undefined
    const engineMax = filters.engineCapacityMax
      ? Number(filters.engineCapacityMax)
      : undefined

    if (engineMin !== undefined && !isNaN(engineMin) && engineMin > 1.0)
      query = query.gte("engine_capacity", engineMin)
    if (engineMax !== undefined && !isNaN(engineMax) && engineMax < 8.0)
      query = query.lte("engine_capacity", engineMax)

    // Location
    if (filters.province && filters.province.trim())
      query = query.ilike("province", `%${filters.province}%`)
    if (filters.city && filters.city.trim())
      query = query.ilike("city", `%${filters.city}%`)

    const { data, error } = await query.order("created_at", {
      ascending: false,
    })

    if (error) {
      console.error("[VehicleOps] filterVehicles error:", error)
      return []
    }

    return (data || []).map(mapDatabaseToVehicle)
  } catch (error) {
    console.error("[VehicleOps] filterVehicles exception:", error)
    return []
  }
}

// ─── Saved Vehicles ───────────────────────────────────────────────────────────

/**
 * Save a vehicle to a user's saved list.
 */
export async function saveVehicle(
  userId: string,
  vehicleId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("saved_vehicles")
      .insert([{ user_id: userId, vehicle_id: vehicleId }])

    if (error) {
      // Unique constraint violation means it's already saved — treat as success
      if (error.code === "23505") {
        console.log("[VehicleOps] Vehicle already saved")
        return true
      }
      console.error("[VehicleOps] saveVehicle error:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[VehicleOps] saveVehicle exception:", error)
    return false
  }
}

/**
 * Remove a vehicle from a user's saved list.
 */
export async function unsaveVehicle(
  userId: string,
  vehicleId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("saved_vehicles")
      .delete()
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)

    if (error) {
      console.error("[VehicleOps] unsaveVehicle error:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[VehicleOps] unsaveVehicle exception:", error)
    return false
  }
}

/**
 * Get all saved vehicles for a user.
 * Uses a two‑step query to ensure full vehicle details including seller info.
 */
export async function getSavedVehicles(userId: string): Promise<Vehicle[]> {
  try {
    // Step 1: get the saved vehicle IDs for this user
    const { data: savedRows, error: savedError } = await supabase
      .from('saved_vehicles')
      .select('vehicle_id')
      .eq('user_id', userId)

    if (savedError) {
      console.error('[VehicleOps] Error fetching saved vehicle IDs:', savedError)
      return []
    }

    if (!savedRows || savedRows.length === 0) return []

    const vehicleIds = savedRows.map(row => row.vehicle_id)

    // Step 2: fetch full vehicle details including images and seller info
    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_DETAIL_QUERY)
      .in('id', vehicleIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[VehicleOps] Error fetching saved vehicles detail:', error)
      return []
    }

    return (data || []).map(mapDatabaseToVehicle)
  } catch (error) {
    console.error('[VehicleOps] Exception fetching saved vehicles:', error)
    return []
  }
}

/**
 * Check if a specific vehicle is saved by a user.
 */
export async function isVehicleSaved(
  userId: string,
  vehicleId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("saved_vehicles")
      .select("id")
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .single()

    // PGRST116 = row not found — not saved
    if (error && error.code !== "PGRST116") {
      console.error("[VehicleOps] isVehicleSaved error:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("[VehicleOps] isVehicleSaved exception:", error)
    return false
  }
}