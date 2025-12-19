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

    // Use RapidAPI Instagram API (instagram28 - has free tier)
    const apiHost = 'instagram28.p.rapidapi.com';
    
    const profileResponse = await fetch(`https://${apiHost}/user_info?user_name=${encodeURIComponent(username)}`, {
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

    // Parse the profile data from instagram28 API
    const userData = profileData.data?.user || profileData.user || profileData.data || profileData;
    
    const data: InstagramScrapedData = {
      username: userData.username || username,
      displayName: userData.full_name || undefined,
      profileImageUrl: userData.profile_pic_url_hd || userData.profile_pic_url || undefined,
      bio: userData.biography || undefined,
      followersCount: userData.edge_followed_by?.count || userData.follower_count || 0,
      followingCount: userData.edge_follow?.count || userData.following_count || 0,
      postsCount: userData.edge_owner_to_timeline_media?.count || userData.media_count || 0,
      posts: [],
    };

    // Extract posts from profile data if available
    try {
      const edges = userData.edge_owner_to_timeline_media?.edges || [];
      
      if (Array.isArray(edges) && edges.length > 0) {
        data.posts = edges.slice(0, 12).map((edge: any) => {
          const node = edge.node || edge;
          return {
            postUrl: `https://www.instagram.com/p/${node.shortcode}/`,
            type: node.is_video ? 'video' : node.__typename === 'GraphSidecar' ? 'carousel' : 'post',
            thumbnailUrl: node.thumbnail_src || node.display_url || undefined,
            caption: node.edge_media_to_caption?.edges?.[0]?.node?.text?.substring(0, 200) || undefined,
            likesCount: node.edge_liked_by?.count || node.like_count || 0,
            commentsCount: node.edge_media_to_comment?.count || node.comment_count || 0,
            viewsCount: node.video_view_count || 0,
          };
        });
      }
    } catch (postsError) {
      console.error('Error parsing posts:', postsError);
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
