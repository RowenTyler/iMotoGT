import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Use environment variables directly to create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    // Fetch data from Supabase using direct fetch API
    const [vehicleCount, userCount, backaBuddyData] = await Promise.all([
      fetchVehicleCount(),
      fetchUserCount(),
      scrapeBackaBuddy(),
    ]);

    // Return combined stats
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
        error: 'Failed to fetch platform stats',
        vehicles: 0,
        users: 0,
        revenue: 0,
        revenueGoal: 10000,
        revenuePercentage: 0,
      },
      { status: 500 }
    );
  }
}

async function fetchVehicleCount(): Promise<number> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/vehicles?select=count`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch vehicle count');
    }

    // Get count from response header
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

async function fetchUserCount(): Promise<number> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=count`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user count');
    }

    // Get count from response header
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
    const url = 'https://www.backabuddy.co.za/campaign/imoto-gt-a-privacy-first-vehicle-marketplace';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract amount raised
    let raised = 0;
    const amountRaisedText = $('.amount-raised div').first().text().trim();
    const raisedMatch = amountRaisedText.match(/R\s*([0-9,\s]+)/);
    if (raisedMatch) {
      raised = parseFloat(raisedMatch[1].replace(/[,\s]/g, ''));
    }

    // Extract goal amount
    let goal = 10000;
    const goalText = $('.campaign-target').text().trim();
    const goalMatch = goalText.match(/R\s*([0-9,\s]+)/);
    if (goalMatch) {
      goal = parseFloat(goalMatch[1].replace(/[,\s]/g, ''));
    }

    // Calculate percentage
    const percentage = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;

    return { raised, goal, percentage };
  } catch (error) {
    console.error('Error scraping BackaBuddy:', error);
    return { raised: 0, goal: 10000, percentage: 0 };
  }
}

// Enable caching
export const revalidate = 300; // 5 minutes