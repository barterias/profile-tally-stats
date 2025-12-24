import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENSEMBLEDATA_API_URL = 'https://ensembledata.com/apis';

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

async function fetchEnsembleData(endpoint: string, params: Record<string, string>): Promise<any> {
  const token = Deno.env.get('ENSEMBLEDATA_TOKEN');
  if (!token) {
    throw new Error('ENSEMBLEDATA_TOKEN not configured');
  }

  const queryParams = new URLSearchParams({ ...params, token });
  const url = `${ENSEMBLEDATA_API_URL}${endpoint}?${queryParams}`;
  
  console.log(`Fetching EnsembleData: ${endpoint}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('EnsembleData API error:', response.status, errorText);
    throw new Error(`EnsembleData API error: ${response.status}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, accountId, fetchVideos = true } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = Deno.env.get('ENSEMBLEDATA_TOKEN');
    if (!token) {
      console.error('ENSEMBLEDATA_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'EnsembleData token not configured. Please add your ENSEMBLEDATA_TOKEN.' }),
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

    console.log(`Fetching Instagram profile via EnsembleData: ${username}`);

    // Fetch user info from EnsembleData
    const userInfoResult = await fetchEnsembleData('/instagram/user/info', { username });
    const userData = userInfoResult.data || userInfoResult;

    const data: InstagramScrapedData = {
      username: userData.username || username,
      displayName: userData.full_name || userData.fullName || undefined,
      profileImageUrl: userData.profile_pic_url_hd || userData.profile_pic_url || userData.hd_profile_pic_url_info?.url || undefined,
      bio: userData.biography || userData.bio || undefined,
      followersCount: userData.follower_count || userData.edge_followed_by?.count || 0,
      followingCount: userData.following_count || userData.edge_follow?.count || 0,
      postsCount: userData.media_count || userData.edge_owner_to_timeline_media?.count || 0,
      posts: [],
    };

    // Fetch user reels/posts if requested
    if (fetchVideos && userData.pk) {
      try {
        const reelsResult = await fetchEnsembleData('/instagram/user/reels', {
          user_id: String(userData.pk),
          depth: '1',
          include_feed_video: 'true',
          chunk_size: '50',
        });

        const reelsData = reelsResult.data?.items || reelsResult.data || [];
        
        if (Array.isArray(reelsData)) {
          console.log(`Found ${reelsData.length} reels/posts`);
          data.posts = reelsData.slice(0, 50).map((item: any) => {
            const isVideo = item.is_video || item.media_type === 2;
            return {
              postUrl: item.code ? `https://www.instagram.com/p/${item.code}/` : '',
              type: isVideo ? 'video' : item.media_type === 8 ? 'carousel' : 'post',
              thumbnailUrl: item.image_versions2?.candidates?.[0]?.url || item.thumbnail_url || undefined,
              caption: item.caption?.text?.substring(0, 200) || undefined,
              likesCount: item.like_count || 0,
              commentsCount: item.comment_count || 0,
              viewsCount: item.play_count || item.view_count || 0,
              sharesCount: item.share_count || 0,
            };
          });
        }
      } catch (postsError) {
        console.error('Error fetching posts:', postsError);
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
