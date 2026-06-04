import { createClient } from "@/utils/supabase/server"
import AnalyticsDashboardClient from "./client-page"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Analytics Dashboard - iMoto GT"
}

export default async function AdminAnalyticsPage() {
  try {
    const supabase = await createClient()

    const safeCount = async (table: string, filters?: { column: string; value: any; operator?: string }) => {
      try {
        let query = supabase.from(table).select("*", { count: "exact", head: true })
        if (filters) {
          const { column, value, operator = "eq" } = filters
          query = query.filter(column, operator, value)
        }
        const { count, error } = await query
        if (error) throw error
        return count ?? 0
      } catch (err) {
        console.error(`Failed to count ${table}:`, err)
        return 0
      }
    }

    const safeSumViews = async (table: string, filters?: { column: string; value: any }) => {
      try {
        let query = supabase.from(table).select("views")
        if (filters) {
          query = query.eq(filters.column, filters.value)
        }
        const { data, error } = await query
        if (error) throw error
        return (data ?? []).reduce((sum: number, row: any) => sum + (row.views ?? 0), 0)
      } catch (err) {
        console.error(`Failed to sum views for ${table}:`, err)
        return 0
      }
    }

    // Blogs
    const totalBlogs = await safeCount("blogs")
    const publishedBlogs = await safeCount("blogs", { column: "status", value: "published" })
    const draftBlogs = totalBlogs - publishedBlogs
    const blogViewsRaw = await (async () => {
      try {
        const { data } = await supabase.from("blogs").select("views").eq("status", "published")
        return data ?? []
      } catch {
        return []
      }
    })()

    // Reviews
    const totalReviews = await safeCount("reviews")
    const publishedReviews = await safeCount("reviews", { column: "status", value: "published" })
    const videoReviews = await safeCount("reviews", { column: "review_type", value: "video" })
    const writtenReviews = await safeCount("reviews", { column: "review_type", value: "written" })
    const reviewViewsRaw = await (async () => {
      try {
        const { data } = await supabase.from("reviews").select("views")
        return data ?? []
      } catch {
        return []
      }
    })()

    // Vehicles – count where is_deleted is false or null
    const { count: totalVehicles } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .or("is_deleted.eq.false,is_deleted.is.null")

    const activeVehicles = await safeCount("vehicles", { column: "status", value: "active" })

    // Users
    const totalUsers = await safeCount("users")

    // Dealers
    const totalDealers = await safeCount("dealer_profiles")
    const approvedDealers = await safeCount("dealer_profiles", { column: "status", value: "approved" })
    const pendingDealers = await safeCount("dealer_profiles", { column: "status", value: "pending" })
    const suspendedDealers = await safeCount("dealer_profiles", { column: "status", value: "suspended" })

    // Saved vehicles
    const totalSavedVehicles = await safeCount("saved_vehicles")

    // Analytics events (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const totalEvents = await (async () => {
      try {
        const { count } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString())
        return count ?? 0
      } catch {
        return 0
      }
    })()

    return (
      <AnalyticsDashboardClient
        totalBlogs={totalBlogs}
        publishedBlogs={publishedBlogs}
        draftBlogs={draftBlogs}
        blogViewsRaw={blogViewsRaw}
        totalReviews={totalReviews}
        publishedReviews={publishedReviews}
        videoReviews={videoReviews}
        writtenReviews={writtenReviews}
        reviewViewsRaw={reviewViewsRaw}
        totalVehicles={totalVehicles ?? 0}
        activeVehicles={activeVehicles}
        totalUsers={totalUsers}
        totalDealers={totalDealers}
        approvedDealers={approvedDealers}
        pendingDealers={pendingDealers}
        suspendedDealers={suspendedDealers}
        totalSavedVehicles={totalSavedVehicles}
        totalEvents={totalEvents}
      />
    )
  } catch (err) {
    console.error("Fatal error in analytics page:", err)
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Unable to load analytics</h2>
        <p className="text-gray-600 mt-2">Please check the server logs or contact support.</p>
      </div>
    )
  }
}