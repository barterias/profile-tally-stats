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

function parseInstagramMetrics(markdown: string, profileUrl: string): InstagramScrapedData {
  console.log('Parsing Instagram data from markdown...');
  
  const data: InstagramScrapedData = {};
  
  // Extract username from URL
  const usernameMatch = profileUrl.match(/instagram\.com\/([^\/\?]+)/);
  if (usernameMatch) {
    data.username = usernameMatch[1];
  }
  
  // Try to extract follower count
  const followersPatterns = [
    /(\d+(?:[.,]\d+)?[KkMm]?)\s*(?:followers|seguidores)/i,
    /followers[:\s]*(\d+(?:[.,]\d+)?[KkMm]?)/i,
    /(\d+(?:[.,]\d+)?)\s*mil?\s*(?:followers|seguidores)/i,
  ];
  
  for (const pattern of followersPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      data.followersCount = parseMetricValue(match[1]);
      break;
    }
  }
  
  // Try to extract following count
  const followingPatterns = [
    /(\d+(?:[.,]\d+)?[KkMm]?)\s*following/i,
    /following[:\s]*(\d+(?:[.,]\d+)?[KkMm]?)/i,
    /seguindo[:\s]*(\d+(?:[.,]\d+)?[KkMm]?)/i,
  ];
  
  for (const pattern of followingPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      data.followingCount = parseMetricValue(match[1]);
      break;
    }
  }
  
  // Try to extract posts count
  const postsPatterns = [
    /(\d+(?:[.,]\d+)?[KkMm]?)\s*posts/i,
    /posts[:\s]*(\d+(?:[.,]\d+)?[KkMm]?)/i,
    /publicações[:\s]*(\d+(?:[.,]\d+)?[KkMm]?)/i,
  ];
  
  for (const pattern of postsPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      data.postsCount = parseMetricValue(match[1]);
      break;
    }
  }
  
  // Extract posts with metrics
  data.posts = [];
  
  // Look for post patterns with likes/comments/views
  const postPatterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/g,
  ];
  
  for (const pattern of postPatterns) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      const postId = match[1];
      const postUrl = `https://www.instagram.com/p/${postId}/`;
      
      // Look for metrics near this post URL in the markdown
      const contextStart = Math.max(0, match.index - 500);
      const contextEnd = Math.min(markdown.length, match.index + 500);
      const context = markdown.substring(contextStart, contextEnd);
      
      const likes = extractMetricFromContext(context, ['likes', 'curtidas', '❤️']);
      const comments = extractMetricFromContext(context, ['comments', 'comentários', '💬']);
      const views = extractMetricFromContext(context, ['views', 'visualizações', 'plays', '👁️']);
      
      data.posts.push({
        postUrl,
        type: match[0].includes('/reel/') ? 'reel' : 'post',
        likesCount: likes,
        commentsCount: comments,
        viewsCount: views,
      });
    }
  }
  
  console.log('Parsed data:', JSON.stringify(data, null, 2));
  return data;
}

function parseMetricValue(value: string): number {
  if (!value) return 0;
  
  value = value.replace(/,/g, '.').toLowerCase();
  
  let multiplier = 1;
  if (value.includes('k')) {
    multiplier = 1000;
    value = value.replace('k', '');
  } else if (value.includes('m')) {
    multiplier = 1000000;
    value = value.replace('m', '');
  }
  
  const num = parseFloat(value);
  return isNaN(num) ? 0 : Math.round(num * multiplier);
}

function extractMetricFromContext(context: string, keywords: string[]): number {
  for (const keyword of keywords) {
    const patterns = [
      new RegExp(`(\\d+(?:[.,]\\d+)?[KkMm]?)\\s*${keyword}`, 'i'),
      new RegExp(`${keyword}[:\\s]*(\\d+(?:[.,]\\d+)?[KkMm]?)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match) {
        return parseMetricValue(match[1]);
      }
    }
  }
  return 0;
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

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Scraping service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize Instagram URL
    let formattedUrl = profileUrl.trim();
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://www.instagram.com/${formattedUrl.replace('@', '')}/`;
    }

    console.log(`Scraping Instagram profile: ${formattedUrl}`);

    // Scrape the profile page
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'links'],
        waitFor: 3000,
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl API error:', scrapeData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: scrapeData.error || `Scraping failed with status ${scrapeResponse.status}` 
        }),
        { status: scrapeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the scraped content
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const parsedData = parseInstagramMetrics(markdown, formattedUrl);

    console.log('Scrape successful, parsed data:', parsedData);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        rawMarkdown: markdown.substring(0, 5000), // Limit for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping Instagram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape Instagram';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
