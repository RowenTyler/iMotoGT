"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ReviewCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, j) => (
              <Card key={j} className="h-40 p-6 space-y-4 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export function ReviewRowSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} classNamepline className="flex items-center gap-4 p-4 bg-white rounded-lg border animate-pulse">
          <div className="h-16 w-16 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
          <div className="h-5 bg-muted rounded w-16" />
        </div>
      ))}
    </>
  )
}
