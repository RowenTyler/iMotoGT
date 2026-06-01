/**
 * Dealer Applications API
 * Handles dealer application submissions and management
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
    const { businessName, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    // Check if user already has a pending application
    const { data: existing } = await supabase
      .from('dealer_applications')
      .select('id')
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a pending application' },
        { status: 400 }
      )
    }

    const { data: application, error } = await supabase
      .from('dealer_applications')
      .insert({
        business_name: businessName,
        owner_id: user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(application)
  } catch (error) {
    console.error('Dealer application error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit application' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const {
      data: { user },
    } = await supabase.auth.getUser()

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
      // Regular user can only see their own applications
      let query = supabase
        .from('dealer_applications')
        .select('*')
        .eq('owner_id', user.id)

      if (status) query = query.eq('status', status)

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Admin can see all applications
    let query = supabase.from('dealer_applications').select('*')

    if (status) query = query.eq('status', status)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Get applications error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
