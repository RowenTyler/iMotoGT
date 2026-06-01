import Link from "next/link"
import Image from "next/image"

interface BlogCardProps {
  blog: {
    id: string
    title: string
    subtitle?: string | null
    slug: string
    category?: string | null
    hero_image?: string | null
    published_at?: string | null
    views?: number | null
    reading_time?: number | null
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

export default function BlogCard({ blog }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-56 w-full overflow-hidden bg-slate-100">
        <Image
          src={blog.hero_image || "/placeholder.svg"}
          alt={blog.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
      </div>
      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-orange-500">
          <span>{blog.category || "Blog"}</span>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 line-clamp-2">{blog.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-3">{blog.subtitle || "Explore the latest insights from iMoto GT."}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>{formatDate(blog.published_at)}</span>
          <span>•</span>
          <span>{blog.views ?? 0} views</span>
          <span>•</span>
          <span>{blog.reading_time ? `${blog.reading_time} min read` : "5 min read"}</span>
        </div>
      </div>
    </Link>
  )
}
