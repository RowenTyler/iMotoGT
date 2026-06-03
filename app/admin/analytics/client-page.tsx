"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, RefreshCw, ArrowRight } from "lucide-react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface AnalyticsDashboardClientProps {
  totalBlogs: number
  publishedBlogs: number
  draftBlogs: number
  blogViewsRaw: { views: number }[]
  totalReviews: number
  publishedReviews: number
  videoReviews: number
  writtenReviews: number
  reviewViewsRaw: { views: number }[]
  totalVehicles: number
  activeVehicles: number
  totalUsers: number
  totalDealers: number
  approvedDealers: number
  pendingDealers: number
  suspendedDealers: number
  totalSavedVehicles: number
  totalEvents: number
}

export default function AnalyticsDashboardClient(props: AnalyticsDashboardClientProps) {
  const router = useRouter()
  const [totalBlogViews, setTotalBlogViews] = useState(0)
  const [totalReviewViews, setTotalReviewViews] = useState(0)

  useEffect(() => {
    setTotalBlogViews((props.blogViewsRaw ?? []).reduce((sum, r) => sum + (r.views ?? 0), 0))
    setTotalReviewViews((props.reviewViewsRaw ?? []).reduce((sum, r) => sum + (r.views ?? 0), 0))
  }, [props.blogViewsRaw, props.reviewViewsRaw])

  // Prepare chart data (filter out zero values for pie charts)
  const contentOverviewData = [
    { name: "Blogs", value: props.totalBlogs },
    { name: "Reviews", value: props.totalReviews },
    { name: "Vehicles", value: props.totalVehicles },
    { name: "Users", value: props.totalUsers },
    { name: "Dealers", value: props.totalDealers },
  ]

  const dealerStatusData = [
    { name: "Approved", value: props.approvedDealers, fill: "#3E5641" },
    { name: "Pending", value: props.pendingDealers, fill: "#FF6700" },
    { name: "Suspended", value: props.suspendedDealers, fill: "#ef4444" },
  ].filter(item => item.value > 0)

  const blogStatusData = [
    { name: "Published", value: props.publishedBlogs },
    { name: "Draft", value: props.draftBlogs },
  ]

  const reviewTypesData = [
    { name: "Video", value: props.videoReviews, fill: "#FF6700" },
    { name: "Written", value: props.writtenReviews, fill: "#3E5641" },
  ].filter(item => item.value > 0)

  const formatNumber = (val: number) => val?.toLocaleString() ?? "—"

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      {/* Header with back & refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Platform Analytics</h1>
            <p className="text-slate-500 mt-1">Live platform metrics — iMoto GT</p>
          </div>
        </div>
        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {/* Blogs */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(props.totalBlogs)}</div>
          <div className="text-sm text-slate-500 mt-1">
            {formatNumber(props.publishedBlogs)} published · {formatNumber(props.draftBlogs)} drafts · {formatNumber(totalBlogViews)} views
          </div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">Blogs</div>
        </div>

        {/* Reviews */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(props.totalReviews)}</div>
          <div className="text-sm text-slate-500 mt-1">
            {formatNumber(props.publishedReviews)} published · {formatNumber(props.videoReviews)} video · {formatNumber(props.writtenReviews)} written · {formatNumber(totalReviewViews)} views
          </div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">Reviews</div>
        </div>

        {/* Vehicles */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(props.totalVehicles)}</div>
          <div className="text-sm text-slate-500 mt-1">{formatNumber(props.activeVehicles)} active</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">Vehicles</div>
        </div>

        {/* Users */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(props.totalUsers)}</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">Users</div>
        </div>

        {/* Dealers */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(props.totalDealers)}</div>
          <div className="text-sm text-slate-500 mt-1">
            {formatNumber(props.approvedDealers)} approved · {formatNumber(props.pendingDealers)} pending · {formatNumber(props.suspendedDealers)} suspended
          </div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">Dealers</div>
        </div>

        {/* Saved Vehicles */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(props.totalSavedVehicles)}</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">Saved Vehicles</div>
        </div>

        {/* Analytics Events (30d) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{formatNumber(props.totalEvents)}</div>
          <div className="text-sm text-slate-500 mt-1">events in last 30 days</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">Analytics Events</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Platform Content Bar Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Platform Content Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contentOverviewData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#FF6700" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dealer Status Pie Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Dealer Status</h3>
          {dealerStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-slate-500">No data available yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dealerStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {dealerStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Blog Status Bar Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Blog Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={blogStatusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3E5641" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Review Types Pie Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Review Types</h3>
          {reviewTypesData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-slate-500">No data available yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reviewTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {reviewTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Link
          href="/admin/blogs"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all flex justify-between items-center"
        >
          <div>
            <h4 className="font-semibold text-slate-800">Manage Blogs</h4>
            <p className="text-sm text-slate-500 mt-1">Create, edit, and publish articles</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#FF6700] transition-colors" />
        </Link>
        <Link
          href="/admin/reviews"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all flex justify-between items-center"
        >
          <div>
            <h4 className="font-semibold text-slate-800">Manage Reviews</h4>
            <p className="text-sm text-slate-500 mt-1">Author and publish vehicle reviews</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#FF6700] transition-colors" />
        </Link>
        <Link
          href="/admin/dealers"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all flex justify-between items-center"
        >
          <div>
            <h4 className="font-semibold text-slate-800">Manage Dealers</h4>
            <p className="text-sm text-slate-500 mt-1">Approve and manage dealer accounts</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#FF6700] transition-colors" />
        </Link>
      </div>
    </div>
  )
}