'use client';

import { useEffect, useState } from 'react';

interface StatsData {
  vehicles: number;
  users: number;
  revenue: number;
  revenueGoal: number;
  revenuePercentage: number;
}

export default function PlatformStats() {
  const [stats, setStats] = useState<StatsData>({
    vehicles: 0,
    users: 0,
    revenue: 0,
    revenueGoal: 10000,
    revenuePercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/platform-stats');
      const data = await response.json();
      
      // If API returned an obviously empty payload (common when env not set),
      // attempt to use locally cached stats as a fallback to avoid showing zeros.
      const isEmptyPayload = !data || ((data.vehicles === 0) && (data.users === 0) && (data.revenue === 0));
      if (isEmptyPayload) {
        const cached = localStorage.getItem('imoto_platform_stats_cache')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            setStats(parsed)
            setIsStale(true)
            setIsLoading(false)
            return
          } catch (err) {
            console.warn('Failed to parse cached platform stats:', err)
          }
        }
      }
      
      // Animate counters
      animateValue(0, data.vehicles, 2000, (val) => 
        setStats(prev => ({ ...prev, vehicles: Math.round(val) }))
      );
      animateValue(0, data.users, 2000, (val) => 
        setStats(prev => ({ ...prev, users: Math.round(val) }))
      );
      animateValue(0, data.revenue, 2000, (val) => 
        setStats(prev => ({ ...prev, revenue: Math.round(val) }))
      );
      
      setStats(prev => ({
        ...prev,
        revenueGoal: data.revenueGoal,
        revenuePercentage: data.revenuePercentage,
      }));

      // Store successful stats locally for future fallback
      try {
        localStorage.setItem('imoto_platform_stats_cache', JSON.stringify({
          vehicles: Math.round(data.vehicles || 0),
          users: Math.round(data.users || 0),
          revenue: Math.round(data.revenue || 0),
          revenueGoal: data.revenueGoal || 10000,
          revenuePercentage: data.revenuePercentage || 0,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        }))
        setIsStale(false)
      } catch (err) {
        console.warn('Failed to persist platform stats to localStorage:', err)
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setIsLoading(false);
    }
  };

  const animateValue = (
    start: number, 
    end: number, 
    duration: number, 
    callback: (val: number) => void
  ) => {
    let startTime: number | null = null;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuad = (t: number) => t * (2 - t);
      const currentValue = start + (end - start) * easeOutQuad(progress);
      
      callback(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
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
          {/* Vehicles Listed - Large Card */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-3xl p-8 md:p-10 min-h-[280px] flex flex-col justify-between group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="text-xs font-semibold tracking-widest text-white/60 mb-4 uppercase">
                Inventory
              </div>
              <div className="text-6xl md:text-7xl font-bold text-white mb-3">
                {isLoading ? (
                  <span className="animate-pulse">-</span>
                ) : (
                  <>
                    {stats.vehicles.toLocaleString()}
                    <span className="text-[#FF6700]">+</span>
                  </>
                )}
              </div>
              {isStale && (
                <div className="text-xs text-white/70 mt-2">Showing cached data (may be stale)</div>
              )}
              <div className="text-lg text-white/80 font-medium">
                Vehicles Listed
              </div>
            </div>
          </div>

          {/* Users Card - Medium */}
          <div className="lg:col-span-3 bg-white dark:bg-[#2A352A] border border-[#9FA791]/20 rounded-3xl p-8 min-h-[280px] flex flex-col justify-between group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="text-xs font-semibold tracking-widest text-[#6F7F69] dark:text-white/60 mb-4 uppercase">
                Community
              </div>
              <div className="text-6xl md:text-7xl font-bold text-[#3E5641] dark:text-white mb-3">
                {isLoading ? (
                  <span className="animate-pulse">-</span>
                ) : (
                  <>
                    {stats.users.toLocaleString()}
                    <span className="text-[#FF6700]">+</span>
                  </>
                )}
              </div>
                {isStale && (
                  <div className="text-xs text-[#6F7F69] mt-2">Showing cached data (may be stale)</div>
                )}
              <div className="text-lg text-[#6F7F69] dark:text-white/80 font-medium">
                Active Users
              </div>
            </div>
          </div>

          {/* Revenue Card - Medium with Progress */}
          <div className="lg:col-span-3 bg-gradient-to-br from-[#FF6700] to-[#FF8534] rounded-3xl p-8 min-h-[280px] flex flex-col justify-between text-white group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70 mb-4 uppercase">
                Crowdfunding
              </div>
              <div className="text-5xl md:text-6xl font-bold mb-3">
                {isLoading ? (
                  <span className="animate-pulse">R 0</span>
                ) : (
                  `R ${stats.revenue.toLocaleString()}`
                )}
              </div>
              {isStale && (
                <div className="text-xs text-white/80 mt-2">Showing cached data (may be stale)</div>
              )}
              <div className="text-base text-white/90 font-medium mb-6">
                Raised
              </div>

              {/* Progress Bar */}
              <div className="mt-auto">
                <div className="bg-white/20 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${stats.revenuePercentage}%` }}
                  />
                </div>
                <div className="text-sm text-white/80">
                  {stats.revenuePercentage}% of R {stats.revenueGoal.toLocaleString()} goal
                </div>
              </div>
            </div>
          </div>

          {/* Transparency Card - Full Width */}
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
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
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
