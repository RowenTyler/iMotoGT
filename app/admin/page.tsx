import { createClient } from "@/utils/supabase/server"
import { requireAdminSession } from "@/lib/admin"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  await requireAdminSession()

  const supabase = await createClient()

  const [
    blogsCount,
    publishedBlogsCount,
    draftBlogsCount,
    reviewsCount,
    publishedReviewsCount,
    vehiclesCount,
    usersCount,
    dealersCount,
  ] = await Promise.all([
    supabase.from("blogs").select("id", { count: "exact", head: true }),
    supabase.from("blogs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("blogs").select("id", { count: "exact", head: true }).neq("status", "published"),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("vehicles").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("dealer_profiles").select("id", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/blogs" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Total Blogs</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{blogsCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">View and manage all blog content</p>
        </Link>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Published Blogs</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{publishedBlogsCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Live blog posts available publicly</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Draft Blogs</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{draftBlogsCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Drafts waiting for review</p>
        </div>
        <Link href="/admin/reviews" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Total Reviews</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{reviewsCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Manage vehicle reviews and author content</p>
        </Link>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Published Reviews</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{publishedReviewsCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Reviews currently visible on the platform</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Total Vehicles</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{vehiclesCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Active vehicle listings in the marketplace</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Total Users</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{usersCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Registered users on the platform</p>
        </div>
        <Link href="/admin/dealers" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Total Dealers</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{dealersCount.count ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Dealer profiles and applications</p>
        </Link>
      </section>
    </div>
  )
}
