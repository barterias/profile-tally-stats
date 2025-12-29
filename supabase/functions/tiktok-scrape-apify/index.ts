import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApifyRunResponse {
  data: {
    id: string;
    defaultDatasetId: string;
  };
}

interface ApifyRunStatus {
  data: {
    status: string;
    defaultDatasetId: string;
  };
}

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

// Start Apify TikTok Profile Scraper run
async function startApifyRun(apifyToken: string, profileUrl: string, resultsLimit: number): Promise<ApifyRunResponse> {
  console.log(`[TikTok Apify] Starting run for: ${profileUrl}, limit: ${resultsLimit}`);
  
  const response = await fetch(
    `https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/runs?token=${apifyToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: [profileUrl],
        resultsPerPage: resultsLimit,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
        shouldDownloadSlideshowImages: false,
        // Use minimal memory to avoid hitting free tier limits
        memory: 1024,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify start failed: ${response.status} - ${text}`);
  }

  return response.json();
}

// Check run status
async function checkRunStatus(apifyToken: string, runId: string): Promise<ApifyRunStatus> {
  const response = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
  );
  if (!response.ok) throw new Error(`Failed to check run status: ${response.status}`);
  return response.json();
}

// Wait for run to complete
async function waitForRunCompletion(apifyToken: string, runId: string, maxWaitMs = 180000): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 3000;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkRunStatus(apifyToken, runId);
    console.log(`[TikTok Apify] Run status: ${status.data.status}`);

    if (status.data.status === 'SUCCEEDED') {
      return status.data.defaultDatasetId;
    }
    if (status.data.status === 'FAILED' || status.data.status === 'ABORTED') {
      throw new Error(`Apify run ${status.data.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Apify run timed out');
}

// Get dataset items
async function getDatasetItems(apifyToken: string, datasetId: string): Promise<any[]> {
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&format=json`
  );
  if (!response.ok) throw new Error(`Failed to get dataset: ${response.status}`);
  return response.json();
}

// Map Apify items to our video format
function mapApifyItemsToData(items: any[]): { profile: Partial<TikTokScrapedData>; videos: TikTokVideo[] } {
  const videos: TikTokVideo[] = [];
  const seenIds = new Set<string>();
  let profile: Partial<TikTokScrapedData> = {};

  for (const item of items) {
    // Extract profile info from first item that has it
    if (!profile.username && item.authorMeta) {
      profile = {
        username: item.authorMeta.name || item.authorMeta.nickName,
        displayName: item.authorMeta.nickName || item.authorMeta.name,
        profileImageUrl: item.authorMeta.avatar,
        bio: item.authorMeta.signature,
        followersCount: toInt(item.authorMeta.fans || item.authorMeta.followers),
        followingCount: toInt(item.authorMeta.following),
        likesCount: toInt(item.authorMeta.heart || item.authorMeta.likes),
        videosCount: toInt(item.authorMeta.video),
      };
    }

    // Extract video data
    const videoId = safeString(item.id) || safeString(item.videoId);
    if (!videoId || seenIds.has(videoId)) continue;
    
    // Validate videoId is numeric and long enough
    if (!/^\d{10,}$/.test(videoId)) continue;
    
    seenIds.add(videoId);

    const username = item.authorMeta?.name || profile.username || '';
    
    videos.push({
      videoId,
      videoUrl: item.webVideoUrl || `https://www.tiktok.com/@${username}/video/${videoId}`,
      caption: safeString(item.text) || safeString(item.desc),
      thumbnailUrl: item.covers?.default || item.videoMeta?.coverUrl,
      viewsCount: toInt(item.playCount || item.videoMeta?.playCount),
      likesCount: toInt(item.diggCount || item.videoMeta?.diggCount),
      commentsCount: toInt(item.commentCount || item.videoMeta?.commentCount),
      sharesCount: toInt(item.shareCount || item.videoMeta?.shareCount),
      duration: toInt(item.videoMeta?.duration),
      postedAt: item.createTimeISO || (item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined),
    });
  }

  console.log(`[TikTok Apify] Mapped ${videos.length} videos from ${items.length} items`);
  return { profile, videos };
}

// Save videos to database
async function saveVideosToDB(supabase: any, accountId: string, username: string, videos: TikTokVideo[]) {
  console.log(`[TikTok Apify] Saving ${videos.length} videos to database...`);
  
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

  console.log(`[TikTok Apify] Saved ${savedCount} new, updated ${updatedCount}`);
  return { savedCount, updatedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');
    if (!apifyToken) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { accountId, username, resultsLimit = 200 } = await req.json();

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

    const profileUrl = `https://www.tiktok.com/@${cleanUsername}`;
    
    // Start Apify run
    const runResponse = await startApifyRun(apifyToken, profileUrl, resultsLimit);
    const runId = runResponse.data.id;
    console.log(`[TikTok Apify] Run started: ${runId}`);

    // Wait for completion
    const datasetId = await waitForRunCompletion(apifyToken, runId);
    console.log(`[TikTok Apify] Run completed, dataset: ${datasetId}`);

    // Get results
    const items = await getDatasetItems(apifyToken, datasetId);
    console.log(`[TikTok Apify] Got ${items.length} items from dataset`);

    // Map to our format
    const { profile, videos } = mapApifyItemsToData(items);

    const result: TikTokScrapedData = {
      username: profile.username || cleanUsername,
      displayName: profile.displayName,
      profileImageUrl: profile.profileImageUrl,
      bio: profile.bio,
      followersCount: profile.followersCount || 0,
      followingCount: profile.followingCount || 0,
      likesCount: profile.likesCount || 0,
      videosCount: profile.videosCount || videos.length,
      scrapedVideosCount: videos.length,
      totalViews: videos.reduce((sum, v) => sum + v.viewsCount, 0),
      videos,
    };

    console.log(`[TikTok Apify] Scrape complete: ${result.scrapedVideosCount} videos, ${result.totalViews} views`);

    // If accountId provided, save to database
    if (accountId) {
      // Save videos
      if (videos.length > 0) {
        await saveVideosToDB(supabase, accountId, cleanUsername, videos);
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
          console.error('[TikTok Apify] Error storing image:', e);
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
        comments_count: videos.reduce((sum, v) => sum + v.commentsCount, 0),
        shares_count: videos.reduce((sum, v) => sum + v.sharesCount, 0),
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
        total_comments: videos.reduce((sum, v) => sum + v.commentsCount, 0),
        total_shares: videos.reduce((sum, v) => sum + v.sharesCount, 0),
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform,username' });
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[TikTok Apify] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
