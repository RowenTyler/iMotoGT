"use client"

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo, 
  useRef 
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CacheManager } from '@/lib/cache-manager';
import type { Vehicle } from '@/types/vehicle';

const MAX_VEHICLES_IN_CACHE = 20;
const MAX_LISTS_IN_CACHE = 10;
const DEFAULT_STALE_TIME = 30 * 60 * 1000;

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
  byId: Record<string, Vehicle>;
  lists: Record<string, VehicleListResponse>;
  timestamps: Record<string, number>;
  lastAccessed: Record<string, number>;
  navigationHistory: {
    path: string;
    searchParams?: string;
    data?: any;
    scrollPosition?: number;
    timestamp: number;
  }[];
}

interface VehicleContextType {
  getVehicle: (id: string) => Promise<Vehicle | null>;
  getVehicleList: (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>) => Promise<VehicleListResponse>;
  getCachedVehicle: (id: string) => Vehicle | null;
  getCachedList: (cacheKey: string) => VehicleListResponse | null;
  isFresh: (key: string, maxAge?: number) => boolean;
  updateVehicleInCache: (vehicle: Vehicle) => void;
  clearCache: (key?: string) => void;
  preloadCache: (key: string, data: VehicleListResponse) => void;
  savePageState: (data?: any) => void;
  restorePageState: () => any;
  getNavigationHistory: () => VehicleCache['navigationHistory'];
  clearNavigationHistory: () => void;
  saveScrollPosition: (position: number) => void;
  restoreScrollPosition: () => number | null;
  getCurrentRouteKey: () => string;
  isCurrentRouteCached: () => boolean;
}

const VehicleContext = createContext<VehicleContextType | null>(null);

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRouteKeyRef = useRef<string>('');
  
  const [cache, setCache] = useState<VehicleCache>(() => {
    if (typeof window === 'undefined') {
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] };
    }
    return CacheManager.get<VehicleCache>('vehicleCache') || { 
      byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] 
    };
  });

  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    const paramsString = searchParams.toString();
    currentRouteKeyRef.current = paramsString ? `${pathname}?${paramsString}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeoutId = setTimeout(() => {
      let updatedCache = { ...cache };
      const vehicleIds = Object.keys(updatedCache.byId);
      if (vehicleIds.length > MAX_VEHICLES_IN_CACHE) {
        const sortedIds = vehicleIds.sort((a, b) => 
          (updatedCache.lastAccessed[a] || 0) - (updatedCache.lastAccessed[b] || 0)
        );
        sortedIds.slice(0, sortedIds.length - MAX_VEHICLES_IN_CACHE).forEach(id => {
          delete updatedCache.byId[id];
          delete updatedCache.timestamps[`vehicle:${id}`];
        });
      }
      CacheManager.set('vehicleCache', updatedCache);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [cache]);

  const isFresh = useCallback((key: string, maxAge = DEFAULT_STALE_TIME) => {
    const ts = cacheRef.current.timestamps[key];
    return ts ? (Date.now() - ts < maxAge) : false;
  }, []);

  const getVehicleList = useCallback(async (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>) => {
    if (isFresh(cacheKey) && cacheRef.current.lists[cacheKey]) {
      return cacheRef.current.lists[cacheKey];
    }
    const response = await fetchFn();
    setCache(prev => ({
      ...prev,
      lists: { ...prev.lists, [cacheKey]: response },
      timestamps: { ...prev.timestamps, [cacheKey]: Date.now() },
      lastAccessed: { ...prev.lastAccessed, [cacheKey]: Date.now() }
    }));
    return response;
  }, [isFresh]);

  const getVehicle = useCallback(async (id: string): Promise<Vehicle | null> => {
    const cacheKey = `vehicle:${id}`;
    if (isFresh(cacheKey) && cacheRef.current.byId[id]) {
      return cacheRef.current.byId[id];
    }
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      if (!response.ok) throw new Error('Fetch failed');
      const vehicle = await response.json();
      setCache(prev => ({
        ...prev,
        byId: { ...prev.byId, [id]: vehicle },
        timestamps: { ...prev.timestamps, [cacheKey]: Date.now() },
        lastAccessed: { ...prev.lastAccessed, [id]: Date.now() }
      }));
      return vehicle;
    } catch (error) {
      return cacheRef.current.byId[id] || null;
    }
  }, [isFresh]);

  const saveScrollPosition = useCallback((pos: number) => {
    const key = currentRouteKeyRef.current;
    setCache(prev => {
      const history = [...prev.navigationHistory];
      const idx = history.findIndex(e => e.path === key);
      if (idx !== -1) {
        if (history[idx].scrollPosition === pos) return prev;
        history[idx] = { ...history[idx], scrollPosition: pos, timestamp: Date.now() };
      } else {
        history.push({ path: key, scrollPosition: pos, timestamp: Date.now() });
      }
      return { ...prev, navigationHistory: history.slice(-15) };
    });
  }, []);

  const savePageState = useCallback((data?: any) => {
    const key = currentRouteKeyRef.current;
    setCache(prev => ({
      ...prev,
      lists: { ...prev.lists, [key]: data },
      timestamps: { ...prev.timestamps, [key]: Date.now() }
    }));
  }, []);

  const contextValue = useMemo(() => ({
    getVehicle,
    getVehicleList,
    getCachedVehicle: (id: string) => {
      if (cacheRef.current.byId[id]) return cacheRef.current.byId[id];
      // Fallback: search within all cached lists synchronously
      for (const list of Object.values(cacheRef.current.lists)) {
        if (list && Array.isArray(list.vehicles)) {
          const found = list.vehicles.find(v => v.id === id);
          if (found) return found;
        }
      }
      return null;
    },
    getCachedList: (key: string) => cacheRef.current.lists[key] || null,
    isFresh,
    updateVehicleInCache: (v: Vehicle) => setCache(p => ({ ...p, byId: { ...p.byId, [v.id]: v } })),
    preloadCache: (key: string, data: VehicleListResponse) => setCache(p => ({ ...p, lists: { ...p.lists, [key]: data }, timestamps: { ...p.timestamps, [key]: Date.now() } })),
    clearCache: (key?: string) => key ? setCache(p => { const n = {...p}; delete n.lists[key]; return n; }) : setCache({byId:{}, lists:{}, timestamps:{}, lastAccessed:{}, navigationHistory:[]}),
    savePageState,
    restorePageState: () => cacheRef.current.lists[currentRouteKeyRef.current] || null,
    getNavigationHistory: () => cacheRef.current.navigationHistory,
    clearNavigationHistory: () => setCache(p => ({ ...p, navigationHistory: [] })),
    saveScrollPosition,
    restoreScrollPosition: () => cacheRef.current.navigationHistory.find(e => e.path === currentRouteKeyRef.current)?.scrollPosition || null,
    getCurrentRouteKey: () => currentRouteKeyRef.current,
    isCurrentRouteCached: () => !!cacheRef.current.lists[currentRouteKeyRef.current]
  }), [getVehicle, getVehicleList, isFresh, saveScrollPosition, savePageState]);

  return <VehicleContext.Provider value={contextValue}>{children}</VehicleContext.Provider>;
};

export const useVehicleContext = () => {
  const context = useContext(VehicleContext);
  if (!context) throw new Error('useVehicleContext must be used within a VehicleProvider');
  return context;
};

export const useVehicleList = (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>, options?: { enabled?: boolean; forceRefresh?: boolean; maxAge?: number; }) => {
  const { getVehicleList, getCachedList, isFresh } = useVehicleContext();

  // 1. Synchronous Cache Initialization for Zero-Latency SPA Navigation
  const [data, setData] = useState<VehicleListResponse | null>(() => {
    if (options?.enabled === false || options?.forceRefresh) return null;
    const cached = getCachedList(cacheKey);
    // Stale-While-Revalidate: Return immediately even if stale so UI snaps into place
    return cached || null;
  });

  // 2. We only 'load' if we actually have no background data to show the user
  const [loading, setLoading] = useState<boolean>(!data);

  useEffect(() => {
    if (options?.enabled === false) {
      if (loading) setLoading(false);
      return;
    }

    const load = async () => {
      const cached = getCachedList(cacheKey);
      const fresh = isFresh(cacheKey, options?.maxAge);

      // Scenario A: Data is fresh and ready. Exit silently.
      if (cached && fresh && !options?.forceRefresh) {
        setData(cached); // Ensure state is synced
        setLoading(false);
        return;
      }

      // Scenario B: Data is stale, empty, or forcefully bypassed.
      // If we don't have ANY data yet, trigger the UI spinner. 
      // If we *do* have stale data, KEEP loading=false to prevent UI layout flash!
      if (!cached) setLoading(true);

      try {
        const resp = await getVehicleList(cacheKey, fetchFn);
        setData(resp); // Silently swap in new data
      } catch (error) {
        console.error("❌ [useVehicleList] Background fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };
    
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, options?.enabled, options?.forceRefresh, options?.maxAge, getVehicleList, getCachedList, isFresh]);

  return { data, loading };
};
