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

const inter = Inter({ subsets: ["latin"] })

export const dynamic = 'force-dynamic'



export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://imoto-gt.co.za'),
  title: {
    default: "Buy & Sell Affordable Cars in South Africa - iMoto GT",
    template: "%s - iMoto GT",
  },
  description:
    "Buy and sell affordable cars across South Africa on a trusted local marketplace. Transparent listings, real people, fair prices, & a simpler way to trade cars.",
  applicationName: "iMoto GT",
  generator: "v0.app",
  keywords: ["cars", "South Africa", "buy cars", "sell cars", "used cars", "car marketplace"],
  authors: [{ name: "iMoto GT" }],
  openGraph: {
    title: "Buy & Sell Affordable Cars in South Africa - iMoto GT",
    description: "Buy and sell affordable cars across South Africa on a trusted local marketplace.",
    type: "website",
    locale: "en_ZA",
    siteName: "iMoto GT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy & Sell Affordable Cars in South Africa - iMoto GT",
    description: "Buy and sell affordable cars across South Africa on a trusted local marketplace.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
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
        
        {/* Additional meta tags for better SEO and performance */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        
        {/* Preconnect to domains for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Cache control meta tags */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Additional scripts for cache and performance monitoring */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Performance monitoring and cache cleanup
              (function() {
                'use strict';
                
                // Performance measurement
                window.__PERFORMANCE_START = performance.now();
                
                // Cache cleanup function
                window.cleanupStorage = function() {
                  try {
                    console.log('🧹 Starting storage cleanup...');
                    
                    // Clear force logout flag if it exists
                    if (sessionStorage.getItem('force_logout_all') === 'true') {
                      console.log('🚨 Force logout detected, clearing all storage');
                      
                      // Clear localStorage (except vehicle cache)
                      const vehicleCache = localStorage.getItem('vehicleCache');
                      localStorage.clear();
                      
                      // Restore vehicle cache if it exists
                      if (vehicleCache) {
                        try {
                          localStorage.setItem('vehicleCache', vehicleCache);
                          console.log('✅ Restored vehicle cache after cleanup');
                        } catch (e) {
                          console.error('Failed to restore vehicle cache:', e);
                        }
                      }
                      
                      // Clear sessionStorage
                      sessionStorage.clear();
                      
                      // Clear all cookies (except essential ones)
                      document.cookie.split(";").forEach(function(c) { 
                        const cookieName = c.split("=")[0].trim();
                        // Don't clear GDPR and auth cookies that might be needed
                        if (!cookieName.includes('gdpr') && !cookieName.includes('auth')) {
                          document.cookie = cookieName + "=;expires=" + new Date(0).toUTCString() + ";path=/";
                        }
                      });
                      
                      // Redirect to home if not already there
                      if (window.location.pathname !== '/' && window.location.pathname !== '/home') {
                        setTimeout(function() {
                          window.location.href = '/home';
                        }, 100);
                      }
                    }
                    
                    // Cache size monitoring
                    try {
                      let totalBytes = 0;
                      for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key) {
                          const value = localStorage.getItem(key);
                          totalBytes += key.length + (value ? value.length : 0);
                        }
                      }
                      
                      const totalKB = Math.round(totalBytes / 1024);
                      if (totalKB > 5000) { // 5MB threshold
                        console.warn('⚠️ LocalStorage size is large:', totalKB + 'KB');
                        // Optionally clear old cache entries here
                      }
                    } catch (e) {
                      console.error('Error checking storage size:', e);
                    }
                    
                  } catch (e) {
                    console.error('Error in cleanup script:', e);
                  }
                };
                
                // Run cleanup on page load
                window.addEventListener('load', function() {
                  setTimeout(cleanupStorage, 1000);
                  
                  // Performance measurement
                  const loadTime = performance.now() - window.__PERFORMANCE_START;
                  console.log('📊 Page load time:', Math.round(loadTime) + 'ms');
                  
                  // Store in session for debugging
                  sessionStorage.setItem('page_load_time', loadTime.toString());
                });
                
                // Cache warming for common routes
                window.warmCache = function() {
                  console.log('🔥 Warming cache for common routes...');
                  // This can be extended to pre-fetch common data
                };
                
                // Initialize cache warming on idle
                if ('requestIdleCallback' in window) {
                  window.requestIdleCallback(window.warmCache, { timeout: 5000 });
                } else {
                  setTimeout(window.warmCache, 5000);
                }
                
                // Navigation performance monitoring
                let navigationStartTime = null;
                
                // Track navigation start
                window.addEventListener('beforeunload', function() {
                  navigationStartTime = performance.now();
                  sessionStorage.setItem('navigation_start_time', navigationStartTime.toString());
                  
                  // Save current scroll position
                  sessionStorage.setItem('last_scroll_position', window.scrollY.toString());
                });
                
                // Track navigation end
                window.addEventListener('load', function() {
                  if (navigationStartTime) {
                    const navigationTime = performance.now() - navigationStartTime;
                    console.log('🧭 Navigation time:', Math.round(navigationTime) + 'ms');
                    
                    // Restore scroll position if we have it
                    const lastScroll = sessionStorage.getItem('last_scroll_position');
                    if (lastScroll && window.location.pathname === sessionStorage.getItem('last_path')) {
                      setTimeout(function() {
                        window.scrollTo(0, parseInt(lastScroll, 10));
                      }, 100);
                    }
                    
                    // Store current path for next navigation
                    sessionStorage.setItem('last_path', window.location.pathname);
                  }
                });
                
                // Vehicle cache initialization
                window.initializeVehicleCache = function() {
                  console.log('🚗 Initializing vehicle cache...');
                  // Check if cache exists and is valid
                  try {
                    const cache = localStorage.getItem('vehicleCache');
                    if (cache) {
                      const parsed = JSON.parse(cache);
                      const cacheAge = Date.now() - (parsed.timestamps?.home || 0);
                      console.log('📅 Vehicle cache age:', Math.round(cacheAge / 60000) + ' minutes');
                      
                      if (cacheAge > 30 * 60 * 1000) { // 30 minutes
                        console.log('🔄 Vehicle cache is stale, will refresh on next load');
                      }
                    }
                  } catch (e) {
                    console.error('Error checking vehicle cache:', e);
                  }
                };
                
                // Initialize vehicle cache
                setTimeout(window.initializeVehicleCache, 2000);
                
              })();
            `,
          }}
        />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "iMoto GT",
              "alternateName": "iMoto GT - South African Car Marketplace",
              "url": "https://imoto-gt.co.za",
              "description": "Buy and sell affordable cars across South Africa on a trusted local marketplace.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://imoto-gt.co.za/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
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
        
        {/* Additional scripts for performance and analytics */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Performance observer for Core Web Vitals
              if ('PerformanceObserver' in window) {
                try {
                  // Largest Contentful Paint
                  const lcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.log('📊 LCP:', lastEntry.startTime);
                    sessionStorage.setItem('lcp', lastEntry.startTime.toString());
                  });
                  lcpObserver.observe({type: 'largest-contentful-paint', buffered: true});
                  
                  // First Input Delay
                  const fidObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach(entry => {
                      console.log('📊 FID:', entry.processingStart - entry.startTime);
                      sessionStorage.setItem('fid', (entry.processingStart - entry.startTime).toString());
                    });
                  });
                  fidObserver.observe({type: 'first-input', buffered: true});
                  
                } catch (e) {
                  console.error('Performance observation error:', e);
                }
              }
              
              // Cache health check
              function checkCacheHealth() {
                try {
                  const now = Date.now();
                  const cache = localStorage.getItem('vehicleCache');
                  
                  if (cache) {
                    const parsed = JSON.parse(cache);
                    const cacheKeys = Object.keys(parsed.timestamps || {});
                    const staleKeys = cacheKeys.filter(key => {
                      const age = now - parsed.timestamps[key];
                      return age > 3600000; // 1 hour
                    });
                    
                    if (staleKeys.length > 0) {
                      console.log('⚠️ Found stale cache keys:', staleKeys.length);
                      // Optionally clean up stale keys
                    }
                  }
                } catch (e) {
                  console.error('Cache health check failed:', e);
                }
              }
              
              // Run cache health check periodically
              setInterval(checkCacheHealth, 300000); // Every 5 minutes
              
              // Navigation tracking for cache optimization
              let lastNavigationTime = Date.now();
              
              window.addEventListener('popstate', function() {
                const now = Date.now();
                const timeSinceLastNav = now - lastNavigationTime;
                lastNavigationTime = now;
                
                console.log('⏪⏩ Back/Forward navigation detected');
                console.log('⏱️ Time since last navigation:', timeSinceLastNav + 'ms');
                
                // If navigation was quick, we might want to use cache more aggressively
                if (timeSinceLastNav < 10000) { // 10 seconds
                  console.log('🚀 Quick navigation detected, prioritizing cache');
                }
              });
              
              // Service Worker registration for offline support
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('✅ ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('❌ ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
