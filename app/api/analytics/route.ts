/**
 * Analytics API Route
 * Handles analytics event tracking and metrics retrieval
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { eventType, entityType, entityId, metadata, userId } = body

    // Insert event - userId from body is required
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { error } = await supabase.from('analytics_events').insert({
      user_id: userId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata || {},
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to track event' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get admin token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch various metrics
    const [blogs, reviews, vehicles, users, dealers, events] = await Promise.all([
      supabase
        .from('blogs')
        .select('id,status,views,saves,published_at')
        .order('published_at', { ascending: false }),
      supabase.from('reviews').select('id,review_type,views').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('id,status').order('created_at', { ascending: false }),
      supabase.from('users').select('id,created_at'),
      supabase
        .from('dealer_profiles')
        .select('id,status,rating')
        .order('created_at', { ascending: false }),
      supabase.from('analytics_events').select('event_type,created_at'),
    ])

    const metrics = {
      blogs: {
        total: blogs.data?.length || 0,
        published: blogs.data?.filter((b: any) => b.status === 'published').length || 0,
        draft: blogs.data?.filter((b: any) => b.status === 'draft').length || 0,
        totalViews: blogs.data?.reduce((sum: number, b: any) => sum + (b.views || 0), 0) || 0,
        totalSaves: blogs.data?.reduce((sum: number, b: any) => sum + (b.saves || 0), 0) || 0,
      },
      reviews: {
        total: reviews.data?.length || 0,
        videoReviews: reviews.data?.filter((r: any) => r.review_type === 'video').length || 0,
        writtenReviews: reviews.data?.filter((r: any) => r.review_type === 'written').length || 0,
        totalViews: reviews.data?.reduce((sum: number, r: any) => sum + (r.views || 0), 0) || 0,
      },
      vehicles: {
        total: vehicles.data?.length || 0,
        active: vehicles.data?.filter((v: any) => v.status !== 'sold').length || 0,
        sold: vehicles.data?.filter((v: any) => v.status === 'sold').length || 0,
      },
      users: {
        total: users.data?.length || 0,
      },
      dealers: {
        total: dealers.data?.length || 0,
        approved: dealers.data?.filter((d: any) => d.status === 'approved').length || 0,
        pending: dealers.data?.filter((d: any) => d.status === 'pending').length || 0,
        suspended: dealers.data?.filter((d: any) => d.status === 'suspended').length || 0,
        avgRating:
          dealers.data && dealers.data.length > 0
            ? (dealers.data.reduce((sum: number, d: any) => sum + (d.rating || 0), 0) / dealers.data.length).toFixed(2)
            : 0,
      },
      events: {
        total: events.data?.length || 0,
      },
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
