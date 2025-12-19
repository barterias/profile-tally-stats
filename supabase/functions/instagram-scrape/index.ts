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

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'RapidAPI key not configured. Please add your RAPIDAPI_KEY.' }),
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

    console.log(`Fetching Instagram profile: ${username}`);

    // Use RapidAPI Instagram Scraper API
    // API: instagram-scraper-api2.p.rapidapi.com
    const profileResponse = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('RapidAPI error:', profileResponse.status, errorText);
      
      if (profileResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (profileResponse.status === 403) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid API key or subscription required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `API error: ${profileResponse.status}` }),
        { status: profileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = await profileResponse.json();
    console.log('Profile data received:', JSON.stringify(profileData, null, 2));

    // Parse the profile data
    const data: InstagramScrapedData = {
      username: profileData.data?.username || username,
      displayName: profileData.data?.full_name || null,
      profileImageUrl: profileData.data?.profile_pic_url || profileData.data?.profile_pic_url_hd || null,
      bio: profileData.data?.biography || null,
      followersCount: profileData.data?.follower_count || 0,
      followingCount: profileData.data?.following_count || 0,
      postsCount: profileData.data?.media_count || 0,
      posts: [],
    };

    // Fetch recent posts
    try {
      const postsResponse = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1.2/posts?username_or_id_or_url=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
        },
      });

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        console.log('Posts data received:', JSON.stringify(postsData, null, 2).substring(0, 1000));

        if (postsData.data?.items) {
          data.posts = postsData.data.items.slice(0, 12).map((post: any) => ({
            postUrl: `https://www.instagram.com/p/${post.code}/`,
            type: post.media_type === 2 ? 'video' : post.media_type === 8 ? 'carousel' : 'post',
            thumbnailUrl: post.thumbnail_url || post.display_url || null,
            caption: post.caption?.text?.substring(0, 200) || null,
            likesCount: post.like_count || 0,
            commentsCount: post.comment_count || 0,
            viewsCount: post.play_count || post.view_count || 0,
          }));
        }
      }
    } catch (postsError) {
      console.error('Error fetching posts:', postsError);
      // Continue without posts - profile data is still useful
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
