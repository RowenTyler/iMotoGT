import { createClient } from "@/utils/supabase/server"
import { requireAdminSession } from "@/lib/admin"
import { ReviewForm, type VehicleOption } from "../review-form"

export const dynamic = "force-dynamic"

export default async function NewReviewPage() {
  await requireAdminSession()
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, make, model, year")
    .order("created_at", { ascending: false })
    .limit(500)

  const options: VehicleOption[] = (vehicles ?? []).map((v) => ({
    id: v.id,
    label: `${v.year} ${v.make} ${v.model}`,
  }))

  return <ReviewForm vehicles={options} />
}
