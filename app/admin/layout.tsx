import Link from "next/link"
import { requireAdminSession } from "@/lib/admin"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Admin Area</p>
            <h1 className="text-2xl font-semibold text-slate-900">iMoto GT Administration</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <Link href="/admin" className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
              Dashboard
            </Link>
            <Link href="/admin/blogs" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Blogs
            </Link>
            <Link href="/admin/reviews" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Reviews
            </Link>
            <Link href="/admin/dealers" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Dealers
            </Link>
            <Link href="/admin/analytics" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Analytics
            </Link>
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
