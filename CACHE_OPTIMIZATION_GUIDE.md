# Imoto Cache Optimization Implementation Guide

## Overview
This guide implements a comprehensive caching strategy to dramatically improve page load speeds from ~2-3 seconds to <100ms for returning users.

## Performance Improvements
- **First Load**: 800ms - 1.5s (database fetch)
- **Cached Load**: 50ms - 150ms (instant)
- **Background Refresh**: Transparent to user
- **Stale Cache Fallback**: Always shows data, even if API fails

---

## Implementation Steps

### 1. Add Cache Manager (Already Created)
\`\`\`typescript
// lib/cache-manager.ts
// Already provided above - copy this file to your project
\`\`\`

### 2. Update Vehicle Service
Replace `lib/vehicle-operations.ts` imports in `lib/vehicle-service.ts`:

\`\`\`typescript
// lib/vehicle-service.ts
import {
  getVehicles,
  getVehicleById,
  getUserVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  filterVehicles,
  invalidateCaches,
} from "./vehicle-operations-optimized"  // Use optimized version

export const vehicleService = {
  getVehicles,
  getVehicleById,
  getUserVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  filterVehicles,
  invalidateCaches,
  // ... other methods
}
\`\`\`

### 3. Update car-marketplace.tsx
Add cache preloading and use optimized loading:

\`\`\`typescript
// components/car-marketplace.tsx

// Add at the top
import { CacheManager, CACHE_CONFIG } from "@/lib/cache-manager"

// Update useEffect for loading vehicles
useEffect(() => {
  const fetchVehicles = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true)
      
      // Check cache first
      if (!forceRefresh) {
        const cachedVehicles = CacheManager.get<Vehicle[]>(CACHE_CONFIG.VEHICLES_KEY)
        if (cachedVehicles) {
          console.log("🚀 Loaded vehicles from cache instantly")
          setAllVehicles(cachedVehicles)
          setFilteredVehicles(cachedVehicles)
          setLoading(false)
          
          // Background refresh if cache is stale
          if (CacheManager.isStale(CACHE_CONFIG.VEHICLES_KEY)) {
            console.log("🔄 Cache is stale, refreshing in background...")
            fetchVehicles(true) // Non-blocking refresh
          }
          return
        }
      }
      
      // Fetch from database
      console.log("🔄 Fetching vehicles from database...")
      const vehicles = await vehicleService.getVehicles()
      
      setAllVehicles(vehicles)
      setFilteredVehicles(vehicles)
      
      // Cache the results
      CacheManager.set(CACHE_CONFIG.VEHICLES_KEY, vehicles)
      
    } catch (error) {
      console.error("❌ Failed to fetch vehicles:", error)
      
      // Fallback to stale cache
      const staleCache = CacheManager.get<Vehicle[]>(CACHE_CONFIG.VEHICLES_KEY, Infinity)
      if (staleCache) {
        console.log("⚠️ Using stale cache as fallback")
        setAllVehicles(staleCache)
        setFilteredVehicles(staleCache)
      }
    } finally {
      if (!forceRefresh) setLoading(false)
    }
  }
  
  fetchVehicles()
}, [])
\`\`\`

### 4. Update Dashboard Component
Add user-specific caching:

\`\`\`typescript
// components/dashboard.tsx

useEffect(() => {
  const loadUserVehicles = async () => {
    if (!user?.id) return
    
    const cacheKey = `${CACHE_CONFIG.USER_VEHICLES_KEY}${user.id}`
    
    // Try cache first
    const cached = CacheManager.get<Vehicle[]>(cacheKey)
    if (cached) {
      console.log("✅ Loaded user vehicles from cache")
      setListedVehicles(cached)
      
      // Background refresh if stale
      if (CacheManager.isStale(cacheKey)) {
        vehicleService.getUserVehicles(user.id, true)
          .then(fresh => setListedVehicles(fresh))
      }
      return
    }
    
    // Fetch fresh data
    const vehicles = await vehicleService.getUserVehicles(user.id)
    setListedVehicles(vehicles)
  }
  
  loadUserVehicles()
}, [user?.id])
\`\`\`

### 5. Update Results Page
Add filtered cache support:

\`\`\`typescript
// components/results-page.tsx

useEffect(() => {
  const fetchAndSetVehicles = async () => {
    setLoading(true)
    try {
      // Generate cache key based on filters
      const filterKey = JSON.stringify(filters)
      const cacheKey = `${CACHE_CONFIG.VEHICLES_KEY}_filtered_${filterKey}`
      
      // Try cache for this specific filter
      const cached = CacheManager.get<Vehicle[]>(cacheKey)
      if (cached) {
        console.log("✅ Loaded filtered results from cache")
        setAllVehicles(cached)
        setLoading(false)
        return
      }
      
      // Fetch with filters
      const data = await vehicleService.filterVehicles(filters)
      
      if (data && Array.isArray(data)) {
        setAllVehicles(data)
        // Cache this specific filter result
        CacheManager.set(cacheKey, data)
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    } finally {
      setLoading(false)
    }
  }
  
  fetchAndSetVehicles()
}, [filters])
\`\`\`

### 6. Add Cache Preloading in App Root
\`\`\`typescript
// app/layout.tsx or pages/_app.tsx

import { preloadCache } from "@/lib/cache-manager"

useEffect(() => {
  // Preload cache on app startup
  preloadCache()
}, [])
\`\`\`

### 7. Cache Invalidation After Actions
Automatically invalidate caches after create/update/delete:

\`\`\`typescript
// components/upload-vehicle.tsx

const handleSubmitVehicle = async () => {
  // ... existing code ...
  
  try {
    if (editMode) {
      await vehicleService.updateVehicle(vehicleId, data)
    } else {
      await vehicleService.createVehicle(data, user.id)
    }
    
    // Cache is automatically invalidated in the service
    
    router.push('/dashboard')
  } catch (error) {
    // ... error handling
  }
}
\`\`\`

---

## Database Optimization

### Add Indexes (Run in Supabase SQL Editor)
\`\`\`sql
-- Add indexes for faster queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_status_created 
  ON vehicles(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_user_status 
  ON vehicles(user_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_search 
  ON vehicles USING gin(to_tsvector('english', make || ' ' || model || ' ' || COALESCE(variant, '')));

-- Add composite index for common filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_filters 
  ON vehicles(status, province, year, price) WHERE status = 'active';
\`\`\`

### Optimize Supabase Query
\`\`\`typescript
// Before (slow)
.select('*')

// After (fast - only select needed fields)
.select(`
  id,
  make,
  model,
  year,
  price,
  mileage,
  images,
  users(first_name, last_name, email)
`)
\`\`\`

---

## Testing Performance

### Test Cache Hit Rate
\`\`\`typescript
// Add to any page to test
import { CacheManager } from "@/lib/cache-manager"

useEffect(() => {
  const stats = CacheManager.getStats()
  console.log("Cache Stats:", {
    entries: stats.totalEntries,
    size: `${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`,
    oldest: `${(stats.oldestAge / 1000 / 60).toFixed(1)} minutes`
  })
}, [])
\`\`\`

### Measure Load Times
\`\`\`typescript
const measureLoadTime = async () => {
  const start = performance.now()
  await vehicleService.getVehicles()
  const end = performance.now()
  console.log(`Load time: ${(end - start).toFixed(0)}ms`)
}
\`\`\`

---

## Monitoring & Maintenance

### Clear Cache When Needed
\`\`\`typescript
// Clear all caches (useful for debugging)
CacheManager.clearAll()

// Clear user-specific cache
CacheManager.clearUserCache(userId)

// Clear specific cache
CacheManager.delete(CACHE_CONFIG.VEHICLES_KEY)
\`\`\`

### Cache Expiry Settings
Adjust in `lib/cache-manager.ts`:
\`\`\`typescript
export const CACHE_CONFIG = {
  CACHE_DURATION: 5 * 60 * 1000,              // 5 minutes (adjust as needed)
  BACKGROUND_REFRESH_THRESHOLD: 2 * 60 * 1000, // 2 minutes
  MAX_CACHE_SIZE: 5 * 1024 * 1024,            // 5MB per entry
}
\`\`\`

---

## Expected Results

### Before Optimization
- First load: ~2-3 seconds
- Return visit: ~2-3 seconds (no caching)
- Dashboard: ~1-2 seconds
- Results page: ~2-3 seconds

### After Optimization
- First load: ~800ms - 1.5s (database + cache)
- Return visit: ~50-150ms (instant from cache)
- Dashboard: ~100ms (cached user data)
- Results page: ~100ms (cached with filters)

### Additional Benefits
- Works offline (stale cache)
- Handles API failures gracefully
- Reduces Supabase costs
- Better user experience
- Faster perceived performance

---

## Troubleshooting

### Cache not working?
1. Check browser console for cache logs
2. Verify localStorage is enabled
3. Check cache size limits
4. Clear browser data and retry

### Data not updating?
1. Verify cache invalidation after mutations
2. Check background refresh is working
3. Reduce CACHE_DURATION if needed

### Performance still slow?
1. Check database indexes are created
2. Optimize Supabase queries (reduce fields)
3. Enable Supabase connection pooling
4. Consider CDN for images

---

## Next Steps
1. Implement the cache manager
2. Update vehicle operations
3. Add cache usage to components
4. Create database indexes
5. Test performance improvements
6. Monitor cache hit rates
7. Adjust cache settings based on usage patterns
