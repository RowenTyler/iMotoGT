"use client"

/**
 * GDPR Provider
 * React context for managing consent state across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ConsentManager } from '@/lib/gdpr/consent-manager'
import type { ConsentState, ConsentPreferences } from '@/lib/gdpr/cookie-config'
import { DEFAULT_CONSENT_STATE } from '@/lib/gdpr/cookie-config'

interface GDPRContextValue {
  consent: ConsentState
  isLoading: boolean
  acceptAll: () => void
  rejectAll: () => void
  savePreferences: (preferences: ConsentPreferences) => void
  openPreferences: () => void
  closePreferences: () => void
  isPreferencesOpen: boolean
}

const GDPRContext = createContext<GDPRContextValue | null>(null)

export function useConsent() {
  const context = useContext(GDPRContext)
  if (!context) {
    throw new Error('useConsent must be used within a GDPRProvider')
  }
  return context
}

interface GDPRProviderProps {
  children: React.ReactNode
}

export function GDPRProvider({ children }: GDPRProviderProps) {
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)

  // Load consent on mount
  useEffect(() => {
    const loadedConsent = ConsentManager.getConsent()
    setConsent(loadedConsent)
    setIsLoading(false)
  }, [])

  // Listen for custom event to open cookie preferences from header menu
  useEffect(() => {
    const handleOpenPreferences = () => {
      setIsPreferencesOpen(true)
    }

    window.addEventListener('open-cookie-preferences', handleOpenPreferences)
    return () => {
      window.removeEventListener('open-cookie-preferences', handleOpenPreferences)
    }
  }, [])

  const acceptAll = useCallback(() => {
    ConsentManager.acceptAll()
    setConsent(ConsentManager.getConsent())
  }, [])

  const rejectAll = useCallback(() => {
    ConsentManager.rejectAll()
    setConsent(ConsentManager.getConsent())
  }, [])

  const savePreferences = useCallback((preferences: ConsentPreferences) => {
    ConsentManager.setConsent(preferences)
    setConsent(ConsentManager.getConsent())
    setIsPreferencesOpen(false)
  }, [])

  const openPreferences = useCallback(() => {
    setIsPreferencesOpen(true)
  }, [])

  const closePreferences = useCallback(() => {
    setIsPreferencesOpen(false)
  }, [])

  const value: GDPRContextValue = {
    consent,
    isLoading,
    acceptAll,
    rejectAll,
    savePreferences,
    openPreferences,
    closePreferences,
    isPreferencesOpen,
  }

  return (
    <GDPRContext.Provider value={value}>
      {children}
    </GDPRContext.Provider>
  )
}
