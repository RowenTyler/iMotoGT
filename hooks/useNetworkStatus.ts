"use client"

/**
 * Hook for detecting and monitoring network status
 * Provides real-time network connectivity information to components
 */

import { useState, useEffect } from "react"

interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean
  message?: string
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
  })

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        isOnline: true,
        wasOffline: prev.isOnline ? false : true,
        message: "Connection restored",
      }))
    }

    const handleOffline = () => {
      setStatus({
        isOnline: false,
        wasOffline: true,
        message: "No internet connection",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return status
}
