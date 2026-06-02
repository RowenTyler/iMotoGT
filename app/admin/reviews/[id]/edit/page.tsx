import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { requireAdminSession } from "@/lib/admin"
import { ReviewForm, type VehicleOption } from "../../review-form"

export const dynamic = "force-dynamic"

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession()
  const { id } = await params
  const supabase = await createClient()

  const [{ data: review, error }, { data: vehicles }] = await Promise.all([
    supabase.from("reviews").select("*").eq("id", id).maybeSingle(),
    supabase.from("vehicles").select("id, make, model, year").order("created_at", { ascending: false }).limit(500),
  ])

  if (error || !review) {
    notFound()
  }

  const options: VehicleOption[] = (vehicles ?? []).map((v) => ({
    id: v.id,
    label: `${v.year} ${v.make} ${v.model}`,
  }))

  return (
    <ReviewForm
      vehicles={options}
      initial={{
        id: review.id,
        title: review.title ?? "",
        vehicle_id: review.vehicle_id ?? "",
        review_type: review.review_type ?? "written",
        video_url: review.video_url ?? "",
        body: typeof review.content_json?.body === "string" ? review.content_json.body : "",
        status: review.status ?? "draft",
      }}
    />
  )
}
