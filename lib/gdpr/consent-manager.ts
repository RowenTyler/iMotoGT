/**
 * GDPR Consent Manager
 * Handles storage and retrieval of user consent preferences
 * Completely isolated from existing business logic
 */

import {
  type ConsentState,
  type ConsentPreferences,
  type CookieCategory,
  DEFAULT_CONSENT_STATE,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
} from './cookie-config'

interface StoredConsent extends ConsentState {
  version: string
}

class ConsentManagerClass {
  private cachedState: ConsentState | null = null

  /**
   * Get current consent state from localStorage
   */
  getConsent(): ConsentState {
    if (this.cachedState) {
      return this.cachedState
    }

    if (typeof window === 'undefined') {
      return DEFAULT_CONSENT_STATE
    }

    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
      if (!stored) {
        return DEFAULT_CONSENT_STATE
      }

      const parsed: StoredConsent = JSON.parse(stored)
      
      // Version check - if consent version changes, require re-consent
      if (parsed.version !== CONSENT_VERSION) {
        return DEFAULT_CONSENT_STATE
      }

      // Ensure necessary is always true
      parsed.preferences.necessary = true
      
      this.cachedState = {
        hasConsented: parsed.hasConsented,
        consentDate: parsed.consentDate,
        preferences: parsed.preferences,
      }

      return this.cachedState
    } catch (error) {
      console.warn('[GDPR] Error reading consent:', error)
      return DEFAULT_CONSENT_STATE
    }
  }

  /**
   * Save consent preferences to localStorage
   */
  setConsent(preferences: ConsentPreferences): void {
    if (typeof window === 'undefined') {
      return
    }

    // Ensure necessary is always true
    const safePreferences: ConsentPreferences = {
      ...preferences,
      necessary: true,
    }

    const consentState: StoredConsent = {
      hasConsented: true,
      consentDate: new Date().toISOString(),
      preferences: safePreferences,
      version: CONSENT_VERSION,
    }

    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentState))
      this.cachedState = {
        hasConsented: consentState.hasConsented,
        consentDate: consentState.consentDate,
        preferences: consentState.preferences,
      }
    } catch (error) {
      console.warn('[GDPR] Error saving consent:', error)
    }
  }

  /**
   * Accept all cookie categories
   */
  acceptAll(): void {
    this.setConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    })
  }

  /**
   * Reject all optional cookie categories (necessary stays on)
   */
  rejectAll(): void {
    this.setConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    })
  }

  /**
   * Check if user has made a consent choice
   */
  hasConsented(): boolean {
    return this.getConsent().hasConsented
  }

  /**
   * Check if a specific category is allowed
   */
  isAllowed(category: CookieCategory): boolean {
    const consent = this.getConsent()
    
    // Necessary is always allowed
    if (category === 'necessary') {
      return true
    }

    // If no consent yet, only necessary is allowed
    if (!consent.hasConsented) {
      return false
    }

    return consent.preferences[category] ?? false
  }

  /**
   * Clear consent (for testing or user request)
   */
  clearConsent(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY)
      this.cachedState = null
    } catch (error) {
      console.warn('[GDPR] Error clearing consent:', error)
    }
  }

  /**
   * Invalidate cached state (force re-read from storage)
   */
  invalidateCache(): void {
    this.cachedState = null
  }
}

// Singleton instance
export const ConsentManager = new ConsentManagerClass()
