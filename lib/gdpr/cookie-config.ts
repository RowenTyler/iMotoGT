/**
 * GDPR Cookie Configuration
 * Defines cookie categories and their properties for consent management
 */

export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing'

export interface CookieCategoryConfig {
  id: CookieCategory
  name: string
  description: string
  required: boolean
  defaultEnabled: boolean
}

export const COOKIE_CATEGORIES: CookieCategoryConfig[] = [
  {
    id: 'necessary',
    name: 'Strictly Necessary',
    description: 'Essential for the website to function. Includes authentication, session management, and core caching required for acceptable performance.',
    required: true,
    defaultEnabled: true,
  },
  {
    id: 'functional',
    name: 'Functional',
    description: 'Enables enhanced functionality and personalization, such as remembering your preferences and settings.',
    required: false,
    defaultEnabled: false,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Helps us understand how visitors interact with our website by collecting and reporting information anonymously.',
    required: false,
    defaultEnabled: false,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Used to track visitors across websites to display relevant advertisements.',
    required: false,
    defaultEnabled: false,
  },
]

export interface ConsentPreferences {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

export interface ConsentState {
  hasConsented: boolean
  consentDate: string | null
  preferences: ConsentPreferences
}

export const DEFAULT_CONSENT_STATE: ConsentState = {
  hasConsented: false,
  consentDate: null,
  preferences: {
    necessary: true, // Always true, cannot be disabled
    functional: false,
    analytics: false,
    marketing: false,
  },
}

export const CONSENT_STORAGE_KEY = 'imoto_gdpr_consent'
export const CONSENT_VERSION = '1.0'
