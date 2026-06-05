"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireAdminSession } from "@/lib/admin"

export interface ActionResult {
  success: boolean
  error?: string
  id?: string
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

/* -------------------------------------------------------------------------- */
/*                                   Blogs                                    */
/* -------------------------------------------------------------------------- */

export interface BlogInput {
  title: string
  subtitle?: string
  category?: string
  hero_image?: string
  hero_video?: string
  seo_title?: string
  seo_description?: string
  content_json?: Record<string, unknown>
  status?: "draft" | "published" | "archived"
}

export async function createBlogAction(input: BlogInput): Promise<ActionResult> {
  const admin = await requireAdminSession()
  const supabase = await createClient()

  if (!input.title?.trim()) {
    return { success: false, error: "Title is required" }
  }

  const slug = slugify(input.title)

  const { data: existing } = await supabase.from("blogs").select("id").eq("slug", slug).maybeSingle()
  if (existing) {
    return { success: false, error: "A blog with this title already exists" }
  }

  const status = input.status ?? "draft"

  const { data, error } = await supabase
    .from("blogs")
    .insert({
      title: input.title,
      subtitle: input.subtitle ?? null,
      slug,
      content_json: input.content_json ?? {},
      hero_image: input.hero_image || null,
      hero_video: input.hero_video || null,
      author_id: admin.userId,
      category: input.category || null,
      seo_title: input.seo_title || input.title,
      seo_description: input.seo_description || null,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/blogs")
  revalidatePath("/admin")
  return { success: true, id: data.id }
}

export async function updateBlogAction(id: string, input: BlogInput): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) {
    updateData.title = input.title
    updateData.slug = slugify(input.title)
    updateData.seo_title = input.seo_title || input.title
  }
  if (input.subtitle !== undefined) updateData.subtitle = input.subtitle || null
  if (input.category !== undefined) updateData.category = input.category || null
  if (input.hero_image !== undefined) updateData.hero_image = input.hero_image || null
  if (input.hero_video !== undefined) updateData.hero_video = input.hero_video || null
  if (input.seo_description !== undefined) updateData.seo_description = input.seo_description || null
  if (input.content_json !== undefined) updateData.content_json = input.content_json
  if (input.status !== undefined) {
    updateData.status = input.status
    if (input.status === "published") {
      updateData.published_at = new Date().toISOString()
    }
  }

  const { error } = await supabase.from("blogs").update(updateData).eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/blogs")
  revalidatePath("/admin")
  return { success: true, id }
}

export async function setBlogStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status }
  if (status === "published") {
    updateData.published_at = new Date().toISOString()
  }

  const { error } = await supabase.from("blogs").update(updateData).eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/blogs")
  revalidatePath("/admin")
  return { success: true, id }
}

export async function deleteBlogAction(id: string): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  await supabase.from("blog_blocks").delete().eq("blog_id", id)
  await supabase.from("saved_blogs").delete().eq("blog_id", id)
  const { error } = await supabase.from("blogs").delete().eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/blogs")
  revalidatePath("/admin")
  return { success: true, id }
}

/* -------------------------------------------------------------------------- */
/*                                  Reviews                                   */
/* -------------------------------------------------------------------------- */

export interface ReviewInput {
  title: string
  vehicle_id: string
  review_type: "written" | "video" | "mixed"
  video_url?: string
  content_json?: Record<string, unknown>
  status?: "draft" | "published"
}

export async function createReviewAction(input: ReviewInput): Promise<ActionResult> {
  const admin = await requireAdminSession()
  const supabase = await createClient()

  if (!input.title?.trim()) {
    return { success: false, error: "Title is required" }
  }
  if (!input.vehicle_id) {
    return { success: false, error: "A vehicle must be selected" }
  }

  const slug = slugify(input.title)
  const status = input.status ?? "draft"

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      title: input.title,
      slug,
      vehicle_id: input.vehicle_id,
      review_type: input.review_type,
      content_json: input.content_json ?? {},
      video_url: input.video_url || null,
      author_id: admin.userId,
      status,
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reviews")
  revalidatePath("/admin")
  return { success: true, id: data.id }
}

export async function updateReviewAction(id: string, input: ReviewInput): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) {
    updateData.title = input.title
    updateData.slug = slugify(input.title)
  }
  if (input.vehicle_id !== undefined) updateData.vehicle_id = input.vehicle_id
  if (input.review_type !== undefined) updateData.review_type = input.review_type
  if (input.video_url !== undefined) updateData.video_url = input.video_url || null
  if (input.content_json !== undefined) updateData.content_json = input.content_json
  if (input.status !== undefined) updateData.status = input.status

  const { error } = await supabase.from("reviews").update(updateData).eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reviews")
  revalidatePath("/admin")
  return { success: true, id }
}

export async function setReviewStatusAction(
  id: string,
  status: "draft" | "published",
): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const { error } = await supabase.from("reviews").update({ status }).eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reviews")
  revalidatePath("/admin")
  return { success: true, id }
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const { error } = await supabase.from("reviews").delete().eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reviews")
  revalidatePath("/admin")
  return { success: true, id }
}

/* -------------------------------------------------------------------------- */
/*                                  Dealers                                   */
/* -------------------------------------------------------------------------- */

export interface DealerInput {
  business_name: string
  owner_id: string
  description?: string
  logo_url?: string
  banner_url?: string
  status?: "pending" | "approved" | "suspended"
}

export async function createDealerAction(input: DealerInput): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  if (!input.business_name?.trim()) {
    return { success: false, error: "Business name is required" }
  }
  if (!input.owner_id?.trim()) {
    return { success: false, error: "An owner user ID is required" }
  }

  const { data, error } = await supabase
    .from("dealer_profiles")
    .insert({
      business_name: input.business_name,
      owner_id: input.owner_id,
      description: input.description || null,
      logo_url: input.logo_url || null,
      banner_url: input.banner_url || null,
      status: input.status ?? "approved",
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/dealers")
  revalidatePath("/admin")
  return { success: true, id: data.id }
}

export async function updateDealerAction(id: string, input: Partial<DealerInput>): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (input.business_name !== undefined) updateData.business_name = input.business_name
  if (input.description !== undefined) updateData.description = input.description || null
  if (input.logo_url !== undefined) updateData.logo_url = input.logo_url || null
  if (input.banner_url !== undefined) updateData.banner_url = input.banner_url || null
  if (input.status !== undefined) updateData.status = input.status

  const { error } = await supabase.from("dealer_profiles").update(updateData).eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/dealers")
  revalidatePath("/admin")
  return { success: true, id }
}

export async function setDealerStatusAction(
  id: string,
  status: "pending" | "approved" | "suspended",
): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const { error } = await supabase.from("dealer_profiles").update({ status }).eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/dealers")
  revalidatePath("/admin")
  return { success: true, id }
}

export async function deleteDealerAction(id: string): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const { error } = await supabase.from("dealer_profiles").delete().eq("id", id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/dealers")
  revalidatePath("/admin")
  return { success: true, id }
}

/* Dealer applications --------------------------------------------------------*/

export async function approveDealerApplicationAction(
  applicationId: string,
  businessName: string,
  ownerId: string,
): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const { data: dealer, error: dealerError } = await supabase
    .from("dealer_profiles")
    .insert({ business_name: businessName, owner_id: ownerId, status: "approved" })
    .select("id")
    .single()

  if (dealerError) {
    return { success: false, error: dealerError.message }
  }

  const { error: appError } = await supabase
    .from("dealer_applications")
    .update({ status: "approved" })
    .eq("id", applicationId)

  if (appError) {
    return { success: false, error: appError.message }
  }

  await supabase
    .from("dealer_employees")
    .insert({ dealer_id: dealer.id, user_id: ownerId, role: "DEALER_OWNER" })

  revalidatePath("/admin/dealers")
  revalidatePath("/admin")
  return { success: true, id: dealer.id }
}

export async function rejectDealerApplicationAction(
  applicationId: string,
  reason: string,
): Promise<ActionResult> {
  await requireAdminSession()
  const supabase = await createClient()

  const { error } = await supabase
    .from("dealer_applications")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", applicationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/dealers")
  return { success: true, id: applicationId }
}