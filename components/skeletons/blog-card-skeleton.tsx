"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function BlogCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden h-full flex flex-col animate-pulse">
          {/* Image */}
          <div className="h-48 bg-muted shrink-0" />
          {/* Content */}
          <div className="p-5 space-y-3 flex-1 flex flex-col">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="mt-auto flex items-center gap-3 pt-2">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          </div>
        </Card>
      ))}
    </>
  )
}

export function BlogRowSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border animate-pulse">
          {/* Image */}
          <div className="h-24 w-24 rounded-lg bg-muted shrink-0" />
          {/* Content */}
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </div>
      ))}
    </>
  )
}
