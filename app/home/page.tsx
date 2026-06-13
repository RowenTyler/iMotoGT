import Link from "next/link"
import CarMarketplace from "@/components/car-marketplace"
import PlatformStats from "@/components/platform-stats"
import BlogCard from "@/components/blog-card"
import ReviewCard from "@/components/review-card"
import { Facebook, Instagram, Twitter } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const supabase = await createClient()
  const [{ data: blogs }, { data: reviews }] = await Promise.all([
    supabase
      .from("blogs")
      .select("id,title,subtitle,slug,category,hero_image,published_at,views")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("reviews")
      .select("id,title,slug,review_type,hero_image,views,created_at,vehicle_name")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3),
  ])

  return (
    <>
      <CarMarketplace />
      <PlatformStats />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-orange-500">Platform Insights</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">Latest from the iMoto GT editorial team</h2>
              <p className="mt-3 text-slate-600">Stay ahead with curated automotive blogs, expert buying guides, and the newest vehicle reviews.</p>
            </div>
            <Link href="/blog" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              View all blogs
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {blogs && blogs.length > 0 ? (
            blogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              No blog content available yet.
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-orange-500">Expert Reviews</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">Car reviews from our team</h2>
              <p className="mt-3 text-slate-600">Discover independent reviews and buyer guidance from vehicles on the market today.</p>
            </div>
            <Link href="/reviews" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Explore reviews
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {reviews && reviews.length > 0 ? (
            reviews.map((review) => <ReviewCard key={review.id} review={review} />)
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              No reviews published yet.
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#3E5641] dark:bg-[#1F2B20] py-8 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-[#FF6700] dark:text-[#FF7D33]">imoto</h3>
              <p className="text-sm text-gray-300">The simplest way to buy or sell your car in South Africa.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-sm text-gray-300 hover:text-[#FF7D33] text-left">Buy a Car</a>
                </li>
                <li>
                  <a href="/upload-vehicle" className="text-sm text-gray-300 hover:text-[#FF7D33] text-left">Sell a Car</a>
                </li>
                <li>
                  <a href="/blog" className="text-sm text-gray-300 hover:text-[#FF7D33] text-left">Blog</a>
                </li>
                <li>
                  <a href="/reviews" className="text-sm text-gray-300 hover:text-[#FF7D33] text-left">Reviews</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">About Us</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Our Story</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Careers</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Press</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-[#FF7D33]">Contact Us</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Connect With Us</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-[#FF7D33]"><Facebook className="w-6 h-6" /></a>
                <a href="#" className="text-gray-300 hover:text-[#FF7D33]"><Instagram className="w-6 h-6" /></a>
                <a href="#" className="text-gray-300 hover:text-[#FF7D33]"><Twitter className="w-6 h-6" /></a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#576B55]/50 dark:border-[#2A352A]/50 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} imoto. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  )
}