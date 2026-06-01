'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, BookmarkIcon, Calendar, Clock, ArrowRight } from 'lucide-react'
import type { Blog } from '@/types/admin'

// Legacy BlogPost support
import { BlogPost } from "@/lib/blog-data"

interface BlogCardProps {
  post?: BlogPost
  blog?: Blog
  featured?: boolean
  variant?: 'default' | 'compact' | 'featured'
  onClick?: () => void
}

export function BlogCard({ 
  post,
  blog,
  featured = false,
  variant = 'default',
  onClick 
}: BlogCardProps) {
  // Support legacy BlogPost format
  if (post) {
    return (
      <Link href={`/blog/${post.slug}`}>
        <div className={`group bg-white dark:bg-[#2A352A] rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col ${featured ? "md:flex-row md:col-span-2" : ""}`}>
          <div className={`relative overflow-hidden ${featured ? "md:w-1/2 h-48 md:h-auto" : "h-48 sm:h-56"}`}>
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 left-3">
              <span className="bg-[#FF6700] dark:bg-[#FF7D33] text-white text-xs font-semibold px-3 py-1 rounded-full">
                {post.category}
              </span>
            </div>
          </div>

          <div className={`p-6 flex flex-col justify-between ${featured ? "md:w-1/2" : ""}`}>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#3E5641] dark:text-white mb-2 line-clamp-2 group-hover:text-[#FF6700] dark:group-hover:text-[#FF7D33] transition-colors">
                {post.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
                {post.excerpt}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{post.readTime} min read</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{post.author}</span>
                </div>
                <div className="text-xs">
                  {new Date(post.date).toLocaleDateString("en-ZA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[#FF6700] dark:text-[#FF7D33] font-semibold hover:gap-3 transition-all">
                Read More
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // New blog format
  if (!blog) return null

  const publishDate = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  if (variant === 'compact') {
    return (
      <Card
        className="p-4 hover:shadow-lg transition cursor-pointer"
        onClick={onClick}
      >
        <div className="flex gap-4">
          {blog.hero_image && (
            <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
              <Image
                src={blog.hero_image}
                alt={blog.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2">{blog.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-1">{blog.subtitle}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {blog.views}
              </span>
              <span className="flex items-center gap-1">
                <BookmarkIcon size={14} />
                {blog.saves}
              </span>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (variant === 'featured') {
    return (
      <Card
        className="overflow-hidden hover:shadow-xl transition cursor-pointer group"
        onClick={onClick}
      >
        {blog.hero_image && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={blog.hero_image}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-105 transition duration-300"
            />
          </div>
        )}
        <div className="p-6 space-y-3">
          {blog.category && (
            <Badge variant="outline" className="w-fit">
              {blog.category}
            </Badge>
          )}
          <h3 className="text-xl font-bold line-clamp-2 group-hover:text-blue-600 transition">
            {blog.title}
          </h3>
          <p className="text-gray-600 line-clamp-2">{blog.subtitle}</p>
          <div className="flex gap-4 text-sm text-gray-500">
            {publishDate && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {publishDate}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {blog.views}
            </span>
            <span className="flex items-center gap-1">
              <BookmarkIcon size={14} />
              {blog.saves}
            </span>
          </div>
        </div>
      </Card>
    )
  }

  // Default variant
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition cursor-pointer"
      onClick={onClick}
    >
      <div className="grid md:grid-cols-3 gap-4">
        {blog.hero_image && (
          <div className="relative h-48 md:h-auto overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-t-none">
            <Image
              src={blog.hero_image}
              alt={blog.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className={`p-6 space-y-3 ${blog.hero_image ? 'md:col-span-2' : 'col-span-full'}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold line-clamp-2">{blog.title}</h3>
              <p className="text-gray-600 line-clamp-1 mt-1">{blog.subtitle}</p>
            </div>
            {blog.category && (
              <Badge variant="outline" className="flex-shrink-0">
                {blog.category}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {publishDate && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {publishDate}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {blog.views} views
            </span>
            <span className="flex items-center gap-1">
              <BookmarkIcon size={14} />
              {blog.saves} saved
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
