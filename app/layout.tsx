import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { UserProvider } from "@/components/UserContext"
import { ThemeProvider } from "@/components/theme-provider"
import { GDPRProvider } from "@/components/gdpr/gdpr-provider"
import { CookieConsentBanner } from "@/components/gdpr/cookie-consent-banner"
import { CookiePreferencesModal } from "@/components/gdpr/cookie-preferences-modal"
import { VehicleProvider } from "@/components/VehicleProvider"
import { NavigationCacheHandler } from "@/components/NavigationCacheHandler"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
})

export const dynamic = "force-dynamic"

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL("https://imotogt.co.za"),
  title: {
    default: "Buy & Sell Affordable Cars in South Africa - iMoto GT",
    template: "%s - iMoto GT",
  },
  description:
    "Buy and sell affordable cars across South Africa on a trusted local marketplace. Transparent listings, real people, fair prices, & a simpler way to trade cars.",
  applicationName: "iMoto GT",
  generator: "v0.app",
  keywords: [
    "cars",
    "South Africa",
    "buy cars",
    "sell cars",
    "used cars",
    "car marketplace",
  ],
  authors: [{ name: "iMoto GT" }],
  openGraph: {
    title: "Buy & Sell Affordable Cars in South Africa | ",
    description:
      "Buy and sell affordable cars across South Africa on a trusted local marketplace.",
    type: "website",
    locale: "en_ZA",
    siteName: "iMoto GT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy & Sell Affordable Cars in South Africa - iMoto GT",
    description:
      "Buy and sell affordable cars across South Africa on a trusted local marketplace.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link
          rel="icon"
          href="/imoto-icon-metadate-image.png"
          type="image/png"
        />

        {/* Preconnect to Supabase Storage for faster image loads */}
        <link
          rel="preconnect"
          href="https://mwzrrrnmtyiyrwdqhcqb.supabase.co"
        />

        {/* Next.js Image with `priority` in car-marketplace.tsx automatically
            generates an optimized image preload. Do NOT add a manual preload
            here — it would fetch the raw 2.4 MB PNG instead of the optimized
            WebP/AVIF version. */}

        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "iMoto GT",
              alternateName: "iMoto GT - South African Car Marketplace",
              url: "https://imotogt.co.za",
              description:
                "Buy and sell affordable cars across South Africa on a trusted local marketplace.",
              potentialAction: {
                "@type": "SearchAction",
                target:
                  "https://imotogt.co.za/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>

      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <GDPRProvider>
            <UserProvider>
              <VehicleProvider>
                <NavigationCacheHandler />
                {children}
              </VehicleProvider>
            </UserProvider>
            <CookieConsentBanner />
            <CookiePreferencesModal />
          </GDPRProvider>
        </ThemeProvider>

        {/* Lightweight init script — moved to public/init.js */}
        <script src="/init.js" defer />
      </body>
    </html>
  )
}