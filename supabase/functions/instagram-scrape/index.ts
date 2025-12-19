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

    const scrapCreatorsApiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!scrapCreatorsApiKey) {
      console.error('SCRAPECREATORS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'ScrapeCreators API key not configured. Please add your SCRAPECREATORS_API_KEY.' }),
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

    // Use ScrapeCreators API
    const apiUrl = `https://api.scrapecreators.com/v1/instagram/profile?handle=${encodeURIComponent(username)}`;
    
    const profileResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': scrapCreatorsApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('ScrapeCreators API error:', profileResponse.status, errorText);
      
      if (profileResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (profileResponse.status === 401 || profileResponse.status === 403) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid API key. Please check your SCRAPECREATORS_API_KEY.' }),
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

    // Parse the profile data from ScrapeCreators API
    const userData = profileData.data || profileData;
    
    const data: InstagramScrapedData = {
      username: userData.username || username,
      displayName: userData.full_name || userData.fullName || undefined,
      profileImageUrl: userData.profile_pic_url_hd || userData.profile_pic_url || userData.profilePicUrl || undefined,
      bio: userData.biography || userData.bio || undefined,
      followersCount: userData.follower_count || userData.followersCount || userData.edge_followed_by?.count || 0,
      followingCount: userData.following_count || userData.followingCount || userData.edge_follow?.count || 0,
      postsCount: userData.media_count || userData.postsCount || userData.edge_owner_to_timeline_media?.count || 0,
      posts: [],
    };

    // Extract posts from profile data if available
    try {
      const posts = userData.posts || userData.recent_posts || userData.edge_owner_to_timeline_media?.edges || [];
      
      if (Array.isArray(posts) && posts.length > 0) {
        data.posts = posts.slice(0, 12).map((post: any) => {
          const node = post.node || post;
          return {
            postUrl: node.url || node.postUrl || (node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : ''),
            type: node.is_video || node.isVideo ? 'video' : node.__typename === 'GraphSidecar' ? 'carousel' : 'post',
            thumbnailUrl: node.thumbnail_url || node.thumbnailUrl || node.thumbnail_src || node.display_url || undefined,
            caption: (node.caption || node.edge_media_to_caption?.edges?.[0]?.node?.text || '')?.substring(0, 200) || undefined,
            likesCount: node.like_count || node.likesCount || node.edge_liked_by?.count || 0,
            commentsCount: node.comment_count || node.commentsCount || node.edge_media_to_comment?.count || 0,
            viewsCount: node.video_view_count || node.viewsCount || node.play_count || 0,
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
