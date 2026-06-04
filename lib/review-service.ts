/**
 * Review Management Service
 * Handles car review creation, editing, and publishing
 */

import { createClient } from "@/lib/supabase-client"
import type { Review } from "@/types/admin"
import { trackAnalyticsEvent } from "./admin-service"
import { generateSlug } from "./blog-service"

const supabase = createClient()

export interface ReviewCreateInput {
  title: string
  vehicle_id: string
  review_type: "written" | "video" | "mixed"
  content_json: Record<string, any>
  video_url?: string
}

export interface ReviewUpdateInput extends Partial<ReviewCreateInput> {
  status?: "draft" | "published"
}

/**
 * Create a new review
 */
export async function createReview(
  input: ReviewCreateInput,
): Promise<{ success: boolean; data?: Review; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const slug = generateSlug(input.title)

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        title: input.title,
        slug,
        vehicle_id: input.vehicle_id,
        review_type: input.review_type,
        content_json: input.content_json,
        video_url: input.video_url,
        author_id: user.id,
        status: "draft",
      })
      .select()
      .single()

    if (error) throw error

    await trackAnalyticsEvent("review_created", "review", review.id)

    return { success: true, data: review }
  } catch (error) {
    console.error("Error creating review:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create review",
    }
  }
}

/**
 * Update review
 */
export async function updateReview(
  reviewId: string,
  input: ReviewUpdateInput,
): Promise<{ success: boolean; data?: Review; error?: string }> {
  try {
    const updateData: any = {}

    if (input.title) {
      updateData.slug = generateSlug(input.title)
      updateData.title = input.title
    }
    if (input.content_json) updateData.content_json = input.content_json
    if (input.video_url !== undefined) updateData.video_url = input.video_url
    if (input.review_type) updateData.review_type = input.review_type
    if (input.status) updateData.status = input.status

    const { data: review, error } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", reviewId)
      .select()
      .single()

    if (error) throw error

    await trackAnalyticsEvent("review_updated", "review", reviewId)

    return { success: true, data: review }
  } catch (error) {
    console.error("Error updating review:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update review",
    }
  }
}

/**
 * Publish a review
 */
export async function publishReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  return updateReview(reviewId, { status: "published" }).then((result) => ({
    success: result.success,
    error: result.error,
  }))
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId)

    if (error) throw error

    await trackAnalyticsEvent("review_deleted", "review", reviewId)

    return { success: true }
  } catch (error) {
    console.error("Error deleting review:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete review",
    }
  }
}

/**
 * Get review
 */
export async function getReview(reviewId: string): Promise<{
  success: boolean
  data?: Review
  error?: string
}> {
  try {
    const { data: review, error } = await supabase.from("reviews").select("*").eq("id", reviewId).single()

    if (error) throw error

    await trackAnalyticsEvent("review_view", "review", reviewId)

    return { success: true, data: review }
  } catch (error) {
    console.error("Error fetching review:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch review",
    }
  }
}

/**
 * Get reviews for a vehicle
 */
export async function getVehicleReviews(vehicleId: string): Promise<{
  success: boolean
  data?: Review[]
  error?: string
}> {
  try {
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .eq("status", "published")
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, data: reviews || [] }
  } catch (error) {
    console.error("Error fetching vehicle reviews:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch reviews",
    }
  }
}

/**
 * Get latest reviews
 */
export async function getLatestReviews(
  limit: number = 10,
  reviewType?: string,
): Promise<{ success: boolean; data?: Review[]; error?: string }> {
  try {
    let query = supabase
      .from("reviews")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (reviewType) {
      query = query.eq("review_type", reviewType)
    }

    const { data: reviews, error } = await query

    if (error) throw error

    return { success: true, data: reviews || [] }
  } catch (error) {
    console.error("Error fetching latest reviews:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch reviews",
    }
  }
}

/**
 * Get trending reviews
 */
export async function getTrendingReviews(limit: number = 5): Promise<{
  success: boolean
  data?: Review[]
  error?: string
}> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("status", "published")
      .gte("created_at", thirtyDaysAgo)
      .order("views", { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data: reviews || [] }
  } catch (error) {
    console.error("Error fetching trending reviews:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch trending reviews",
    }
  }
}