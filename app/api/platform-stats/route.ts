import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured, returning default stats');
      return NextResponse.json({
        vehicles: 0,
        users: 0,
        revenue: 0,
        revenueGoal: 10000,
        revenuePercentage: 0,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Fetch data with timeout
    const [vehicleCount, userCount, backaBuddyData] = await Promise.all([
      fetchVehicleCount(supabaseUrl, supabaseKey),
      fetchUserCount(supabaseUrl, supabaseKey),
      scrapeBackaBuddy(),
    ]);

    return NextResponse.json({
      vehicles: vehicleCount,
      users: userCount,
      revenue: backaBuddyData.raised,
      revenueGoal: backaBuddyData.goal,
      revenuePercentage: backaBuddyData.percentage,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in platform-stats API:', error);
    return NextResponse.json(
      { 
        vehicles: 0,
        users: 0,
        revenue: 0,
        revenueGoal: 10000,
        revenuePercentage: 0,
      },
      { status: 200 } // Return 200 instead of 500 to not break the build
    );
  }
}

async function fetchVehicleCount(supabaseUrl: string, supabaseKey: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `${supabaseUrl}/rest/v1/vehicles?select=count`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
        signal: controller.signal,
        cache: 'no-store',
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to fetch vehicle count');
    }

    const count = response.headers.get('content-range');
    if (count) {
      const match = count.match(/\/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  } catch (error) {
    console.error('Error fetching vehicle count:', error);
    return 0;
  }
}

async function fetchUserCount(supabaseUrl: string, supabaseKey: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=count`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
        signal: controller.signal,
        cache: 'no-store',
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to fetch user count');
    }

    const count = response.headers.get('content-range');
    if (count) {
      const match = count.match(/\/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  } catch (error) {
    console.error('Error fetching user count:', error);
    return 0;
  }
}

async function scrapeBackaBuddy(): Promise<{
  raised: number;
  goal: number;
  percentage: number;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = 'https://www.backabuddy.co.za/campaign/imoto-gt-a-privacy-first-vehicle-marketplace';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let raised = 0;
    const amountRaisedText = $('.amount-raised div').first().text().trim();
    const raisedMatch = amountRaisedText.match(/R\s*([0-9,\s]+)/);
    if (raisedMatch) {
      raised = parseFloat(raisedMatch[1].replace(/[,\s]/g, ''));
    }

    let goal = 10000;
    const goalText = $('.campaign-target').text().trim();
    const goalMatch = goalText.match(/R\s*([0-9,\s]+)/);
    if (goalMatch) {
      goal = parseFloat(goalMatch[1].replace(/[,\s]/g, ''));
    }

    const percentage = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;

    return { raised, goal, percentage };
  } catch (error) {
    console.error('Error scraping BackaBuddy:', error);
    return { raised: 0, goal: 10000, percentage: 0 };
  }
}

// Disable caching during build
export const dynamic = 'force-dynamic';
export const revalidate = 0;