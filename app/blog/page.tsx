"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BlogCard } from "@/components/blog-card"
import { blogPosts } from "@/lib/blog-data"

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get unique categories
  const categories = Array.from(new Set(blogPosts.map((post) => post.category)))

  // Filter posts based on search and category
  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = !selectedCategory || post.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  // Separate featured and regular posts
  const featuredPosts = filteredPosts.filter((post) => post.featured)
  const regularPosts = filteredPosts.filter((post) => !post.featured)

  // Sort by date (newest first)
  const sortedPosts = [...regularPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link href="/" className="inline-flex items-center text-[#FF6700] dark:text-[#FF7D33] hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-[#3E5641] dark:text-white">Blog & Insights</h1>
          <div className="w-20 h-1 bg-[#FF6700] dark:bg-[#FF7D33] mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Explore articles, tips, and industry insights about cars and the automotive market in South Africa.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-[#2A352A] rounded-2xl p-6 mb-8 shadow-md border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search articles by title, topic, or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-gray-50 dark:bg-[#1F2B20] border border-[#9FA791]/20 dark:border-[#4A4D45]/20 rounded-lg text-[#3E5641] dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <p className="text-sm font-semibold text-[#3E5641] dark:text-white mb-3">Filter by Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? "bg-[#FF6700] text-white"
                    : "bg-gray-100 dark:bg-[#1F2B20] text-[#3E5641] dark:text-white hover:bg-gray-200 dark:hover:bg-[#3A452E]"
                }`}
              >
                All Articles
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-[#FF6700] text-white"
                      : "bg-gray-100 dark:bg-[#1F2B20] text-[#3E5641] dark:text-white hover:bg-gray-200 dark:hover:bg-[#3A452E]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#3E5641] dark:text-white mb-6">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredPosts.map((post) => (
                <BlogCard key={post.id} post={post} featured />
              ))}
            </div>
          </div>
        )}

        {/* All Posts */}
        <div>
          <h2 className="text-2xl font-bold text-[#3E5641] dark:text-white mb-6">
            {featuredPosts.length > 0 ? "More Articles" : "All Articles"}
          </h2>

          {sortedPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">No articles found matching your search.</p>
              <Button
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory(null)
                }}
                className="bg-[#FF6700] hover:bg-[#FF6700]/90 text-white"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {filteredPosts.length > 0 && (
          <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
            <p>
              Showing {filteredPosts.length} article{filteredPosts.length !== 1 ? "s" : ""} from {blogPosts.length} total
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
