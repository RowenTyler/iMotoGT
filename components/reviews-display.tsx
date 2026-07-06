'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReviewCardSkeleton } from '@/components/skeletons'
import { getTrendingReviews, getLatestReviews } from '@/lib/review-service'
import type { Review } from '@/types/admin'
import { Eye, Calendar, Video, FileText, ArrowRight } from 'lucide-react'

interface ReviewsDisplayProps {
  onViewAll?: () => void
}

export default function ReviewsDisplay({ onViewAll }: ReviewsDisplayProps) {
  const [latestReviews, setLatestReviews] = useState<Review[]>([])
  const [trendingReviews, setTrendingReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true)
        const [latest, trending] = await Promise.all([
          getLatestReviews(6),
          getTrendingReviews(3),
        ])

        if (latest.success) setLatestReviews(latest.data || [])
        if (trending.success) setTrendingReviews(trending.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviews()
  }, [])

  const getReviewIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={16} />
      case 'written':
        return <FileText size={16} />
      default:
        return <Eye size={16} />
    }
  }

  const ReviewCard = ({ review }: { review: Review }) => (
    <Card className="overflow-hidden hover:shadow-lg transition cursor-pointer">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-lg line-clamp-2">{review.title}</h3>
            <p className="text-sm text-gray-500 mt-1">Review ID: {review.id.slice(0, 8)}</p>
          </div>
          <Badge variant="outline" className="flex-shrink-0">
            {review.review_type}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            {getReviewIcon(review.review_type)}
            {review.views} views
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {new Date(review.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-8">
      {!isLoading && trendingReviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Trending Reviews</h2>
            <Button variant="ghost" onClick={onViewAll}>
              View All <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {trendingReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && latestReviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Latest Reviews</h2>
            <Button variant="ghost" onClick={onViewAll}>
              View All <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>

          <div className="grid gap-4">
            {latestReviews.slice(0, 6).map((review) => (
              <div
                key={review.id}
                className="flex items-center gap-4 p-4 bg-white rounded-lg hover:shadow-md transition cursor-pointer border"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{review.title}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      {getReviewIcon(review.review_type)}
                      {review.review_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {review.views}
                    </span>
                  </div>
                </div>
                <Badge>{review.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && <ReviewCardSkeleton />}

      {!isLoading && latestReviews.length === 0 && trendingReviews.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No reviews yet. Check back soon!</p>
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
