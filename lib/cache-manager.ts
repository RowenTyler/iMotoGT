/**
 * Optimized Cache Manager for Imoto
 * Implements smart caching with stale-while-revalidate strategy
 */

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
  VEHICLES_KEY: 'imoto_vehicles_cache',
  VEHICLES_TIMESTAMP_KEY: 'imoto_vehicles_timestamp',
  USER_VEHICLES_KEY: 'imoto_user_vehicles_',
  SAVED_VEHICLES_KEY: 'imoto_saved_vehicles_',
  VEHICLE_DETAILS_KEY: 'imoto_vehicle_details_',
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  BACKGROUND_REFRESH_THRESHOLD: 2 * 60 * 1000, // 2 minutes - refresh in background if older
  MAX_CACHE_SIZE: 5 * 1024 * 1024, // 5MB per cache entry
}

interface CacheData<T> {
  data: T
  timestamp: number
  version: string
  compressed: boolean
}

export class CacheManager {
  private static version = '1.0'

  /**
   * Set data in cache with timestamp
   */
  static set<T>(key: string, data: T, options: { setTimestamp?: boolean } = {}): boolean {
    try {
      const timestamp = Date.now()
      const cacheData: CacheData<T> = {
        data,
        timestamp,
        version: this.version,
        compressed: false,
      }

      const serialized = JSON.stringify(cacheData)

      // Check size limit
      if (serialized.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
        console.warn(`[Cache] Size exceeds limit for ${key}: ${(serialized.length / 1024 / 1024).toFixed(2)}MB`)
        return false
      }

      localStorage.setItem(key, serialized)

      if (options.setTimestamp !== false) {
        localStorage.setItem(`${key}_timestamp`, timestamp.toString())
      }

      console.log(`[Cache] Set ${key} (${(serialized.length / 1024).toFixed(2)}KB)`)
      return true
    } catch (error) {
      console.error('[Cache] Set error:', error)
      // Try to clear some space
      this.clearOldest()
      return false
    }
  }

  /**
   * Get data from cache with age validation
   */
  static get<T>(key: string, maxAge: number = CACHE_CONFIG.CACHE_DURATION): T | null {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) {
        console.log(`[Cache] Miss: ${key}`)
        return null
      }

      const cacheData: CacheData<T> = JSON.parse(cached)
      const age = Date.now() - cacheData.timestamp

      // Check version compatibility
      if (cacheData.version !== this.version) {
        console.warn(`[Cache] Version mismatch for ${key}`)
        this.delete(key)
        return null
      }

      // Check age
      if (age > maxAge) {
        console.log(`[Cache] Expired: ${key} (${(age / 1000 / 60).toFixed(1)}min old)`)
        this.delete(key)
        return null
      }

      console.log(`[Cache] Hit: ${key} (${(age / 1000).toFixed(1)}s old)`)
      return cacheData.data
    } catch (error) {
      console.error('[Cache] Get error:', error)
      this.delete(key)
      return null
    }
  }

  /**
   * Check if cache exists and is within stale threshold
   */
  static isStale(key: string, staleThreshold: number = CACHE_CONFIG.BACKGROUND_REFRESH_THRESHOLD): boolean {
    try {
      const timestamp = localStorage.getItem(`${key}_timestamp`)
      if (!timestamp) return true

      const age = Date.now() - parseInt(timestamp)
      return age > staleThreshold
    } catch {
      return true
    }
  }

  /**
   * Get cache age in milliseconds
   */
  static getAge(key: string): number {
    try {
      const timestamp = localStorage.getItem(`${key}_timestamp`)
      if (!timestamp) return Infinity

      return Date.now() - parseInt(timestamp)
    } catch {
      return Infinity
    }
  }

  /**
   * Delete a cache entry
   */
  static delete(key: string): void {
    try {
      localStorage.removeItem(key)
      localStorage.removeItem(`${key}_timestamp`)
      console.log(`[Cache] Deleted: ${key}`)
    } catch (error) {
      console.error('[Cache] Delete error:', error)
    }
  }

  /**
   * Clear all Imoto caches
   */
  static clearAll(): void {
    try {
      const keys = Object.keys(localStorage)
      const imotoKeys = keys.filter(key => key.startsWith('imoto_') || key.startsWith('cached_'))

      imotoKeys.forEach(key => localStorage.removeItem(key))
      console.log(`[Cache] Cleared ${imotoKeys.length} entries`)
    } catch (error) {
      console.error('[Cache] Clear all error:', error)
    }
  }

  /**
   * Clear user-specific caches
   */
  static clearUserCache(userId: string): void {
    try {
      this.delete(`${CACHE_CONFIG.USER_VEHICLES_KEY}${userId}`)
      this.delete(`${CACHE_CONFIG.SAVED_VEHICLES_KEY}${userId}`)
      console.log(`[Cache] Cleared user cache for: ${userId}`)
    } catch (error) {
      console.error('[Cache] Clear user cache error:', error)
    }
  }

  /**
   * Clear oldest cache entries to free space
   */
  private static clearOldest(count: number = 5): void {
    try {
      const keys = Object.keys(localStorage)
      const timestampKeys = keys.filter(key => key.endsWith('_timestamp'))

      const entries = timestampKeys
        .map(key => ({
          key: key.replace('_timestamp', ''),
          timestamp: parseInt(localStorage.getItem(key) || '0'),
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, count)

      entries.forEach(entry => this.delete(entry.key))
      console.log(`[Cache] Cleared ${entries.length} oldest entries`)
    } catch (error) {
      console.error('[Cache] Clear oldest error:', error)
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    totalEntries: number
    totalSize: number
    oldestEntry: string | null
    oldestAge: number
  } {
    try {
      const keys = Object.keys(localStorage)
      const imotoKeys = keys.filter(key => key.startsWith('imoto_') && !key.endsWith('_timestamp'))

      let totalSize = 0
      let oldestTimestamp = Date.now()
      let oldestEntry: string | null = null

      imotoKeys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length

          const timestamp = parseInt(localStorage.getItem(`${key}_timestamp`) || '0')
          if (timestamp && timestamp < oldestTimestamp) {
            oldestTimestamp = timestamp
            oldestEntry = key
          }
        }
      })

      return {
        totalEntries: imotoKeys.length,
        totalSize,
        oldestEntry,
        oldestAge: oldestEntry ? Date.now() - oldestTimestamp : 0,
      }
    } catch (error) {
      console.error('[Cache] Get stats error:', error)
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        oldestAge: 0,
      }
    }
  }
}

/**
 * Preload cache on app startup
 */
export async function preloadCache(): Promise<void> {
  console.log('[Cache] Preloading critical data...')
  
  // This will be called when the app loads to preemptively cache data
  // Implementation depends on your vehicle service
  try {
    // Example: const { vehicleService } = await import('./vehicle-service')
    // await vehicleService.getVehicles() // This will cache the data
    console.log('[Cache] Preload complete')
  } catch (error) {
    console.error('[Cache] Preload failed:', error)
  }
}
