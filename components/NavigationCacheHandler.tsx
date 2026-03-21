// components/NavigationCacheHandler.tsx
"use client"

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useVehicleContext } from './VehicleProvider'

/**
 * Hook for components to access and manipulate the navigation cache.
 * Required by car-marketplace.tsx
 */
export const useNavigationCache = () => {
  const context = useVehicleContext()
  
  return {
    savePageState: context.savePageState,
    restorePageState: context.restorePageState,
    saveScrollPosition: context.saveScrollPosition,
    restoreScrollPosition: context.restoreScrollPosition,
    getCurrentRouteKey: context.getCurrentRouteKey,
    getNavigationHistory: context.getNavigationHistory,
    clearNavigationHistory: context.clearNavigationHistory,
    // Aliases for compatibility with older marketplace logic
    saveCurrentState: context.savePageState,
    restoreCurrentState: context.restorePageState,
  }
}

/**
 * Global observer component that handles scroll restoration and route tracking.
 * Should be placed in your root layout.
 */
export function NavigationCacheHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { 
    saveScrollPosition, 
    restoreScrollPosition, 
    getCurrentRouteKey,
    savePageState 
  } = useVehicleContext()
  
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastPath = useRef<string>('')
  const isRestoring = useRef<boolean>(false)

  // 1. Precise Route Change Management & Scroll Restoration
  useEffect(() => {
    const routeKey = getCurrentRouteKey()
    
    // Prevent execution if the route hasn't actually changed
    if (routeKey === lastPath.current) return
    
    // Set a flag to ignore scroll events triggered by the restoration itself
    isRestoring.current = true

    // Small timeout ensures the DOM is painted before we attempt to scroll
    const timer = setTimeout(() => {
      const savedPos = restoreScrollPosition()
      
      if (savedPos !== null && savedPos > 0) {
        window.scrollTo({
          top: savedPos,
          behavior: 'instant'
        })
      } else {
        window.scrollTo({
          top: 0,
          behavior: 'instant'
        })
      }
      
      // Allow scroll listening to resume after the jump
      setTimeout(() => {
        isRestoring.current = false
      }, 50)
    }, 100)

    lastPath.current = routeKey
    
    return () => {
      clearTimeout(timer)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [pathname, searchParams, restoreScrollPosition, getCurrentRouteKey])

  // 2. Optimized Scroll Listener (Debounced to prevent 12MB cache growth)
  useEffect(() => {
    const handleScroll = () => {
      if (isRestoring.current) return

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }

      scrollTimeout.current = setTimeout(() => {
        saveScrollPosition(window.scrollY)
      }, 200) // 200ms debounce is optimal for performance vs accuracy
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [saveScrollPosition])

  return null
}

/**
 * Utility hook for saving specific component state (like filters or tab indices)
 * without saving the entire application data.
 */
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
  
  return [componentData, updateCache] as const
}

/**
 * Forces a cache clear for the current route and reloads the page.
 */
export function useForceRefresh() {
  const { clearCache, getCurrentRouteKey } = useVehicleContext()
  
  return useCallback(() => {
    const key = getCurrentRouteKey()
    clearCache(key)
    window.location.reload()
  }, [clearCache, getCurrentRouteKey])
}
