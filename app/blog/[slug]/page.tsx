import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Clock, User, Share2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BlogCard } from "@/components/blog-card"
import { blogPosts } from "@/lib/blog-data"
import { notFound } from "next/navigation"

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export function generateMetadata({ params }: BlogPostPageProps) {
  const post = blogPosts.find((p) => p.slug === params.slug)

  if (!post) {
    return {
      title: "Not Found",
      description: "The blog post you are looking for does not exist.",
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [
        {
          url: post.image,
          width: 800,
          height: 400,
        },
      ],
    },
  }
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = blogPosts.find((p) => p.slug === params.slug)

  if (!post) {
    notFound()
  }

  // Get related posts (same category or featured)
  const relatedPosts = blogPosts
    .filter((p) => p.id !== post.id && (p.category === post.category || p.featured))
    .slice(0, 3)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/blog" className="inline-flex items-center text-[#FF6700] dark:text-[#FF7D33] hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <div className="mb-8">
          <div className="inline-block bg-[#FF6700] dark:bg-[#FF7D33] text-white text-sm font-semibold px-4 py-1 rounded-full mb-4">
            {post.category}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#3E5641] dark:text-white mb-4">{post.title}</h1>
          <div className="w-20 h-1 bg-[#FF6700] dark:bg-[#FF7D33] mb-6"></div>

          {/* Meta Information */}
          <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDate(post.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.readTime} min read</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative h-96 sm:h-96 rounded-2xl overflow-hidden shadow-lg mb-8 border border-[#9FA791]/20 dark:border-[#4A4D45]/20">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Article Content */}
        <div className="bg-white dark:bg-[#2A352A] rounded-2xl p-8 shadow-md border border-[#9FA791]/20 dark:border-[#4A4D45]/20 mb-8">
          <article className="prose dark:prose-invert max-w-none prose-headings:text-[#3E5641] dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-a:text-[#FF6700] dark:prose-a:text-[#FF7D33] prose-strong:text-[#3E5641] dark:prose-strong:text-white">
            <div
              dangerouslySetInnerHTML={{
                __html: post.content
                  .split("\n")
                  .map((line) => {
                    // Handle headings
                    if (line.startsWith("# ")) {
                      return `<h1>${line.substring(2)}</h1>`
                    }
                    if (line.startsWith("## ")) {
                      return `<h2>${line.substring(3)}</h2>`
                    }
                    if (line.startsWith("### ")) {
                      return `<h3>${line.substring(4)}</h3>`
                    }
                    // Handle bold text
                    if (line.includes("**")) {
                      return `<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`
                    }
                    // Handle lists
                    if (line.startsWith("- ")) {
                      return `<li>${line.substring(2)}</li>`
                    }
                    // Regular paragraphs
                    if (line.trim()) {
                      return `<p>${line}</p>`
                    }
                    return ""
                  })
                  .join(""),
              }}
            />
          </article>
        </div>

        {/* Share Section */}
        <div className="bg-white dark:bg-[#2A352A] rounded-2xl p-6 shadow-md border border-[#9FA791]/20 dark:border-[#4A4D45]/20 mb-12 flex items-center gap-4">
          <Share2 className="w-5 h-5 text-[#FF6700] dark:text-[#FF7D33]" />
          <span className="font-semibold text-[#3E5641] dark:text-white">Share this article:</span>
          <div className="flex gap-3">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${typeof window !== "undefined" ? window.location.href : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-[#FF6700] dark:hover:text-[#FF7D33]"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${typeof window !== "undefined" ? window.location.href : ""}&text=${post.title}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-[#FF6700] dark:hover:text-[#FF7D33]"
            >
              Twitter
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${typeof window !== "undefined" ? window.location.href : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-[#FF6700] dark:hover:text-[#FF7D33]"
            >
              LinkedIn
            </a>
          </div>
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-[#3E5641] dark:text-white mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {relatedPosts.map((relatedPost) => (
                <BlogCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#FF6700] to-[#FF7D33] rounded-2xl p-8 text-white text-center shadow-lg">
          <h3 className="text-2xl font-bold mb-4">Ready to Buy or Sell?</h3>
          <p className="mb-6">Start your car journey with iMoto GT - South Africa's trusted car marketplace.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild className="bg-white hover:bg-gray-100 text-[#FF6700] font-semibold">
              <Link href="/">Browse Cars</Link>
            </Button>
            <Button asChild className="bg-white/20 hover:bg-white/30 text-white font-semibold border border-white">
              <Link href="/upload-vehicle">List Your Car</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
