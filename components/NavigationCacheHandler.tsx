"use client"

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useVehicleContext } from './VehicleProvider'

export function NavigationCacheHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { saveScrollPosition, restoreScrollPosition, getCurrentRouteKey } = useVehicleContext()
  
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastPath = useRef<string>('')

  useEffect(() => {
    const routeKey = getCurrentRouteKey();
    if (routeKey === lastPath.current) return;
    
    const timer = setTimeout(() => {
      const savedPos = restoreScrollPosition();
      if (savedPos !== null) window.scrollTo({ top: savedPos, behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    }, 100);

    lastPath.current = routeKey;
    return () => clearTimeout(timer);
  }, [pathname, searchParams, restoreScrollPosition, getCurrentRouteKey]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        saveScrollPosition(window.scrollY);
      }, 250);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [saveScrollPosition]);

  return null;
}

// RESTORED COMPATIBILITY HOOK
export const useNavigationCache = () => {
  const context = useVehicleContext();
  return {
    savePageState: context.savePageState,
    restorePageState: context.restorePageState,
    saveScrollPosition: context.saveScrollPosition,
    restoreScrollPosition: context.restoreScrollPosition,
    isCurrentRouteCached: context.isCurrentRouteCached,
    getCurrentRouteKey: context.getCurrentRouteKey,
    getNavigationHistory: context.getNavigationHistory,
    clearNavigationHistory: context.clearNavigationHistory
  };
};
