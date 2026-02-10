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
  getVehicle: (id: string) => Promise<Vehicle | null>;
  getVehicleList: (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>) => Promise<VehicleListResponse>;
  getCachedVehicle: (id: string) => Vehicle | null;
  getCachedList: (cacheKey: string) => VehicleListResponse | null;
  isFresh: (key: string, maxAge?: number) => boolean;
  updateVehicleInCache: (vehicle: Vehicle) => void;
  clearCache: (key?: string) => void;
  preloadCache: (key: string, data: VehicleListResponse) => void;
  
  // === NAVIGATION CACHE ===
  savePageState: (data?: any) => void;
  restorePageState: () => any;
  getNavigationHistory: () => VehicleCache['navigationHistory'];
  clearNavigationHistory: () => void;
  saveScrollPosition: (position: number) => void;
  restoreScrollPosition: () => number | null;
  
  // === ROUTE-BASED CACHING ===
  getCurrentRouteKey: () => string;
  saveForCurrentRoute: (data: any, type?: 'list' | 'detail') => void;
  getForCurrentRoute: () => any;
  isCurrentRouteCached: () => boolean;
  
  // === LEGACY SUPPORT ===
  vehicles: Vehicle[];
  loadVehicles: () => Promise<void>;
  loading: boolean;
  getVehicleById: (id: string) => Promise<Vehicle | null>;
}

const VehicleContext = createContext<VehicleContextType | null>(null);

const DEFAULT_STALE_TIME = 30 * 60 * 1000; 
const VEHICLE_STALE_TIME = 60 * 60 * 1000; 
const MAX_CACHE_SIZE = 100; 
const MAX_NAVIGATION_HISTORY = 20; 

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
      const savedCache = CacheManager.get<VehicleCache>('vehicleCache');
      if (savedCache) {
        return {
          byId: savedCache.byId || {},
          lists: savedCache.lists || {},
          timestamps: savedCache.timestamps || {},
          lastAccessed: savedCache.lastAccessed || {},
          navigationHistory: savedCache.navigationHistory || []
        };
      }
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] };
    } catch (error) {
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] };
    }
  });

  useEffect(() => {
    const paramsString = searchParams.toString();
    currentRouteKeyRef.current = paramsString ? `${pathname}?${paramsString}` : pathname;
    isInitialMount.current = false;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saveCache = () => CacheManager.set('vehicleCache', cache);
    const timeoutId = setTimeout(saveCache, 1000);
    return () => clearTimeout(timeoutId);
  }, [cache]);

  const getVehicle = useCallback(async (id: string): Promise<Vehicle | null> => {
    const cacheKey = `vehicle:${id}`;
    const cachedVehicle = cache.byId[id];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedVehicle && cachedTimestamp && Date.now() - cachedTimestamp < VEHICLE_STALE_TIME) {
      return cachedVehicle;
    }
    
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch vehicle: ${response.status}`);
      const vehicle: Vehicle = await response.json();
      
      setCache(prev => {
        const newCache = { ...prev };
        newCache.byId[id] = vehicle;
        newCache.timestamps[cacheKey] = Date.now();
        newCache.lastAccessed[cacheKey] = Date.now();
        return newCache;
      });
      return vehicle;
    } catch (error) {
      return cachedVehicle || null;
    }
  }, [cache]);

  const getVehicleList = useCallback(async (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>): Promise<VehicleListResponse> => {
    const cachedList = cache.lists[cacheKey];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedList && cachedTimestamp && Date.now() - cachedTimestamp < DEFAULT_STALE_TIME) {
      return cachedList;
    }
    
    try {
      const response = await fetchFn();
      setCache(prev => {
        const newCache = { ...prev };
        newCache.lists[cacheKey] = response;
        newCache.timestamps[cacheKey] = Date.now();
        if (response.vehicles) {
          response.vehicles.forEach(v => {
            newCache.byId[v.id] = v;
            newCache.timestamps[`vehicle:${v.id}`] = Date.now();
          });
        }
        return newCache;
      });
      return response;
    } catch (error) {
      if (cachedList) return cachedList;
      throw error;
    }
  }, [cache]);

  const getCachedVehicle = useCallback((id: string) => cache.byId[id] || null, [cache]);
  const getCachedList = useCallback((key: string) => cache.lists[key] || null, [cache]);
  const isFresh = useCallback((key: string, maxAge: number = DEFAULT_STALE_TIME) => {
    const ts = cache.timestamps[key];
    return ts ? (Date.now() - ts) < maxAge : false;
  }, [cache.timestamps]);

  const updateVehicleInCache = useCallback((vehicle: Vehicle) => {
    setCache(prev => ({
      ...prev,
      byId: { ...prev.byId, [vehicle.id]: vehicle },
      timestamps: { ...prev.timestamps, [`vehicle:${vehicle.id}`]: Date.now() }
    }));
  }, []);

  const preloadCache = useCallback((key: string, data: VehicleListResponse) => {
    setCache(prev => ({
      ...prev,
      lists: { ...prev.lists, [key]: data },
      timestamps: { ...prev.timestamps, [key]: Date.now() }
    }));
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache.lists[key];
        delete newCache.timestamps[key];
        return newCache;
      });
    } else {
      setCache({ byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] });
    }
  }, []);

  const savePageState = useCallback((data?: any) => {
    const routeKey = currentRouteKeyRef.current;
    if (!routeKey) return;
    setCache(prev => {
      const newHistory = (prev.navigationHistory || []).filter(e => e.path !== routeKey);
      newHistory.unshift({ path: routeKey, searchParams: searchParams.toString(), data: data || getForCurrentRoute(), timestamp: Date.now() });
      return { ...prev, navigationHistory: newHistory.slice(0, MAX_NAVIGATION_HISTORY) };
    });
  }, [searchParams]);

  const restorePageState = useCallback(() => {
    const routeKey = currentRouteKeyRef.current;
    const entry = cache.navigationHistory.find(e => e.path === routeKey);
    return entry ? entry.data : getForCurrentRoute();
  }, [cache.navigationHistory]);

  const getNavigationHistory = useCallback(() => cache.navigationHistory || [], [cache.navigationHistory]);
  const clearNavigationHistory = useCallback(() => setCache(prev => ({ ...prev, navigationHistory: [] })), []);
  
  const saveScrollPosition = useCallback((pos: number) => {
    const routeKey = currentRouteKeyRef.current;
    setCache(prev => {
      const newHistory = [...(prev.navigationHistory || [])];
      const idx = newHistory.findIndex(e => e.path === routeKey);
      if (idx !== -1) newHistory[idx].scrollPosition = pos;
      return { ...prev, navigationHistory: newHistory };
    });
  }, []);

  const restoreScrollPosition = useCallback(() => {
    const entry = cache.navigationHistory.find(e => e.path === currentRouteKeyRef.current);
    return entry?.scrollPosition || null;
  }, [cache.navigationHistory]);

  const getCurrentRouteKey = useCallback(() => currentRouteKeyRef.current, []);
  
  const saveForCurrentRoute = useCallback((data: any, type: 'list' | 'detail' = 'list') => {
    const routeKey = currentRouteKeyRef.current;
    setCache(prev => {
      const newCache = { ...prev };
      if (type === 'list') newCache.lists[routeKey] = data;
      else if (type === 'detail' && data.id) newCache.byId[data.id] = data;
      newCache.timestamps[routeKey] = Date.now();
      return newCache;
    });
  }, []);

  const getForCurrentRoute = useCallback(() => {
    const routeKey = currentRouteKeyRef.current;
    if (cache.lists[routeKey]) return cache.lists[routeKey];
    const match = routeKey.match(/\/vehicle\/([^\/?]+)/);
    return match ? cache.byId[match[1]] : null;
  }, [cache.lists, cache.byId]);

  const isCurrentRouteCached = useCallback(() => !!getForCurrentRoute(), [getForCurrentRoute]);

  const [legacyVehicles, setLegacyVehicles] = useState<Vehicle[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);

  const loadVehicles = useCallback(async () => {
    setLegacyLoading(true);
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      setLegacyVehicles(Array.isArray(data) ? data : data.vehicles || []);
    } finally {
      setLegacyLoading(false);
    }
  }, []);

  const getVehicleById = useCallback((id: string) => getVehicle(id), [getVehicle]);

  const contextValue = useMemo(() => ({
    getVehicle, getVehicleList, getCachedVehicle, getCachedList, isFresh, updateVehicleInCache, preloadCache, clearCache,
    savePageState, restorePageState, getNavigationHistory, clearNavigationHistory, saveScrollPosition, restoreScrollPosition,
    getCurrentRouteKey, saveForCurrentRoute, getForCurrentRoute, isCurrentRouteCached,
    vehicles: legacyVehicles, loadVehicles, loading: legacyLoading, getVehicleById
  }), [
    getVehicle, getVehicleList, getCachedVehicle, getCachedList, isFresh, updateVehicleInCache, preloadCache, clearCache,
    savePageState, restorePageState, getNavigationHistory, clearNavigationHistory, saveScrollPosition, restoreScrollPosition,
    getCurrentRouteKey, saveForCurrentRoute, getForCurrentRoute, isCurrentRouteCached, legacyVehicles, loadVehicles, legacyLoading, getVehicleById
  ]);

  return <VehicleContext.Provider value={contextValue}>{children}</VehicleContext.Provider>;
};

export const useVehicleContext = () => {
  const context = useContext(VehicleContext);
  if (!context) throw new Error('useVehicleContext must be used within a VehicleProvider');
  return context;
};

export const useVehicleList = (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>, options?: { enabled?: boolean; forceRefresh?: boolean; maxAge?: number; }) => {
  const [data, setData] = useState<VehicleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getVehicleList, getCachedList, isFresh, saveForCurrentRoute } = useVehicleContext();

  useEffect(() => {
    if (options?.enabled === false) { setLoading(false); return; }
    const loadList = async () => {
      try {
        setLoading(true);
        const cached = getCachedList(cacheKey);
        if (cached && (isFresh(cacheKey, options?.maxAge) && !options?.forceRefresh)) {
          setData(cached);
          saveForCurrentRoute(cached, 'list');
          setLoading(false);
          return;
        }
        const response = await getVehicleList(cacheKey, fetchFn);
        setData(response);
        saveForCurrentRoute(response, 'list');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally { setLoading(false); }
    };
    loadList();
  }, [cacheKey, fetchFn, options?.enabled, options?.forceRefresh, options?.maxAge, getVehicleList, getCachedList, isFresh, saveForCurrentRoute]);

  return { data, loading, error };
};

export const useVehicle = (id?: string) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getVehicle, getCachedVehicle, saveForCurrentRoute } = useVehicleContext();

  useEffect(() => {
    if (!id) { setVehicle(null); setLoading(false); return; }
    const loadVehicle = async () => {
      try {
        setLoading(true);
        const cached = getCachedVehicle(id);
        if (cached) { setVehicle(cached); saveForCurrentRoute(cached, 'detail'); setLoading(false); }
        const fetched = await getVehicle(id);
        if (fetched) { setVehicle(fetched); saveForCurrentRoute(fetched, 'detail'); }
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
      finally { setLoading(false); }
    };
    loadVehicle();
  }, [id, getVehicle, getCachedVehicle, saveForCurrentRoute]);

  return { vehicle, loading, error };
};

export const useNavigationCache = () => {
  const { savePageState, restorePageState, saveScrollPosition, restoreScrollPosition, getNavigationHistory, clearNavigationHistory } = useVehicleContext();
  return { savePageState, restorePageState, saveScrollPosition, restoreScrollPosition, getNavigationHistory, clearNavigationHistory };
};
