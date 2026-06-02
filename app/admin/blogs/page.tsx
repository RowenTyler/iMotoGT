import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { requireAdminSession } from "@/lib/admin"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FileText, Plus } from "lucide-react"
import { BlogRowActions } from "./blog-row-actions"

export const dynamic = "force-dynamic"

type BlogRow = {
  id: string
  title: string
  category: string | null
  status: "draft" | "published" | "archived"
  views: number | null
  updated_at: string
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-amber-100 text-amber-800",
  archived: "bg-slate-200 text-slate-700",
}

export default async function AdminBlogsPage() {
  await requireAdminSession()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("blogs")
    .select("id, title, category, status, views, updated_at")
    .order("updated_at", { ascending: false })

  const blogs = (data as BlogRow[] | null) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Blogs</h2>
          <p className="text-sm text-slate-500">Create, edit, publish, and remove blog posts.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/blogs/new">
            <Plus size={16} /> New Blog
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load blogs: {error.message}
        </div>
      ) : blogs.length === 0 ? (
        <Empty className="rounded-3xl border border-slate-200 bg-white">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No blogs yet</EmptyTitle>
            <EmptyDescription>Get started by creating your first blog post.</EmptyDescription>
          </EmptyHeader>
          <Button asChild className="gap-2">
            <Link href="/admin/blogs/new">
              <Plus size={16} /> New Blog
            </Link>
          </Button>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="hidden px-6 py-4 font-semibold md:table-cell">Category</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="hidden px-6 py-4 font-semibold lg:table-cell">Views</th>
                <th className="hidden px-6 py-4 font-semibold lg:table-cell">Updated</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blogs.map((blog) => (
                <tr key={blog.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/blogs/${blog.id}/edit`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {blog.title}
                    </Link>
                  </td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">
                    {blog.category || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={STATUS_STYLES[blog.status] ?? "bg-slate-100 text-slate-700"}>
                      {blog.status}
                    </Badge>
                  </td>
                  <td className="hidden px-6 py-4 text-slate-600 lg:table-cell">{blog.views ?? 0}</td>
                  <td className="hidden px-6 py-4 text-slate-600 lg:table-cell">
                    {new Date(blog.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <BlogRowActions id={blog.id} status={blog.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
