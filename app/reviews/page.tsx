import { createClient } from "@/utils/supabase/server"
import ReviewCard from "@/components/review-card"
import { Header } from "@/components/ui/header"

export const dynamic = "force-dynamic"

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id,title,slug,review_type,hero_image,views,created_at,vehicle_name")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(12)

  return (
    <>
      <Header />
      <div className="space-y-10 pt-24 pb-8">
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.45em] text-orange-500">Expert Reviews</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Recent Car Reviews</h1>
          <p className="mt-3 text-slate-600">Browse the latest vehicle reviews, expert insights, and buyer recommendations.</p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {reviews && reviews.length > 0 ? (
          reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            No published reviews are available yet.
          </div>
        )}
      </section>
    </div>
  </>
  )
}
