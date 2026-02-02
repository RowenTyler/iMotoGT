// components/VehicleProvider.tsx
"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
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
  // Navigation history for back/forward buttons
  navigationHistory: {
    path: string;
    searchParams?: string;
    data?: any;
    scrollPosition?: number;
    timestamp: number;
  }[];
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
  
  // === NAVIGATION CACHE ===
  // Save current page state before navigating away
  savePageState: (data?: any) => void;
  // Restore page state when navigating back/forward
  restorePageState: () => any;
  // Get navigation history
  getNavigationHistory: () => VehicleCache['navigationHistory'];
  // Clear navigation history
  clearNavigationHistory: () => void;
  // Save scroll position for current page
  saveScrollPosition: (position: number) => void;
  // Restore scroll position for current page
  restoreScrollPosition: () => number | null;
  
  // === ROUTE-BASED CACHING ===
  // Get current route cache key
  getCurrentRouteKey: () => string;
  // Save data for current route
  saveForCurrentRoute: (data: any, type?: 'list' | 'detail') => void;
  // Get data for current route
  getForCurrentRoute: () => any;
  // Check if current route is cached
  isCurrentRouteCached: () => boolean;
  
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
const MAX_NAVIGATION_HISTORY = 20; // Maximum pages in navigation history
const NAVIGATION_CACHE_KEY = 'vehicle_navigation_cache';

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const currentRouteKeyRef = useRef<string>('');
  
  const [cache, setCache] = useState<VehicleCache>(() => {
    if (typeof window === 'undefined') {
      return { 
        byId: {}, 
        lists: {}, 
        timestamps: {}, 
        lastAccessed: {},
        navigationHistory: []
      };
    }
    
    try {
      log('🔍 Loading cache from localStorage');
      const savedCache = CacheManager.get<VehicleCache>('vehicleCache');
      if (savedCache) {
        log('✅ Loaded cached data from localStorage', {
          vehicles: Object.keys(savedCache.byId || {}).length,
          lists: Object.keys(savedCache.lists || {}).length,
          timestamps: Object.keys(savedCache.timestamps || {}).length,
          navigationHistory: (savedCache.navigationHistory || []).length
        });
        return {
          byId: savedCache.byId || {},
          lists: savedCache.lists || {},
          timestamps: savedCache.timestamps || {},
          lastAccessed: savedCache.lastAccessed || {},
          navigationHistory: savedCache.navigationHistory || []
        };
      }
      log('📭 No cache found in localStorage');
      return { 
        byId: {}, 
        lists: {}, 
        timestamps: {}, 
        lastAccessed: {},
        navigationHistory: []
      };
    } catch (error) {
      console.error('❌ Failed to load cache from localStorage:', error);
      return { 
        byId: {}, 
        lists: {}, 
        timestamps: {}, 
        lastAccessed: {},
        navigationHistory: []
      };
    }
  });

  // Update current route key when pathname or searchParams change
  useEffect(() => {
    const paramsString = searchParams.toString();
    currentRouteKeyRef.current = paramsString 
      ? `${pathname}?${paramsString}`
      : pathname;
    
    log(`📍 Current route key updated: ${currentRouteKeyRef.current}`);
    
    // Auto-restore state for this route if available
    if (!isInitialMount.current) {
      const cachedData = getForCurrentRoute();
      if (cachedData) {
        log(`🔄 Auto-restored cached data for route: ${currentRouteKeyRef.current}`);
      }
    }
    
    isInitialMount.current = false;
  }, [pathname, searchParams]);

  // Save cache to localStorage with debounce
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saveCache = () => {
      try {
        log('💾 Saving cache to localStorage', {
          vehicles: Object.keys(cache.byId).length,
          lists: Object.keys(cache.lists).length,
          navigationHistory: cache.navigationHistory.length
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
          const isList = key.startsWith('home') || key.startsWith('results') || key.startsWith('search') || key.includes('?');
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

        // Clean up old navigation history
        if (newCache.navigationHistory.length > MAX_NAVIGATION_HISTORY) {
          newCache.navigationHistory = newCache.navigationHistory
            .slice(0, MAX_NAVIGATION_HISTORY);
        }

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
      setCache({ 
        byId: {}, 
        lists: {}, 
        timestamps: {}, 
        lastAccessed: {},
        navigationHistory: []
      });
    }
  }, []);

  // === NAVIGATION CACHE FUNCTIONS ===
  
  // Save current page state before navigating away
  const savePageState = useCallback((data?: any) => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return;
    
    log(`💾 Saving page state for route: ${routeKey}`);
    
    setCache(prev => {
      const newHistory = [...(prev.navigationHistory || [])];
      
      // Remove existing entry for this route if it exists
      const existingIndex = newHistory.findIndex(entry => entry.path === routeKey);
      if (existingIndex !== -1) {
        newHistory.splice(existingIndex, 1);
      }
      
      // Add current state to history
      newHistory.unshift({
        path: routeKey,
        searchParams: searchParams.toString(),
        data: data || getForCurrentRoute(),
        timestamp: Date.now()
      });
      
      // Limit history size
      if (newHistory.length > MAX_NAVIGATION_HISTORY) {
        newHistory.pop();
      }
      
      return {
        ...prev,
        navigationHistory: newHistory
      };
    });
  }, [searchParams]);

  // Restore page state when navigating back/forward
  const restorePageState = useCallback(() => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return null;
    
    log(`🔄 Attempting to restore page state for route: ${routeKey}`);
    
    const historyEntry = cache.navigationHistory.find(entry => entry.path === routeKey);
    
    if (historyEntry) {
      log(`✅ Restored page state from navigation history for: ${routeKey}`);
      return historyEntry.data;
    }
    
    // If not in navigation history, try regular cache
    const cachedData = getForCurrentRoute();
    if (cachedData) {
      log(`✅ Restored page state from regular cache for: ${routeKey}`);
      return cachedData;
    }
    
    log(`❌ No cached data found for route: ${routeKey}`);
    return null;
  }, [cache.navigationHistory]);

  // Get navigation history
  const getNavigationHistory = useCallback(() => {
    return cache.navigationHistory || [];
  }, [cache.navigationHistory]);

  // Clear navigation history
  const clearNavigationHistory = useCallback(() => {
    log('🧹 Clearing navigation history');
    setCache(prev => ({
      ...prev,
      navigationHistory: []
    }));
  }, []);

  // Save scroll position for current page
  const saveScrollPosition = useCallback((position: number) => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return;
    
    log(`📐 Saving scroll position ${position} for route: ${routeKey}`);
    
    setCache(prev => {
      const newHistory = [...(prev.navigationHistory || [])];
      const existingIndex = newHistory.findIndex(entry => entry.path === routeKey);
      
      if (existingIndex !== -1) {
        newHistory[existingIndex] = {
          ...newHistory[existingIndex],
          scrollPosition: position
        };
      } else {
        newHistory.unshift({
          path: routeKey,
          searchParams: searchParams.toString(),
          scrollPosition: position,
          timestamp: Date.now()
        });
      }
      
      // Limit history size
      if (newHistory.length > MAX_NAVIGATION_HISTORY) {
        newHistory.pop();
      }
      
      return {
        ...prev,
        navigationHistory: newHistory
      };
    });
  }, [searchParams]);

  // Restore scroll position for current page
  const restoreScrollPosition = useCallback(() => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return null;
    
    const historyEntry = cache.navigationHistory.find(entry => entry.path === routeKey);
    return historyEntry?.scrollPosition || null;
  }, [cache.navigationHistory]);

  // === ROUTE-BASED CACHING ===
  
  // Get current route cache key
  const getCurrentRouteKey = useCallback(() => {
    return currentRouteKeyRef.current;
  }, []);

  // Save data for current route
  const saveForCurrentRoute = useCallback((data: any, type: 'list' | 'detail' = 'list') => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return;
    
    log(`💾 Saving data for current route: ${routeKey} (type: ${type})`);
    
    setCache(prev => {
      const newCache = { ...prev };
      
      // Store in appropriate cache based on type
      if (type === 'list') {
        newCache.lists[routeKey] = data;
      } else if (type === 'detail' && data.id) {
        newCache.byId[data.id] = data;
        newCache.timestamps[`vehicle:${data.id}`] = Date.now();
        newCache.lastAccessed[`vehicle:${data.id}`] = Date.now();
      }
      
      // Always update timestamps for the route
      newCache.timestamps[routeKey] = Date.now();
      newCache.lastAccessed[routeKey] = Date.now();
      
      return newCache;
    });
  }, []);

  // Get data for current route
  const getForCurrentRoute = useCallback(() => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return null;
    
    // First try lists (for search results, home page, etc.)
    const listData = cache.lists[routeKey];
    if (listData) {
      log(`🔍 Found cached list data for route: ${routeKey}`);
      return listData;
    }
    
    // Then check if this is a vehicle detail page
    const vehicleIdMatch = routeKey.match(/\/vehicle\/([^\/?]+)/);
    if (vehicleIdMatch) {
      const vehicleId = vehicleIdMatch[1];
      const vehicleData = cache.byId[vehicleId];
      if (vehicleData) {
        log(`🔍 Found cached vehicle data for route: ${routeKey}`);
        return vehicleData;
      }
    }
    
    return null;
  }, [cache.lists, cache.byId, currentRouteKeyRef.current]);

  // Check if current route is cached
  const isCurrentRouteCached = useCallback(() => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return false;
    
    const hasListCache = !!cache.lists[routeKey];
    const hasVehicleCache = (() => {
      const vehicleIdMatch = routeKey.match(/\/vehicle\/([^\/?]+)/);
      if (vehicleIdMatch) {
        const vehicleId = vehicleIdMatch[1];
        return !!cache.byId[vehicleId];
      }
      return false;
    })();
    
    return hasListCache || hasVehicleCache;
  }, [cache.lists, cache.byId, currentRouteKeyRef.current]);

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

  // Save state before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      log('⚠️ Page unloading, saving current state');
      savePageState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [savePageState]);

  // Auto-save state when navigating away (route changes)
  useEffect(() => {
    if (isInitialMount.current) return;
    
    log(`📍 Route changed to: ${currentRouteKeyRef.current}, saving previous state`);
    savePageState();
  }, [pathname, searchParams, savePageState]);

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
    
    // Navigation cache
    savePageState,
    restorePageState,
    getNavigationHistory,
    clearNavigationHistory,
    saveScrollPosition,
    restoreScrollPosition,
    
    // Route-based caching
    getCurrentRouteKey,
    saveForCurrentRoute,
    getForCurrentRoute,
    isCurrentRouteCached,
    
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
    savePageState,
    restorePageState,
    getNavigationHistory,
    clearNavigationHistory,
    saveScrollPosition,
    restoreScrollPosition,
    getCurrentRouteKey,
    saveForCurrentRoute,
    getForCurrentRoute,
    isCurrentRouteCached,
    legacyVehicles,
    loadVehicles,
    legacyLoading,
    getVehicleById,
  ]);

  log('🎯 VehicleProvider state:', {
    cacheSize: Object.keys(cache.byId).length,
    listKeys: Object.keys(cache.lists),
    navigationHistory: cache.navigationHistory.length,
    currentRoute: currentRouteKeyRef.current,
    isCurrentRouteCached: isCurrentRouteCached()
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
  const { getVehicleList, getCachedList, isFresh, saveForCurrentRoute } = useVehicleContext();

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
          
          // Save to route cache for navigation
          saveForCurrentRoute(cached, 'list');
          
          // If force refresh is true, still fetch in background
          if (forceRefresh) {
            console.log(`🔄 useVehicleList ${cacheKey}: Force refresh in background`);
            try {
              const response = await getVehicleList(cacheKey, fetchFn);
              if (response !== cached) {
                console.log(`🔄 useVehicleList ${cacheKey}: Updated with fresh data`);
                setData(response);
                saveForCurrentRoute(response, 'list');
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
          
          // Save to route cache for navigation
          saveForCurrentRoute(cached, 'list');
          
          // Fetch fresh data in background
          console.log(`🔄 useVehicleList ${cacheKey}: Fetching fresh data in background`);
          try {
            const response = await getVehicleList(cacheKey, fetchFn);
            if (response !== cached) {
              console.log(`🔄 useVehicleList ${cacheKey}: Updated with fresh data`);
              setData(response);
              saveForCurrentRoute(response, 'list');
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
        saveForCurrentRoute(response, 'list');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load vehicles';
        console.error(`❌ useVehicleList error for ${cacheKey}:`, errorMsg);
        setError(errorMsg);
        
        // Try to use stale cache as fallback
        const cached = getCachedList(cacheKey);
        if (cached) {
          console.log(`🔄 useVehicleList ${cacheKey}: Using stale cache as fallback after error`);
          setData(cached);
          saveForCurrentRoute(cached, 'list');
        }
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [cacheKey, fetchFn, enabled, forceRefresh, maxAge, getVehicleList, getCachedList, isFresh, saveForCurrentRoute]);

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
  const { getVehicle, getCachedVehicle, saveForCurrentRoute } = useVehicleContext();

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
          
          // Save to route cache for navigation
          saveForCurrentRoute(cached, 'detail');
          
          // Always fetch fresh data in background
          console.log(`🔄 useVehicle: Fetching fresh data in background for ${id}`);
          try {
            const fetchedVehicle = await getVehicle(id);
            if (fetchedVehicle && fetchedVehicle !== cached) {
              console.log(`🔄 useVehicle: Updated with fresh data for ${id}`);
              setVehicle(fetchedVehicle);
              saveForCurrentRoute(fetchedVehicle, 'detail');
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
          saveForCurrentRoute(fetchedVehicle, 'detail');
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
  }, [id, getVehicle, getCachedVehicle, saveForCurrentRoute]);

  console.log(`📊 useVehicle state for ${id}:`, { loading, hasVehicle: !!vehicle, error });

  return { vehicle, loading, error };
};

// Hook for handling navigation caching
export const useNavigationCache = () => {
  const { 
    savePageState, 
    restorePageState, 
    saveScrollPosition, 
    restoreScrollPosition,
    getNavigationHistory,
    clearNavigationHistory
  } = useVehicleContext();
  
  return {
    savePageState,
    restorePageState,
    saveScrollPosition,
    restoreScrollPosition,
    getNavigationHistory,
    clearNavigationHistory
  };
};
