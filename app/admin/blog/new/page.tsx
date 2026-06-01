'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSuperAdminCheck } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import BlogEditor from '@/components/blog-editor'
import { createBlog } from '@/lib/blog-service'
import { ArrowLeft, Save, Loader2, CheckCircle } from 'lucide-react'

interface EditorBlock {
  id: string
  type: string
  content: string
  sourceLabel?: string
  sourceUrl?: string
}

const BLOG_CATEGORIES = [
  'Automotive News',
  'Vehicle Reviews',
  'Buying Guides',
  'Industry Insights',
  'Electric Vehicles',
  'Dealer News',
  'Tips & Tricks',
  'Market Trends',
]

export default function CreateBlogPage() {
  const router = useRouter()
  const { isSuperAdmin, isLoading } = useSuperAdminCheck()

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [category, setCategory] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isLoading && !isSuperAdmin) {
    return null
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createBlog({
        title,
        subtitle,
        category,
        hero_image: heroImage,
        content_json: { blocks },
        seo_title: seoTitle || title,
        seo_description: seoDescription,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/admin')
        }, 2000)
      } else {
        setError(result.error || 'Failed to create blog')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Blog Post</h1>
                <p className="text-sm text-gray-600">Write and publish your article</p>
              </div>
            </div>
            <Button onClick={handlePublish} disabled={isSubmitting || !title.trim()} size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Publish Article
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Editor - Left Side */}
          <div className="lg:col-span-2">
            <BlogEditor
              title={title}
              subtitle={subtitle}
              heroImage={heroImage}
              onTitleChange={setTitle}
              onSubtitleChange={setSubtitle}
              onHeroImageChange={setHeroImage}
              onBlocksChange={setBlocks}
              initialBlocks={blocks}
            />
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Status */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Blog post published successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Metadata */}
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Metadata</h3>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOG_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || 'Will use article title'}
                  maxLength={60}
                />
                <p className="text-xs text-gray-500">{seoTitle.length}/60</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Describe your article for search engines..."
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-gray-500">{seoDescription.length}/160</p>
              </div>
            </Card>

            {/* Content Stats */}
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Content Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-medium">{title.length} characters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blocks:</span>
                  <span className="font-medium">{blocks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hero Image:</span>
                  <span className="font-medium">{heroImage ? '✓' : '−'}</span>
                </div>
              </div>
            </Card>

            {/* Publishing Info */}
            <Card className="p-6 space-y-3 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900">Publishing</h3>
              <p className="text-sm text-blue-800">
                This article will be published immediately and visible to all users.
              </p>
              <p className="text-xs text-blue-700">
                You can edit or archive it later from the blog management panel.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
