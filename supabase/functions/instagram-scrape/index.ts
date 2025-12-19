const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramScrapedData {
  username?: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  posts?: Array<{
    postUrl: string;
    type: string;
    thumbnailUrl?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, action } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract username from URL or use directly
    let username = profileUrl.trim();
    const usernameMatch = profileUrl.match(/instagram\.com\/([^\/\?]+)/);
    if (usernameMatch) {
      username = usernameMatch[1];
    }
    username = username.replace('@', '').replace('/', '');

    const instagramUrl = `https://www.instagram.com/${username}/`;
    console.log(`Scraping Instagram profile with Firecrawl: ${instagramUrl}`);

    // Use Firecrawl to scrape the Instagram profile page
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: instagramUrl,
        formats: ['markdown', 'html', 'links'],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firecrawl error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Scraping failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeResult = await response.json();
    console.log('Firecrawl response received');

    const pageContent = scrapeResult.data?.markdown || scrapeResult.markdown || '';
    const html = scrapeResult.data?.html || scrapeResult.html || '';

    // Parse Instagram data from scraped content
    const data: InstagramScrapedData = {
      username: username,
      displayName: undefined,
      profileImageUrl: undefined,
      bio: undefined,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      posts: [],
    };

    // Try to extract follower count from content
    const followersMatch = pageContent.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Followers|seguidores)/i) ||
                          pageContent.match(/Followers[:\s]*(\d+(?:[.,]\d+)?[KMB]?)/i);
    if (followersMatch) {
      data.followersCount = parseCount(followersMatch[1]);
    }

    // Try to extract following count
    const followingMatch = pageContent.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Following|seguindo)/i) ||
                          pageContent.match(/Following[:\s]*(\d+(?:[.,]\d+)?[KMB]?)/i);
    if (followingMatch) {
      data.followingCount = parseCount(followingMatch[1]);
    }

    // Try to extract posts count
    const postsMatch = pageContent.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Posts|posts|publicações)/i);
    if (postsMatch) {
      data.postsCount = parseCount(postsMatch[1]);
    }

    // Try to extract bio - look for text between name and stats
    const bioMatch = pageContent.match(/\n([^\n]{10,300})\n.*?(?:Followers|Posts)/i);
    if (bioMatch) {
      data.bio = bioMatch[1].trim();
    }

    // Try to extract profile image from HTML
    const imgMatch = html.match(/profile_pic_url['":\s]+['"]([^'"]+)['"]/i) ||
                    html.match(/<img[^>]+alt="[^"]*profile[^"]*"[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      data.profileImageUrl = imgMatch[1].replace(/\\u0026/g, '&');
    }

    // Extract display name
    const nameMatch = pageContent.match(/^#?\s*([^\n\|]+)/);
    if (nameMatch && nameMatch[1].length < 50) {
      data.displayName = nameMatch[1].trim().replace(/^#\s*/, '');
    }

    console.log('Parsed data:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping Instagram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Instagram data';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseCount(countStr: string): number {
  if (!countStr) return 0;
  
  const normalized = countStr.replace(',', '.').toUpperCase();
  const numMatch = normalized.match(/([\d.]+)([KMB])?/);
  
  if (!numMatch) return 0;
  
  let num = parseFloat(numMatch[1]);
  const suffix = numMatch[2];
  
  if (suffix === 'K') num *= 1000;
  else if (suffix === 'M') num *= 1000000;
  else if (suffix === 'B') num *= 1000000000;
  
  return Math.round(num);
}
