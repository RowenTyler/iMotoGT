import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ─── Environment variable guard ───────────────────────────────────────────────
// Fail fast with a clear error if env vars are missing, rather than silently
// returning zeros. Check Vercel → Settings → Environment Variables if this fires.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cache the response for 5 minutes at the edge (Vercel CDN)
export const revalidate = 300;

export async function GET() {
  // ── Guard: missing env vars ──────────────────────────────────────────────
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      '[platform-stats] Missing Supabase environment variables.\n' +
      'Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).\n' +
      'Check your Vercel project → Settings → Environment Variables.'
    );
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Run all three queries in parallel for speed
    const [vehiclesResult, usersResult] = await Promise.all([
      supabase
        .from('vehicles')           // ← your vehicles table name
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('profiles')           // ← your users/profiles table name
        .select('*', { count: 'exact', head: true }),
    ]);

    // ── Error handling per query ─────────────────────────────────────────
    if (vehiclesResult.error) {
      console.error('[platform-stats] vehicles query error:', vehiclesResult.error);
    }
    if (usersResult.error) {
      console.error('[platform-stats] users query error:', usersResult.error);
    }

    const vehicles = vehiclesResult.count ?? 0;
    const users = usersResult.count ?? 0;

    // ── Crowdfunding ─────────────────────────────────────────────────────
    // Currently hardcoded. To make this dynamic, either:
    // (a) Store it in a Supabase table (e.g. `crowdfunding_campaigns`)
    // (b) Fetch from BackaBuddy if they have an API
    const revenue = 0;
    const revenueGoal = 10000;
    const revenuePercentage = revenueGoal > 0
      ? Math.round((revenue / revenueGoal) * 100)
      : 0;

    return NextResponse.json(
      {
        vehicles,
        users,
        revenue,
        revenueGoal,
        revenuePercentage,
        lastUpdated: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          // Allow Vercel edge to cache this response for 5 minutes
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[platform-stats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform stats' },
      { status: 500 }
    );
  }
}