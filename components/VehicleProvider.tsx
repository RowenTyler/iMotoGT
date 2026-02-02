// VehicleProvider.tsx
"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { CacheManager } from '@/lib/cache/CacheManager';

// Extend the Vehicle interface as needed
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year?: number;
  price?: number;
  mileage?: number;
  images?: string[];
  // Add other vehicle properties as needed
}

interface VehicleListResponse {
  vehicles: Vehicle[];
  totalCount?: number;
  page?: number;
  limit?: number;
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
}

const VehicleContext = createContext<VehicleContextType | null>(null);

// Default stale times (in milliseconds)
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes for lists
const VEHICLE_STALE_TIME = 10 * 60 * 1000; // 10 minutes for individual vehicles

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const [cache, setCache] = useState<VehicleCache>(() => {
    // Initialize cache from localStorage on client side
    if (typeof window === 'undefined') {
      return { byId: {}, lists: {}, timestamps: {} };
    }
    
    try {
      const cacheManager = CacheManager.getInstance();
      const savedCache = cacheManager.get('vehicleCache');
      return savedCache || { byId: {}, lists: {}, timestamps: {} };
    } catch (error) {
      console.error('Failed to load cache from localStorage:', error);
      return { byId: {}, lists: {}, timestamps: {} };
    }
  });
  
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // Save cache to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheManager = CacheManager.getInstance();
      // Debounce the save to prevent excessive writes
      const timeoutId = setTimeout(() => {
        cacheManager.set('vehicleCache', cache);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Failed to save cache to localStorage:', error);
    }
  }, [cache]);

  // Get vehicle by ID with caching
  const getVehicle = useCallback(async (id: string): Promise<Vehicle | null> => {
    const cacheKey = `vehicle:${id}`;
    
    // Check if already loading
    if (loadingStates[cacheKey]) {
      // Wait briefly and check cache
      await new Promise(resolve => setTimeout(resolve, 50));
      const cached = cache.byId[id];
      if (cached) return cached;
    }
    
    // Check cache first
    const cachedVehicle = cache.byId[id];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedVehicle && cachedTimestamp && 
        Date.now() - cachedTimestamp < VEHICLE_STALE_TIME) {
      return cachedVehicle;
    }
    
    // Set loading state
    setLoadingStates(prev => ({ ...prev, [cacheKey]: true }));
    
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      if (!response.ok) throw new Error('Failed to fetch vehicle');
      
      const vehicle: Vehicle = await response.json();
      
      // Update cache
      setCache(prev => ({
        ...prev,
        byId: { ...prev.byId, [id]: vehicle },
        timestamps: { ...prev.timestamps, [cacheKey]: Date.now() }
      }));
      
      return vehicle;
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      
      // Return stale cache if available
      if (cachedVehicle) {
        console.log('Returning stale cached vehicle');
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
    // Check if already loading
    if (loadingStates[cacheKey]) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const cached = cache.lists[cacheKey];
      if (cached) return cached;
    }
    
    // Check cache first
    const cachedList = cache.lists[cacheKey];
    const cachedTimestamp = cache.timestamps[cacheKey];
    
    if (cachedList && cachedTimestamp && 
        Date.now() - cachedTimestamp < DEFAULT_STALE_TIME) {
      return cachedList;
    }
    
    // Set loading state
    setLoadingStates(prev => ({ ...prev, [cacheKey]: true }));
    
    try {
      const response = await fetchFn();
      
      // Update list cache
      setCache(prev => ({
        ...prev,
        lists: { ...prev.lists, [cacheKey]: response },
        timestamps: { ...prev.timestamps, [cacheKey]: Date.now() }
      }));
      
      // Also cache individual vehicles from the list
      if (response.vehicles) {
        setCache(prev => {
          const newById = { ...prev.byId };
          const newTimestamps = { ...prev.timestamps };
          
          response.vehicles.forEach(vehicle => {
            const vehicleKey = `vehicle:${vehicle.id}`;
            newById[vehicle.id] = vehicle;
            newTimestamps[vehicleKey] = Date.now();
          });
          
          return {
            ...prev,
            byId: newById,
            timestamps: newTimestamps
          };
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching vehicle list:', error);
      
      // Return stale cache if available
      if (cachedList) {
        console.log('Returning stale cached list');
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
    return cache.byId[id] || null;
  }, [cache.byId]);

  // Get cached list immediately (no fetch)
  const getCachedList = useCallback((cacheKey: string): VehicleListResponse | null => {
    return cache.lists[cacheKey] || null;
  }, [cache.lists]);

  // Check if cache is fresh
  const isFresh = useCallback((key: string, maxAge: number = DEFAULT_STALE_TIME): boolean => {
    const timestamp = cache.timestamps[key];
    if (!timestamp) return false;
    return Date.now() - timestamp < maxAge;
  }, [cache.timestamps]);

  // Update vehicle in cache
  const updateVehicleInCache = useCallback((vehicle: Vehicle) => {
    setCache(prev => ({
      ...prev,
      byId: { ...prev.byId, [vehicle.id]: vehicle },
      timestamps: { ...prev.timestamps, [`vehicle:${vehicle.id}`]: Date.now() }
    }));
  }, []);

  // Clear cache
  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache.lists[key];
        delete newCache.timestamps[key];
        return newCache;
      });
    } else {
      setCache({ byId: {}, lists: {}, timestamps: {} });
    }
  }, []);

  // Context value
  const contextValue = useMemo(() => ({
    getVehicle,
    getVehicleList,
    getCachedVehicle,
    getCachedList,
    isFresh,
    updateVehicleInCache,
    clearCache,
    loadingStates,
  }), [
    getVehicle,
    getVehicleList,
    getCachedVehicle,
    getCachedList,
    isFresh,
    updateVehicleInCache,
    clearCache,
    loadingStates,
  ]);

  return (
    <VehicleContext.Provider value={contextValue}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => {
  const context = useContext(VehicleContext);
  if (!context) {
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
      setVehicle(null);
      setLoading(false);
      return;
    }

    const loadVehicle = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first
        const cached = getCachedVehicle(id);
        if (cached) {
          setVehicle(cached);
          setLoading(false);
        }
        
        // Fetch with cache fallback
        const fetchedVehicle = await getVehicle(id);
        if (fetchedVehicle && fetchedVehicle !== cached) {
          setVehicle(fetchedVehicle);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vehicle');
      } finally {
        setLoading(false);
      }
    };

    loadVehicle();
  }, [id, getVehicle, getCachedVehicle]);

  return { vehicle, loading, error };
};

// Custom hook for vehicle lists with caching
export const useVehicleList = (
  cacheKey: string,
  fetchFn: () => Promise<VehicleListResponse>,
  options?: {
    enabled?: boolean;
    forceRefresh?: boolean;
  }
) => {
  const [data, setData] = useState<VehicleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getVehicleList, getCachedList, isFresh } = useVehicleContext();

  const enabled = options?.enabled ?? true;
  const forceRefresh = options?.forceRefresh ?? false;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const loadList = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          const cached = getCachedList(cacheKey);
          if (cached && isFresh(cacheKey)) {
            setData(cached);
            setLoading(false);
          }
        }
        
        // Fetch (will use cache internally if fresh)
        const response = await getVehicleList(cacheKey, fetchFn);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [cacheKey, fetchFn, enabled, forceRefresh, getVehicleList, getCachedList, isFresh]);

  return { data, loading, error };
};
