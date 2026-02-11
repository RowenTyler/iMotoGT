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
  saveForCurrentRoute: (data: any, type?: 'list' | 'detail') => void;
  getForCurrentRoute: () => any;
  isCurrentRouteCached: () => boolean;
  vehicles: Vehicle[];
  loadVehicles: () => Promise<void>;
  loading: boolean;
  getVehicleById: (id: string) => Promise<Vehicle | null>;
}

// Ensure the context is initialized with null and the correct type
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
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] };
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
    const timeoutId = setTimeout(() => CacheManager.set('vehicleCache', cache), 1000);
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
      if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
      const vehicle: Vehicle = await response.json();
      
      setCache(prev => ({
        ...prev,
        byId: { ...prev.byId, [id]: vehicle },
        timestamps: { ...prev.timestamps, [cacheKey]: Date.now() },
        lastAccessed: { ...prev.lastAccessed, [cacheKey]: Date.now() }
      }));
      return vehicle;
    } catch (error) {
      return cachedVehicle || null;
    }
  }, [cache]);

  const getVehicleList = useCallback(async (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>) => {
    const cachedList = cache.lists[cacheKey];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedList && cachedTimestamp && Date.now() - cachedTimestamp < DEFAULT_STALE_TIME) {
      return cachedList;
    }
    
    const response = await fetchFn();
    setCache(prev => ({
      ...prev,
      lists: { ...prev.lists, [cacheKey]: response },
      timestamps: { ...prev.timestamps, [cacheKey]: Date.now() },
      lastAccessed: { ...prev.lastAccessed, [cacheKey]: Date.now() }
    }));
    return response;
  }, [cache]);

  const getCachedVehicle = useCallback((id: string) => cache.byId[id] || null, [cache.byId]);
  const getCachedList = useCallback((key: string) => cache.lists[key] || null, [cache.lists]);
  const isFresh = useCallback((key: string, maxAge = DEFAULT_STALE_TIME) => {
    const ts = cache.timestamps[key];
    return ts ? (Date.now() - ts < maxAge) : false;
  }, [cache.timestamps]);

  const updateVehicleInCache = useCallback((v: Vehicle) => {
    setCache(prev => ({
      ...prev,
      byId: { ...prev.byId, [v.id]: v },
      timestamps: { ...prev.timestamps, [`vehicle:${v.id}`]: Date.now() }
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
        const next = { ...prev };
        delete next.lists[key];
        delete next.timestamps[key];
        return next;
      });
    } else {
      setCache({ byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] });
    }
  }, []);

  const savePageState = useCallback((data?: any) => {
    const key = currentRouteKeyRef.current;
    if (!key) return;
    setCache(prev => ({
      ...prev,
      navigationHistory: [{ path: key, data: data || prev.lists[key], timestamp: Date.now() }, ...prev.navigationHistory].slice(0, MAX_NAVIGATION_HISTORY)
    }));
  }, []);

  const restorePageState = useCallback(() => {
    const key = currentRouteKeyRef.current;
    return cache.navigationHistory.find(e => e.path === key)?.data || cache.lists[key] || null;
  }, [cache]);

  const saveScrollPosition = useCallback((pos: number) => {
    const key = currentRouteKeyRef.current;
    setCache(prev => {
      const history = [...prev.navigationHistory];
      const idx = history.findIndex(e => e.path === key);
      if (idx !== -1) history[idx].scrollPosition = pos;
      return { ...prev, navigationHistory: history };
    });
  }, []);

  const restoreScrollPosition = useCallback(() => {
    return cache.navigationHistory.find(e => e.path === currentRouteKeyRef.current)?.scrollPosition || null;
  }, [cache.navigationHistory]);

  const saveForCurrentRoute = useCallback((data: any, type: 'list' | 'detail' = 'list') => {
    const key = currentRouteKeyRef.current;
    setCache(prev => {
      const next = { ...prev };
      if (type === 'list') next.lists[key] = data;
      else if (data.id) next.byId[data.id] = data;
      next.timestamps[key] = Date.now();
      return next;
    });
  }, []);

  const getForCurrentRoute = useCallback(() => {
    const key = currentRouteKeyRef.current;
    if (cache.lists[key]) return cache.lists[key];
    const match = key.match(/\/vehicle\/([^\/?]+)/);
    return match ? cache.byId[match[1]] : null;
  }, [cache]);

  const isCurrentRouteCached = useCallback(() => !!getForCurrentRoute(), [getForCurrentRoute]);

  const contextValue = useMemo(() => ({
    getVehicle, getVehicleList, getCachedVehicle, getCachedList, isFresh, updateVehicleInCache, preloadCache, clearCache,
    savePageState, restorePageState, getNavigationHistory: () => cache.navigationHistory, clearNavigationHistory: () => setCache(p => ({ ...p, navigationHistory: [] })),
    saveScrollPosition, restoreScrollPosition, getCurrentRouteKey: () => currentRouteKeyRef.current, saveForCurrentRoute, getForCurrentRoute, isCurrentRouteCached,
    vehicles: [], loadVehicles: async () => {}, loading: false, getVehicleById: getVehicle
  }), [getVehicle, getVehicleList, getCachedVehicle, getCachedList, isFresh, updateVehicleInCache, preloadCache, clearCache, savePageState, restorePageState, cache.navigationHistory, saveScrollPosition, restoreScrollPosition, saveForCurrentRoute, getForCurrentRoute, isCurrentRouteCached]);

  return (
    <VehicleContext.Provider value={contextValue}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => {
  const context = useContext(VehicleContext);
  if (!context) throw new Error('useVehicleContext must be used within a VehicleProvider');
  return context;
};

export const useVehicleList = (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>, options?: { enabled?: boolean; forceRefresh?: boolean; maxAge?: number; }) => {
  const [data, setData] = useState<VehicleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { getVehicleList, getCachedList, isFresh, saveForCurrentRoute } = useVehicleContext();

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
  }, [cacheKey, options?.enabled, options?.forceRefresh]);

  return { data, loading };
};

export const useVehicle = (id?: string) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const { getVehicle, getCachedVehicle } = useVehicleContext();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const cached = getCachedVehicle(id);
      if (cached) {
        setVehicle(cached);
        setLoading(false);
      }
      const fresh = await getVehicle(id);
      setVehicle(fresh);
      setLoading(false);
    };
    load();
  }, [id, getVehicle, getCachedVehicle]);

  return { vehicle, loading };
};
