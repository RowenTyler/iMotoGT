"use client"

export function StatsSkeleton() {
  return (
    <section className="w-full py-16 md:py-24 bg-gradient-to-b from-white to-gray-50 dark:from-[#0A0F0A] dark:to-[#0A0F0A]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="mb-12 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-10 bg-muted animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 mb-8">
          {/* Vehicles Listed */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-3xl p-8 md:p-10 min-h-[280px] flex flex-col justify-between animate-pulse">
            <div className="space-y-4">
              <div className="h-3 w-20 bg-white/10 rounded" />
              <div className="h-16 w-32 bg-white/10 rounded-xl" />
              <div className="h-6 w-48 bg-white/10 rounded" />
            </div>
          </div>

          {/* Active Users */}
          <div className="lg:col-span-3 bg-white dark:bg-[#2A352A] border border-[#9FA791]/20 rounded-3xl p-8 min-h-[280px] flex flex-col justify-between animate-pulse">
            <div className="space-y-4">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-16 w-24 bg-[#3E5641]/10 rounded-xl" />
              <div className="h-6 w-32 bg-[#3E5641]/10 rounded" />
            </div>
          </div>

          {/* Crowdfunding */}
          <div className="lg:col-span-3 bg-gradient-to-br from-[#FF6700] to-[#FF8534] rounded-3xl p-8 min-h-[280px] flex flex-col justify-between animate-pulse">
            <div className="space-y-4">
              <div className="h-3 w-28 bg-white/20 rounded" />
              <div className="h-14 w-40 bg-white/20 rounded-xl" />
              <div className="h-6 w-24 bg-white/20 rounded" />
              <div className="h-2 w-full bg-white/20 rounded-full" />
              <div className="h-4 w-48 bg-white/20 rounded" />
            </div>
          </div>

          {/* Transparency Card */}
          <div className="lg:col-span-12 bg-gradient-to-br from-[#FFF8E0] to-[#FFF0C7] dark:from-[#2A352A] dark:to-[#1F2B20] border-2 border-[#FF6700] rounded-3xl p-10 md:p-12 text-center animate-pulse space-y-4">
            <div className="h-8 w-96 mx-auto bg-muted rounded" />
            <div className="h-4 w-[60%] mx-auto bg-muted rounded" />
            <div className="h-4 w-[50%] mx-auto bg-muted rounded" />
            <div className="h-10 w-32 mx-auto bg-muted rounded-full" />
          </div>
        </div>
      </div>
    </section>
  )
}
