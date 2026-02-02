// components/VehicleProvider.tsx
"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { CacheManager } from '@/lib/cache-manager';
import type { Vehicle } from '@/types/vehicle';

// Debug logging flag
const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) console.log('🚗 [VehicleProvider]', ...args);
};

interface VehicleListResponse {
  vehicles: Vehicle[];
  totalCount?: number;
  page?: number;
  limit?: number;
  hierarchy?: Record<string, string[]>;
  timestamp?: number;
  filters?: any;
}

interface VehicleCache {
  // Individual vehicles by ID
  byId: Record<string, Vehicle>;
  // Lists by cache key (e.g., 'home', 'search:query')
  lists: Record<string, VehicleListResponse>;
  // Timestamps for freshness checks
  timestamps: Record<string, number>;
  // Last accessed timestamps for LRU eviction
  lastAccessed: Record<string, number>;
}

interface VehicleContextType {
  // === CACHE SYSTEM ===
  // Get vehicle by ID (cached)
  getVehicle: (id: string) => Promise<Vehicle | null>;
  // Get vehicle list (cached)
  getVehicleList: (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>) => Promise<VehicleListResponse>;
  // Get cached vehicle immediately
  getCachedVehicle: (id: string) => Vehicle | null;
  // Get cached list immediately
  getCachedList: (cacheKey: string) => VehicleListResponse | null;
  // Check if data is fresh
  isFresh: (key: string, maxAge?: number) => boolean;
  // Manual cache update
  updateVehicleInCache: (vehicle: Vehicle) => void;
  // Clear specific cache
  clearCache: (key?: string) => void;
  // Preload cache (for navigation)
  preloadCache: (key: string, data: VehicleListResponse) => void;
  
  // === LEGACY SUPPORT ===
  vehicles: Vehicle[];
  loadVehicles: () => Promise<void>;
  loading: boolean;
  getVehicleById: (id: string) => Promise<Vehicle | null>;
}

const VehicleContext = createContext<VehicleContextType | null>(null);

// Cache configuration
const DEFAULT_STALE_TIME = 30 * 60 * 1000; // 30 minutes for lists
const VEHICLE_STALE_TIME = 60 * 60 * 1000; // 60 minutes for individual vehicles
const MAX_CACHE_SIZE = 100; // Maximum number of cache entries to prevent memory bloat

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const [cache, setCache] = useState<VehicleCache>(() => {
    if (typeof window === 'undefined') {
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {} };
    }
    
    try {
      log('🔍 Loading cache from localStorage');
      const savedCache = CacheManager.get<VehicleCache>('vehicleCache');
      if (savedCache) {
        log('✅ Loaded cached data from localStorage', {
          vehicles: Object.keys(savedCache.byId || {}).length,
          lists: Object.keys(savedCache.lists || {}).length,
          timestamps: Object.keys(savedCache.timestamps || {}).length
        });
        return {
          byId: savedCache.byId || {},
          lists: savedCache.lists || {},
          timestamps: savedCache.timestamps || {},
          lastAccessed: savedCache.lastAccessed || {}
        };
      }
      log('📭 No cache found in localStorage');
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {} };
    } catch (error) {
      console.error('❌ Failed to load cache from localStorage:', error);
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {} };
    }
  });

  // Save cache to localStorage with debounce
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saveCache = () => {
      try {
        log('💾 Saving cache to localStorage', {
          vehicles: Object.keys(cache.byId).length,
          lists: Object.keys(cache.lists).length
        });
        CacheManager.set('vehicleCache', cache);
      } catch (error) {
        console.error('❌ Failed to save cache to localStorage:', error);
      }
    };

    // Debounce to prevent excessive writes
    const timeoutId = setTimeout(saveCache, 1000);
    return () => clearTimeout(timeoutId);
  }, [cache]);

  // Clean up old cache entries periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setCache(prev => {
        const now = Date.now();
        const newCache = { ...prev };
        
        // Clean up old timestamps
        Object.keys(newCache.timestamps).forEach(key => {
          const age = now - newCache.timestamps[key];
          const isList = key.startsWith('home') || key.startsWith('results') || key.startsWith('search');
          const maxAge = isList ? DEFAULT_STALE_TIME : VEHICLE_STALE_TIME;
          
          if (age > maxAge * 2) { // Double the stale time before cleanup
            delete newCache.timestamps[key];
            delete newCache.lastAccessed[key];
            
            if (key.startsWith('vehicle:')) {
              const id = key.replace('vehicle:', '');
              delete newCache.byId[id];
            } else {
              delete newCache.lists[key];
            }
            
            log('🧹 Cleaned up old cache entry:', key);
          }
        });

        return newCache;
      });
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Get vehicle by ID with caching
  const getVehicle = useCallback(async (id: string): Promise<Vehicle | null> => {
    const cacheKey = `vehicle:${id}`;
    
    log(`🔄 getVehicle called for ID: ${id}`);
    
    // Check cache first (even if loading)
    const cachedVehicle = cache.byId[id];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedVehicle && cachedTimestamp && Date.now() - cachedTimestamp < VEHICLE_STALE_TIME) {
      log(`✅ Returning cached vehicle ${id}`);
      // Update last accessed time
      setCache(prev => ({
        ...prev,
        lastAccessed: { ...prev.lastAccessed, [cacheKey]: Date.now() }
      }));
      return cachedVehicle;
    }
    
    log(`🚀 Fetching vehicle ${id} from API`);
    
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      if (!response.ok) {
        log(`❌ API error for vehicle ${id}: ${response.status}`);
        throw new Error(`Failed to fetch vehicle: ${response.status}`);
      }
      
      const vehicle: Vehicle = await response.json();
      log(`✅ Fetched vehicle ${id}: ${vehicle.make} ${vehicle.model}`);
      
      // Update cache
      setCache(prev => {
        const newCache = { ...prev };
        newCache.byId[id] = vehicle;
        newCache.timestamps[cacheKey] = Date.now();
        newCache.lastAccessed[cacheKey] = Date.now();
        
        // Limit cache size
        if (Object.keys(newCache.byId).length > MAX_CACHE_SIZE) {
          const entries = Object.entries(newCache.lastAccessed).sort((a, b) => a[1] - b[1]);
          const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.1)); // Remove 10% oldest
          toRemove.forEach(([key]) => {
            if (key.startsWith('vehicle:')) {
              const vehicleId = key.replace('vehicle:', '');
              delete newCache.byId[vehicleId];
            }
            delete newCache.timestamps[key];
            delete newCache.lastAccessed[key];
          });
        }
        
        return newCache;
      });
      
      return vehicle;
    } catch (error) {
      console.error(`❌ Error fetching vehicle ${id}:`, error);
      
      // Return stale cache if available
      if (cachedVehicle) {
        log(`🔄 Returning stale cache as fallback for vehicle ${id}`);
        return cachedVehicle;
      }
      
      return null;
    }
  }, [cache]);

  // Get vehicle list with caching
  const getVehicleList = useCallback(async (
    cacheKey: string, 
    fetchFn: () => Promise<VehicleListResponse>
  ): Promise<VehicleListResponse> => {
    log(`🔄 getVehicleList called for cacheKey: ${cacheKey}`);
    
    // Check cache first
    const cachedList = cache.lists[cacheKey];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedList && cachedTimestamp && Date.now() - cachedTimestamp < DEFAULT_STALE_TIME) {
      log(`✅ Returning cached list ${cacheKey} with ${cachedList.vehicles?.length || 0} vehicles`);
      // Update last accessed time
      setCache(prev => ({
        ...prev,
        lastAccessed: { ...prev.lastAccessed, [cacheKey]: Date.now() }
      }));
      return cachedList;
    }
    
    log(`🚀 Fetching list ${cacheKey} from API`);
    
    try {
      const response = await fetchFn();
      log(`✅ Fetched list ${cacheKey} with ${response.vehicles?.length || 0} vehicles`);
      
      // Update cache
      setCache(prev => {
        const newCache = { ...prev };
        newCache.lists[cacheKey] = response;
        newCache.timestamps[cacheKey] = Date.now();
        newCache.lastAccessed[cacheKey] = Date.now();
        
        // Also cache individual vehicles
        if (response.vehicles) {
          response.vehicles.forEach(vehicle => {
            const vehicleKey = `vehicle:${vehicle.id}`;
            newCache.byId[vehicle.id] = vehicle;
            newCache.timestamps[vehicleKey] = Date.now();
            newCache.lastAccessed[vehicleKey] = Date.now();
          });
        }
        
        // Limit cache size
        if (Object.keys(newCache.lists).length > MAX_CACHE_SIZE / 2) {
          const listEntries = Object.entries(newCache.lastAccessed)
            .filter(([key]) => !key.startsWith('vehicle:'))
            .sort((a, b) => a[1] - b[1]);
          
          const toRemove = listEntries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.1));
          toRemove.forEach(([key]) => {
            delete newCache.lists[key];
            delete newCache.timestamps[key];
            delete newCache.lastAccessed[key];
          });
        }
        
        return newCache;
      });
      
      return response;
    } catch (error) {
      console.error(`❌ Error fetching list ${cacheKey}:`, error);
      
      // Return stale cache if available
      if (cachedList) {
        log(`🔄 Returning stale cache as fallback for list ${cacheKey}`);
        return cachedList;
      }
      
      throw error;
    }
  }, [cache]);

  // Get cached vehicle immediately (no fetch)
  const getCachedVehicle = useCallback((id: string): Vehicle | null => {
    const vehicle = cache.byId[id] || null;
    if (vehicle) {
      log(`🔍 Found cached vehicle ${id}: ${vehicle.make} ${vehicle.model}`);
      // Update last accessed time
      setCache(prev => ({
        ...prev,
        lastAccessed: { ...prev.lastAccessed, [`vehicle:${id}`]: Date.now() }
      }));
    }
    return vehicle;
  }, [cache]);

  // Get cached list immediately (no fetch)
  const getCachedList = useCallback((cacheKey: string): VehicleListResponse | null => {
    const list = cache.lists[cacheKey] || null;
    if (list) {
      log(`🔍 Found cached list ${cacheKey} with ${list.vehicles?.length || 0} vehicles`);
      // Update last accessed time
      setCache(prev => ({
        ...prev,
        lastAccessed: { ...prev.lastAccessed, [cacheKey]: Date.now() }
      }));
    }
    return list;
  }, [cache]);

  // Check if cache is fresh
  const isFresh = useCallback((key: string, maxAge: number = DEFAULT_STALE_TIME): boolean => {
    const timestamp = cache.timestamps[key];
    if (!timestamp) {
      return false;
    }
    const age = Date.now() - timestamp;
    const fresh = age < maxAge;
    log(`📅 Cache key ${key} age: ${age}ms, fresh: ${fresh}, maxAge: ${maxAge}`);
    return fresh;
  }, [cache.timestamps]);

  // Update vehicle in cache
  const updateVehicleInCache = useCallback((vehicle: Vehicle) => {
    log(`💾 Updating cache for vehicle ${vehicle.id}`);
    setCache(prev => ({
      ...prev,
      byId: { ...prev.byId, [vehicle.id]: vehicle },
      timestamps: { ...prev.timestamps, [`vehicle:${vehicle.id}`]: Date.now() },
      lastAccessed: { ...prev.lastAccessed, [`vehicle:${vehicle.id}`]: Date.now() }
    }));
  }, []);

  // Preload cache (for navigation)
  const preloadCache = useCallback((key: string, data: VehicleListResponse) => {
    log(`⚡ Preloading cache for key: ${key}`);
    setCache(prev => ({
      ...prev,
      lists: { ...prev.lists, [key]: data },
      timestamps: { ...prev.timestamps, [key]: Date.now() },
      lastAccessed: { ...prev.lastAccessed, [key]: Date.now() }
    }));
  }, []);

  // Clear cache
  const clearCache = useCallback((key?: string) => {
    if (key) {
      log(`🧹 Clearing cache for key: ${key}`);
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache.lists[key];
        delete newCache.timestamps[key];
        delete newCache.lastAccessed[key];
        return newCache;
      });
    } else {
      log('🧹 Clearing all cache');
      setCache({ byId: {}, lists: {}, timestamps: {}, lastAccessed: {} });
    }
  }, []);

  // === LEGACY FUNCTIONS ===
  const [legacyVehicles, setLegacyVehicles] = useState<Vehicle[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);

  const loadVehicles = useCallback(async () => {
    log('🔄 Legacy loadVehicles called');
    setLegacyLoading(true);
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      const vehicles = Array.isArray(data) ? data : data.vehicles || [];
      setLegacyVehicles(vehicles);
      log(`✅ Legacy loaded ${vehicles.length} vehicles`);
    } catch (error) {
      console.error('❌ Legacy failed to fetch vehicles:', error);
    } finally {
      setLegacyLoading(false);
    }
  }, []);

  const getVehicleById = useCallback(async (id: string): Promise<Vehicle | null> => {
    log(`🔄 Legacy getVehicleById called for ${id}`);
    return getVehicle(id);
  }, [getVehicle]);

  // Context value
  const contextValue = useMemo(() => ({
    // Cache system
    getVehicle,
    getVehicleList,
    getCachedVehicle,
    getCachedList,
    isFresh,
    updateVehicleInCache,
    preloadCache,
    clearCache,
    
    // Legacy
    vehicles: legacyVehicles,
    loadVehicles,
    loading: legacyLoading,
    getVehicleById,
  }), [
    getVehicle,
    getVehicleList,
    getCachedVehicle,
    getCachedList,
    isFresh,
    updateVehicleInCache,
    preloadCache,
    clearCache,
    legacyVehicles,
    loadVehicles,
    legacyLoading,
    getVehicleById,
  ]);

  log('🎯 VehicleProvider state:', {
    cacheSize: Object.keys(cache.byId).length,
    listKeys: Object.keys(cache.lists),
    lastLoad: cache.timestamps['home'] ? new Date(cache.timestamps['home']).toLocaleTimeString() : 'never'
  });

  return (
    <VehicleContext.Provider value={contextValue}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => {
  const context = useContext(VehicleContext);
  if (!context) {
    console.error('❌ useVehicleContext must be used within a VehicleProvider');
    throw new Error('useVehicleContext must be used within a VehicleProvider');
  }
  return context;
};

// Custom hook for vehicle lists with caching
export const useVehicleList = (
  cacheKey: string,
  fetchFn: () => Promise<VehicleListResponse>,
  options?: {
    enabled?: boolean;
    forceRefresh?: boolean;
    maxAge?: number;
  }
) => {
  const [data, setData] = useState<VehicleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getVehicleList, getCachedList, isFresh } = useVehicleContext();

  const enabled = options?.enabled ?? true;
  const forceRefresh = options?.forceRefresh ?? false;
  const maxAge = options?.maxAge ?? DEFAULT_STALE_TIME;

  useEffect(() => {
    if (!enabled) {
      console.log(`⏸️ useVehicleList ${cacheKey}: Disabled`);
      setLoading(false);
      return;
    }

    console.log(`🔄 useVehicleList hook called for key: ${cacheKey}`, { forceRefresh });

    const loadList = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ALWAYS check cache first, even on force refresh
        const cached = getCachedList(cacheKey);
        const fresh = isFresh(cacheKey, maxAge);
        
        console.log(`🔍 useVehicleList ${cacheKey}: Cache check`, { 
          hasCache: !!cached, 
          fresh,
          forceRefresh 
        });
        
        // If we have cached data and it's fresh, use it immediately
        if (cached && fresh && !forceRefresh) {
          console.log(`✅ useVehicleList ${cacheKey}: Using cached data`);
          setData(cached);
          setLoading(false);
          
          // If force refresh is true, still fetch in background
          if (forceRefresh) {
            console.log(`🔄 useVehicleList ${cacheKey}: Force refresh in background`);
            try {
              const response = await getVehicleList(cacheKey, fetchFn);
              if (response !== cached) {
                console.log(`🔄 useVehicleList ${cacheKey}: Updated with fresh data`);
                setData(response);
              }
            } catch (bgError) {
              console.error(`❌ useVehicleList ${cacheKey}: Background refresh failed:`, bgError);
              // Don't show error to user for background refresh
            }
          }
          return;
        }
        
        // If we have cached data but it's stale, show it immediately while fetching fresh
        if (cached && !fresh && !forceRefresh) {
          console.log(`⚠️ useVehicleList ${cacheKey}: Cache stale, showing cached while fetching`);
          setData(cached);
          setLoading(false);
          
          // Fetch fresh data in background
          console.log(`🔄 useVehicleList ${cacheKey}: Fetching fresh data in background`);
          try {
            const response = await getVehicleList(cacheKey, fetchFn);
            if (response !== cached) {
              console.log(`🔄 useVehicleList ${cacheKey}: Updated with fresh data`);
              setData(response);
            }
          } catch (bgError) {
            console.error(`❌ useVehicleList ${cacheKey}: Background refresh failed:`, bgError);
            // Don't show error to user for background refresh
          }
          return;
        }
        
        // No cache or force refresh - fetch fresh
        console.log(`🚀 useVehicleList ${cacheKey}: Fetching fresh data`);
        const response = await getVehicleList(cacheKey, fetchFn);
        console.log(`✅ useVehicleList ${cacheKey}: Fetched ${response.vehicles?.length || 0} vehicles`);
        setData(response);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load vehicles';
        console.error(`❌ useVehicleList error for ${cacheKey}:`, errorMsg);
        setError(errorMsg);
        
        // Try to use stale cache as fallback
        const cached = getCachedList(cacheKey);
        if (cached) {
          console.log(`🔄 useVehicleList ${cacheKey}: Using stale cache as fallback after error`);
          setData(cached);
        }
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [cacheKey, fetchFn, enabled, forceRefresh, maxAge, getVehicleList, getCachedList, isFresh]);

  console.log(`📊 useVehicleList state for ${cacheKey}:`, { 
    loading, 
    vehicleCount: data?.vehicles?.length || 0,
    error 
  });

  return { data, loading, error };
};

// Custom hook for vehicle details with caching
export const useVehicle = (id?: string) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getVehicle, getCachedVehicle } = useVehicleContext();

  useEffect(() => {
    if (!id) {
      console.log('⚠️ useVehicle: No ID provided');
      setVehicle(null);
      setLoading(false);
      return;
    }

    console.log(`🔄 useVehicle hook called for ID: ${id}`);
    
    const loadVehicle = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ALWAYS check cache first
        const cached = getCachedVehicle(id);
        if (cached) {
          console.log(`✅ useVehicle: Found cached vehicle ${id}`);
          setVehicle(cached);
          setLoading(false);
          
          // Always fetch fresh data in background
          console.log(`🔄 useVehicle: Fetching fresh data in background for ${id}`);
          try {
            const fetchedVehicle = await getVehicle(id);
            if (fetchedVehicle && fetchedVehicle !== cached) {
              console.log(`🔄 useVehicle: Updated with fresh data for ${id}`);
              setVehicle(fetchedVehicle);
            }
          } catch (bgError) {
            console.error(`❌ useVehicle: Background refresh failed for ${id}:`, bgError);
            // Don't show error to user for background refresh
          }
          return;
        }
        
        // No cache - fetch fresh
        console.log(`🚀 useVehicle: Fetching vehicle ${id}`);
        const fetchedVehicle = await getVehicle(id);
        if (fetchedVehicle) {
          console.log(`✅ useVehicle: Fetched vehicle ${id}`);
          setVehicle(fetchedVehicle);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load vehicle';
        console.error(`❌ useVehicle error for ${id}:`, errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadVehicle();
  }, [id, getVehicle, getCachedVehicle]);

  console.log(`📊 useVehicle state for ${id}:`, { loading, hasVehicle: !!vehicle, error });

  return { vehicle, loading, error };
};
