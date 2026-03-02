// components/NavigationCacheHandler.tsx
"use client"

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useVehicleContext } from './VehicleProvider'

// Debug logging flag
const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) console.log('🧭 [NavigationCacheHandler]', ...args);
};

export function NavigationCacheHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    savePageState,
    restorePageState,
    saveScrollPosition,
    restoreScrollPosition,
    getForCurrentRoute,
    isCurrentRouteCached,
    getCurrentRouteKey,
    getNavigationHistory
  } = useVehicleContext()
  
  const isInitialMount = useRef(true)
  const currentRouteKey = useRef<string>('')
  const lastKnownScrollPosition = useRef<number>(0)
  const scrollRestorationAttempted = useRef(false)
  const [hasCachedData, setHasCachedData] = useState(false)
  
  // Update current route key when pathname or searchParams change
  useEffect(() => {
    const paramsString = searchParams.toString()
    const newRouteKey = paramsString ? `${pathname}?${paramsString}` : pathname
    
    // Only update if the route actually changed
    if (newRouteKey !== currentRouteKey.current) {
      const previousRouteKey = currentRouteKey.current
      currentRouteKey.current = newRouteKey
      
      log(`📍 Route changed: ${previousRouteKey} -> ${newRouteKey}`)
      
      // Save state for previous route before handling the new one
      if (!isInitialMount.current && previousRouteKey) {
        log(`💾 Auto-saving state for previous route: ${previousRouteKey}`)
        savePageState()
      }
      
      // Check if new route has cached data
      const cached = getForCurrentRoute()
      setHasCachedData(!!cached)
      
      // Reset scroll restoration flag for new route
      scrollRestorationAttempted.current = false
    }
    
    isInitialMount.current = false
  }, [pathname, searchParams, savePageState, getForCurrentRoute])
  
  // Handle browser back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      log('⏪⏩ Popstate event triggered (back/forward navigation)')
      
      // Short delay to allow route to update
      setTimeout(() => {
        const routeKey = getCurrentRouteKey()
        log(`🔄 Handling popstate for route: ${routeKey}`)
        
        // Attempt to restore cached state
        const restoredData = restorePageState()
        
        if (restoredData) {
          log('✅ Successfully restored page state from cache')
          
          // Dispatch a custom event so other components can react
          const cacheRestoredEvent = new CustomEvent('cache:restored', {
            detail: { routeKey, data: restoredData }
          })
          window.dispatchEvent(cacheRestoredEvent)
        } else {
          log('⚠️ No cached data available for this route')
        }
        
        // Restore scroll position
        restoreScrollPositionForRoute()
      }, 50)
    }
    
    // Add event listener
    window.addEventListener('popstate', handlePopState)
    log('👂 Added popstate event listener')
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      log('👋 Removed popstate event listener')
    }
  }, [restorePageState, getCurrentRouteKey])
  
  // Handle scroll position
  useEffect(() => {
    const handleScroll = () => {
      lastKnownScrollPosition.current = window.scrollY
    }
    
    // Throttle scroll events to prevent excessive saves
    let scrollTimeout: NodeJS.Timeout
    const throttledScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        if (currentRouteKey.current) {
          saveScrollPosition(lastKnownScrollPosition.current)
        }
      }, 500)
    }
    
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('scroll', throttledScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', throttledScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [saveScrollPosition])
  
  // Handle page visibility change (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, save current state
        log('👁️ Page hidden, saving current state')
        savePageState()
      } else {
        // Page is visible again
        log('👁️ Page visible again')
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [savePageState])
  
  // Handle beforeunload (page refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      log('⚠️ Page unloading, saving final state')
      savePageState()
      
      // Save scroll position one last time
      saveScrollPosition(window.scrollY)
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [savePageState, saveScrollPosition])
  
  // Restore scroll position for current route
  const restoreScrollPositionForRoute = () => {
    if (scrollRestorationAttempted.current) {
      return
    }
    
    const scrollPosition = restoreScrollPosition()
    if (scrollPosition !== null) {
      log(`📐 Restoring scroll position: ${scrollPosition}px`)
      
      // Use requestAnimationFrame for smooth scroll restoration
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        })
        scrollRestorationAttempted.current = true
      })
    }
  }
  
  // Auto-restore scroll position on mount if we have cached data
  useEffect(() => {
    if (!isInitialMount.current && hasCachedData) {
      // Small delay to allow page to render
      const timer = setTimeout(() => {
        restoreScrollPositionForRoute()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [hasCachedData, isInitialMount.current])
  
  // Debug logging for navigation history
  useEffect(() => {
    if (DEBUG) {
      const history = getNavigationHistory()
      log(`📜 Navigation history: ${history.length} entries`)
      if (history.length > 0) {
        log('📜 Recent history:', history.slice(0, 3).map(entry => ({
          path: entry.path,
          timestamp: new Date(entry.timestamp).toLocaleTimeString()
        })))
      }
    }
  }, [pathname, getNavigationHistory])
  
  // Helper function to manually trigger cache save
  const manualSave = () => {
    log('💾 Manual cache save triggered')
    savePageState()
    
    // Notify other components
    const cacheSavedEvent = new CustomEvent('cache:saved', {
      detail: { routeKey: currentRouteKey.current }
    })
    window.dispatchEvent(cacheSavedEvent)
  }
  
  // Expose manual save via window object for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__debug_cache = {
        manualSave,
        getHistory: () => getNavigationHistory(),
        getCurrentRoute: () => currentRouteKey.current,
        hasCache: () => isCurrentRouteCached()
      }
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__debug_cache
      }
    }
  }, [getNavigationHistory, isCurrentRouteCached])
  
  // Debug UI (visible only in development)
  if (DEBUG && typeof window !== 'undefined') {
    const showDebugPanel = window.location.search.includes('debug=cache')
    
    if (showDebugPanel) {
      return (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">🧭 Navigation Cache</h3>
              <button
                onClick={manualSave}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
              >
                Save Now
              </button>
            </div>
            
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Current Route:</span>
                <span className="font-mono truncate max-w-[200px]" title={currentRouteKey.current}>
                  {currentRouteKey.current}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Has Cache:</span>
                <span className={hasCachedData ? 'text-green-400' : 'text-yellow-400'}>
                  {hasCachedData ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>History Entries:</span>
                <span>{getNavigationHistory().length}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Scroll Position:</span>
                <span>{lastKnownScrollPosition.current}px</span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button
                onClick={() => {
                  console.log('📜 Full navigation history:', getNavigationHistory())
                }}
                className="text-xs bg-gray-700 hover:bg-gray-600 w-full py-1 rounded"
              >
                Log History to Console
              </button>
            </div>
          </div>
        </div>
      )
    }
  }
  
  // Main component doesn't render anything visible
  return null
}

// Custom hook for components to interact with navigation cache
export function useNavigationCache() {
  const {
    savePageState,
    restorePageState,
    saveScrollPosition,
    restoreScrollPosition,
    getForCurrentRoute,
    isCurrentRouteCached,
    getCurrentRouteKey
  } = useVehicleContext()
  
  // Listen for cache events
  useEffect(() => {
    const handleCacheRestored = (event: CustomEvent) => {
      log('📡 Component received cache:restored event:', event.detail)
    }
    
    const handleCacheSaved = (event: CustomEvent) => {
      log('📡 Component received cache:saved event:', event.detail)
    }
    
    window.addEventListener('cache:restored', handleCacheRestored as EventListener)
    window.addEventListener('cache:saved', handleCacheSaved as EventListener)
    
    return () => {
      window.removeEventListener('cache:restored', handleCacheRestored as EventListener)
      window.removeEventListener('cache:saved', handleCacheSaved as EventListener)
    }
  }, [])
  
  return {
    // Save current page state
    saveCurrentState: (data?: any) => {
      log('💾 Component-triggered cache save')
      savePageState(data)
    },
    
    // Restore page state
    restoreCurrentState: () => {
      log('🔄 Component-triggered cache restore')
      return restorePageState()
    },
    
    // Check if current route has cached data
    hasCachedData: () => {
      return isCurrentRouteCached()
    },
    
    // Get cached data for current route
    getCachedData: () => {
      return getForCurrentRoute()
    },
    
    // Get current route key
    getRouteKey: () => {
      return getCurrentRouteKey()
    },
    
    // Save scroll position
    saveCurrentScrollPosition: (position?: number) => {
      const pos = position ?? window.scrollY
      log(`📐 Component saving scroll position: ${pos}px`)
      saveScrollPosition(pos)
    },
    
    // Restore scroll position
    restoreCurrentScrollPosition: () => {
      const pos = restoreScrollPosition()
      if (pos !== null) {
        log(`📐 Component restoring scroll position: ${pos}px`)
        window.scrollTo({ top: pos, behavior: 'auto' })
      }
      return pos
    },
    
    // Force refresh current route (clear cache and reload)
    forceRefresh: () => {
      log('🔄 Component forcing refresh of current route')
      // Clear cache for current route
      const routeKey = getCurrentRouteKey()
      if (routeKey) {
        // Dispatch event to notify other components
        const refreshEvent = new CustomEvent('cache:force-refresh', {
          detail: { routeKey }
        })
        window.dispatchEvent(refreshEvent)
      }
      
      // Reload the page
      window.location.reload()
    }
  }
}

// Helper hook for saving component-specific data to cache
export function useComponentCache<T>(key: string, initialData?: T) {
  const { savePageState, restorePageState } = useVehicleContext()
  const [componentData, setComponentData] = useState<T | null>(initialData || null)
  
  // Load component data from cache on mount
  useEffect(() => {
    const restored = restorePageState()
    if (restored && restored[key]) {
      setComponentData(restored[key])
    }
  }, [key, restorePageState])
  
  // Save component data to cache
  const saveComponentData = useCallback((data: T) => {
    setComponentData(data)
    
    // Get current page state
    const currentState = restorePageState() || {}
    
    // Update with component data
    const updatedState = {
      ...currentState,
      [key]: data
    }
    
    // Save back to cache
    savePageState(updatedState)
  }, [key, savePageState, restorePageState])
  
  return {
    data: componentData,
    save: saveComponentData,
    clear: () => saveComponentData(null as T)
  }
}
