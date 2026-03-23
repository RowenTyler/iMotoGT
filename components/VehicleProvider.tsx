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
    if (typeof window === 'undefined') return
    const timeoutId = setTimeout(() => {
      let updatedCache = { ...cache }

      // --- ADD THIS BLOCK ---
      // Strip base64 images before persisting to localStorage
      const prunedById: Record<string, Vehicle> = {}
      Object.entries(updatedCache.byId).forEach(([id, vehicle]) => {
        prunedById[id] = { 
          ...vehicle, 
          images: [],          // never persist base64 to localStorage
          sellerProfilePic: "" 
        }
      })
      updatedCache = { ...updatedCache, byId: prunedById }
      // --- END BLOCK ---

      const vehicleIds = Object.keys(updatedCache.byId)
      if (vehicleIds.length > MAX_VEHICLES_IN_CACHE) {
        // ... existing eviction logic
      }
      CacheManager.set('vehicleCache', updatedCache)
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [cache])

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
    getCachedVehicle: (id: string) => cacheRef.current.byId[id] || null,
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
  const [data, setData] = useState<VehicleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { getVehicleList, getCachedList, isFresh } = useVehicleContext();

  useEffect(() => {
    if (options?.enabled === false) return;
    const load = async () => {
      setLoading(true);
      const cached = getCachedList(cacheKey);
      if (cached && isFresh(cacheKey, options?.maxAge) && !options?.forceRefresh) {
        setData(cached);
        setLoading(false);
        return;
      }
      const resp = await getVehicleList(cacheKey, fetchFn);
      setData(resp);
      setLoading(false);
    };
    load();
  }, [cacheKey, options?.enabled, options?.forceRefresh, getVehicleList, getCachedList, isFresh, options?.maxAge]);

  return { data, loading };
};
