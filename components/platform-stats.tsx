'use client';

import { useEffect, useRef, useState } from 'react';

interface StatsData {
  vehicles: number;
  users: number;
  revenue: number;
  revenueGoal: number;
  revenuePercentage: number;
  lastUpdated?: string;
}

const DEFAULT_STATS: StatsData = {
  vehicles: 0,
  users: 0,
  revenue: 0,
  revenueGoal: 10000,
  revenuePercentage: 0,
};

const CACHE_KEY = 'imoto_platform_stats_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(cached: StatsData & { lastUpdated?: string }): boolean {
  if (!cached.lastUpdated) return false;
  return Date.now() - new Date(cached.lastUpdated).getTime() < CACHE_TTL_MS;
}

function readCache(): (StatsData & { lastUpdated?: string }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(data: StatsData): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...data, lastUpdated: new Date().toISOString() })
    );
  } catch {
    // localStorage may be unavailable (e.g. private browsing) — fail silently
  }
}

export default function PlatformStats() {
  const [stats, setStats] = useState<StatsData>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [hasError, setHasError] = useState(false);
  const animationRefs = useRef<number[]>([]);

  // Cancel any in-flight animations on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach(cancelAnimationFrame);
    };
  }, []);

  useEffect(() => {
    // Show cached data immediately while fetching fresh data
    const cached = readCache();
    if (cached) {
      setStats({
        vehicles: cached.vehicles ?? 0,
        users: cached.users ?? 0,
        revenue: cached.revenue ?? 0,
        revenueGoal: cached.revenueGoal ?? 10000,
        revenuePercentage: cached.revenuePercentage ?? 0,
      });
      setIsLoading(false);
      if (!isCacheValid(cached)) {
        setIsStale(true);
      } else {
        // Cache is fresh — no need to re-fetch
        return;
      }
    }

    fetchStats();
  }, []);

  const animateValue = (
    start: number,
    end: number,
    duration: number,
    callback: (val: number) => void
  ): void => {
    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * (2 - progress); // ease-out quad
      callback(start + (end - start) * eased);

      if (progress < 1) {
        const id = requestAnimationFrame(animate);
        animationRefs.current.push(id);
      }
    };

    const id = requestAnimationFrame(animate);
    animationRefs.current.push(id);
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/platform-stats', {
        // Revalidate every 5 minutes, use stale cache while revalidating
        next: { revalidate: 300 },
      } as RequestInit);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: StatsData = await response.json();

      // Validate the response shape — guard against malformed payloads
      if (typeof data.vehicles !== 'number' || typeof data.users !== 'number') {
        throw new Error('Invalid stats payload received');
      }

      // Cancel any previous animations before starting new ones
      animationRefs.current.forEach(cancelAnimationFrame);
      animationRefs.current = [];

      const prevStats = stats;

      // Animate from current displayed value to new value (smooth update)
      animateValue(prevStats.vehicles, data.vehicles, 1500, (val) =>
        setStats((prev) => ({ ...prev, vehicles: Math.round(val) }))
      );
      animateValue(prevStats.users, data.users, 1500, (val) =>
        setStats((prev) => ({ ...prev, users: Math.round(val) }))
      );
      animateValue(prevStats.revenue, data.revenue, 1500, (val) =>
        setStats((prev) => ({ ...prev, revenue: Math.round(val) }))
      );

      // Set non-animated fields immediately
      setStats((prev) => ({
        ...prev,
        revenueGoal: data.revenueGoal ?? 10000,
        revenuePercentage: data.revenuePercentage ?? 0,
      }));

      writeCache(data);
      setIsStale(false);
      setHasError(false);
      setIsLoading(false);
    } catch (error) {
      console.error('[PlatformStats] Failed to fetch stats:', error);
      setHasError(true);
      setIsLoading(false);
      // Keep whatever we already have displayed (cache or zeros) — don't blank the UI
    }
  };

  return (
    <section className="w-full py-16 md:py-24 bg-gradient-to-b from-white to-gray-50 dark:from-[#0A0F0A] dark:to-[#0A0F0A]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-0.5 w-10 bg-[#FF6700]" />
            <span className="text-sm font-semibold tracking-wider text-[#FF6700] uppercase">
              Platform Insights
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#3E5641] dark:text-white">
            Growing Together
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 mb-8">
          {/* Vehicles Listed */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-3xl p-8 md:p-10 min-h-[280px] flex flex-col justify-between group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="text-xs font-semibold tracking-widest text-white/60 mb-4 uppercase">
                Inventory
              </div>
              <div className="text-6xl md:text-7xl font-bold text-white mb-3">
                {isLoading ? (
                  <span className="inline-block w-24 h-16 rounded-xl bg-white/10 animate-pulse" />
                ) : (
                  <>
                    {stats.vehicles.toLocaleString()}
                    <span className="text-[#FF6700]">+</span>
                  </>
                )}
              </div>
              {isStale && !isLoading && (
                <div className="text-xs text-white/50 mt-1">Refreshing…</div>
              )}
              {hasError && !isStale && (
                <div className="text-xs text-white/50 mt-1">Could not refresh data</div>
              )}
              <div className="text-lg text-white/80 font-medium mt-2">Vehicles Listed</div>
            </div>
          </div>

          {/* Active Users */}
          <div className="lg:col-span-3 bg-white dark:bg-[#2A352A] border border-[#9FA791]/20 rounded-3xl p-8 min-h-[280px] flex flex-col justify-between group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="text-xs font-semibold tracking-widest text-[#6F7F69] dark:text-white/60 mb-4 uppercase">
                Community
              </div>
              <div className="text-6xl md:text-7xl font-bold text-[#3E5641] dark:text-white mb-3">
                {isLoading ? (
                  <span className="inline-block w-16 h-16 rounded-xl bg-[#3E5641]/10 animate-pulse" />
                ) : (
                  <>
                    {stats.users.toLocaleString()}
                    <span className="text-[#FF6700]">+</span>
                  </>
                )}
              </div>
              {isStale && !isLoading && (
                <div className="text-xs text-[#6F7F69] mt-1">Refreshing…</div>
              )}
              <div className="text-lg text-[#6F7F69] dark:text-white/80 font-medium mt-2">
                Active Users
              </div>
            </div>
          </div>

          {/* Crowdfunding */}
          <div className="lg:col-span-3 bg-gradient-to-br from-[#FF6700] to-[#FF8534] rounded-3xl p-8 min-h-[280px] flex flex-col justify-between text-white group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70 mb-4 uppercase">
                Crowdfunding
              </div>
              <div className="text-5xl md:text-6xl font-bold mb-3">
                {isLoading ? (
                  <span className="inline-block w-28 h-14 rounded-xl bg-white/20 animate-pulse" />
                ) : (
                  `R ${stats.revenue.toLocaleString()}`
                )}
              </div>
              {isStale && !isLoading && (
                <div className="text-xs text-white/70 mt-1">Refreshing…</div>
              )}
              <div className="text-base text-white/90 font-medium mb-6">Raised</div>

              {/* Progress Bar */}
              <div className="mt-auto">
                <div className="bg-white/20 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(stats.revenuePercentage, 100)}%` }}
                  />
                </div>
                <div className="text-sm text-white/80">
                  {isLoading ? (
                    <span className="inline-block w-32 h-4 rounded bg-white/20 animate-pulse" />
                  ) : (
                    `${stats.revenuePercentage}% of R ${stats.revenueGoal.toLocaleString()} goal`
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transparency Card */}
          <div className="lg:col-span-12 bg-gradient-to-br from-[#FFF8E0] to-[#FFF0C7] dark:from-[#2A352A] dark:to-[#1F2B20] border-2 border-[#FF6700] rounded-3xl p-10 md:p-12 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="text-3xl md:text-4xl font-bold text-[#3E5641] dark:text-white mb-4 flex items-center justify-center gap-3">
                <span className="text-4xl">🤝</span>
                Built on Transparency & Trust
              </div>
              <p className="text-base md:text-lg text-[#6F7F69] dark:text-white/80 leading-relaxed">
                We believe in being completely open with our community. Every vehicle listing,
                user registration, and contribution is tracked in real-time. Our crowdfunding
                campaign is publicly accessible, and we're committed to building a privacy-first
                platform that puts transparency at the forefront. Together, we're creating
                South Africa's most trusted vehicle marketplace.
              </p>
              <a
                href="https://www.backabuddy.co.za/campaign/imoto-gt-a-privacy-first-vehicle-marketplace"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#FF6700] text-white rounded-full font-semibold hover:bg-[#FF7D33] transition-colors duration-300"
              >
                <span>View Campaign</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}