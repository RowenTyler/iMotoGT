import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import AnalyticsTracker from "@/components/analytics-tracker"

export const dynamic = "force-dynamic"

interface BlogBlock {
  id: string
  block_type: string
  content: string
}

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const [{ data: blog }, { data: blocks }] = await Promise.all([
    supabase
      .from("blogs")
      .select("id,title,subtitle,hero_image,content,category,author,slug,published_at,views,reading_time")
      .eq("slug", params.slug)
      .eq("status", "published")
      .single(),
    supabase
      .from("blog_blocks")
      .select("id,block_type,content")
      .eq("blog_slug", params.slug)
      .order("created_at", { ascending: true }),
  ])

  if (!blog) {
    return notFound()
  }

  return (
    <article className="space-y-10">
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.45em] text-orange-500">{blog.category || "Blog"}</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">{blog.title}</h1>
        {blog.subtitle ? <p className="mt-4 text-slate-600">{blog.subtitle}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          {blog.author && <span>By {blog.author}</span>}
          {blog.published_at && <span>{new Date(blog.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
          <span>{blog.views ?? 0} views</span>
          {blog.reading_time ? <span>{blog.reading_time} min read</span> : null}
        </div>
      </section>

      {blog.hero_image ? (
        <div className="rounded-3xl overflow-hidden bg-slate-100 shadow-sm">
          <img src={blog.hero_image} alt={blog.title} className="h-[420px] w-full object-cover" />
        </div>
      ) : null}

      <section className="space-y-6 rounded-3xl bg-white p-8 shadow-sm">
        {blocks && blocks.length > 0 ? (
          blocks.map((block: BlogBlock) => (
            <div key={block.id} className="prose prose-slate max-w-none">
              {block.block_type === "heading" ? <h2>{block.content}</h2> : null}
              {block.block_type === "paragraph" ? <p>{block.content}</p> : null}
              {block.block_type === "quote" ? <blockquote>{block.content}</blockquote> : null}
              {block.block_type === "list" ? (
                <ul>
                  {block.content.split("\n").map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        ) : (
          <div className="prose prose-slate max-w-none">
            <p>{blog.content ?? "Read the latest article from the iMoto GT team."}</p>
          </div>
        )}
      </section>

      <AnalyticsTracker
        eventType="blog_view"
        targetTable="blogs"
        targetId={blog.id}
      />
    </article>
  )
}
