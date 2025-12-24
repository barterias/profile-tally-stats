import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    sharesCount?: number;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, action, accountId, fetchVideos = true } = await req.json();

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

    console.log(`Fetching Instagram profile: ${username}, fetchVideos: ${fetchVideos}`);

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
    console.log('Profile data received');

    // Parse the profile data from ScrapeCreators API - data is nested in data.user
    const userData = profileData.data?.user || profileData.data || profileData;
    
    const data: InstagramScrapedData = {
      username: userData.username || username,
      displayName: userData.full_name || userData.fullName || undefined,
      profileImageUrl: userData.profile_pic_url_hd || userData.profile_pic_url || userData.profilePicUrl || undefined,
      bio: userData.biography || userData.bio || undefined,
      followersCount: userData.edge_followed_by?.count || userData.follower_count || userData.followersCount || 0,
      followingCount: userData.edge_follow?.count || userData.following_count || userData.followingCount || 0,
      postsCount: userData.edge_owner_to_timeline_media?.count || userData.media_count || userData.postsCount || 0,
      posts: [],
    };

    // Fetch posts using dedicated posts endpoint
    if (fetchVideos) {
      try {
        // First try from profile data
        const postsEdges = userData.edge_owner_to_timeline_media?.edges || userData.posts || userData.recent_posts || [];
        
        if (Array.isArray(postsEdges) && postsEdges.length > 0) {
          console.log(`Found ${postsEdges.length} posts in profile response`);
          data.posts = postsEdges.slice(0, 50).map((edge: any) => {
            const node = edge.node || edge;
            const isVideo = node.is_video || node.isVideo || node.__typename === 'GraphVideo';
            
            // Fallback chain for views: video_view_count -> play_count -> views -> impressions -> 0
            let viewsCount = 0;
            if (isVideo) {
              viewsCount = node.video_view_count ?? node.play_count ?? node.views ?? node.view_count ?? node.impressions ?? 0;
            } else {
              // For non-video posts, use impressions or reach as "views"
              viewsCount = node.impressions ?? node.reach ?? node.views ?? 0;
            }
            
            console.log(`Post ${node.shortcode || 'unknown'}: type=${isVideo ? 'video' : 'post'}, views=${viewsCount}, raw_video_view=${node.video_view_count}, play=${node.play_count}`);
            
            return {
              postUrl: node.url || node.postUrl || (node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : ''),
              type: isVideo ? 'video' : node.__typename === 'GraphSidecar' ? 'carousel' : 'post',
              thumbnailUrl: node.thumbnail_url || node.thumbnailUrl || node.thumbnail_src || node.display_url || undefined,
              caption: (node.edge_media_to_caption?.edges?.[0]?.node?.text || node.caption || '')?.substring(0, 200) || undefined,
              likesCount: node.edge_liked_by?.count || node.edge_media_preview_like?.count || node.like_count || node.likes || 0,
              commentsCount: node.edge_media_to_comment?.count || node.comment_count || node.comments || 0,
              viewsCount: viewsCount,
              sharesCount: node.share_count || node.shares || 0,
            };
          });
        } else {
          // Try dedicated posts endpoint
          const postsResponse = await fetch(
            `https://api.scrapecreators.com/v2/instagram/user/posts?handle=${encodeURIComponent(username)}&limit=50`,
            {
              method: 'GET',
              headers: {
                'x-api-key': scrapCreatorsApiKey,
                'Content-Type': 'application/json',
              },
            }
          );

          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            const postsArray = postsData.data?.posts || postsData.data || [];
            
            console.log(`Found ${postsArray.length} posts from v2 endpoint`);
            
            data.posts = postsArray.slice(0, 50).map((post: any) => {
              const isVideo = post.is_video || post.type === 'video' || post.media_type === 'VIDEO';
              
              // Fallback chain for views
              let viewsCount = 0;
              if (isVideo) {
                viewsCount = post.video_view_count ?? post.play_count ?? post.views ?? post.view_count ?? 0;
              } else {
                viewsCount = post.impressions ?? post.reach ?? post.views ?? 0;
              }
              
              console.log(`Post v2 ${post.shortcode || 'unknown'}: type=${isVideo ? 'video' : 'post'}, views=${viewsCount}`);
              
              return {
                postUrl: post.url || post.link || (post.shortcode ? `https://www.instagram.com/p/${post.shortcode}/` : ''),
                type: isVideo ? 'video' : post.type || 'post',
                thumbnailUrl: post.thumbnail_url || post.display_url || post.image || undefined,
                caption: post.caption?.substring(0, 200) || undefined,
                likesCount: post.like_count || post.likes || 0,
                commentsCount: post.comment_count || post.comments || 0,
                viewsCount: viewsCount,
                sharesCount: post.share_count || post.shares || 0,
              };
            });
          }
        }
      } catch (postsError) {
        console.error('Error parsing/fetching posts:', postsError);
      }
    }

    console.log('Parsed data:', data.displayName, 'with', data.posts?.length || 0, 'posts');

    // Update database if accountId is provided
    if (accountId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('instagram_accounts')
        .update({
          display_name: data.displayName,
          profile_image_url: data.profileImageUrl,
          bio: data.bio,
          followers_count: data.followersCount,
          following_count: data.followingCount,
          posts_count: data.postsCount,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('Error updating account:', updateError);
      }

      // Save metrics history
      await supabase.from('instagram_metrics_history').insert({
        account_id: accountId,
        followers_count: data.followersCount,
      });

      // Save posts to database
      if (data.posts && data.posts.length > 0) {
        for (const post of data.posts) {
          // Upsert post
          const { data: existingPost } = await supabase
            .from('instagram_posts')
            .select('id')
            .eq('account_id', accountId)
            .eq('post_url', post.postUrl)
            .maybeSingle();

          if (existingPost) {
            await supabase
              .from('instagram_posts')
              .update({
                post_type: post.type,
                thumbnail_url: post.thumbnailUrl,
                caption: post.caption,
                likes_count: post.likesCount,
                comments_count: post.commentsCount,
                views_count: post.viewsCount,
                shares_count: post.sharesCount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPost.id);
          } else {
            await supabase
              .from('instagram_posts')
              .insert({
                account_id: accountId,
                post_url: post.postUrl,
                post_type: post.type,
                thumbnail_url: post.thumbnailUrl,
                caption: post.caption,
                likes_count: post.likesCount,
                comments_count: post.commentsCount,
                views_count: post.viewsCount,
                shares_count: post.sharesCount,
              });
          }
        }
        console.log(`Saved ${data.posts.length} posts to database`);
      }
    }

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
