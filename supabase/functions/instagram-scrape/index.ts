import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCRAPECREATORS_API_URL = 'https://api.scrapecreators.com';

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

// ScrapeCreators API client
async function fetchScrapeCreators(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
  if (!apiKey) {
    throw new Error('SCRAPECREATORS_API_KEY não configurada');
  }

  const queryParams = new URLSearchParams(params);
  const url = `${SCRAPECREATORS_API_URL}${endpoint}?${queryParams}`;
  
  console.log(`[ScrapeCreators] Fetching: ${endpoint}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ScrapeCreators] API error: ${response.status}`, errorText);
    
    if (response.status === 401) {
      throw new Error('API key do ScrapeCreators inválida ou expirada');
    } else if (response.status === 402) {
      throw new Error('Créditos do ScrapeCreators esgotados');
    } else if (response.status === 429) {
      throw new Error('Rate limit do ScrapeCreators atingido');
    }
    
    throw new Error(`ScrapeCreators API error: ${response.status}`);
  }

  return response.json();
}

// Map ScrapeCreators profile data to our format
function mapProfileData(data: any): InstagramScrapedData {
  const user = data?.data?.user || data?.user || data;
  
  console.log('[ScrapeCreators] Mapping profile:', user?.username);
  
  return {
    username: user?.username,
    displayName: user?.full_name || user?.fullName,
    profileImageUrl: user?.profile_pic_url_hd || user?.profile_pic_url || user?.profilePicUrl,
    bio: user?.biography,
    followersCount: user?.edge_followed_by?.count || user?.followerCount || 0,
    followingCount: user?.edge_follow?.count || user?.followingCount || 0,
    postsCount: user?.edge_owner_to_timeline_media?.count || user?.mediaCount || 0,
    posts: [],
  };
}

// Helper to detect missing vs 0 counts
function toIntOrNull(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
  const s = String(value).trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

// Map ScrapeCreators posts to our format
function mapPosts(postsData: any, profileData: InstagramScrapedData): InstagramScrapedData {
  let edges: any[] = [];

  if (Array.isArray(postsData)) {
    edges = postsData;
  } else if (postsData?.data?.user?.edge_owner_to_timeline_media?.edges) {
    edges = postsData.data.user.edge_owner_to_timeline_media.edges;
  } else if (postsData?.edges) {
    edges = postsData.edges;
  }

  if (!edges || edges.length === 0) {
    console.log('[ScrapeCreators] No posts found to map');
    return profileData;
  }

  profileData.posts = edges.slice(0, 50).map((edge: any) => {
    const node = edge?.node || edge;
    const isVideo = node?.__typename === 'XDTGraphVideo' || node?.is_video || node?.product_type === 'clips';

    const likes = toIntOrNull(node?.edge_liked_by?.count ?? node?.likesCount ?? node?.like_count);
    const comments = toIntOrNull(node?.edge_media_to_comment?.count ?? node?.commentsCount ?? node?.comment_count);

    // Views: only when the API actually provides a view field
    const rawViews = node?.video_view_count ?? node?.video_play_count ?? node?.viewCount;
    const views = toIntOrNull(rawViews);

    return {
      postUrl: node?.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : '',
      type: isVideo ? 'video' : (node?.__typename === 'XDTGraphSidecar' ? 'carousel' : 'post'),
      thumbnailUrl: node?.display_url || node?.thumbnail_src || node?.thumbnailUrl,
      caption: (node?.edge_media_to_caption?.edges?.[0]?.node?.text || node?.caption || '')?.substring(0, 200),
      likesCount: likes ?? 0,
      commentsCount: comments ?? 0,
      // If missing, keep as null-ish at persistence layer by passing null below
      viewsCount: (views ?? 0),
      sharesCount: 0,
    };
  });

  console.log(`[ScrapeCreators] Mapped ${profileData.posts?.length || 0} posts`);
  return profileData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, accountId, fetchVideos = true, debug = false } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SCRAPECREATORS_API_KEY = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!SCRAPECREATORS_API_KEY) {
      console.error('[ScrapeCreators] API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SCRAPECREATORS_API_KEY não configurada. Adicione a chave nas variáveis de ambiente.' }),
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

    console.log(`[ScrapeCreators] Fetching Instagram profile: ${username}`);

    // Fetch profile data - use 'handle' as the parameter name
    const profileResult = await fetchScrapeCreators('/v1/instagram/profile', { handle: username });
    let data = mapProfileData(profileResult);

    // Ensure username is set
    if (!data.username) {
      data.username = username;
    }

    // Fetch posts if requested (profile already includes recent posts)
    if (fetchVideos) {
      const user = profileResult?.data?.user || profileResult?.user;
      if (user?.edge_owner_to_timeline_media?.edges) {
        data = mapPosts(user.edge_owner_to_timeline_media.edges, data);
      }
    }

    console.log('[ScrapeCreators] Parsed data:', data.displayName || data.username, 'with', data.posts?.length || 0, 'posts');

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
        console.error('[ScrapeCreators] Error updating account:', updateError);
      } else {
        console.log('[ScrapeCreators] Account updated successfully');
      }

      // Save metrics history (store aggregated views/likes/comments from fetched posts)
      const posts = data.posts || [];

      const hasAnyViews = posts.some((p) => p.viewsCount !== undefined && p.viewsCount !== null);
      const hasAnyLikes = posts.some((p) => p.likesCount !== undefined && p.likesCount !== null);
      const hasAnyComments = posts.some((p) => p.commentsCount !== undefined && p.commentsCount !== null);

      const totalViews = posts.reduce((sum, p) => sum + (typeof p.viewsCount === 'number' ? p.viewsCount : 0), 0);
      const totalLikes = posts.reduce((sum, p) => sum + (typeof p.likesCount === 'number' ? p.likesCount : 0), 0);
      const totalComments = posts.reduce((sum, p) => sum + (typeof p.commentsCount === 'number' ? p.commentsCount : 0), 0);

      await supabase.from('instagram_metrics_history').insert({
        account_id: accountId,
        followers_count: data.followersCount,
        likes_count: hasAnyLikes ? totalLikes : null,
        comments_count: hasAnyComments ? totalComments : null,
        views_count: hasAnyViews ? totalViews : null,
      });

      // Save posts to database
      if (data.posts && data.posts.length > 0) {
        for (const post of data.posts) {
          if (!post.postUrl) continue;
          
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
                likes_count: post.likesCount ?? null,
                comments_count: post.commentsCount ?? null,
                views_count: post.viewsCount ?? null,
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
                likes_count: post.likesCount ?? null,
                comments_count: post.commentsCount ?? null,
                views_count: post.viewsCount ?? null,
                shares_count: post.sharesCount,
              });
          }
        }
        console.log(`[ScrapeCreators] Saved ${data.posts.length} posts to database`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
        ...(debug ? { raw: { profile: profileResult } } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ScrapeCreators] Error scraping Instagram:', error);
    
    let errorMessage = 'Failed to fetch Instagram data';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('API key') || errorMessage.includes('401')) {
        statusCode = 401;
      } else if (errorMessage.includes('Créditos') || errorMessage.includes('402')) {
        statusCode = 402;
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        statusCode = 429;
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});