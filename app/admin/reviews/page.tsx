import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { requireAdminSession } from "@/lib/admin"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Star, Plus } from "lucide-react"
import { ReviewRowActions } from "./review-row-actions"

export const dynamic = "force-dynamic"

type ReviewRow = {
  id: string
  title: string
  vehicle_id: string
  review_type: "written" | "video" | "mixed"
  status: "draft" | "published"
  views: number | null
  updated_at: string
}

export default async function AdminReviewsPage() {
  await requireAdminSession()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reviews")
    .select("id, title, vehicle_id, review_type, status, views, updated_at")
    .order("updated_at", { ascending: false })

  const reviews = (data as ReviewRow[] | null) ?? []

  // Resolve vehicle labels in a single query.
  const vehicleIds = Array.from(new Set(reviews.map((r) => r.vehicle_id).filter(Boolean)))
  const vehicleLabels = new Map<string, string>()
  if (vehicleIds.length > 0) {
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, make, model, year")
      .in("id", vehicleIds)
    for (const v of vehicles ?? []) {
      vehicleLabels.set(v.id, `${v.year} ${v.make} ${v.model}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Reviews</h2>
          <p className="text-sm text-slate-500">Author, publish, and remove vehicle reviews.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/reviews/new">
            <Plus size={16} /> New Review
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load reviews: {error.message}
        </div>
      ) : reviews.length === 0 ? (
        <Empty className="rounded-3xl border border-slate-200 bg-white">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Star className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No reviews yet</EmptyTitle>
            <EmptyDescription>Create your first vehicle review to get started.</EmptyDescription>
          </EmptyHeader>
          <Button asChild className="gap-2">
            <Link href="/admin/reviews/new">
              <Plus size={16} /> New Review
            </Link>
          </Button>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="hidden px-6 py-4 font-semibold md:table-cell">Vehicle</th>
                <th className="hidden px-6 py-4 font-semibold sm:table-cell">Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="hidden px-6 py-4 font-semibold lg:table-cell">Views</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/reviews/${review.id}/edit`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {review.title}
                    </Link>
                  </td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">
                    {vehicleLabels.get(review.vehicle_id) || "—"}
                  </td>
                  <td className="hidden px-6 py-4 capitalize text-slate-600 sm:table-cell">
                    {review.review_type}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      className={
                        review.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {review.status}
                    </Badge>
                  </td>
                  <td className="hidden px-6 py-4 text-slate-600 lg:table-cell">{review.views ?? 0}</td>
                  <td className="px-6 py-4">
                    <ReviewRowActions id={review.id} status={review.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
