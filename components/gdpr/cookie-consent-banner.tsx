"use client"

/**
 * Cookie Consent Banner
 * Displays at the bottom of the screen until user makes a consent choice
 * Follows existing design system
 */

import { useConsent } from './gdpr-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Shield } from 'lucide-react'

export function CookieConsentBanner() {
  const { consent, isLoading, acceptAll, rejectAll, openPreferences } = useConsent()

  // Don't render if loading or already consented
  if (isLoading || consent.hasConsented) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <Card className="mx-auto max-w-4xl border border-border bg-card shadow-lg">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:block">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  We value your privacy
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We use cookies to ensure essential website functionality and to improve your experience. 
                  You can choose to accept all cookies or customize your preferences.{' '}
                  <Link 
                    href="/privacy" 
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Learn more
                  </Link>
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={openPreferences}
                  className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Manage preferences
                </button>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={rejectAll}
                    className="w-full sm:w-auto bg-transparent"
                  >
                    Reject All
                  </Button>
                  <Button
                    onClick={acceptAll}
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Accept All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
