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
 * VEHICLE_LIST_QUERY includes images (first image used for card thumbnails).
 * VEHICLE_DETAIL_QUERY includes full images array and all seller contact info.
 */

import { supabase } from "./supabase"
import type { Vehicle } from "@/types/vehicle"

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Query for list/search/filter views.
 * Includes images so card thumbnails work correctly.
 * No description — only needed on the detail page.
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
 * Includes full images array and complete seller contact information.
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
    images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [],
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

export async function filterVehicles(
  filters: VehicleFilters
): Promise<Vehicle[]> {
  try {
    let query = supabase
      .from("vehicles")
      .select(VEHICLE_LIST_QUERY)
      .eq("status", "active")

    if (filters.query && filters.query.trim()) {
      const searchTerm = `%${filters.query.trim()}%`
      query = query.or(
        `make.ilike.${searchTerm},model.ilike.${searchTerm},variant.ilike.${searchTerm}`
      )
    }

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

    const minYear = filters.minYear ? Number(filters.minYear) : undefined
    const maxYear = filters.maxYear ? Number(filters.maxYear) : undefined

    if (minYear && !isNaN(minYear) && minYear > 0)
      query = query.gte("year", minYear)
    if (maxYear && !isNaN(maxYear) && maxYear > 0)
      query = query.lte("year", maxYear)

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

    if (
      filters.transmission &&
      filters.transmission.trim() &&
      filters.transmission.toLowerCase() !== "all"
    ) {
      query = query.ilike("transmission", `%${filters.transmission}%`)
    }

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

export async function saveVehicle(
  userId: string,
  vehicleId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("saved_vehicles")
      .insert([{ user_id: userId, vehicle_id: vehicleId }])

    if (error) {
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
 *
 * Two-step query:
 * 1. Get vehicle IDs from saved_vehicles table
 * 2. Fetch full vehicle details (including images + seller info) using VEHICLE_DETAIL_QUERY
 *
 * Uses VEHICLE_DETAIL_QUERY so images and all seller fields are populated.
 * This is intentional — saved vehicles are displayed in the dashboard carousel
 * and liked-cars-page, both of which need the image and contact info.
 */
export async function getSavedVehicles(userId: string): Promise<Vehicle[]> {
  try {
    // Step 1: get the saved vehicle IDs for this user
    const { data: savedRows, error: savedError } = await supabase
      .from("saved_vehicles")
      .select("vehicle_id")
      .eq("user_id", userId)

    if (savedError) {
      console.error("[VehicleOps] Error fetching saved vehicle IDs:", savedError)
      return []
    }

    if (!savedRows || savedRows.length === 0) {
      console.log("[VehicleOps] No saved vehicles for user:", userId)
      return []
    }

    const vehicleIds = savedRows.map((row) => row.vehicle_id)
    console.log(`[VehicleOps] Found ${vehicleIds.length} saved vehicle IDs`)

    // Step 2: fetch full vehicle details including images and seller info
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_DETAIL_QUERY)
      .in("id", vehicleIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[VehicleOps] Error fetching saved vehicles detail:", error)
      return []
    }

    const vehicles = (data || []).map(mapDatabaseToVehicle)
    console.log(
      `[VehicleOps] Loaded ${vehicles.length} saved vehicles, ` +
      `first has ${vehicles[0]?.images?.length ?? 0} images`
    )

    return vehicles
  } catch (error) {
    console.error("[VehicleOps] Exception fetching saved vehicles:", error)
    return []
  }
}

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