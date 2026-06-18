import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import AnalyticsTracker from "@/components/analytics-tracker"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface BlogBlock {
  id: string
  type: string
  content: string
  sourceLabel?: string
  sourceUrl?: string
}

async function getBlog(slug: string) {
  const supabase = await createClient()
  
  const { data: blog, error } = await supabase
    .from("blogs")
    .select("id, title, subtitle, slug, hero_image, hero_video, category, author_id, published_at, views, content_json, seo_title, seo_description")
    .eq("slug", slug)
    .eq("status", "published")
    .single()
  
  if (error || !blog) return null
  
  const { data: author } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, name")
    .eq("id", blog.author_id)
    .maybeSingle()
  
  let authorName = "iMoto GT Team"
  if (author) {
    if (author.full_name) authorName = author.full_name
    else if (author.name) authorName = author.name
    else if (author.first_name && author.last_name) authorName = `${author.first_name} ${author.last_name}`
    else if (author.first_name) authorName = author.first_name
  }
  
  return { blog, authorName }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getBlog(slug)

  if (!result) {
    return { title: "Blog Not Found - iMoto GT" }
  }

  const { blog } = result
  const title = blog.seo_title || blog.title
  const description =
    blog.seo_description || blog.subtitle || `Read "${blog.title}" on iMoto GT.`
  const ogImage = blog.hero_image || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://imotogt.co.za/blog/${blog.slug}`,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: blog.title }]
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

/**
 * Normalize URLs inside HTML anchor tags.
 * Adds https:// to any href that doesn't start with http://, https://, or /.
 * Works during SSR (no DOM) using regex.
 */
function normalizeLinksInHtml(html: string): string {
  if (!html) return html
  // Match <a href="..."> and ensure the href has a protocol
  return html.replace(/<a\s+href="(?!https?:\/\/|\/)([^"]+)"/gi, '<a href="https://$1"')
}

function renderBlock(block: BlogBlock) {
  switch (block.type) {
    case "heading":
      return (
        <h2 key={block.id} className="text-2xl font-bold mt-8 mb-4 text-[#3E5641] dark:text-white">
          {block.content}
        </h2>
      )
    case "subheading":
      return (
        <h3 key={block.id} className="text-xl font-semibold mt-6 mb-3 text-[#3E5641] dark:text-white">
          {block.content}
        </h3>
      )
    case "text":
      const safeHtml = normalizeLinksInHtml(block.content || '')
      return (
        <div
          key={block.id}
          className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      )
    case "image":
      return (
        <div key={block.id} className="my-6">
          <img src={block.content} alt="Blog image" className="w-full rounded-xl" />
          {block.sourceLabel && (
            <p className="text-xs text-gray-400 mt-1">
              Source: {block.sourceUrl ? <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF6700] hover:underline">{block.sourceLabel}</a> : block.sourceLabel}
            </p>
          )}
        </div>
      )
    case "video": {
      let embedUrl = block.content
      const youtubeMatch = block.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      if (youtubeMatch) {
        embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`
      }
      return (
        <div key={block.id} className="aspect-video my-6">
          <iframe
            src={embedUrl}
            title="Video embed"
            className="w-full h-full rounded-xl"
            allowFullScreen
          />
        </div>
      )
    }
    case "quote":
      return (
        <blockquote key={block.id} className="border-l-4 border-[#FF6700] pl-4 italic my-6 text-gray-600 dark:text-gray-300">
          {block.content}
        </blockquote>
      )
    case "divider":
      return <hr key={block.id} className="my-8 border-[#9FA791]/30" />
    default:
      return <p key={block.id} className="mb-4 text-gray-700 dark:text-gray-300">{block.content}</p>
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getBlog(slug)
  if (!result) return notFound()
  
  const { blog, authorName } = result
  const blocks = blog.content_json?.blocks ?? []
  
  return (
    <>
      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Link href="/blog" className="inline-flex items-center text-sm text-[#FF6700] hover:underline">
          ← Back to all blogs
        </Link>
        
        {blog.hero_image && (
          <div className="rounded-2xl overflow-hidden">
            <img
              src={blog.hero_image}
              alt={blog.title}
              className="w-full max-h-96 object-cover rounded-2xl"
            />
          </div>
        )}
        
        {blog.category && (
          <div className="inline-block bg-[#FF6700] text-white text-sm font-semibold px-3 py-1 rounded-full">
            {blog.category}
          </div>
        )}
        
        <h1 className="text-4xl md:text-5xl font-bold text-[#3E5641] dark:text-white">
          {blog.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>By {authorName}</span>
          <span>·</span>
          <span>{formatDate(blog.published_at)}</span>
          <span>·</span>
          <span>{blog.views ?? 0} views</span>
        </div>
        
        <div className="max-w-3xl mx-auto">
          {blocks.map((block: BlogBlock) => renderBlock(block))}
        </div>
        
        <div className="border-t border-[#9FA791]/30 pt-8 mt-12">
          <h3 className="text-lg font-semibold text-[#3E5641] dark:text-white mb-4">Share this article</h3>
          <div className="flex gap-4">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(`https://imoto.co.za/blog/${blog.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[#FF6700] transition"
            >
              Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://imoto.co.za/blog/${blog.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[#FF6700] transition"
            >
              Facebook
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(`https://imoto.co.za/blog/${blog.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[#FF6700] transition"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </article>
      
      <AnalyticsTracker eventType="blog_view" targetTable="blogs" targetId={blog.id} />
    </>
  )
}