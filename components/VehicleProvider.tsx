// components/VehicleProvider.tsx
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

// Configuration for stability and storage safety
const DEBUG = process.env.NODE_ENV === 'development';
const DEFAULT_STALE_TIME = 30 * 60 * 1000; 
const VEHICLE_STALE_TIME = 60 * 60 * 1000; 
const MAX_VEHICLES_IN_CACHE = 20; // Prevents >5MB LocalStorage crash
const MAX_LISTS_IN_CACHE = 10;

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
  
  // 1. Core State Initialization
  const [cache, setCache] = useState<VehicleCache>(() => {
    if (typeof window === 'undefined') {
      return { byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] };
    }
    return CacheManager.get<VehicleCache>('vehicleCache') || { 
      byId: {}, lists: {}, timestamps: {}, lastAccessed: {}, navigationHistory: [] 
    };
  });

  // 2. The Stability Reference
  // This allows functions to access the latest cache without triggering re-renders
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // 3. Sync Route Key
  useEffect(() => {
    const paramsString = searchParams.toString();
    currentRouteKeyRef.current = paramsString ? `${pathname}?${paramsString}` : pathname;
  }, [pathname, searchParams]);

  // 4. Persistence & Pruning Logic (Prevents 12MB Error)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const timeoutId = setTimeout(() => {
      let updatedCache = { ...cache };
      const vehicleIds = Object.keys(updatedCache.byId);
      const listKeys = Object.keys(updatedCache.lists);

      // LRU Eviction: Keep cache size small
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

  // --- STABLE CONTEXT FUNCTIONS ---

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
    if (isFresh(cacheKey, VEHICLE_STALE_TIME) && cacheRef.current.byId[id]) {
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

  // 5. Build the context value (Referentially stable)
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

// --- HOOKS ---

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

export const useVehicle = (id?: string) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const { getVehicle, getCachedVehicle } = useVehicleContext();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const cached = getCachedVehicle(id);
      if (cached) setVehicle(cached);
      const fresh = await getVehicle(id);
      if (fresh) setVehicle(fresh);
      setLoading(false);
    };
    load();
  }, [id, getVehicle, getCachedVehicle]);

  return { vehicle, loading };
};  updateVehicleInCache: (vehicle: Vehicle) => void;
  clearCache: (key?: string) => void;
  savePageState: (data?: any) => void;
  restorePageState: () => any;
  saveScrollPosition: (position: number) => void;
  restoreScrollPosition: () => number | null;
  getCurrentRouteKey: () => string;
  isCurrentRouteCached: () => boolean;
  getNavigationHistory: () => VehicleCache['navigationHistory'];
  clearNavigationHistory: () => void;
}

const VehicleContext = createContext<VehicleContextType | null>(null);

// LIMITS TO PREVENT 12MB OVERFLOW
const MAX_VEHICLES = 30;
const MAX_LISTS = 10;

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRouteKeyRef = useRef<string>('');
  
  const [cache, setCache] = useState<VehicleCache>(() => {
    if (typeof window === 'undefined') return { byId: {}, lists: {}, timestamps: {}, navigationHistory: [] };
    const saved = CacheManager.get<VehicleCache>('vehicleCache');
    return saved || { byId: {}, lists: {}, timestamps: {}, navigationHistory: [] };
  });

  const cacheRef = useRef(cache);
  useEffect(() => { cacheRef.current = cache; }, [cache]);

  useEffect(() => {
    const params = searchParams.toString();
    currentRouteKeyRef.current = params ? `${pathname}?${params}` : pathname;
  }, [pathname, searchParams]);

  // Persistent sync with Pruning logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeoutId = setTimeout(() => {
      // PRUNING: Only keep the most recent entries to avoid exceeding 5MB
      const vehicleIds = Object.keys(cache.byId);
      const listKeys = Object.keys(cache.lists);
      
      if (vehicleIds.length > MAX_VEHICLES || listKeys.length > MAX_LISTS) {
        const prunedCache = {
          ...cache,
          byId: Object.fromEntries(Object.entries(cache.byId).slice(-MAX_VEHICLES)),
          lists: Object.fromEntries(Object.entries(cache.lists).slice(-MAX_LISTS)),
        };
        CacheManager.set('vehicleCache', prunedCache);
      } else {
        CacheManager.set('vehicleCache', cache);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [cache]);

  const isFresh = useCallback((key: string, maxAge = 1800000) => {
    const ts = cacheRef.current.timestamps[key];
    return ts ? (Date.now() - ts < maxAge) : false;
  }, []);

  const getVehicleList = useCallback(async (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>) => {
    if (isFresh(cacheKey) && cacheRef.current.lists[cacheKey]) return cacheRef.current.lists[cacheKey];
    const response = await fetchFn();
    setCache(prev => ({
      ...prev,
      lists: { ...prev.lists, [cacheKey]: response },
      timestamps: { ...prev.timestamps, [cacheKey]: Date.now() }
    }));
    return response;
  }, [isFresh]);

  const getVehicle = useCallback(async (id: string): Promise<Vehicle | null> => {
    if (isFresh(`vehicle:${id}`) && cacheRef.current.byId[id]) return cacheRef.current.byId[id];
    const response = await fetch(`/api/vehicles/${id}`);
    const vehicle = await response.json();
    setCache(prev => ({
      ...prev,
      byId: { ...prev.byId, [id]: vehicle },
      timestamps: { ...prev.timestamps, [`vehicle:${id}`]: Date.now() }
    }));
    return vehicle;
  }, [isFresh]);

  const saveScrollPosition = useCallback((pos: number) => {
    const key = currentRouteKeyRef.current;
    setCache(prev => {
      const history = [...prev.navigationHistory];
      const idx = history.findIndex(e => e.path === key);
      if (idx !== -1) history[idx].scrollPosition = pos;
      else history.push({ path: key, scrollPosition: pos, timestamp: Date.now() });
      return { ...prev, navigationHistory: history.slice(-20) };
    });
  }, []);

  const contextValue = useMemo(() => ({
    getVehicle, getVehicleList,
    getCachedVehicle: (id: string) => cacheRef.current.byId[id] || null,
    getCachedList: (key: string) => cacheRef.current.lists[key] || null,
    isFresh,
    updateVehicleInCache: (v: Vehicle) => setCache(p => ({ ...p, byId: { ...p.byId, [v.id]: v } })),
    clearCache: (key?: string) => key ? setCache(p => { const n = {...p}; delete n.lists[key]; return n; }) : setCache({byId:{}, lists:{}, timestamps:{}, navigationHistory:[]}),
    savePageState: (data: any) => setCache(p => ({ ...p, lists: { ...p.lists, [currentRouteKeyRef.current]: data } })),
    restorePageState: () => cacheRef.current.lists[currentRouteKeyRef.current] || null,
    saveScrollPosition,
    restoreScrollPosition: () => cacheRef.current.navigationHistory.find(e => e.path === currentRouteKeyRef.current)?.scrollPosition || null,
    getCurrentRouteKey: () => currentRouteKeyRef.current,
    isCurrentRouteCached: () => !!cacheRef.current.lists[currentRouteKeyRef.current],
    getNavigationHistory: () => cacheRef.current.navigationHistory,
    clearNavigationHistory: () => setCache(p => ({ ...p, navigationHistory: [] }))
  }), [getVehicle, getVehicleList, isFresh, saveScrollPosition]);

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

