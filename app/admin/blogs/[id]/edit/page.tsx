import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { requireAdminSession } from "@/lib/admin"
import { BlogForm } from "../../blog-form"

export const dynamic = "force-dynamic"

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession()
  const { id } = await params
  const supabase = await createClient()

  const { data: blog, error } = await supabase.from("blogs").select("*").eq("id", id).maybeSingle()

  if (error || !blog) {
    notFound()
  }

  const blocks = Array.isArray(blog.content_json?.blocks) ? blog.content_json.blocks : []

  return (
    <BlogForm
      initial={{
        id: blog.id,
        title: blog.title ?? "",
        subtitle: blog.subtitle ?? "",
        category: blog.category ?? "",
        hero_image: blog.hero_image ?? "",
        seo_title: blog.seo_title ?? "",
        seo_description: blog.seo_description ?? "",
        blocks,
        status: blog.status,
      }}
    />
  )
}
