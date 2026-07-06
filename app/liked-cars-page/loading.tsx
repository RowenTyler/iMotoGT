import { VehicleCardSkeleton } from "@/components/skeletons/vehicle-card-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function LikedCarsLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="pt-20 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <VehicleCardSkeleton count={6} />
        </div>
      </div>
    </div>
  )
}
