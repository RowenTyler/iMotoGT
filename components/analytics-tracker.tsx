"use client"

import { useEffect } from "react"
import { useUser } from "@/components/UserContext"
import { trackEvent, type AnalyticsEventType } from "@/lib/analytics"

interface AnalyticsTrackerProps {
  eventType: AnalyticsEventType
  targetTable?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  userId?: string | null
}

export default function AnalyticsTracker({
  eventType,
  targetTable = null,
  targetId = null,
  metadata = null,
  userId = null,
}: AnalyticsTrackerProps) {
  const { user } = useUser()

  useEffect(() => {
    if (!targetId || !eventType) return

    const payload = {
      eventType,
      targetTable,
      targetId,
      metadata,
      userId: userId ?? user?.id ?? null,
    }

    void trackEvent(payload)
  }, [eventType, targetTable, targetId, metadata, user?.id, userId])

  return null
}
