"use client"

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useVehicleContext } from './VehicleProvider'

export function NavigationCacheHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { saveScrollPosition, restoreScrollPosition, getCurrentRouteKey } = useVehicleContext()
  
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastPath = useRef<string>('')

  // 1. Scroll Restoration
  useEffect(() => {
    const routeKey = getCurrentRouteKey();
    if (routeKey === lastPath.current) return;
    
    // Use a small delay to ensure Next.js has finished rendering the route
    const timer = setTimeout(() => {
      const savedPos = restoreScrollPosition();
      if (savedPos !== null) {
        window.scrollTo({ top: savedPos, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 50);

    lastPath.current = routeKey;
    return () => clearTimeout(timer);
  }, [pathname, searchParams, restoreScrollPosition, getCurrentRouteKey]);

  // 2. Debounced Scroll Listener (Prevents constant cache writes)
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        saveScrollPosition(window.scrollY);
      }, 150); 
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [saveScrollPosition]);

  return null;
}

// 3. Optimized Component Cache Hook
export function useComponentCache<T>(key: string, initialData?: T) {
  const { savePageState, restorePageState } = useVehicleContext()
  const [componentData, setComponentData] = useState<T | null>(() => {
    const restored = restorePageState()
    return (restored && restored[key]) ? restored[key] : (initialData || null)
  })
  
  const updateCache = useCallback((data: T) => {
    setComponentData(data)
    const currentState = restorePageState() || {}
    savePageState({ ...currentState, [key]: data })
  }, [key, savePageState, restorePageState])
  
  return [componentData, updateCache] as const;
}

// 4. Force Refresh Utility
export function useForceRefresh() {
  const { clearCache, getCurrentRouteKey } = useVehicleContext()
  
  return useCallback(() => {
    const key = getCurrentRouteKey()
    clearCache(key)
    window.location.reload()
  }, [clearCache, getCurrentRouteKey])
}
