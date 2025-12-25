import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCRAPECREATORS_BASE_URL = 'https://api.scrapecreators.com';

async function fetchScrapeCreators(endpoint: string, params: Record<string, string> = {}) {
  const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
  
  if (!apiKey) {
    throw new Error('SCRAPECREATORS_API_KEY not configured');
  }

  const url = new URL(`${SCRAPECREATORS_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log(`[ScrapeCreators Test] Calling: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`[ScrapeCreators Test] API error: ${response.status}`, JSON.stringify(data));
    throw new Error(`ScrapeCreators API error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') || 'instagram';
    const username = url.searchParams.get('username') || 'instagram';
    const resource = url.searchParams.get('resource') || 'profile'; // profile | videos

    console.log(`[ScrapeCreators Test] Testing ${platform}/${resource} with username: ${username}`);

    let result: any;
    let endpoint: string;

    switch (platform) {
      case 'instagram':
        endpoint = '/v1/instagram/profile';
        // Profile already contains recent posts (including video_view_count for reels)
        result = await fetchScrapeCreators(endpoint, { handle: username });
        break;
      case 'tiktok':
        if (resource === 'videos') {
          endpoint = '/v3/tiktok/profile-videos';
          result = await fetchScrapeCreators(endpoint, { handle: username, count: '30' });
        } else {
          endpoint = '/v1/tiktok/profile';
          result = await fetchScrapeCreators(endpoint, { handle: username });
        }
        break;
      case 'youtube':
        if (resource === 'videos') {
          endpoint = '/v1/youtube/channel-videos';
          result = await fetchScrapeCreators(endpoint, { handle: username });
        } else {
          endpoint = '/v1/youtube/channel';
          result = await fetchScrapeCreators(endpoint, { handle: username });
        }
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log(`[ScrapeCreators Test] Success! Response keys:`, Object.keys(result));
    console.log(`[ScrapeCreators Test] Full response:`, JSON.stringify(result, null, 2));

    return new Response(JSON.stringify({
      success: true,
      platform,
      username,
      endpoint,
      data: result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ScrapeCreators Test] Error:', errorMessage);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
