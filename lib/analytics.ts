export type AnalyticsEventType =
  | "blog_view"
  | "review_view"
  | "vehicle_view"
  | "save_vehicle"
  | "save_blog"
  | "dealer_view"
  | string

export interface AnalyticsEventPayload {
  eventType: AnalyticsEventType
  targetTable?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  userId?: string | null
}

const API_ENDPOINT = "/api/analytics"

async function postEvent(payload: AnalyticsEventPayload) {
  if (typeof window === "undefined") {
    return
  }

  try {
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("[Analytics] Failed to post event:", error)
  }
}

export async function trackEvent(payload: AnalyticsEventPayload) {
  return postEvent(payload)
}

export async function trackBlogView(blogId: string, userId?: string | null) {
  return postEvent({
    eventType: "blog_view",
    targetTable: "blogs",
    targetId: blogId,
    userId: userId || null,
  })
}

export async function trackReviewView(reviewId: string, userId?: string | null) {
  return postEvent({
    eventType: "review_view",
    targetTable: "reviews",
    targetId: reviewId,
    userId: userId || null,
  })
}

export async function trackVehicleView(vehicleId: string, userId?: string | null) {
  return postEvent({
    eventType: "vehicle_view",
    targetTable: "vehicles",
    targetId: vehicleId,
    userId: userId || null,
  })
}

export async function trackSaveVehicle(vehicleId: string, userId?: string | null) {
  return postEvent({
    eventType: "save_vehicle",
    targetTable: "saved_vehicles",
    targetId: vehicleId,
    userId: userId || null,
  })
}

export async function trackSaveBlog(blogId: string, userId?: string | null) {
  return postEvent({
    eventType: "save_blog",
    targetTable: "saved_blogs",
    targetId: blogId,
    userId: userId || null,
  })
}

export async function trackDealerView(dealerId: string, userId?: string | null) {
  return postEvent({
    eventType: "dealer_view",
    targetTable: "dealer_profiles",
    targetId: dealerId,
    userId: userId || null,
  })
}
