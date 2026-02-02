import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { UserProvider } from "@/components/UserContext"
import { ThemeProvider } from "@/components/theme-provider"
import { GDPRProvider } from "@/components/gdpr/gdpr-provider"
import { CookieConsentBanner } from "@/components/gdpr/cookie-consent-banner"
import { CookiePreferencesModal } from "@/components/gdpr/cookie-preferences-modal"

const inter = Inter({ subsets: ["latin"] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: "Buy & Sell Affordable Cars in South Africa | iMoto GT",
    template: "%s | iMoto GT",
  },
  description:
    "Buy and sell affordable cars across South Africa on a trusted local marketplace. Transparent listings, real people, fair prices, & a simpler way to trade cars.",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon for website tab */}
        <link rel="icon" href="/imoto-icon-metadate-image.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check for force logout flag
                  if (sessionStorage.getItem('force_logout_all') === 'true') {
                    console.log('🚨 Force logout detected, clearing all storage');
                    
                    // Clear localStorage
                    localStorage.clear();
                    
                    // Clear sessionStorage
                    sessionStorage.clear();
                    
                    // Clear all cookies
                    document.cookie.split(";").forEach(function(c) { 
                      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                    });
                    
                    // Redirect to home if not already there
                    if (window.location.pathname !== '/home') {
                      window.location.href = '/home';
                    }
                  }
                } catch (e) {
                  console.error('Error in cleanup script:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <GDPRProvider>
            <UserProvider>{children}</UserProvider>
            <CookieConsentBanner />
            <CookiePreferencesModal />
          </GDPRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
