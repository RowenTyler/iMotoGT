/**
 * public/init.js
 *
 * Lightweight client-side initialisation script.
 * Loaded with `defer` so it never blocks rendering.
 *
 * Handles:
 * - Force logout cleanup (clears storage if flagged)
 * - Storage size monitoring (warns if approaching localStorage quota)
 * - Service worker registration (for future offline support)
 * - Basic navigation timing log (dev only)
 */

(function () {
  "use strict";

  // ─── Force Logout Cleanup ─────────────────────────────────────────────────
  // If another tab or the app itself set this flag, clear all storage
  // and redirect to home. Used by forceLogoutAll() in UserContext.

  try {
    if (sessionStorage.getItem("force_logout_all") === "true") {
      sessionStorage.clear();
      localStorage.clear();

      // Clear cookies (except essential ones)
      document.cookie.split(";").forEach(function (c) {
        var cookieName = c.split("=")[0].trim();
        if (!cookieName.includes("gdpr") && !cookieName.includes("auth")) {
          document.cookie =
            cookieName +
            "=;expires=" +
            new Date(0).toUTCString() +
            ";path=/";
        }
      });

      if (
        window.location.pathname !== "/" &&
        window.location.pathname !== "/home"
      ) {
        window.location.href = "/home";
      }
    }
  } catch (e) {
    // localStorage may be unavailable in some privacy modes — fail silently
  }

  // ─── Storage Size Monitor ─────────────────────────────────────────────────
  // Warns in the console if localStorage is getting large.
  // At 4MB+ the browser may start throwing QuotaExceededError.

  function checkStorageSize() {
    try {
      var totalBytes = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key) {
          var value = localStorage.getItem(key);
          totalBytes += key.length + (value ? value.length : 0);
        }
      }
      var totalKB = Math.round(totalBytes / 1024);
      if (totalKB > 3000) {
        console.warn(
          "[iMoto] localStorage is large (" +
            totalKB +
            "KB). Consider clearing old cache."
        );
      }
    } catch (e) {
      // Fail silently
    }
  }

  // ─── Service Worker Registration ─────────────────────────────────────────
  // Registers sw.js when it exists for offline support.
  // Fails silently if the file does not exist yet.

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(function (registration) {
          console.log(
            "[iMoto] ServiceWorker registered, scope:",
            registration.scope
          );
        })
        .catch(function () {
          // sw.js does not exist yet — expected, fail silently
        });
    }
  }

  // ─── Navigation Timing ───────────────────────────────────────────────────
  // Logs page load time in development to help track performance regressions.

  function logNavigationTiming() {
    if (
      typeof performance === "undefined" ||
      typeof performance.getEntriesByType !== "function"
    )
      return;
    try {
      var entries = performance.getEntriesByType("navigation");
      if (entries.length > 0) {
        var nav = entries[0];
        var loadTime = Math.round(nav.loadEventEnd - nav.startTime);
        if (loadTime > 0) {
          console.log("[iMoto] Page load: " + loadTime + "ms");
        }
      }
    } catch (e) {
      // Fail silently
    }
  }

  // ─── Run on Load ──────────────────────────────────────────────────────────

  window.addEventListener("load", function () {
    checkStorageSize();
    registerServiceWorker();
    logNavigationTiming();
  });
})();