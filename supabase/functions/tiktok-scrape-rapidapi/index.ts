import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikTokVideo {
  videoId: string;
  videoUrl: string;
  caption?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration?: number;
  postedAt?: string;
}

interface TikTokScrapedData {
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  videosCount: number;
  scrapedVideosCount: number;
  totalViews: number;
  videos: TikTokVideo[];
}

function toInt(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function safeString(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

// Get user info from RapidAPI TikTok Scraper
async function getUserInfo(rapidApiKey: string, username: string): Promise<any> {
  console.log(`[TikTok RapidAPI] Getting user info for: ${username}`);
  
  const response = await fetch(
    `https://tiktok-scraper7.p.rapidapi.com/user/info?unique_id=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com',
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`[TikTok RapidAPI] User info failed: ${response.status} - ${text}`);
    throw new Error(`RapidAPI user info failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[TikTok RapidAPI] User info response:`, JSON.stringify(data).substring(0, 500));
  return data;
}

// Get user posts from RapidAPI TikTok Scraper
async function getUserPosts(rapidApiKey: string, username: string, cursor?: string): Promise<any> {
  console.log(`[TikTok RapidAPI] Getting posts for: ${username}, cursor: ${cursor || 'initial'}`);
  
  let url = `https://tiktok-scraper7.p.rapidapi.com/user/posts?unique_id=${encodeURIComponent(username)}&count=30`;
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[TikTok RapidAPI] Posts failed: ${response.status} - ${text}`);
    throw new Error(`RapidAPI posts failed: ${response.status}`);
  }

  return response.json();
}

// Map RapidAPI response to our video format
function mapRapidAPIVideos(posts: any[]): TikTokVideo[] {
  const videos: TikTokVideo[] = [];
  const seenIds = new Set<string>();

  for (const post of posts) {
    const videoId = safeString(post.video_id) || safeString(post.aweme_id);
    if (!videoId || seenIds.has(videoId)) continue;
    seenIds.add(videoId);

    const author = post.author?.unique_id || post.author?.uniqueId || '';
    
    videos.push({
      videoId,
      videoUrl: post.video?.play_addr?.url_list?.[0] || `https://www.tiktok.com/@${author}/video/${videoId}`,
      caption: safeString(post.desc) || safeString(post.title),
      thumbnailUrl: post.video?.cover?.url_list?.[0] || post.video?.origin_cover?.url_list?.[0],
      viewsCount: toInt(post.statistics?.play_count || post.play_count),
      likesCount: toInt(post.statistics?.digg_count || post.digg_count),
      commentsCount: toInt(post.statistics?.comment_count || post.comment_count),
      sharesCount: toInt(post.statistics?.share_count || post.share_count),
      duration: toInt(post.video?.duration || post.duration),
      postedAt: post.create_time ? new Date(post.create_time * 1000).toISOString() : undefined,
    });
  }

  return videos;
}

// Save videos to database
async function saveVideosToDB(supabase: any, accountId: string, username: string, videos: TikTokVideo[]) {
  console.log(`[TikTok RapidAPI] Saving ${videos.length} videos to database...`);
  
  let savedCount = 0;
  let updatedCount = 0;

  for (const video of videos) {
    if (!video.videoId) continue;

    const { data: existing } = await supabase
      .from('tiktok_videos')
      .select('id')
      .eq('account_id', accountId)
      .eq('video_id', video.videoId)
      .maybeSingle();

    if (existing) {
      await supabase.from('tiktok_videos').update({
        caption: video.caption,
        thumbnail_url: video.thumbnailUrl,
        views_count: video.viewsCount,
        likes_count: video.likesCount,
        comments_count: video.commentsCount,
        shares_count: video.sharesCount,
        duration: video.duration,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      updatedCount++;
    } else {
      await supabase.from('tiktok_videos').insert({
        account_id: accountId,
        video_id: video.videoId,
        video_url: video.videoUrl,
        caption: video.caption,
        thumbnail_url: video.thumbnailUrl,
        views_count: video.viewsCount,
        likes_count: video.likesCount,
        comments_count: video.commentsCount,
        shares_count: video.sharesCount,
        duration: video.duration,
        posted_at: video.postedAt,
      });
      savedCount++;
    }
  }

  console.log(`[TikTok RapidAPI] Saved ${savedCount} new, updated ${updatedCount}`);
  return { savedCount, updatedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { accountId, username, resultsLimit = 100 } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean username
    let cleanUsername = username.replace(/^@/, '').trim();
    const urlMatch = cleanUsername.match(/tiktok\.com\/@?([^\/\?]+)/);
    if (urlMatch) {
      cleanUsername = urlMatch[1];
    }

    console.log(`[TikTok RapidAPI] Starting scrape for: ${cleanUsername}`);

    // Get user info
    const userInfo = await getUserInfo(rapidApiKey, cleanUsername);
    const userData = userInfo.data?.user || userInfo.user || {};
    const statsData = userInfo.data?.stats || userInfo.stats || {};

    // Get user posts with pagination
    const allVideos: TikTokVideo[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = Math.ceil(resultsLimit / 30);

    while (hasMore && pageCount < maxPages && allVideos.length < resultsLimit) {
      try {
        const postsResponse = await getUserPosts(rapidApiKey, cleanUsername, cursor);
        const posts = postsResponse.data?.videos || postsResponse.videos || postsResponse.data?.aweme_list || [];
        
        if (posts.length === 0) {
          hasMore = false;
          break;
        }

        const mappedVideos = mapRapidAPIVideos(posts);
        allVideos.push(...mappedVideos);
        
        cursor = postsResponse.data?.cursor || postsResponse.cursor || postsResponse.data?.max_cursor;
        hasMore = postsResponse.data?.hasMore ?? postsResponse.hasMore ?? (posts.length >= 30);
        pageCount++;

        console.log(`[TikTok RapidAPI] Page ${pageCount}: got ${mappedVideos.length} videos, total: ${allVideos.length}`);

        // Small delay between requests
        if (hasMore && allVideos.length < resultsLimit) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (pageError) {
        console.error(`[TikTok RapidAPI] Error on page ${pageCount + 1}:`, pageError);
        break;
      }
    }

    // Limit videos to requested amount
    const limitedVideos = allVideos.slice(0, resultsLimit);

    const result: TikTokScrapedData = {
      username: userData.uniqueId || userData.unique_id || cleanUsername,
      displayName: userData.nickname || userData.nickName,
      profileImageUrl: userData.avatarLarger || userData.avatar_larger || userData.avatarMedium,
      bio: userData.signature,
      followersCount: toInt(statsData.followerCount || statsData.follower_count || userData.follower_count),
      followingCount: toInt(statsData.followingCount || statsData.following_count || userData.following_count),
      likesCount: toInt(statsData.heartCount || statsData.heart_count || statsData.heart || userData.total_favorited),
      videosCount: toInt(statsData.videoCount || statsData.video_count || userData.aweme_count),
      scrapedVideosCount: limitedVideos.length,
      totalViews: limitedVideos.reduce((sum, v) => sum + v.viewsCount, 0),
      videos: limitedVideos,
    };

    console.log(`[TikTok RapidAPI] Scrape complete: ${result.scrapedVideosCount} videos, ${result.totalViews} views`);

    // If accountId provided, save to database
    if (accountId) {
      // Save videos
      if (limitedVideos.length > 0) {
        await saveVideosToDB(supabase, accountId, cleanUsername, limitedVideos);
      }

      // Download and store profile image
      let storedProfileImageUrl = result.profileImageUrl;
      if (result.profileImageUrl) {
        try {
          const imageResponse = await fetch(result.profileImageUrl);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const fileName = `tiktok/${accountId}.png`;

            await supabase.storage.from('profile-avatars').upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: true,
            });

            const { data: publicUrlData } = supabase.storage.from('profile-avatars').getPublicUrl(fileName);
            storedProfileImageUrl = publicUrlData.publicUrl + `?t=${Date.now()}`;
          }
        } catch (e) {
          console.error('[TikTok RapidAPI] Error storing image:', e);
        }
      }

      // Update account
      await supabase.from('tiktok_accounts').update({
        display_name: result.displayName,
        profile_image_url: storedProfileImageUrl,
        bio: result.bio,
        followers_count: result.followersCount,
        following_count: result.followingCount,
        likes_count: result.likesCount,
        videos_count: result.videosCount,
        total_views: result.totalViews,
        scraped_videos_count: result.scrapedVideosCount,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      // Save metrics history
      await supabase.from('tiktok_metrics_history').insert({
        account_id: accountId,
        followers_count: result.followersCount,
        likes_count: result.likesCount,
        views_count: result.totalViews,
        comments_count: limitedVideos.reduce((sum, v) => sum + v.commentsCount, 0),
        shares_count: limitedVideos.reduce((sum, v) => sum + v.sharesCount, 0),
      });

      // Update profile_metrics
      await supabase.from('profile_metrics').upsert({
        profile_id: accountId,
        platform: 'tiktok',
        username: result.username,
        display_name: result.displayName,
        profile_image_url: storedProfileImageUrl,
        followers: result.followersCount,
        following: result.followingCount,
        total_views: result.totalViews,
        total_posts: result.videosCount,
        total_likes: result.likesCount,
        total_comments: limitedVideos.reduce((sum, v) => sum + v.commentsCount, 0),
        total_shares: limitedVideos.reduce((sum, v) => sum + v.sharesCount, 0),
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform,username' });
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[TikTok RapidAPI] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    // Check for rate limit errors
    const isRateLimit = errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit');
    
    if (isRateLimit) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'RATE_LIMIT',
          error: 'Limite de requisições atingido. Tente novamente em alguns minutos.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
