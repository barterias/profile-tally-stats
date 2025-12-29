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
  scrapedPostsCount?: number;
  totalViews?: number;
  nextCursor?: string | null;
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
    scrapedPostsCount: 0,
    totalViews: 0,
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

  profileData.posts = edges.map((edge: any) => {
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
      viewsCount: (views ?? 0),
      sharesCount: 0,
    };
  });

  // Calculate totals
  profileData.scrapedPostsCount = profileData.posts?.length || 0;
  profileData.totalViews = profileData.posts?.reduce((sum, p) => sum + (p.viewsCount || 0), 0) || 0;

  console.log(`[ScrapeCreators] Mapped ${profileData.scrapedPostsCount} posts, total views: ${profileData.totalViews}`);
  return profileData;
}

// Map posts from /v2/instagram/user/posts endpoint
function mapPostsFromUserPosts(postsData: any): { posts: any[]; nextCursor: string | null } {
  let items: any[] = [];
  let nextCursor: string | null = null;

  // The endpoint returns items directly or in data.items
  if (Array.isArray(postsData?.items)) {
    items = postsData.items;
  } else if (Array.isArray(postsData?.data?.items)) {
    items = postsData.data.items;
  } else if (Array.isArray(postsData)) {
    items = postsData;
  }

  // Get pagination cursor
  nextCursor = postsData?.next_max_id || postsData?.data?.next_max_id || postsData?.paging_info?.next_max_id || null;

  console.log(`[ScrapeCreators] Posts from user/posts endpoint: ${items.length}, nextCursor: ${nextCursor ? 'yes' : 'no'}`);

  const posts = items.map((item: any) => {
    const isVideo = item?.media_type === 2 || item?.product_type === 'clips' || item?.is_video;

    const likes = toIntOrNull(item?.like_count);
    const comments = toIntOrNull(item?.comment_count);
    const views = toIntOrNull(item?.play_count ?? item?.video_play_count ?? item?.view_count);

    return {
      postUrl: item?.code ? `https://www.instagram.com/p/${item.code}/` : (item?.permalink || ''),
      type: isVideo ? 'video' : (item?.media_type === 8 ? 'carousel' : 'post'),
      thumbnailUrl: item?.image_versions2?.candidates?.[0]?.url || item?.thumbnail_url || item?.display_url,
      caption: (item?.caption?.text || '')?.substring(0, 200),
      likesCount: likes ?? 0,
      commentsCount: comments ?? 0,
      viewsCount: views ?? 0,
      sharesCount: 0,
      postedAt: item?.taken_at ? new Date(item.taken_at * 1000).toISOString() : null,
    };
  });

  return { posts, nextCursor };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      profileUrl,
      username: bodyUsername,
      accountId,
      fetchVideos = true,
      continueFrom = false,
      debug = false,
    } = body;

    // Accept either a full profileUrl (legacy) or a username (preferred)
    if (!profileUrl && !bodyUsername) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize username
    let username = String(bodyUsername ?? profileUrl).trim();
    if (profileUrl) {
      const usernameMatch = String(profileUrl).match(/instagram\.com\/([^\/\?]+)/);
      if (usernameMatch) {
        username = usernameMatch[1];
      }
    }
    username = username.replace('@', '').replace('/', '');

    const SCRAPECREATORS_API_KEY = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!SCRAPECREATORS_API_KEY) {
      console.error('[ScrapeCreators] API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SCRAPECREATORS_API_KEY não configurada. Adicione a chave nas variáveis de ambiente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ScrapeCreators] Fetching Instagram profile: ${username}, continueFrom: ${continueFrom}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing account data and cursor if continuing
    let existingCursor: string | null = null;
    let existingScrapedCount = 0;

    if (accountId && continueFrom) {
      const { data: existingAccount } = await supabase
        .from('instagram_accounts')
        .select('next_cursor, scraped_posts_count, posts_count')
        .eq('id', accountId)
        .single();
      
      existingCursor = existingAccount?.next_cursor || null;
      existingScrapedCount = existingAccount?.scraped_posts_count || 0;
      const totalPosts = existingAccount?.posts_count || 0;
      
      console.log(`[ScrapeCreators] Continue from cursor: ${existingCursor ? 'yes' : 'no'}, existing count: ${existingScrapedCount}, total: ${totalPosts}`);
      
      // Se não há cursor mas ainda faltam posts, fazer coleta sem cursor (do início)
      if (!existingCursor && existingScrapedCount >= totalPosts && totalPosts > 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Todos os posts já foram coletados' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Se não há cursor, continuar sem ele (vai buscar os mais recentes)
      if (!existingCursor) {
        console.log('[ScrapeCreators] No cursor but posts missing, starting fresh collection');
      }
    }

    // Fetch profile data - only on initial sync, not on continue
    let data: InstagramScrapedData = {
      username,
      scrapedPostsCount: 0,
      totalViews: 0,
      posts: [],
    };

    if (!continueFrom) {
      // Fetch profile data - use 'handle' as the parameter name
      const profileResult = await fetchScrapeCreators('/v1/instagram/profile', { handle: username });
      data = mapProfileData(profileResult);

      // Ensure username is set
      if (!data.username) {
        data.username = username;
      }
    }

    // Fetch ALL posts using pagination
    let allPosts: any[] = [];
    let currentCursor: string | null = existingCursor;
    const MAX_PAGES = 10; // Safety limit to prevent infinite loops
    const MAX_POSTS = 20; // Maximum posts to fetch

    if (fetchVideos) {
      console.log('[ScrapeCreators] Fetching ALL posts with pagination...');
      
      let pageCount = 0;
      let hasMore = true;

      while (hasMore && pageCount < MAX_PAGES && allPosts.length < MAX_POSTS) {
        pageCount++;
        const params: Record<string, string> = { handle: username };
        
        if (currentCursor) {
          params.max_id = currentCursor;
          console.log(`[ScrapeCreators] Page ${pageCount}: Using cursor`);
        } else {
          console.log(`[ScrapeCreators] Page ${pageCount}: Starting from beginning`);
        }

        try {
          const postsResult = await fetchScrapeCreators('/v2/instagram/user/posts', params);
          const mapped = mapPostsFromUserPosts(postsResult);
          
          if (mapped.posts.length === 0) {
            console.log(`[ScrapeCreators] Page ${pageCount}: No more posts, stopping`);
            hasMore = false;
            break;
          }

          allPosts = [...allPosts, ...mapped.posts];
          currentCursor = mapped.nextCursor;
          
          console.log(`[ScrapeCreators] Page ${pageCount}: Fetched ${mapped.posts.length} posts (total: ${allPosts.length}), next cursor: ${currentCursor ? 'yes' : 'no'}`);

          // Stop if no more cursor
          if (!currentCursor) {
            hasMore = false;
          }

          // Small delay to avoid rate limiting
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (postsError) {
          console.error(`[ScrapeCreators] Page ${pageCount}: Error fetching posts:`, postsError);
          hasMore = false;
          
          // Fallback: if first page failed and not continuing, use profile embedded posts
          if (pageCount === 1 && !continueFrom) {
            try {
              const profileResult = await fetchScrapeCreators('/v1/instagram/profile', { handle: username });
              const user = profileResult?.data?.user || profileResult?.user;
              if (user?.edge_owner_to_timeline_media?.edges) {
                data = mapPosts(user.edge_owner_to_timeline_media.edges, data);
                allPosts = data.posts || [];
              }
            } catch (fallbackError) {
              console.error('[ScrapeCreators] Fallback also failed:', fallbackError);
            }
          }
        }
      }

      console.log(`[ScrapeCreators] Pagination complete: ${allPosts.length} total posts fetched in ${pageCount} pages`);
    }

    const newPosts = allPosts;
    const newCursor = currentCursor;

    data.posts = newPosts;
    data.scrapedPostsCount = newPosts.length;
    data.totalViews = newPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    data.nextCursor = newCursor;

    console.log('[ScrapeCreators] Parsed data:', {
      username: data.displayName || data.username,
      posts: data.posts?.length || 0,
      scrapedPostsCount: data.scrapedPostsCount,
      totalViews: data.totalViews,
      hasNextCursor: !!data.nextCursor,
    });

    // Update database if accountId is provided
    if (accountId) {
      // Download and store profile image in Supabase Storage (only on initial sync)
      let storedProfileImageUrl = data.profileImageUrl;
      if (data.profileImageUrl && !continueFrom) {
        try {
          console.log('[ScrapeCreators] Downloading profile image...');
          const imageResponse = await fetch(data.profileImageUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            const imageBuffer = await imageBlob.arrayBuffer();
            const fileName = `instagram/${accountId}.png`;
            
            // Upload to storage (overwrite if exists)
            const { error: uploadError } = await supabase.storage
              .from('profile-avatars')
              .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: true
              });

            if (uploadError) {
              console.error('[ScrapeCreators] Error uploading image:', uploadError);
            } else {
              // Get public URL
              const { data: publicUrlData } = supabase.storage
                .from('profile-avatars')
                .getPublicUrl(fileName);
              
              storedProfileImageUrl = publicUrlData.publicUrl + `?t=${Date.now()}`;
              console.log('[ScrapeCreators] Profile image stored:', storedProfileImageUrl);
            }
          }
        } catch (imgError) {
          console.error('[ScrapeCreators] Error processing profile image:', imgError);
        }
      }

      // Save posts to database FIRST (using UPSERT to avoid duplicates)
      let savedCount = 0;
      let updatedCount = 0;
      
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
            updatedCount++;
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
            savedCount++;
          }
        }
        console.log(`[ScrapeCreators] Saved ${savedCount} new posts, updated ${updatedCount} existing`);
      }

      // Calculate total views from ALL posts in database
      const { data: allPosts } = await supabase
        .from('instagram_posts')
        .select('views_count')
        .eq('account_id', accountId);
      
      const totalViewsFromDb = (allPosts || []).reduce((sum, p) => sum + (p.views_count || 0), 0);
      const totalScrapedCount = (allPosts || []).length;
      
      console.log(`[ScrapeCreators] Total from DB: ${totalScrapedCount} posts, ${totalViewsFromDb} views`);

      // Update account with totals and cursor
      const updateData: any = {
        total_views: totalViewsFromDb,
        scraped_posts_count: totalScrapedCount,
        next_cursor: newCursor,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only update profile data on initial sync
      if (!continueFrom) {
        updateData.display_name = data.displayName;
        updateData.profile_image_url = storedProfileImageUrl;
        updateData.bio = data.bio;
        updateData.followers_count = data.followersCount;
        updateData.following_count = data.followingCount;
        updateData.posts_count = data.postsCount;
      }

      const { error: updateError } = await supabase
        .from('instagram_accounts')
        .update(updateData)
        .eq('id', accountId);

      if (updateError) {
        console.error('[ScrapeCreators] Error updating account:', updateError);
      } else {
        console.log('[ScrapeCreators] Account updated successfully with total_views, scraped_posts_count, and cursor');
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

      // Update unified profile_metrics table (triggers realtime) - only on initial sync
      if (!continueFrom && data.followersCount) {
        const { error: profileMetricsError } = await supabase
          .from('profile_metrics')
          .upsert({
            profile_id: accountId,
            platform: 'instagram',
            username: data.username || username,
            display_name: data.displayName,
            profile_image_url: storedProfileImageUrl,
            followers: data.followersCount || 0,
            following: data.followingCount || 0,
            total_views: totalViewsFromDb,
            total_likes: hasAnyLikes ? totalLikes : 0,
            total_posts: data.postsCount || 0,
            total_comments: hasAnyComments ? totalComments : 0,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'platform,username' });

        if (profileMetricsError) {
          console.error('[ScrapeCreators] Error updating profile_metrics:', profileMetricsError);
        } else {
          console.log('[ScrapeCreators] profile_metrics updated (realtime trigger)');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...data,
          hasMore: !!newCursor,
        },
        ...(debug ? { raw: {} } : {}),
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
