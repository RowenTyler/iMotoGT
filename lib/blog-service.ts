/**
 * Blog Management Service
 * Handles blog creation, editing, publishing, and retrieval
 */

import { supabase } from "./supabase"
import type { Blog, BlogBlock } from "@/types/admin"
import { trackAnalyticsEvent } from "./admin-service"

export interface BlogCreateInput {
  title: string
  subtitle?: string
  content_json: Record<string, any>
  hero_image?: string
  hero_video?: string
  category?: string
  seo_title?: string
  seo_description?: string
}

export interface BlogUpdateInput extends Partial<BlogCreateInput> {
  status?: "draft" | "published" | "archived"
}

/**
 * Generate URL-friendly slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Create a new blog post
 */
export async function createBlog(
  input: BlogCreateInput,
): Promise<{ success: boolean; data?: Blog; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const slug = generateSlug(input.title)

    // Check if slug already exists
    const { data: existing } = await supabase.from("blogs").select("id").eq("slug", slug).single()

    if (existing) {
      return { success: false, error: "A blog with this title already exists" }
    }

    const { data: blog, error } = await supabase
      .from("blogs")
      .insert({
        title: input.title,
        subtitle: input.subtitle,
        slug,
        content_json: input.content_json,
        hero_image: input.hero_image,
        hero_video: input.hero_video,
        author_id: user.id,
        category: input.category,
        seo_title: input.seo_title,
        seo_description: input.seo_description,
        status: "draft",
      })
      .select()
      .single()

    if (error) throw error

    await trackAnalyticsEvent("blog_created", "blog", blog.id)

    return { success: true, data: blog }
  } catch (error) {
    console.error("Error creating blog:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create blog",
    }
  }
}

/**
 * Update blog post
 */
export async function updateBlog(
  blogId: string,
  input: BlogUpdateInput,
): Promise<{ success: boolean; data?: Blog; error?: string }> {
  try {
    const updateData: any = {}

    if (input.title) {
      updateData.slug = generateSlug(input.title)
      updateData.title = input.title
    }
    if (input.subtitle !== undefined) updateData.subtitle = input.subtitle
    if (input.content_json) updateData.content_json = input.content_json
    if (input.hero_image !== undefined) updateData.hero_image = input.hero_image
    if (input.hero_video !== undefined) updateData.hero_video = input.hero_video
    if (input.category !== undefined) updateData.category = input.category
    if (input.seo_title !== undefined) updateData.seo_title = input.seo_title
    if (input.seo_description !== undefined) updateData.seo_description = input.seo_description
    if (input.status) {
      updateData.status = input.status
      if (input.status === "published") {
        updateData.published_at = new Date().toISOString()
      }
    }

    const { data: blog, error } = await supabase
      .from("blogs")
      .update(updateData)
      .eq("id", blogId)
      .select()
      .single()

    if (error) throw error

    await trackAnalyticsEvent("blog_updated", "blog", blogId)

    return { success: true, data: blog }
  } catch (error) {
    console.error("Error updating blog:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update blog",
    }
  }
}

/**
 * Publish a blog post
 */
export async function publishBlog(blogId: string): Promise<{ success: boolean; error?: string }> {
  return updateBlog(blogId, { status: "published" }).then((result) => ({
    success: result.success,
    error: result.error,
  }))
}

/**
 * Archive a blog post
 */
export async function archiveBlog(blogId: string): Promise<{ success: boolean; error?: string }> {
  return updateBlog(blogId, { status: "archived" }).then((result) => ({
    success: result.success,
    error: result.error,
  }))
}

/**
 * Delete a blog post
 */
export async function deleteBlog(blogId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete blocks first
    await supabase.from("blog_blocks").delete().eq("blog_id", blogId)

    // Delete saved blogs
    await supabase.from("saved_blogs").delete().eq("blog_id", blogId)

    // Delete blog
    const { error } = await supabase.from("blogs").delete().eq("id", blogId)

    if (error) throw error

    await trackAnalyticsEvent("blog_deleted", "blog", blogId)

    return { success: true }
  } catch (error) {
    console.error("Error deleting blog:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete blog",
    }
  }
}

/**
 * Get single blog post
 */
export async function getBlog(blogId: string): Promise<{ success: boolean; data?: Blog; error?: string }> {
  try {
    const { data: blog, error } = await supabase.from("blogs").select("*").eq("id", blogId).single()

    if (error) throw error

    await trackAnalyticsEvent("blog_view", "blog", blogId)

    return { success: true, data: blog }
  } catch (error) {
    console.error("Error fetching blog:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch blog",
    }
  }
}

/**
 * Get blog by slug
 */
export async function getBlogBySlug(slug: string): Promise<{ success: boolean; data?: Blog; error?: string }> {
  try {
    const { data: blog, error } = await supabase.from("blogs").select("*").eq("slug", slug).single()

    if (error) throw error

    await trackAnalyticsEvent("blog_view_by_slug", "blog", blog.id)

    return { success: true, data: blog }
  } catch (error) {
    console.error("Error fetching blog by slug:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch blog",
    }
  }
}

/**
 * Get latest published blogs
 */
export async function getLatestBlogs(
  limit: number = 10,
  category?: string,
): Promise<{ success: boolean; data?: Blog[]; error?: string }> {
  try {
    let query = supabase
      .from("blogs")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit)

    if (category) {
      query = query.eq("category", category)
    }

    const { data: blogs, error } = await query

    if (error) throw error

    return { success: true, data: blogs || [] }
  } catch (error) {
    console.error("Error fetching latest blogs:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch blogs",
    }
  }
}

/**
 * Get featured blogs
 */
export async function getFeaturedBlogs(limit: number = 5): Promise<{
  success: boolean
  data?: Blog[]
  error?: string
}> {
  try {
    const { data: blogs, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("status", "published")
      .order("views", { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data: blogs || [] }
  } catch (error) {
    console.error("Error fetching featured blogs:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch featured blogs",
    }
  }
}

/**
 * Get trending blogs
 */
export async function getTrendingBlogs(limit: number = 5): Promise<{
  success: boolean
  data?: Blog[]
  error?: string
}> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: blogs, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("status", "published")
      .gte("published_at", thirtyDaysAgo)
      .order("views", { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data: blogs || [] }
  } catch (error) {
    console.error("Error fetching trending blogs:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch trending blogs",
    }
  }
}

/**
 * Get blog blocks
 */
export async function getBlogBlocks(blogId: string): Promise<{
  success: boolean
  data?: BlogBlock[]
  error?: string
}> {
  try {
    const { data: blocks, error } = await supabase
      .from("blog_blocks")
      .select("*")
      .eq("blog_id", blogId)
      .order("position", { ascending: true })

    if (error) throw error

    return { success: true, data: blocks || [] }
  } catch (error) {
    console.error("Error fetching blog blocks:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch blog blocks",
    }
  }
}

/**
 * Add blog block
 */
export async function addBlogBlock(
  blogId: string,
  blockType: string,
  content: string,
  position: number,
  sourceLabel?: string,
  sourceUrl?: string,
): Promise<{ success: boolean; data?: BlogBlock; error?: string }> {
  try {
    const { data: block, error } = await supabase
      .from("blog_blocks")
      .insert({
        blog_id: blogId,
        block_type: blockType,
        content,
        position,
        source_label: sourceLabel,
        source_url: sourceUrl,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: block }
  } catch (error) {
    console.error("Error adding blog block:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add blog block",
    }
  }
}

/**
 * Update blog block
 */
export async function updateBlogBlock(
  blockId: string,
  content: string,
  sourceLabel?: string,
  sourceUrl?: string,
): Promise<{ success: boolean; data?: BlogBlock; error?: string }> {
  try {
    const { data: block, error } = await supabase
      .from("blog_blocks")
      .update({
        content,
        source_label: sourceLabel,
        source_url: sourceUrl,
      })
      .eq("id", blockId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: block }
  } catch (error) {
    console.error("Error updating blog block:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update blog block",
    }
  }
}

/**
 * Delete blog block
 */
export async function deleteBlogBlock(blockId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("blog_blocks").delete().eq("id", blockId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error deleting blog block:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete blog block",
    }
  }
}

/**
 * Save blog (bookmark)
 */
export async function saveBlog(blogId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const { error } = await supabase.from("saved_blogs").insert({
      user_id: user.id,
      blog_id: blogId,
    })

    if (error && error.code === "23505") {
      // Already saved
      return { success: true }
    }

    if (error) throw error

    await trackAnalyticsEvent("blog_saved", "blog", blogId)

    return { success: true }
  } catch (error) {
    console.error("Error saving blog:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save blog",
    }
  }
}

/**
 * Unsave blog
 */
export async function unsaveBlog(blogId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const { error } = await supabase
      .from("saved_blogs")
      .delete()
      .eq("user_id", user.id)
      .eq("blog_id", blogId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error unsaving blog:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unsave blog",
    }
  }
}

/**
 * Get user's saved blogs
 */
export async function getSavedBlogs(): Promise<{ success: boolean; data?: Blog[]; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const { data: blogs, error } = await supabase
      .from("saved_blogs")
      .select("blogs(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, data: blogs?.map((item: any) => item.blogs) || [] }
  } catch (error) {
    console.error("Error fetching saved blogs:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch saved blogs",
    }
  }
}
