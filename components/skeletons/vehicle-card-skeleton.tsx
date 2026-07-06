"use client"

import { cn } from "@/lib/utils"

interface VehicleCardSkeletonProps {
  count?: number
  className?: string
}

export function VehicleCardSkeleton({ count = 1, className }: VehicleCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg shadow-md overflow-hidden h-96 bg-gray-200 dark:bg-gray-700 animate-pulse",
            className
          )}
        >
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 relative">
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
              <div className="h-7 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
