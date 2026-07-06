"use client"

export function VehicleDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 space-y-8">
        {/* Back Button + Title */}
        <div className="flex items-center gap-4">
          <div className="h-6 w-6 rounded-full bg-muted" />
          <div className="h-8 w-64 bg-muted rounded" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-2xl" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 w-20 bg-muted rounded-lg" />
              ))}
            </div>
          </div>

          {/* Seller Info */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-10 w-32 bg-muted rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/5 bg-muted rounded" />
              <div className="h-4 w-4/5 bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 flex-1 bg-muted rounded-lg" />
              <div className="h-10 flex-1 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
