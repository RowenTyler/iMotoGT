"use client"

/**
 * Cookie Preferences Modal
 * Allows granular control over cookie categories
 */

import { useState, useEffect } from 'react'
import { useConsent } from './gdpr-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { COOKIE_CATEGORIES, type ConsentPreferences } from '@/lib/gdpr/cookie-config'
import { X, Lock } from 'lucide-react'

export function CookiePreferencesModal() {
  const { consent, isPreferencesOpen, closePreferences, savePreferences } = useConsent()
  const [preferences, setPreferences] = useState<ConsentPreferences>(consent.preferences)

  // Sync preferences when consent changes
  useEffect(() => {
    setPreferences(consent.preferences)
  }, [consent.preferences])

  if (!isPreferencesOpen) {
    return null
  }

  const handleToggle = (categoryId: keyof ConsentPreferences) => {
    // Cannot toggle necessary cookies
    if (categoryId === 'necessary') return

    setPreferences(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }))
  }

  const handleSave = () => {
    savePreferences(preferences)
  }

  const handleAcceptAll = () => {
    savePreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    })
  }

  const handleRejectAll = () => {
    savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closePreferences}
        onKeyDown={(e) => e.key === 'Escape' && closePreferences()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card shadow-xl">
        <CardHeader className="relative">
          <button
            type="button"
            onClick={closePreferences}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <CardTitle>Cookie Preferences</CardTitle>
          <CardDescription>
            Manage your cookie preferences. You can enable or disable different types of cookies below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {COOKIE_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{category.name}</h4>
                  {category.required && (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category.description}
                </p>
              </div>

              <div className="flex-shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences[category.id]}
                  aria-label={`Toggle ${category.name} cookies`}
                  disabled={category.required}
                  onClick={() => handleToggle(category.id)}
                  className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${category.required ? 'cursor-not-allowed opacity-50' : ''}
                    ${preferences[category.id] ? 'bg-primary' : 'bg-muted'}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                      transition duration-200 ease-in-out
                      ${preferences[category.id] ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            </div>
          ))}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
            >
              Reject All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptAll}
            >
              Accept All
            </Button>
          </div>
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save Preferences
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
