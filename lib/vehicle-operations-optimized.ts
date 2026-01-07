/**
 * Optimized Vehicle Operations with Smart Caching
 * Implements stale-while-revalidate strategy for instant page loads
 */

import { supabase } from "./supabase"
import type { Vehicle, VehicleFormData } from "@/types/vehicle"
import { CacheManager, CACHE_CONFIG } from "./cache-manager"

// Queue for background refresh operations
let backgroundRefreshQueue: Set<string> = new Set()

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

/**
 * OPTIMIZED: Fetch all vehicles with smart caching
 */
export async function getVehicles(status = "active", forceRefresh = false): Promise<Vehicle[]> {
  const cacheKey = `${CACHE_CONFIG.VEHICLES_KEY}_${status}`
  
  // Try cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = CacheManager.get<Vehicle[]>(cacheKey)
    if (cached) {
      console.log(`✅ [Vehicles] Loaded ${cached.length} from cache`)
      
      // Background refresh if stale
      if (CacheManager.isStale(cacheKey) && !backgroundRefreshQueue.has(cacheKey)) {
        console.log('🔄 [Vehicles] Cache is stale, refreshing in background...')
        backgroundRefreshQueue.add(cacheKey)
        
        // Non-blocking background refresh
        getVehicles(status, true)
          .then(() => console.log('✅ [Vehicles] Background refresh complete'))
          .catch(err => console.error('❌ [Vehicles] Background refresh failed:', err))
          .finally(() => backgroundRefreshQueue.delete(cacheKey))
      }
      
      return cached
    }
  }

  // Fetch from database
  console.log(`🔄 [Vehicles] Fetching from database (status: ${status})...`)
  const startTime = performance.now()
  
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        `
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
      `,
      )
      .eq("status", status)
      .order("created_at", { ascending: false })

    const endTime = performance.now()
    console.log(`⏱️ [Vehicles] Database query took ${(endTime - startTime).toFixed(0)}ms`)

    if (error) {
      console.error("[Vehicles] Database error:", error)
      
      // Return stale cache as fallback
      const staleCache = CacheManager.get<Vehicle[]>(cacheKey, Infinity)
      if (staleCache) {
        console.log('⚠️ [Vehicles] Using stale cache as fallback')
        return staleCache
      }
      
      return []
    }

    const vehicles = (data || []).map(mapDatabaseToVehicle)
    
    // Cache the results
    CacheManager.set(cacheKey, vehicles)
    console.log(`✅ [Vehicles] Cached ${vehicles.length} vehicles`)

    return vehicles
  } catch (error) {
    console.error("[Vehicles] Exception:", error)
    
    // Return stale cache as fallback
    const staleCache = CacheManager.get<Vehicle[]>(cacheKey, Infinity)
    if (staleCache) {
      console.log('⚠️ [Vehicles] Using stale cache as fallback')
      return staleCache
    }
    
    return []
  }
}

/**
 * OPTIMIZED: Get a single vehicle by ID with caching
 */
export async function getVehicleById(id: string, forceRefresh = false): Promise<Vehicle | null> {
  const cacheKey = `${CACHE_CONFIG.VEHICLE_DETAILS_KEY}${id}`
  
  if (!forceRefresh) {
    const cached = CacheManager.get<Vehicle>(cacheKey)
    if (cached) {
      console.log(`✅ [Vehicle] Loaded ${id} from cache`)
      return cached
    }
  }

  console.log(`🔄 [Vehicle] Fetching ${id} from database...`)
  
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        `
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
      `,
      )
      .eq("id", id)
      .single()

    if (error) {
      console.error("[Vehicle] Database error:", error)
      return null
    }

    const vehicle = data ? mapDatabaseToVehicle(data) : null
    
    if (vehicle) {
      CacheManager.set(cacheKey, vehicle)
      console.log(`✅ [Vehicle] Cached ${id}`)
    }

    return vehicle
  } catch (error) {
    console.error("[Vehicle] Exception:", error)
    return null
  }
}

/**
 * OPTIMIZED: Get user vehicles with caching
 */
export async function getUserVehicles(userId: string, forceRefresh = false): Promise<Vehicle[]> {
  const cacheKey = `${CACHE_CONFIG.USER_VEHICLES_KEY}${userId}`
  
  if (!forceRefresh) {
    const cached = CacheManager.get<Vehicle[]>(cacheKey)
    if (cached) {
      console.log(`✅ [User Vehicles] Loaded ${cached.length} from cache`)
      
      // Background refresh if stale
      if (CacheManager.isStale(cacheKey) && !backgroundRefreshQueue.has(cacheKey)) {
        console.log('🔄 [User Vehicles] Cache is stale, refreshing in background...')
        backgroundRefreshQueue.add(cacheKey)
        
        getUserVehicles(userId, true)
          .then(() => console.log('✅ [User Vehicles] Background refresh complete'))
          .catch(err => console.error('❌ [User Vehicles] Background refresh failed:', err))
          .finally(() => backgroundRefreshQueue.delete(cacheKey))
      }
      
      return cached
    }
  }

  console.log(`🔄 [User Vehicles] Fetching for user ${userId}...`)
  
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        `
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
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[User Vehicles] Database error:", error)
      
      // Return stale cache as fallback
      const staleCache = CacheManager.get<Vehicle[]>(cacheKey, Infinity)
      return staleCache || []
    }

    const vehicles = (data || []).map(mapDatabaseToVehicle)
    
    CacheManager.set(cacheKey, vehicles)
    console.log(`✅ [User Vehicles] Cached ${vehicles.length} vehicles`)

    return vehicles
  } catch (error) {
    console.error("[User Vehicles] Exception:", error)
    
    const staleCache = CacheManager.get<Vehicle[]>(cacheKey, Infinity)
    return staleCache || []
  }
}

/**
 * Create vehicle and invalidate caches
 */
export async function createVehicle(vehicleData: VehicleFormData, userId: string): Promise<Vehicle | null> {
  try {
    const dbData = {
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
      contact_privacy_enabled: vehicleData.contactPrivacyEnabled ?? false,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("vehicles")
      .insert([dbData])
      .select(
        `
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
      `,
      )
      .single()

    if (error) {
      console.error("[Vehicle Create] Error:", error)
      return null
    }

    // Invalidate caches
    invalidateCaches(userId)

    return data ? mapDatabaseToVehicle(data) : null
  } catch (error) {
    console.error("[Vehicle Create] Exception:", error)
    return null
  }
}

/**
 * Update vehicle and invalidate caches
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
    if (vehicleData.province) dbData.province = vehicleData.province
    if (vehicleData.city) dbData.city = vehicleData.city
    if (vehicleData.description !== undefined) dbData.description = vehicleData.description
    if (vehicleData.images) dbData.images = vehicleData.images
    if (vehicleData.contactPrivacyEnabled !== undefined) dbData.contact_privacy_enabled = vehicleData.contactPrivacyEnabled

    const { data, error } = await supabase
      .from("vehicles")
      .update(dbData)
      .eq("id", id)
      .select(
        `
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
      `,
      )
      .single()

    if (error) {
      console.error("[Vehicle Update] Error:", error)
      return null
    }

    // Invalidate caches
    if (data) {
      invalidateCaches(data.user_id)
      CacheManager.delete(`${CACHE_CONFIG.VEHICLE_DETAILS_KEY}${id}`)
    }

    return data ? mapDatabaseToVehicle(data) : null
  } catch (error) {
    console.error("[Vehicle Update] Exception:", error)
    return null
  }
}

/**
 * Delete vehicle and invalidate caches
 */
export async function deleteVehicle(id: string): Promise<boolean> {
  try {
    // Get vehicle first to know user ID
    const vehicle = await getVehicleById(id)
    
    const { error } = await supabase.from("vehicles").delete().eq("id", id)

    if (error) {
      console.error("[Vehicle Delete] Error:", error)
      return false
    }

    // Invalidate caches
    if (vehicle) {
      invalidateCaches(vehicle.userId)
    }
    CacheManager.delete(`${CACHE_CONFIG.VEHICLE_DETAILS_KEY}${id}`)

    return true
  } catch (error) {
    console.error("[Vehicle Delete] Exception:", error)
    return false
  }
}

/**
 * Invalidate all vehicle-related caches
 */
export function invalidateCaches(userId?: string): void {
  console.log('🗑️ [Cache] Invalidating vehicle caches...')
  
  // Clear main vehicles cache
  CacheManager.delete(`${CACHE_CONFIG.VEHICLES_KEY}_active`)
  
  // Clear user-specific caches if userId provided
  if (userId) {
    CacheManager.clearUserCache(userId)
  }
  
  console.log('✅ [Cache] Invalidation complete')
}

// Export other functions (search, filter, saved vehicles) - keep existing implementation
export * from "./vehicle-operations"
