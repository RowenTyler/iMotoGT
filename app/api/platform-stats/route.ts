import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch vehicle count from database
    const { count: vehicleCount, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    if (vehicleError) {
      console.error('Error fetching vehicle count:', vehicleError);
    }

    // Fetch user count from database
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.error('Error fetching user count:', userError);
    }

    // Fetch BackaBuddy campaign data
    const backaBuddyData = await scrapeBackaBuddy();

    // Return combined stats
    return NextResponse.json({
      vehicles: vehicleCount || 0,
      users: userCount || 0,
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

async function scrapeBackaBuddy(): Promise<{
  raised: number;
  goal: number;
  percentage: number;
}> {
  try {
    const url = 'https://www.backabuddy.co.za/campaign/imoto-gt-a-privacy-first-vehicle-marketplace';
    
    // Fetch the page with proper headers to avoid blocking
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
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
    let goal = 10000; // Default
    const goalText = $('.campaign-target').text().trim();
    const goalMatch = goalText.match(/R\s*([0-9,\s]+)/);
    if (goalMatch) {
      goal = parseFloat(goalMatch[1].replace(/[,\s]/g, ''));
    }

    // Extract percentage from progress bar
    let percentage = 0;
    const progressBar = $('.progress-bar');
    const percentageText = progressBar.text().trim();
    const percentageMatch = percentageText.match(/([0-9.]+)%/);
    if (percentageMatch) {
      percentage = parseFloat(percentageMatch[1]);
    } else {
      // Calculate if not found
      percentage = goal > 0 ? Math.round((raised / goal) * 100) : 0;
    }

    return {
      raised,
      goal,
      percentage: Math.min(percentage, 100), // Cap at 100%
    };
  } catch (error) {
    console.error('Error scraping BackaBuddy:', error);
    // Return default values on error
    return {
      raised: 0,
      goal: 10000,
      percentage: 0,
    };
  }
}

// Optional: Add caching mechanism
export const revalidate = 300; // Revalidate every 5 minutes