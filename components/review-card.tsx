import Link from "next/link"
import Image from "next/image"

interface ReviewCardProps {
  review: {
    id: string
    title: string
    slug: string
    review_type?: string | null
    hero_image?: string | null
    views?: number | null
    created_at?: string | null
    vehicle_name?: string | null
  }
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "Unknown date"
  return new Intl.DateTimeFormat("en-ZA", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(dateString))
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Link
      href={`/reviews/${review.slug}`}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-56 w-full overflow-hidden bg-slate-100">
        <Image
          src={review.hero_image || "/placeholder.svg"}
          alt={review.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
      </div>
      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-orange-500">
          <span>{review.review_type ? review.review_type.toUpperCase() : "Review"}</span>
          {review.vehicle_name && <span>• {review.vehicle_name}</span>}
        </div>
        <h3 className="text-xl font-semibold text-slate-900 line-clamp-2">{review.title}</h3>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>{formatDate(review.created_at)}</span>
          <span>•</span>
          <span>{review.views ?? 0} views</span>
        </div>
      </div>
    </Link>
  )
}
