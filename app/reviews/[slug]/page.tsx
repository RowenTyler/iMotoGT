import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import AnalyticsTracker from "@/components/analytics-tracker"

export const dynamic = "force-dynamic"

export default async function ReviewDetailPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const { data: review } = await supabase
    .from("reviews")
    .select("id,title,slug,hero_image,review_type,content,vehicle_name,created_at,views,author")
    .eq("slug", params.slug)
    .eq("status", "published")
    .single()

  if (!review) {
    return notFound()
  }

  return (
    <article className="space-y-10">
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.45em] text-orange-500">{review.review_type ?? "Review"}</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">{review.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          {review.vehicle_name && <span>{review.vehicle_name}</span>}
          {review.author && <span>By {review.author}</span>}
          {review.created_at && <span>{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
          <span>{review.views ?? 0} views</span>
        </div>
      </section>

      {review.hero_image ? (
        <div className="rounded-3xl overflow-hidden bg-slate-100 shadow-sm">
          <img src={review.hero_image} alt={review.title} className="h-[420px] w-full object-cover" />
        </div>
      ) : null}

      <section className="prose prose-slate max-w-none rounded-3xl bg-white p-8 shadow-sm">
        <p>{review.content ?? "Detailed vehicle review and insights will appear here."}</p>
      </section>

      <AnalyticsTracker
        eventType="review_view"
        targetTable="reviews"
        targetId={review.id}
      />
    </article>
  )
}
