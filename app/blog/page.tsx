import { createClient } from "@/utils/supabase/server"
import BlogCard from "@/components/blog-card"

export const dynamic = "force-dynamic"

export default async function BlogIndexPage() {
  const supabase = await createClient()
  const { data: blogs } = await supabase
    .from("blogs")
    .select("id,title,subtitle,slug,category,hero_image,published_at,views,reading_time")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12)

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.45em] text-orange-500">Platform Insights</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Latest Blogs</h1>
          <p className="mt-3 text-slate-600">Explore the latest editorial articles, reviews, and trends from the iMoto GT team.</p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {blogs && blogs.length > 0 ? (
          blogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            No published blogs available yet.
          </div>
        )}
      </section>
    </div>
  )
}
