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

    // Use RapidAPI Instagram Scraper API (junioroangel - more reliable)
    // API: instagram-scraper-api3.p.rapidapi.com
    const apiHost = 'instagram-scraper-api3.p.rapidapi.com';
    
    const profileResponse = await fetch(`https://${apiHost}/user_info_by_username?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': apiHost,
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
          JSON.stringify({ success: false, error: 'Invalid API key or subscription required. Please subscribe to the Instagram API on RapidAPI.' }),
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

    // Parse the profile data - handle different API response structures
    const userData = profileData.data || profileData.user || profileData;
    
    const data: InstagramScrapedData = {
      username: userData.username || username,
      displayName: userData.full_name || userData.fullName || null,
      profileImageUrl: userData.profile_pic_url || userData.profile_pic_url_hd || userData.profilePicUrl || null,
      bio: userData.biography || userData.bio || null,
      followersCount: userData.follower_count || userData.followers_count || userData.followers || 0,
      followingCount: userData.following_count || userData.followings_count || userData.following || 0,
      postsCount: userData.media_count || userData.posts_count || userData.mediaCount || 0,
      posts: [],
    };

    // Fetch recent posts
    try {
      const postsResponse = await fetch(`https://${apiHost}/user_posts_by_username?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': apiHost,
        },
      });

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        console.log('Posts data received:', JSON.stringify(postsData, null, 2).substring(0, 1000));

        // Handle different response structures
        const items = postsData.data?.items || postsData.items || postsData.edges || postsData.posts || [];
        
        if (items.length > 0) {
          data.posts = items.slice(0, 12).map((post: any) => {
            // Handle different post structures
            const node = post.node || post;
            return {
              postUrl: node.permalink || `https://www.instagram.com/p/${node.code || node.shortcode}/`,
              type: node.media_type === 2 || node.is_video ? 'video' : node.media_type === 8 ? 'carousel' : 'post',
              thumbnailUrl: node.thumbnail_url || node.display_url || node.thumbnail_src || null,
              caption: (node.caption?.text || node.edge_media_to_caption?.edges?.[0]?.node?.text || '')?.substring(0, 200) || null,
              likesCount: node.like_count || node.edge_liked_by?.count || node.likes_count || 0,
              commentsCount: node.comment_count || node.edge_media_to_comment?.count || node.comments_count || 0,
              viewsCount: node.play_count || node.view_count || node.video_view_count || 0,
            };
          });
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
