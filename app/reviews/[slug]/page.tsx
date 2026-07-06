import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { Header } from "@/components/ui/header"
import AnalyticsTracker from "@/components/analytics-tracker"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function getReview(slug: string) {
  const supabase = await createClient()

  // Added `hero_image` to the select list
  const { data: review, error } = await supabase
    .from("reviews")
    .select("id, title, slug, review_type, video_url, hero_image, content_json, views, vehicle_id, author_id, created_at")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (error || !review) return null

  // Parallel lookups for vehicle and author
  const [vehicleResult, authorResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("make, model, year")
      .eq("id", review.vehicle_id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", review.author_id)
      .maybeSingle(),
  ])

  const vehicleName = vehicleResult.data
    ? `${vehicleResult.data.year} ${vehicleResult.data.make} ${vehicleResult.data.model}`
    : null

  const authorName = authorResult.data
    ? `${authorResult.data.first_name} ${authorResult.data.last_name}`
    : "iMoto GT Team"

  return { review, vehicleName, authorName }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const result = await getReview(params.slug)

  if (!result) {
    return { title: "Review Not Found - iMoto GT" }
  }

  const { review, vehicleName } = result
  const title = vehicleName ? `${review.title} | ${vehicleName} Review` : review.title
  const description = vehicleName
    ? `${review.review_type === "video" ? "Watch" : "Read"} our review of the ${vehicleName} on iMoto GT.`
    : "Read this vehicle review on iMoto GT."
  const ogImage = review.hero_image || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://imotogt.co.za/reviews/${review.slug}`,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Recent"
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null
  // Convert youtube.com/watch?v=ID or youtu.be/ID to embed URL
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }
  return url
}

export default async function ReviewDetailPage({ params }: { params: { slug: string } }) {
  const result = await getReview(params.slug)
  if (!result) return notFound()

  const { review, vehicleName, authorName } = result
  const embedUrl = getYouTubeEmbedUrl(review.video_url)
  const reviewContent = review.content_json?.body || ""

  // Determine badge color based on review_type
  const getBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "video":
        return "bg-[#FF6700] text-white"
      case "written":
        return "bg-[#3E5641] text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  return (
    <>
      <Header />
      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 space-y-8">
        {/* Back link */}
        <Link href="/reviews" className="inline-flex items-center text-sm text-[#FF6700] hover:underline">
          ← Back to all reviews
        </Link>

        {/* Type badge */}
        <div className="inline-block">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getBadgeColor(review.review_type)}`}>
            {review.review_type?.toUpperCase() || "REVIEW"}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-[#3E5641] dark:text-white">
          {review.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          {vehicleName && <span>{vehicleName}</span>}
          {vehicleName && <span>·</span>}
          <span>By {authorName}</span>
          <span>·</span>
          <span>{formatDate(review.created_at)}</span>
          <span>·</span>
          <span>{review.views ?? 0} views</span>
        </div>

        {/* Video embed if video_url exists */}
        {embedUrl && (
          <div className="rounded-2xl overflow-hidden bg-black">
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={`${review.title} video review`}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Written content section */}
        <div className="max-w-3xl mx-auto">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {reviewContent ? (
              // Simple rendering of content string (assumes plain text or basic HTML)
              <div dangerouslySetInnerHTML={{ __html: reviewContent.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Full review content will appear here.
              </p>
            )}
          </div>
        </div>
      </article>

      <AnalyticsTracker eventType="review_view" targetTable="reviews" targetId={review.id} />
    </>
  )
}