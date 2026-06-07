/**
 * lib/cache-manager.ts
 *
 * localStorage cache with:
 * - TTL-based expiry (5 minutes default)
 * - Stale-while-revalidate threshold (2 minutes)
 * - Automatic quota management (evicts oldest entries on overflow)
 * - Size guard (refuses entries over 5MB to prevent single large items
 *   from consuming the entire quota — some vehicle list responses can be large)
 *
 * Key change: MAX_CACHE_SIZE increased from 500KB → 5MB.
 * Although images are now stored in Supabase Storage and only URLs are cached,
 * a full vehicle list (200+ vehicles) with all fields can exceed 3–6MB.
 * The 500KB limit was too restrictive for production data.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

export interface CacheConfig {
  VEHICLES_KEY: string
  VEHICLES_TIMESTAMP_KEY: string
  USER_VEHICLES_KEY: string
  SAVED_VEHICLES_KEY: string
  VEHICLE_DETAILS_KEY: string
  CACHE_DURATION: number
  BACKGROUND_REFRESH_THRESHOLD: number
  MAX_CACHE_SIZE: number
}

export const CACHE_CONFIG: CacheConfig = {
  VEHICLES_KEY: "imoto_vehicles_cache",
  VEHICLES_TIMESTAMP_KEY: "imoto_vehicles_timestamp",
  USER_VEHICLES_KEY: "imoto_user_vehicles_",
  SAVED_VEHICLES_KEY: "imoto_saved_vehicles_",
  VEHICLE_DETAILS_KEY: "imoto_vehicle_details_",

  // How long a cache entry is considered fresh
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  // If older than this, trigger a background refresh even on cache hit
  BACKGROUND_REFRESH_THRESHOLD: 2 * 60 * 1000, // 2 minutes

  // Maximum size per cache entry
  // Increased from 500KB → 5MB because vehicle lists can be 3–6MB in practice
  MAX_CACHE_SIZE: 5 * 1024 * 1024, // 5MB
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: string
}

// ─── CacheManager ─────────────────────────────────────────────────────────────

export class CacheManager {
  private static readonly VERSION = "2.0"
  // Version bumped from 1.0 → 2.0 so all old base64-containing cache
  // entries are automatically invalidated on first load after this update

  // ─── Set ────────────────────────────────────────────────────────────────────

  /**
   * Store a value in localStorage with a timestamp.
   * Returns true on success, false if the entry was too large or storage failed.
   */
  static set<T>(key: string, data: T): boolean {
    if (typeof window === "undefined") return false

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: this.VERSION,
      }

      const serialized = JSON.stringify(entry)

      // Guard: refuse entries that are too large
      if (serialized.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
        console.warn(
          `[Cache] Refusing oversized entry for "${key}": ` +
            `${(serialized.length / 1024).toFixed(1)}KB > ` +
            `${(CACHE_CONFIG.MAX_CACHE_SIZE / 1024).toFixed(0)}KB limit`
        )
        return false
      }

      // Attempt to write — if quota is exceeded, evict and retry
      try {
        localStorage.setItem(key, serialized)
        localStorage.setItem(`${key}_ts`, String(Date.now()))
      } catch (err: any) {
        if (this.isQuotaError(err)) {
          console.warn(
            `[Cache] Quota exceeded writing "${key}", evicting old entries...`
          )
          this.evictOldest(5)
          try {
            localStorage.setItem(key, serialized)
            localStorage.setItem(`${key}_ts`, String(Date.now()))
            console.log(`[Cache] Retry succeeded for "${key}"`)
          } catch (retryErr) {
            console.error(
              `[Cache] Retry failed for "${key}" after eviction`
            )
            return false
          }
        } else {
          console.error(`[Cache] Write error for "${key}":`, err)
          return false
        }
      }

      return true
    } catch (err) {
      console.error(`[Cache] set() exception for "${key}":`, err)
      return false
    }
  }

  // ─── Get ────────────────────────────────────────────────────────────────────

  /**
   * Retrieve a value from localStorage.
   *
   * Returns null if:
   * - The key does not exist
   * - The entry has expired (older than maxAge)
   * - The entry was written by a different cache version
   *   (version 2.0 automatically discards old base64-containing entries)
   */
  static get<T>(
    key: string,
    maxAge: number = CACHE_CONFIG.CACHE_DURATION
  ): T | null {
    if (typeof window === "undefined") return null

    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null

      const entry: CacheEntry<T> = JSON.parse(raw)

      // Version check — discards entries from the old cache version
      // This automatically clears all base64 image cache entries on first load
      if (entry.version !== this.VERSION) {
        console.log(
          `[Cache] Version mismatch for "${key}" ` +
            `(stored: ${entry.version}, current: ${this.VERSION}) — discarding`
        )
        this.delete(key)
        return null
      }

      // TTL check
      const age = Date.now() - entry.timestamp
      if (age > maxAge) {
        console.log(
          `[Cache] Expired "${key}" ` +
            `(${(age / 1000 / 60).toFixed(1)}min old)`
        )
        this.delete(key)
        return null
      }

      return entry.data
    } catch (err) {
      console.error(`[Cache] get() error for "${key}":`, err)
      this.delete(key)
      return null
    }
  }

  // ─── IsStale ────────────────────────────────────────────────────────────────

  /**
   * Returns true if the entry exists but is older than the background
   * refresh threshold — meaning a background refresh should be triggered
   * even though the data is still within the full TTL.
   */
  static isStale(
    key: string,
    threshold: number = CACHE_CONFIG.BACKGROUND_REFRESH_THRESHOLD
  ): boolean {
    if (typeof window === "undefined") return true

    try {
      const ts = localStorage.getItem(`${key}_ts`)
      if (!ts) return true
      return Date.now() - parseInt(ts, 10) > threshold
    } catch {
      return true
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  /**
   * Remove a single cache entry and its timestamp key.
   */
  static delete(key: string): void {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(key)
      localStorage.removeItem(`${key}_ts`)
    } catch (err) {
      console.error(`[Cache] delete() error for "${key}":`, err)
    }
  }

  // ─── ClearAll ───────────────────────────────────────────────────────────────

  /**
   * Remove all cache entries written by this app (prefixed with "imoto_").
   * Does not touch unrelated localStorage keys (e.g. Supabase auth tokens).
   */
  static clearAll(): void {
    if (typeof window === "undefined") return

    try {
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith("imoto_") || k.endsWith("_ts")
      )
      keys.forEach((k) => localStorage.removeItem(k))
      console.log(`[Cache] Cleared ${keys.length} entries`)
    } catch (err) {
      console.error("[Cache] clearAll() error:", err)
    }
  }

  // ─── ClearUserCache ──────────────────────────────────────────────────────────

  /**
   * Clear all cache entries for a specific user.
   * Called after login, logout, or profile update.
   */
  static clearUserCache(userId: string): void {
    if (typeof window === "undefined") return

    try {
      this.delete(`${CACHE_CONFIG.USER_VEHICLES_KEY}${userId}`)
      this.delete(`${CACHE_CONFIG.SAVED_VEHICLES_KEY}${userId}`)
      console.log(`[Cache] Cleared user cache for ${userId}`)
    } catch (err) {
      console.error("[Cache] clearUserCache() error:", err)
    }
  }

  // ─── GetStats ────────────────────────────────────────────────────────────────

  /**
   * Returns a summary of cache usage.
   * Useful for debugging — call CacheManager.getStats() in the browser console.
   */
  static getStats(): {
    totalEntries: number
    totalSizeKB: number
    entries: Array<{ key: string; sizeKB: number; ageMinutes: number }>
  } {
    if (typeof window === "undefined") {
      return { totalEntries: 0, totalSizeKB: 0, entries: [] }
    }

    try {
      const imotoKeys = Object.keys(localStorage).filter(
        (k) => k.startsWith("imoto_") && !k.endsWith("_ts")
      )

      let totalBytes = 0
      const entries = imotoKeys.map((key) => {
        const value = localStorage.getItem(key) || ""
        const sizeBytes = value.length
        totalBytes += sizeBytes

        let ageMinutes = 0
        try {
          const entry = JSON.parse(value)
          ageMinutes = Math.round(
            (Date.now() - entry.timestamp) / 1000 / 60
          )
        } catch {
          // Could not parse — skip age
        }

        return {
          key,
          sizeKB: Math.round(sizeBytes / 1024),
          ageMinutes,
        }
      })

      return {
        totalEntries: imotoKeys.length,
        totalSizeKB: Math.round(totalBytes / 1024),
        entries: entries.sort((a, b) => b.sizeKB - a.sizeKB),
      }
    } catch (err) {
      console.error("[Cache] getStats() error:", err)
      return { totalEntries: 0, totalSizeKB: 0, entries: [] }
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Detect localStorage quota exceeded errors across browsers.
   */
  private static isQuotaError(err: any): boolean {
    if (!err) return false
    const name = err.name || ""
    const msg = (err.message || "").toLowerCase()
    return (
      name === "QuotaExceededError" ||
      name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      msg.includes("quota") ||
      err.code === 22 ||
      err.code === 1014
    )
  }

  /**
   * Evict the N oldest cache entries to free up space.
   * Only evicts imoto_ prefixed keys — never touches auth or other app data.
   */
  private static evictOldest(count: number = 3): void {
    if (typeof window === "undefined") return

    try {
      const entries = Object.keys(localStorage)
        .filter((k) => k.startsWith("imoto_") && !k.endsWith("_ts"))
        .map((key) => {
          const ts = localStorage.getItem(`${key}_ts`)
          return {
            key,
            timestamp: ts ? parseInt(ts, 10) : 0,
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp) // oldest first
        .slice(0, count)

      entries.forEach(({ key }) => {
        this.delete(key)
        console.log(`[Cache] Evicted "${key}"`)
      })
    } catch (err) {
      console.error("[Cache] evictOldest() error:", err)
    }
  }
}

// ─── Preload (stub) ───────────────────────────────────────────────────────────

/**
 * Called from layout.tsx (previously).
 * Now a no-op — preloading is handled by VehicleProvider on first render.
 * Kept to avoid breaking any imports.
 */
export async function preloadCache(): Promise<void> {
  // No-op — VehicleProvider handles cache warming
}