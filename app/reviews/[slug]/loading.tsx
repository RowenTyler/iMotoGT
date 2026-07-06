import { Skeleton } from "@/components/ui/skeleton"

export default function ReviewDetailLoading() {
  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] animate-pulse">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8">
        {/* Title */}
        <div className="space-y-4">
          <div className="h-12 w-full bg-muted rounded" />
          <div className="h-12 w-2/3 bg-muted rounded" />
          <div className="flex items-center gap-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-4 bg-muted rounded-full" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </div>
        {/* Hero image */}
        <div className="aspect-video bg-muted rounded-2xl" />
        {/* Content */}
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-muted rounded"
              style={{ width: `${Math.random() * 20 + 80}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
