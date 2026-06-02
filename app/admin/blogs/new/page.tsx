import { requireAdminSession } from "@/lib/admin"
import { BlogForm } from "../blog-form"

export const dynamic = "force-dynamic"

export default async function NewBlogPage() {
  await requireAdminSession()
  return <BlogForm />
}
