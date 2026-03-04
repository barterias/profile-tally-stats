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
  
  console.log(`[ScrapeCreators] Fetching: ${endpoint}`, params);

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

    // Views: check ALL possible view/play count fields and take the highest
    const viewCandidates = [
      toIntOrNull(node?.video_view_count),
      toIntOrNull(node?.video_play_count),
      toIntOrNull(node?.viewCount),
      toIntOrNull(node?.play_count),
      toIntOrNull(node?.ig_reels_aggregated_all_plays_count),
      toIntOrNull(node?.clip_music_attribution_info?.ig_reels_aggregated_all_plays_count),
    ].filter((v): v is number => v !== null && v > 0);
    
    const views = viewCandidates.length > 0 ? Math.max(...viewCandidates) : 0;

    return {
      postUrl: node?.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : '',
      type: isVideo ? 'video' : (node?.__typename === 'XDTGraphSidecar' ? 'carousel' : 'post'),
      thumbnailUrl: node?.display_url || node?.thumbnail_src || node?.thumbnailUrl,
      caption: (node?.edge_media_to_caption?.edges?.[0]?.node?.text || node?.caption || '')?.substring(0, 200),
      likesCount: likes ?? 0,
      commentsCount: comments ?? 0,
      viewsCount: views,
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

  // Get pagination cursor - check all possible locations (ScrapeCreators uses profile_grid_items_cursor)
  nextCursor =
    postsData?.profile_grid_items_cursor ||
    postsData?.data?.profile_grid_items_cursor ||
    postsData?.paging_info?.profile_grid_items_cursor ||
    postsData?.pagination?.profile_grid_items_cursor ||
    postsData?.pagination?.cursor ||
    postsData?.next_max_id ||
    postsData?.data?.next_max_id ||
    postsData?.paging_info?.next_max_id ||
    null;

  console.log(`[ScrapeCreators] Posts from user/posts endpoint: ${items.length}, nextCursor: ${nextCursor || 'none'}`);
  
  // Log first post code to detect duplicates
  if (items.length > 0) {
    console.log(`[ScrapeCreators] First post code: ${items[0]?.code || items[0]?.shortcode || 'unknown'}`);
  }

  const posts = items.map((item: any, idx: number) => {
    const isVideo = item?.media_type === 2 || item?.product_type === 'clips' || item?.is_video;

    const likes = toIntOrNull(item?.like_count);
    const comments = toIntOrNull(item?.comment_count);
    
    // Instagram has multiple view/play count fields - check ALL of them and take the highest
    const viewCandidates = [
      toIntOrNull(item?.play_count),
      toIntOrNull(item?.video_play_count),
      toIntOrNull(item?.view_count),
      toIntOrNull(item?.ig_play_count),
      toIntOrNull(item?.fb_play_count),
      toIntOrNull(item?.ig_reels_aggregated_all_plays_count),
      toIntOrNull(item?.video_view_count),
      toIntOrNull(item?.media_preview_like_count),
      toIntOrNull(item?.clip_music_attribution_info?.ig_reels_aggregated_all_plays_count),
    ].filter((v): v is number => v !== null && v > 0);
    
    const views = viewCandidates.length > 0 ? Math.max(...viewCandidates) : 0;

    // Debug: log all view-related fields for first 2 posts
    if (idx < 2) {
      const viewFields: Record<string, any> = {};
      for (const key of Object.keys(item || {})) {
        if (key.toLowerCase().includes('view') || key.toLowerCase().includes('play') || key.toLowerCase().includes('count')) {
          viewFields[key] = item[key];
        }
      }
      console.log(`[ScrapeCreators] Post ${idx} (${item?.code}) view fields:`, JSON.stringify(viewFields));
      console.log(`[ScrapeCreators] Post ${idx} resolved views: ${views} from candidates: [${viewCandidates.join(', ')}]`);
    }

    return {
      postUrl: item?.code ? `https://www.instagram.com/p/${item.code}/` : (item?.permalink || ''),
      type: isVideo ? 'video' : (item?.media_type === 8 ? 'carousel' : 'post'),
      thumbnailUrl: item?.image_versions2?.candidates?.[0]?.url || item?.thumbnail_url || item?.display_url,
      caption: (item?.caption?.text || '')?.substring(0, 200),
      likesCount: likes ?? 0,
      commentsCount: comments ?? 0,
      viewsCount: views,
      sharesCount: 0,
      postedAt: item?.taken_at ? new Date(item.taken_at * 1000).toISOString() : null,
    };
  });

  return { posts, nextCursor };
}

// Map reels from /v1/instagram/user/reels endpoint
function mapReelsFromEndpoint(reelsData: any): { posts: any[]; nextCursor: string | null } {
  let items: any[] = [];
  let nextCursor: string | null = null;

  if (Array.isArray(reelsData?.items)) {
    items = reelsData.items;
  } else if (Array.isArray(reelsData?.data?.items)) {
    items = reelsData.data.items;
  } else if (Array.isArray(reelsData)) {
    items = reelsData;
  }

  nextCursor =
    reelsData?.paging_info?.max_id ||
    reelsData?.max_id ||
    reelsData?.data?.paging_info?.max_id ||
    null;

  console.log(`[ScrapeCreators] Reels from endpoint: ${items.length}, nextCursor: ${nextCursor || 'none'}`);

  const posts = items.map((item: any) => {
    const media = item?.media || item;
    const code = media?.code || media?.shortcode;
    const likes = toIntOrNull(media?.like_count);
    const comments = toIntOrNull(media?.comment_count);

    const viewCandidates = [
      toIntOrNull(media?.play_count),
      toIntOrNull(media?.ig_play_count),
      toIntOrNull(media?.video_play_count),
      toIntOrNull(media?.video_view_count),
      toIntOrNull(media?.view_count),
    ].filter((v): v is number => v !== null && v > 0);
    const views = viewCandidates.length > 0 ? Math.max(...viewCandidates) : 0;

    const thumbnailUrl = media?.image_versions2?.candidates?.[0]?.url || media?.display_uri || media?.thumbnail_url;
    const captionText = media?.caption?.text || (typeof media?.caption === 'string' ? media?.caption : '') || '';

    return {
      postUrl: code ? `https://www.instagram.com/reel/${code}/` : '',
      type: 'video' as const,
      thumbnailUrl,
      caption: (typeof captionText === 'string' ? captionText : '').substring(0, 200),
      likesCount: likes ?? 0,
      commentsCount: comments ?? 0,
      viewsCount: views,
      sharesCount: 0,
      postedAt: media?.taken_at ? new Date(media.taken_at * 1000).toISOString() : null,
    };
  }).filter((p: any) => p.postUrl);

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

    // Fetch posts AND reels with pagination
    let allPosts: any[] = [];
    let currentCursor: string | null = existingCursor;
    const MAX_PAGES = 10; // Increased to fetch all posts
    const MAX_POSTS = 10; // Maximum 10 posts per account (display)

    if (fetchVideos) {
      // === 1. Fetch from /v2/instagram/user/posts (timeline posts) ===
      console.log('[ScrapeCreators] Fetching timeline posts...');
      let pageCount = 0;
      let hasMore = true;

      while (hasMore && pageCount < MAX_PAGES) {
        pageCount++;
        const params: Record<string, string> = { handle: username, count: '50' };
        if (currentCursor) {
          params.cursor = currentCursor;
          params.max_id = currentCursor;
          params.next_max_id = currentCursor;
          params.profile_grid_items_cursor = currentCursor;
          params.end_cursor = currentCursor;
        }

        try {
          const postsResult = await fetchScrapeCreators('/v2/instagram/user/posts', params);
          const mapped = mapPostsFromUserPosts(postsResult);
          if (mapped.posts.length === 0) { hasMore = false; break; }
          allPosts = [...allPosts, ...mapped.posts];
          if (!mapped.nextCursor || mapped.nextCursor === currentCursor) {
            currentCursor = null; hasMore = false;
          } else {
            currentCursor = mapped.nextCursor;
          }
          console.log(`[ScrapeCreators] Posts page ${pageCount}: ${mapped.posts.length} posts (total: ${allPosts.length})`);
          if (hasMore) await new Promise(resolve => setTimeout(resolve, 500));
        } catch (postsError) {
          console.error(`[ScrapeCreators] Posts page ${pageCount} error:`, postsError);
          hasMore = false;
        }
      }
      console.log(`[ScrapeCreators] Timeline posts complete: ${allPosts.length} posts in ${pageCount} pages`);

      // === 2. Fetch from /v1/instagram/user/reels (Reels tab) ===
      console.log('[ScrapeCreators] Fetching Reels...');
      let reelsPageCount = 0;
      let reelsHasMore = true;
      let reelsCursor: string | null = null;

      while (reelsHasMore && reelsPageCount < MAX_PAGES) {
        reelsPageCount++;
        const reelsParams: Record<string, string> = { handle: username, count: '50' };
        if (reelsCursor) {
          reelsParams.max_id = reelsCursor;
          reelsParams.end_cursor = reelsCursor;
        }

        try {
          const reelsResult = await fetchScrapeCreators('/v1/instagram/user/reels', reelsParams);
          const mapped = mapReelsFromEndpoint(reelsResult);
          if (mapped.posts.length === 0) { reelsHasMore = false; break; }
          allPosts = [...allPosts, ...mapped.posts];
          if (!mapped.nextCursor || mapped.nextCursor === reelsCursor) {
            reelsHasMore = false;
          } else {
            reelsCursor = mapped.nextCursor;
          }
          console.log(`[ScrapeCreators] Reels page ${reelsPageCount}: ${mapped.posts.length} reels (total posts+reels: ${allPosts.length})`);
          if (reelsHasMore) await new Promise(resolve => setTimeout(resolve, 500));
        } catch (reelsError) {
          console.error(`[ScrapeCreators] Reels page ${reelsPageCount} error:`, reelsError);
          reelsHasMore = false;
        }
      }
      console.log(`[ScrapeCreators] Reels complete: fetched in ${reelsPageCount} pages, combined total: ${allPosts.length}`);
    }

    // Deduplicate posts by URL - normalize /p/ and /reel/ URLs to use shortcode
    const uniquePostsMap = new Map<string, any>();
    for (const post of allPosts) {
      if (!post.postUrl) continue;
      // Extract shortcode from both /p/CODE/ and /reel/CODE/ URLs
      const codeMatch = post.postUrl.match(/instagram\.com\/(?:p|reel)\/([^\/\?]+)/);
      const key = codeMatch ? codeMatch[1] : post.postUrl;
      
      const existing = uniquePostsMap.get(key);
      if (!existing) {
        uniquePostsMap.set(key, post);
      } else {
        // Keep the one with higher views
        if ((post.viewsCount || 0) > (existing.viewsCount || 0)) {
          uniquePostsMap.set(key, post);
        }
      }
    }
    
    // Sort by views descending, then take top MAX_POSTS
    const allUniquePosts = Array.from(uniquePostsMap.values())
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    const newPosts = allUniquePosts.slice(0, MAX_POSTS);
    const newCursor = currentCursor;
    
    // Calculate total views from ALL unique posts (not just top 10)
    const totalViewsAllPosts = allUniquePosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

    console.log(`[ScrapeCreators] After deduplication: ${allUniquePosts.length} unique (showing top ${newPosts.length}), total views across all: ${totalViewsAllPosts}`);

    data.posts = newPosts;
    data.scrapedPostsCount = allUniquePosts.length; // Track ALL scraped, not just displayed
    data.totalViews = totalViewsAllPosts; // Sum from ALL posts
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
            .select('id, likes_count, comments_count, views_count, shares_count')
            .eq('account_id', accountId)
            .eq('post_url', post.postUrl)
            .maybeSingle();

          if (existingPost) {
            // Protect metrics: keep existing higher values if new values are 0/null
            const safeViews = (post.viewsCount && post.viewsCount > 0) 
              ? Math.max(post.viewsCount, existingPost.views_count || 0) 
              : (existingPost.views_count || 0);
            const safeLikes = (post.likesCount && post.likesCount > 0) 
              ? Math.max(post.likesCount, existingPost.likes_count || 0) 
              : (existingPost.likes_count || 0);
            const safeComments = (post.commentsCount && post.commentsCount > 0) 
              ? Math.max(post.commentsCount, existingPost.comments_count || 0) 
              : (existingPost.comments_count || 0);
            const safeShares = (post.sharesCount && post.sharesCount > 0) 
              ? Math.max(post.sharesCount, existingPost.shares_count || 0) 
              : (existingPost.shares_count || 0);

            await supabase
              .from('instagram_posts')
              .update({
                post_type: post.type,
                thumbnail_url: post.thumbnailUrl || undefined,
                caption: post.caption || undefined,
                likes_count: safeLikes,
                comments_count: safeComments,
                views_count: safeViews,
                shares_count: safeShares,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPost.id);
            updatedCount++;
            console.log(`[ScrapeCreators] Protected update post: views=${safeViews}(new=${post.viewsCount},old=${existingPost.views_count}), likes=${safeLikes}(new=${post.likesCount},old=${existingPost.likes_count})`);
          } else {
            await supabase
              .from('instagram_posts')
              .insert({
                account_id: accountId,
                post_url: post.postUrl,
                post_type: post.type,
                thumbnail_url: post.thumbnailUrl,
                caption: post.caption,
                likes_count: post.likesCount ?? 0,
                comments_count: post.commentsCount ?? 0,
                views_count: post.viewsCount ?? 0,
                shares_count: post.sharesCount ?? 0,
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

      // Only update profile data on initial sync — protect against zeroed values
      if (!continueFrom) {
        // Get existing account data for protection
        const { data: existingAccountData } = await supabase
          .from('instagram_accounts')
          .select('followers_count, following_count, posts_count')
          .eq('id', accountId)
          .single();

        if (data.displayName) updateData.display_name = data.displayName;
        if (storedProfileImageUrl) updateData.profile_image_url = storedProfileImageUrl;
        if (data.bio) updateData.bio = data.bio;
        
        // Protect follower/following/posts counts from being zeroed
        updateData.followers_count = (data.followersCount && data.followersCount > 0) 
          ? data.followersCount 
          : (existingAccountData?.followers_count || 0);
        updateData.following_count = (data.followingCount && data.followingCount > 0) 
          ? data.followingCount 
          : (existingAccountData?.following_count || 0);
        updateData.posts_count = (data.postsCount && data.postsCount > 0) 
          ? data.postsCount 
          : (existingAccountData?.posts_count || 0);
        
        console.log(`[ScrapeCreators] Protected account update: followers=${updateData.followers_count}(new=${data.followersCount},old=${existingAccountData?.followers_count})`);
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
