import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Clock, User, Tag } from "lucide-react"
import { BlogPost } from "@/lib/blog-data"

interface BlogCardProps {
  post: BlogPost
  featured?: boolean
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
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
                <User className="w-4 h-4" />
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

            <div className="flex items-center gap-2 text-[#FF6700] dark:text-[#FF7D33] font-semibold hover:gap-3 transition-all group-hover:no-underline">
              Read More
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
