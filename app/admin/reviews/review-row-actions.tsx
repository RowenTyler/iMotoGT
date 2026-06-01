"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Loader2 } from "lucide-react"
import { setReviewStatusAction, deleteReviewAction } from "@/app/admin/actions"

export function ReviewRowActions({
  id,
  status,
}: {
  id: string
  status: "draft" | "published"
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.success) {
        setError(result.error || "Action failed")
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Review actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/admin/reviews/${id}/edit`} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
            {status !== "published" ? (
              <DropdownMenuItem onClick={() => run(() => setReviewStatusAction(id, "published"))}>
                <Eye className="h-4 w-4" /> Publish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => run(() => setReviewStatusAction(id, "draft"))}>
                <EyeOff className="h-4 w-4" /> Unpublish
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the review. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => run(() => deleteReviewAction(id))}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
