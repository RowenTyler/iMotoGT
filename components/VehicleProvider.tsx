// components/VehicleProvider.tsx (Debug Version)
"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { CacheManager } from '@/lib/cache-manager';

// Import your actual Vehicle type
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
}

interface VehicleContextType {
  // === NEW CACHE SYSTEM ===
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
  // Loading states
  loadingStates: Record<string, boolean>;
  
  // === LEGACY SUPPORT (for backward compatibility) ===
  vehicles: Vehicle[];
  loadVehicles: () => Promise<void>;
  loading: boolean;
  getVehicleById: (id: string) => Promise<Vehicle | null>;
}

const VehicleContext = createContext<VehicleContextType | null>(null);

// Default stale times (in milliseconds)
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes for lists
const VEHICLE_STALE_TIME = 10 * 60 * 1000; // 10 minutes for individual vehicles

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const [cache, setCache] = useState<VehicleCache>(() => {
    // Initialize cache from localStorage on client side
    if (typeof window === 'undefined') {
      log('🔍 Initializing cache (server-side)');
      return { byId: {}, lists: {}, timestamps: {} };
    }
    
    try {
      log('🔍 Loading cache from localStorage');
      const savedCache = CacheManager.get<VehicleCache>('vehicleCache');
      if (savedCache) {
        log('✅ Loaded cached data:', {
          vehiclesCount: Object.keys(savedCache.byId || {}).length,
          listsCount: Object.keys(savedCache.lists || {}).length
        });
      } else {
        log('📭 No cache found in localStorage');
      }
      return savedCache || { byId: {}, lists: {}, timestamps: {} };
    } catch (error) {
      console.error('❌ Failed to load cache from localStorage:', error);
      return { byId: {}, lists: {}, timestamps: {} };
    }
  });
  
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  // Legacy state for backward compatibility
  const [legacyVehicles, setLegacyVehicles] = useState<Vehicle[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);

  // Save cache to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Debounce the save to prevent excessive writes
      const timeoutId = setTimeout(() => {
        log('💾 Saving cache to localStorage', {
          vehiclesCount: Object.keys(cache.byId).length,
          listsCount: Object.keys(cache.lists).length
        });
        CacheManager.set('vehicleCache', cache);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('❌ Failed to save cache to localStorage:', error);
    }
  }, [cache]);

  // === NEW CACHE FUNCTIONS ===

  // Get vehicle by ID with caching
  const getVehicle = useCallback(async (id: string): Promise<Vehicle | null> => {
    const cacheKey = `vehicle:${id}`;
    
    log(`🔄 getVehicle called for ID: ${id}`);
    
    // Check if already loading
    if (loadingStates[cacheKey]) {
      log(`⏳ Vehicle ${id} already loading, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 50));
      const cached = cache.byId[id];
      if (cached) {
        log(`✅ Returning cached vehicle ${id} (was loading)`);
        return cached;
      }
    }
    
    // Check cache first
    const cachedVehicle = cache.byId[id];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedVehicle && cachedTimestamp && 
        Date.now() - cachedTimestamp < VEHICLE_STALE_TIME) {
      log(`✅ Returning fresh cached vehicle ${id}`);
      return cachedVehicle;
    } else if (cachedVehicle) {
      log(`⚠️  Returning stale cached vehicle ${id}`);
    }
    
    // Set loading state
    log(`🚀 Fetching vehicle ${id} from API`);
    setLoadingStates(prev => ({ ...prev, [cacheKey]: true }));
    
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      if (!response.ok) {
        log(`❌ API error for vehicle ${id}: ${response.status}`);
        throw new Error(`Failed to fetch vehicle: ${response.status}`);
      }
      
      const vehicle: Vehicle = await response.json();
      log(`✅ Fetched vehicle ${id}: ${vehicle.make} ${vehicle.model}`);
      
      // Update cache
      setCache(prev => ({
        ...prev,
        byId: { ...prev.byId, [id]: vehicle },
        timestamps: { ...prev.timestamps, [cacheKey]: Date.now() }
      }));
      
      return vehicle;
    } catch (error) {
      console.error(`❌ Error fetching vehicle ${id}:`, error);
      
      // Return stale cache if available
      if (cachedVehicle) {
        log(`🔄 Returning stale cache as fallback for vehicle ${id}`);
        return cachedVehicle;
      }
      
      return null;
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [cache, loadingStates]);

  // Get vehicle list with caching
  const getVehicleList = useCallback(async (
    cacheKey: string, 
    fetchFn: () => Promise<VehicleListResponse>
  ): Promise<VehicleListResponse> => {
    log(`🔄 getVehicleList called for cacheKey: ${cacheKey}`);
    
    // Check if already loading
    if (loadingStates[cacheKey]) {
      log(`⏳ List ${cacheKey} already loading, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 50));
      const cached = cache.lists[cacheKey];
      if (cached) {
        log(`✅ Returning cached list ${cacheKey} (was loading)`);
        return cached;
      }
    }
    
    // Check cache first
    const cachedList = cache.lists[cacheKey];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedList && cachedTimestamp && 
        Date.now() - cachedTimestamp < DEFAULT_STALE_TIME) {
      log(`✅ Returning fresh cached list ${cacheKey} with ${cachedList.vehicles?.length || 0} vehicles`);
      return cachedList;
    } else if (cachedList) {
      log(`⚠️  Cached list ${cacheKey} is stale (${Date.now() - cachedTimestamp}ms old)`);
    }
    
    // Set loading state
    log(`🚀 Fetching list ${cacheKey} from API`);
    setLoadingStates(prev => ({ ...prev, [cacheKey]: true }));
    
    try {
      const response = await fetchFn();
      log(`✅ Fetched list ${cacheKey} with ${response.vehicles?.length || 0} vehicles`);
      
      // Update list cache
      setCache(prev => ({
        ...prev,
        lists: { ...prev.lists, [cacheKey]: response },
        timestamps: { ...prev.timestamps, [cacheKey]: Date.now() }
      }));
      
      // Also cache individual vehicles from the list
      if (response.vehicles) {
        log(`💾 Caching ${response.vehicles.length} individual vehicles`);
        response.vehicles.forEach(vehicle => {
          setCache(prev => ({
            ...prev,
            byId: { ...prev.byId, [vehicle.id]: vehicle },
            timestamps: { ...prev.timestamps, [`vehicle:${vehicle.id}`]: Date.now() }
          }));
        });
      }
      
      return response;
    } catch (error) {
      console.error(`❌ Error fetching list ${cacheKey}:`, error);
      
      // Return stale cache if available
      if (cachedList) {
        log(`🔄 Returning stale cache as fallback for list ${cacheKey}`);
        return cachedList;
      }
      
      throw error;
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [cache, loadingStates]);

  // Get cached vehicle immediately (no fetch)
  const getCachedVehicle = useCallback((id: string): Vehicle | null => {
    const vehicle = cache.byId[id] || null;
    if (vehicle) {
      log(`🔍 Found cached vehicle ${id}: ${vehicle.make} ${vehicle.model}`);
    }
    return vehicle;
  }, [cache.byId]);

  // Get cached list immediately (no fetch)
  const getCachedList = useCallback((cacheKey: string): VehicleListResponse | null => {
    const list = cache.lists[cacheKey] || null;
    if (list) {
      log(`🔍 Found cached list ${cacheKey} with ${list.vehicles?.length || 0} vehicles`);
    }
    return list;
  }, [cache.lists]);

  // Check if cache is fresh
  const isFresh = useCallback((key: string, maxAge: number = DEFAULT_STALE_TIME): boolean => {
    const timestamp = cache.timestamps[key];
    if (!timestamp) {
      log(`❌ Cache key ${key} has no timestamp`);
      return false;
    }
    const age = Date.now() - timestamp;
    const fresh = age < maxAge;
    log(`📅 Cache key ${key} age: ${age}ms, fresh: ${fresh}`);
    return fresh;
  }, [cache.timestamps]);

  // Update vehicle in cache
  const updateVehicleInCache = useCallback((vehicle: Vehicle) => {
    log(`💾 Updating cache for vehicle ${vehicle.id}`);
    setCache(prev => ({
      ...prev,
      byId: { ...prev.byId, [vehicle.id]: vehicle },
      timestamps: { ...prev.timestamps, [`vehicle:${vehicle.id}`]: Date.now() }
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
        return newCache;
      });
    } else {
      log('🧹 Clearing all cache');
      setCache({ byId: {}, lists: {}, timestamps: {} });
    }
  }, []);

  // === LEGACY FUNCTIONS (for backward compatibility) ===

  const loadVehicles = useCallback(async () => {
    log('🔄 Legacy loadVehicles called');
    setLegacyLoading(true);
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      const vehicles = Array.isArray(data) ? data : data.vehicles || [];
      setLegacyVehicles(vehicles);
      
      log(`✅ Legacy loaded ${vehicles.length} vehicles`);
      
      // Also update cache for future use
      const cacheKey = 'legacy:all';
      setCache(prev => ({
        ...prev,
        lists: {
          ...prev.lists,
          [cacheKey]: { vehicles, totalCount: vehicles.length, timestamp: Date.now() }
        },
        timestamps: { ...prev.timestamps, [cacheKey]: Date.now() }
      }));
      
      // Cache individual vehicles
      vehicles.forEach(vehicle => {
        updateVehicleInCache(vehicle);
      });
      
    } catch (error) {
      console.error('❌ Legacy failed to fetch vehicles:', error);
    } finally {
      setLegacyLoading(false);
    }
  }, [updateVehicleInCache]);

  // Legacy function for backward compatibility
  const getVehicleById = useCallback(async (id: string): Promise<Vehicle | null> => {
    log(`🔄 Legacy getVehicleById called for ${id}`);
    return getVehicle(id);
  }, [getVehicle]);

  // Context value
  const contextValue = useMemo(() => ({
    // New cache system
    getVehicle,
    getVehicleList,
    getCachedVehicle,
    getCachedList,
    isFresh,
    updateVehicleInCache,
    clearCache,
    loadingStates,
    
    // Legacy properties for backward compatibility
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
    clearCache,
    loadingStates,
    legacyVehicles,
    loadVehicles,
    legacyLoading,
    getVehicleById,
  ]);

  log('🎯 VehicleProvider rendering with state:', {
    cacheSize: Object.keys(cache.byId).length,
    listKeys: Object.keys(cache.lists),
    loadingStates: Object.keys(loadingStates)
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
        
        // Check cache first
        const cached = getCachedVehicle(id);
        if (cached) {
          console.log(`✅ useVehicle: Found cached vehicle ${id}`);
          setVehicle(cached);
          setLoading(false);
        } else {
          console.log(`📭 useVehicle: No cache for ${id}`);
        }
        
        // Fetch with cache fallback
        console.log(`🚀 useVehicle: Fetching vehicle ${id}`);
        const fetchedVehicle = await getVehicle(id);
        if (fetchedVehicle && fetchedVehicle !== cached) {
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
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          const cached = getCachedList(cacheKey);
          const fresh = isFresh(cacheKey, maxAge);
          console.log(`🔍 useVehicleList ${cacheKey}: Cache check`, { hasCache: !!cached, fresh });
          
          if (cached && fresh) {
            console.log(`✅ useVehicleList ${cacheKey}: Using cached data`);
            setData(cached);
            setLoading(false);
          } else if (cached) {
            console.log(`⚠️ useVehicleList ${cacheKey}: Cache stale, fetching new data`);
          } else {
            console.log(`📭 useVehicleList ${cacheKey}: No cache found`);
          }
        } else {
          console.log(`🔄 useVehicleList ${cacheKey}: Force refresh requested`);
        }
        
        // Fetch (will use cache internally if fresh)
        console.log(`🚀 useVehicleList ${cacheKey}: Fetching data`);
        const response = await getVehicleList(cacheKey, fetchFn);
        console.log(`✅ useVehicleList ${cacheKey}: Fetched ${response.vehicles?.length || 0} vehicles`);
        setData(response);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load vehicles';
        console.error(`❌ useVehicleList error for ${cacheKey}:`, errorMsg);
        setError(errorMsg);
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
