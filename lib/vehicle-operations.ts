import { createClient } from "@supabase/supabase-js"
import type { Vehicle } from "./types"
import { mapDatabaseToVehicle } from "./vehicle-services"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Define the expected structure of filters
export interface VehicleFilters {
  query?: string
  province?: string
  city?: string
  fuelType?: string | string[]
  transmission?: string
  bodyType?: string | string[]
  minPrice?: number
  maxPrice?: number
  priceMin?: number
  priceMax?: number
  minYear?: number
  maxYear?: number
  minMileage?: number
  maxMileage?: number
  mileageMin?: number
  mileageMax?: number
  engineCapacityMin?: number
  engineCapacityMax?: number
}

/**
 * Fetches vehicles from Supabase with dynamic filtering.
 * All filters use AND logic (no overlap or OR chaining).
 * Handles city/province normalization and flexible matching.
 */
export async function filterVehicles(filters: VehicleFilters): Promise<Vehicle[]> {
  try {
    let query = supabase
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
        created_at,
        updated_at,
        users(
          id,
          email,
          first_name,
          last_name,
          phone,
          profile_pic,
          suburb,
          city,
          province
        )
      `
      )
      .eq("status", "active")

    // --- 1️⃣ Text Search ---
    if (filters.query && filters.query.trim()) {
      const term = `%${filters.query.trim()}%`
      query = query.or(
        `make.ilike.${term},model.ilike.${term},variant.ilike.${term},description.ilike.${term}`
      )
    }

    // --- 2️⃣ Location (normalize + flexible matching) ---
    const normalize = (val: string) => val?.trim().toLowerCase()
    const city = filters.city ? normalize(filters.city) : null
    const province = filters.province ? normalize(filters.province) : null

    if (province) query = query.ilike("province", province)
    if (city) query = query.ilike("city", city)

    // --- 3️⃣ Specs (body, fuel, transmission) ---
    if (filters.fuelType) {
      const fuels = Array.isArray(filters.fuelType)
        ? filters.fuelType
        : [filters.fuelType]
      for (const f of fuels) {
        query = query.ilike("fuel", `%${f.trim()}%`)
      }
    }

    if (
      filters.transmission &&
      filters.transmission.trim() &&
      filters.transmission.toLowerCase() !== "all"
    ) {
      query = query.ilike("transmission", `%${filters.transmission.trim()}%`)
    }

    if (filters.bodyType) {
      const bodies = Array.isArray(filters.bodyType)
        ? filters.bodyType
        : [filters.bodyType]
      for (const b of bodies) {
        query = query.ilike("body_type", `%${b.trim()}%`)
      }
    }

    // --- 4️⃣ Price Range ---
    const minPrice = filters.minPrice ?? filters.priceMin
    const maxPrice = filters.maxPrice ?? filters.priceMax
    if (minPrice != null && !isNaN(Number(minPrice)))
      query = query.gte("price", Number(minPrice))
    if (maxPrice != null && !isNaN(Number(maxPrice)))
      query = query.lte("price", Number(maxPrice))

    // --- 5️⃣ Year Range ---
    const minYear = filters.minYear ? Number(filters.minYear) : undefined
    const maxYear = filters.maxYear ? Number(filters.maxYear) : undefined
    if (minYear != null && !isNaN(minYear)) query = query.gte("year", minYear)
    if (maxYear != null && !isNaN(maxYear)) query = query.lte("year", maxYear)

    // --- 6️⃣ Mileage Range ---
    const minMileage = filters.minMileage ?? filters.mileageMin
    const maxMileage = filters.maxMileage ?? filters.mileageMax
    if (minMileage != null && !isNaN(Number(minMileage)))
      query = query.gte("mileage", Number(minMileage))
    if (maxMileage != null && !isNaN(Number(maxMileage)))
      query = query.lte("mileage", Number(maxMileage))

    // --- 7️⃣ Engine Capacity ---
    const minEngine = filters.engineCapacityMin
      ? Number(filters.engineCapacityMin)
      : undefined
    const maxEngine = filters.engineCapacityMax
      ? Number(filters.engineCapacityMax)
      : undefined
    if (minEngine != null && !isNaN(minEngine))
      query = query.gte("engine_capacity", minEngine)
    if (maxEngine != null && !isNaN(maxEngine))
      query = query.lte("engine_capacity", maxEngine)

    // --- 8️⃣ Order ---
    query = query.order("created_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("[iMoto] Vehicle filter error:", error)
      return []
    }

    // --- 🔁 Normalize matched city/province results ---
    const normalizedResults = (data || []).filter((v: any) => {
      const cityMatch = !city || v.city?.toLowerCase() === city
      const provinceMatch = !province || v.province?.toLowerCase() === province
      return cityMatch && provinceMatch
    })

    // --- ✅ Final map to Vehicle type ---
    return normalizedResults.map(mapDatabaseToVehicle)
  } catch (err) {
    console.error("[iMoto] Vehicle filter exception:", err)
    return []
  }
}
