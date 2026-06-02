import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
      !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)',
    ].filter(Boolean);

    console.error(
      `[platform-stats] ❌ Missing env vars: ${missing.join(', ')}\n` +
      'Go to Vercel → Project → Settings → Environment Variables and add them for Production.'
    );

    return NextResponse.json(
      { error: 'Server misconfiguration', detail: `Missing: ${missing.join(', ')}` },
      { status: 500 }
    );
  }

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error('[platform-stats] ❌ Failed to create Supabase client:', err);
    return NextResponse.json({ error: 'Failed to initialize database client' }, { status: 500 });
  }

  try {
    const [vehiclesResult, usersResult] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .or('is_deleted.eq.false,is_deleted.is.null'),

      supabase
        .from('users')   // ✅ correct table name
        .select('*', { count: 'exact', head: true }),
    ]);

    if (vehiclesResult.error) {
      console.error('[platform-stats] vehicles query error:', JSON.stringify(vehiclesResult.error));
    }
    if (usersResult.error) {
      console.error('[platform-stats] users query error:', JSON.stringify(usersResult.error));
    }

    const vehicles = vehiclesResult.count ?? 0;
    const users = usersResult.count ?? 0;

    const revenue = 0;
    const revenueGoal = 10000;
    const revenuePercentage = revenueGoal > 0
      ? parseFloat(((revenue / revenueGoal) * 100).toFixed(1))
      : 0;

    console.log(`[platform-stats] ✅ vehicles=${vehicles}, users=${users}`);

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
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('[platform-stats] ❌ Unexpected error during query:', err);
    return NextResponse.json(
      { error: 'Database query failed', detail: String(err) },
      { status: 500 }
    );
  }
}
