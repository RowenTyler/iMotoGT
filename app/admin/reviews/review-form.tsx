"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Send, Loader2, CheckCircle } from "lucide-react"
import { createReviewAction, updateReviewAction, type ReviewInput } from "@/app/admin/actions"

export interface VehicleOption {
  id: string
  label: string
}

export interface ReviewFormInitial {
  id?: string
  title?: string
  vehicle_id?: string
  review_type?: "written" | "video" | "mixed"
  video_url?: string
  body?: string
  status?: "draft" | "published"
}

export function ReviewForm({
  vehicles,
  initial,
}: {
  vehicles: VehicleOption[]
  initial?: ReviewFormInitial
}) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)

  const [title, setTitle] = useState(initial?.title ?? "")
  const [vehicleId, setVehicleId] = useState(initial?.vehicle_id ?? "")
  const [reviewType, setReviewType] = useState<"written" | "video" | "mixed">(
    initial?.review_type ?? "written",
  )
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "")
  const [body, setBody] = useState(initial?.body ?? "")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (status: "draft" | "published") => {
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    if (!vehicleId) {
      setError("Please select a vehicle")
      return
    }
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    const payload: ReviewInput = {
      title,
      vehicle_id: vehicleId,
      review_type: reviewType,
      video_url: videoUrl,
      content_json: { body },
      status,
    }

    try {
      const result = isEdit
        ? await updateReviewAction(initial!.id!, payload)
        : await createReviewAction(payload)

      if (result.success) {
        setSuccess(status === "published" ? "Review published." : "Review saved as draft.")
        setTimeout(() => {
          router.push("/admin/reviews")
          router.refresh()
        }, 900)
      } else {
        setError(result.error || "Failed to save review")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href="/admin/reviews">
              <ArrowLeft size={16} /> Back
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Edit Review" : "Create Review"}
            </h2>
            <p className="text-sm text-slate-500">Author and manage vehicle reviews.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => submit("draft")}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Draft
          </Button>
          <Button onClick={() => submit("published")} disabled={isSubmitting} className="gap-2">
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

      <Card className="space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2024 Toyota GR Corolla — Track-ready hot hatch"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder={vehicles.length ? "Select a vehicle" : "No vehicles available"} />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewType">Review Type</Label>
            <Select value={reviewType} onValueChange={(v) => setReviewType(v as typeof reviewType)}>
              <SelectTrigger id="reviewType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="written">Written</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(reviewType === "video" || reviewType === "mixed") && (
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL</Label>
            <Input
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="body">Review Content</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the review..."
            rows={12}
          />
        </div>
      </Card>
    </div>
  )
}
