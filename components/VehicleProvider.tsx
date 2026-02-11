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

interface VehicleListResponse {
  vehicles: Vehicle[];
  totalCount?: number;
  page?: number;
  limit?: number;
  timestamp?: number;
}

interface VehicleCache {
  byId: Record<string, Vehicle>;
  lists: Record<string, VehicleListResponse>;
  timestamps: Record<string, number>;
  navigationHistory: { path: string; data?: any; scrollPosition?: number; timestamp: number; }[];
}

interface VehicleContextType {
  getVehicle: (id: string) => Promise<Vehicle | null>;
  getVehicleList: (cacheKey: string, fetchFn: () => Promise<VehicleListResponse>) => Promise<VehicleListResponse>;
  getCachedVehicle: (id: string) => Vehicle | null;
  getCachedList: (cacheKey: string) => VehicleListResponse | null;
  isFresh: (key: string, maxAge?: number) => boolean;
  updateVehicleInCache: (vehicle: Vehicle) => void;
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
