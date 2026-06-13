"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BlogEditor from "@/components/blog-editor";
import { ArrowLeft, Save, Send, Loader2, CheckCircle, CalendarIcon } from "lucide-react";
import { createBlogAction, updateBlogAction, type BlogInput } from "@/app/admin/actions";

interface EditorBlock {
  id: string;
  type: string;
  content: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

const BLOG_CATEGORIES = [
  "Automotive News",
  "Vehicle Reviews",
  "Buying Guides",
  "Industry Insights",
  "Electric Vehicles",
  "Dealer News",
  "Tips & Tricks",
  "Market Trends",
];

export interface BlogFormInitial {
  id?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  hero_image?: string;
  seo_title?: string;
  seo_description?: string;
  blocks?: EditorBlock[];
  status?: "draft" | "published" | "archived";
  scheduled_publish_at?: string;
}

export function BlogForm({ initial }: { initial?: BlogFormInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [heroImage, setHeroImage] = useState(initial?.hero_image ?? "");
  const [blocks, setBlocks] = useState<EditorBlock[]>(initial?.blocks ?? []);
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seo_description ?? "");
  const [scheduledDate, setScheduledDate] = useState(initial?.scheduled_publish_at ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-update SEO title when title changes, if SEO title is empty
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!seoTitle.trim() && newTitle.trim()) {
      setSeoTitle(newTitle);
    }
  };

  const submit = async (status: "draft" | "published") => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload: BlogInput = {
      title,
      subtitle,
      category,
      hero_image: heroImage,
      content_json: { blocks },
      seo_title: seoTitle || title,
      seo_description: seoDescription,
      status,
      scheduled_publish_at: scheduledDate || null,
    };

    try {
      const result = isEdit
        ? await updateBlogAction(initial!.id!, payload)
        : await createBlogAction(payload);

      if (result.success) {
        setSuccess(
          status === "published" ? "Blog published successfully." : "Blog saved as draft."
        );
        setTimeout(() => {
          router.push("/admin/blogs");
          router.refresh();
        }, 900);
      } else {
        setError(result.error || "Failed to save blog");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href="/admin/blogs">
              <ArrowLeft size={16} /> Back
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Edit Blog Post" : "Create Blog Post"}
            </h2>
            <p className="text-sm text-slate-500">Write and manage your article.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => submit("draft")}
            disabled={isSubmitting || !title.trim()}
            className="gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Draft
          </Button>
          <Button
            onClick={() => submit("published")}
            disabled={isSubmitting || !title.trim()}
            className="gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Publish
          </Button>
        </div>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BlogEditor
            title={title}
            subtitle={subtitle}
            heroImage={heroImage}
            onTitleChange={handleTitleChange}
            onSubtitleChange={setSubtitle}
            onHeroImageChange={setHeroImage}
            onBlocksChange={setBlocks}
            initialBlocks={blocks}
          />
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-6">
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
                placeholder={title || "Will use article title"}
                maxLength={60}
              />
              <p className="text-xs text-slate-500">
                {seoTitle.length}/60 characters
              </p>
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
              <p className="text-xs text-slate-500">
                {seoDescription.length}/160 characters
              </p>
            </div>
          </Card>

          {/* Scheduling Card */}
          <Card className="space-y-4 p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <CalendarIcon size={16} /> Schedule Publish
            </h3>
            <div className="space-y-2">
              <Label htmlFor="schedule">Future publish date/time</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduledDate.slice(0, 16)}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Leave empty to publish immediately. Use your local time – will be stored as UTC.
              </p>
            </div>
          </Card>

          <Card className="space-y-3 p-6">
            <h3 className="font-semibold">Content Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Title</span>
                <span className="font-medium">{title.length} characters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Blocks</span>
                <span className="font-medium">{blocks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Hero image</span>
                <span className="font-medium">{heroImage ? "Set" : "None"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}