'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BlogCard } from './blog-card'
import { BlogCardSkeleton } from '@/components/skeletons'
import { getTrendingBlogs, getFeaturedBlogs, getLatestBlogs } from '@/lib/blog-service'
import type { Blog } from '@/types/admin'
import { ArrowRight } from 'lucide-react'

interface BlogsDisplayProps {
  onViewAll?: () => void
}

export default function BlogsDisplay({ onViewAll }: BlogsDisplayProps) {
  const [latestBlogs, setLatestBlogs] = useState<Blog[]>([])
  const [trendingBlogs, setTrendingBlogs] = useState<Blog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setIsLoading(true)
        const [latest, trending] = await Promise.all([
          getLatestBlogs(6),
          getTrendingBlogs(3),
        ])

        if (latest.success) setLatestBlogs(latest.data || [])
        if (trending.success) setTrendingBlogs(trending.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load blogs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlogs()
  }, [])

  return (
    <div className="space-y-8">
      {/* Featured / Trending Section */}
      {!isLoading && trendingBlogs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Trending Articles</h2>
            <Button variant="ghost" onClick={onViewAll}>
              View All <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {trendingBlogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                variant="featured"
              />
            ))}
          </div>
        </div>
      )}

      {/* Latest Articles */}
      {!isLoading && latestBlogs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Latest Articles</h2>
            <Button variant="ghost" onClick={onViewAll}>
              View All <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>

          <div className="space-y-4">
            {latestBlogs.slice(0, 4).map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="h-8 w-40 bg-muted rounded animate-pulse" />
            <div className="grid md:grid-cols-3 gap-6">
              <BlogCardSkeleton count={3} />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && latestBlogs.length === 0 && trendingBlogs.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No articles yet. Check back soon!</p>
        </Card>
      )}

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-700">{error}</p>
        </Card>
      )}
    </div>
  )
}
