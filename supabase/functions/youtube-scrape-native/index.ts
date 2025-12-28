import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// YouTube Innertube API
const YOUTUBE_BROWSE_URL = 'https://www.youtube.com/youtubei/v1/browse';

const INNERTUBE_CONTEXT = {
  context: {
    client: {
      clientName: 'WEB',
      clientVersion: '2.20240101.00.00',
      hl: 'en',
      gl: 'US',
    },
  },
};

interface YouTubeVideo {
  videoId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  publishedAt?: string;
  duration?: number;
  isShort?: boolean;
}

interface YouTubeScrapedData {
  channelId: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  bannerUrl?: string;
  description?: string;
  subscribersCount: number;
  videosCount: number;
  totalViews: number;
  scrapedVideosCount: number;
  videos: YouTubeVideo[];
}

function parseCompactCount(text?: string | number | null): number {
  if (text === null || text === undefined) return 0;
  if (typeof text === 'number') return Math.round(text);
  
  const str = String(text).trim().replace(/,/g, '');
  const match = str.match(/([\d.]+)\s*(K|M|B|mil|mi|bi)?/i);
  if (!match) return parseInt(str.replace(/\D/g, ''), 10) || 0;
  
  let value = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  
  if (suffix === 'K' || suffix === 'MIL') value *= 1_000;
  else if (suffix === 'M' || suffix === 'MI') value *= 1_000_000;
  else if (suffix === 'B' || suffix === 'BI') value *= 1_000_000_000;
  
  return Math.round(value);
}

function parseDuration(duration?: string): number {
  if (!duration) return 0;
  // Format: "4:30" or "1:23:45"
  const parts = duration.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function resolveChannelId(identifier: string): Promise<{ channelId: string; handle?: string }> {
  const trimmed = identifier.trim();
  
  if (/^UC[\w-]{20,24}$/.test(trimmed)) {
    return { channelId: trimmed };
  }
  
  let handle = trimmed;
  const urlMatch = trimmed.match(/youtube\.com\/(channel\/|@|c\/|user\/)?([^\/\?]+)/);
  if (urlMatch) {
    handle = urlMatch[2];
    if (urlMatch[1] === 'channel/') {
      return { channelId: handle };
    }
  }
  
  handle = handle.replace(/^@/, '').replace(/\/$/, '');
  
  console.log(`[YouTube Native] Resolving handle: ${handle}`);
  
  const channelUrl = `https://www.youtube.com/@${handle}`;
  const response = await fetch(channelUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Canal não encontrado: ${handle}`);
  }
  
  const html = await response.text();
  
  const channelIdMatch = html.match(/"channelId":"(UC[\w-]+)"/) ||
                         html.match(/channel_id=(UC[\w-]+)/) ||
                         html.match(/"externalId":"(UC[\w-]+)"/);
  
  if (!channelIdMatch) {
    throw new Error(`Não foi possível extrair o Channel ID de: ${handle}`);
  }
  
  return { channelId: channelIdMatch[1], handle };
}

async function fetchChannelPage(channelId: string): Promise<any> {
  const url = `https://www.youtube.com/channel/${channelId}/videos`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Erro ao acessar canal: ${response.status}`);
  }
  
  const html = await response.text();
  const dataMatch = html.match(/var ytInitialData = ({.+?});<\/script>/);
  if (!dataMatch) {
    throw new Error('Não foi possível extrair dados do canal');
  }
  
  return JSON.parse(dataMatch[1]);
}

async function fetchMoreVideos(continuation: string): Promise<any> {
  const response = await fetch(YOUTUBE_BROWSE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      ...INNERTUBE_CONTEXT,
      continuation,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar mais vídeos: ${response.status}`);
  }
  
  return response.json();
}

function parseChannelData(data: any): Partial<YouTubeScrapedData> {
  const header = data?.header?.c4TabbedHeaderRenderer || 
                 data?.header?.pageHeaderRenderer ||
                 data?.metadata?.channelMetadataRenderer;
  
  const metadata = data?.metadata?.channelMetadataRenderer || {};
  
  const avatarSources = header?.avatar?.thumbnails || header?.image?.thumbnails || [];
  const profileImageUrl = avatarSources[avatarSources.length - 1]?.url || avatarSources[0]?.url;
  
  const bannerSources = header?.banner?.thumbnails || [];
  const bannerUrl = bannerSources[bannerSources.length - 1]?.url;
  
  const subscriberText = header?.subscriberCountText?.simpleText ||
                         header?.subscriberCountText?.runs?.[0]?.text || '';
  
  const videoCountText = header?.videosCountText?.simpleText ||
                         header?.videosCountText?.runs?.[0]?.text || '';
  
  return {
    channelId: metadata?.externalId || data?.header?.c4TabbedHeaderRenderer?.channelId || '',
    username: metadata?.vanityChannelUrl?.split('@')[1] || metadata?.title || '',
    displayName: header?.title || metadata?.title || '',
    profileImageUrl: profileImageUrl?.replace(/=s\d+/, '=s400'),
    bannerUrl,
    description: metadata?.description?.substring(0, 500),
    subscribersCount: parseCompactCount(subscriberText),
    videosCount: parseCompactCount(videoCountText),
    totalViews: 0,
  };
}

function extractVideosFromTab(data: any): { videos: YouTubeVideo[]; continuation?: string } {
  const videos: YouTubeVideo[] = [];
  let continuation: string | undefined;
  
  // Find videos tab
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const videosTab = tabs.find((t: any) => 
    t?.tabRenderer?.title === 'Videos' || t?.tabRenderer?.selected
  );
  
  const content = videosTab?.tabRenderer?.content;
  const gridRenderer = content?.richGridRenderer;
  const items = gridRenderer?.contents || [];
  
  for (const item of items) {
    // Check for continuation token
    if (item?.continuationItemRenderer) {
      continuation = item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      continue;
    }
    
    const videoRenderer = item?.richItemRenderer?.content?.videoRenderer;
    if (!videoRenderer?.videoId) continue;
    
    const viewCountText = videoRenderer?.viewCountText?.simpleText ||
                         videoRenderer?.viewCountText?.runs?.[0]?.text || '0';
    
    const publishedText = videoRenderer?.publishedTimeText?.simpleText ||
                         videoRenderer?.publishedTimeText?.runs?.[0]?.text;
    
    const isShort = videoRenderer?.navigationEndpoint?.reelWatchEndpoint !== undefined ||
                    videoRenderer?.thumbnailOverlays?.some((o: any) => 
                      o?.thumbnailOverlayTimeStatusRenderer?.style === 'SHORTS'
                    );
    
    videos.push({
      videoId: videoRenderer.videoId,
      title: videoRenderer?.title?.runs?.[0]?.text || videoRenderer?.title?.simpleText || '',
      description: videoRenderer?.descriptionSnippet?.runs?.[0]?.text,
      thumbnailUrl: videoRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
      viewsCount: parseCompactCount(viewCountText),
      likesCount: 0,
      commentsCount: 0,
      publishedAt: publishedText,
      duration: parseDuration(videoRenderer?.lengthText?.simpleText),
      isShort,
    });
  }
  
  return { videos, continuation };
}

function extractVideosFromContinuation(data: any): { videos: YouTubeVideo[]; continuation?: string } {
  const videos: YouTubeVideo[] = [];
  let continuation: string | undefined;
  
  const actions = data?.onResponseReceivedActions || [];
  for (const action of actions) {
    const items = action?.appendContinuationItemsAction?.continuationItems || [];
    
    for (const item of items) {
      if (item?.continuationItemRenderer) {
        continuation = item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        continue;
      }
      
      const videoRenderer = item?.richItemRenderer?.content?.videoRenderer;
      if (!videoRenderer?.videoId) continue;
      
      const viewCountText = videoRenderer?.viewCountText?.simpleText ||
                           videoRenderer?.viewCountText?.runs?.[0]?.text || '0';
      
      const publishedText = videoRenderer?.publishedTimeText?.simpleText ||
                           videoRenderer?.publishedTimeText?.runs?.[0]?.text;
      
      const isShort = videoRenderer?.navigationEndpoint?.reelWatchEndpoint !== undefined;
      
      videos.push({
        videoId: videoRenderer.videoId,
        title: videoRenderer?.title?.runs?.[0]?.text || '',
        description: videoRenderer?.descriptionSnippet?.runs?.[0]?.text,
        thumbnailUrl: videoRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
        viewsCount: parseCompactCount(viewCountText),
        likesCount: 0,
        commentsCount: 0,
        publishedAt: publishedText,
        duration: parseDuration(videoRenderer?.lengthText?.simpleText),
        isShort,
      });
    }
  }
  
  return { videos, continuation };
}

// Main scraping function - fetches ALL videos with pagination
async function scrapeAllVideos(channelId: string, handle?: string): Promise<YouTubeScrapedData> {
  console.log(`[YouTube Native] Starting full scrape for channel: ${channelId}`);
  
  // Fetch initial page
  const initialData = await fetchChannelPage(channelId);
  const channelData = parseChannelData(initialData);
  
  const allVideos: YouTubeVideo[] = [];
  let { videos, continuation } = extractVideosFromTab(initialData);
  allVideos.push(...videos);
  
  console.log(`[YouTube Native] Initial batch: ${videos.length} videos, has continuation: ${!!continuation}`);
  
  // Fetch ALL pages until no more continuation
  let pageCount = 1;
  while (continuation) {
    pageCount++;
    console.log(`[YouTube Native] Fetching page ${pageCount}...`);
    
    try {
      const moreData = await fetchMoreVideos(continuation);
      const result = extractVideosFromContinuation(moreData);
      
      if (result.videos.length === 0) {
        console.log('[YouTube Native] No more videos found, stopping pagination');
        break;
      }
      
      allVideos.push(...result.videos);
      continuation = result.continuation;
      
      console.log(`[YouTube Native] Page ${pageCount}: ${result.videos.length} videos, total: ${allVideos.length}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[YouTube Native] Error fetching page ${pageCount}:`, error);
      break;
    }
  }
  
  const totalViews = allVideos.reduce((sum, v) => sum + v.viewsCount, 0);
  
  console.log(`[YouTube Native] Scrape complete: ${allVideos.length} total videos, ${totalViews} total views`);
  
  return {
    channelId,
    username: handle || channelData.username || '',
    displayName: channelData.displayName || '',
    profileImageUrl: channelData.profileImageUrl,
    bannerUrl: channelData.bannerUrl,
    description: channelData.description,
    subscribersCount: channelData.subscribersCount || 0,
    videosCount: channelData.videosCount || allVideos.length,
    totalViews,
    scrapedVideosCount: allVideos.length,
    videos: allVideos,
  };
}

// Save videos to database in batches
async function saveVideosToDB(supabase: any, accountId: string, videos: YouTubeVideo[]) {
  console.log(`[YouTube Native] Saving ${videos.length} videos to database...`);
  
  let savedCount = 0;
  let updatedCount = 0;
  
  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    
    for (const video of batch) {
      const videoUrl = video.isShort
        ? `https://www.youtube.com/shorts/${video.videoId}`
        : `https://www.youtube.com/watch?v=${video.videoId}`;

      const { data: existingVideo } = await supabase
        .from('youtube_videos')
        .select('id')
        .eq('account_id', accountId)
        .eq('video_id', video.videoId)
        .maybeSingle();

      if (existingVideo) {
        await supabase.from('youtube_videos').update({
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnailUrl,
          views_count: video.viewsCount,
          likes_count: video.likesCount,
          comments_count: video.commentsCount,
          duration: video.duration,
          video_url: videoUrl,
          updated_at: new Date().toISOString(),
        }).eq('id', existingVideo.id);
        updatedCount++;
      } else {
        await supabase.from('youtube_videos').insert({
          account_id: accountId,
          video_id: video.videoId,
          video_url: videoUrl,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnailUrl,
          views_count: video.viewsCount,
          likes_count: video.likesCount,
          comments_count: video.commentsCount,
          duration: video.duration,
          published_at: video.publishedAt,
        });
        savedCount++;
      }
    }
    
    console.log(`[YouTube Native] Processed batch ${Math.ceil((i + 1) / batchSize)}: ${savedCount} new, ${updatedCount} updated`);
  }
  
  return { savedCount, updatedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { accountId, username, identifier, channelId, url, fetchVideos = true } = body || {};

    const channelIdentifier = identifier || username || channelId || url;

    if (!channelIdentifier) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identificador do canal é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[YouTube Native] Starting scrape for: ${channelIdentifier}`);

    const { channelId: resolvedChannelId, handle } = await resolveChannelId(String(channelIdentifier));
    const data = await scrapeAllVideos(resolvedChannelId, handle);

    console.log('[YouTube Native] Scrape complete:', {
      username: data.username,
      displayName: data.displayName,
      subscribers: data.subscribersCount,
      videos: data.scrapedVideosCount,
      totalViews: data.totalViews,
    });

    // Update database if accountId provided
    if (accountId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Update account
      await supabase.from('youtube_accounts').update({
        channel_id: data.channelId,
        username: data.username,
        display_name: data.displayName,
        profile_image_url: data.profileImageUrl,
        banner_url: data.bannerUrl,
        description: data.description,
        subscribers_count: data.subscribersCount,
        videos_count: data.videosCount,
        total_views: data.totalViews,
        scraped_videos_count: data.scrapedVideosCount,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      // Save metrics history
      await supabase.from('youtube_metrics_history').insert({
        account_id: accountId,
        subscribers_count: data.subscribersCount,
        views_count: data.totalViews,
      });

      // Update profile_metrics
      await supabase.from('profile_metrics').upsert({
        profile_id: accountId,
        platform: 'youtube',
        username: data.username,
        display_name: data.displayName,
        profile_image_url: data.profileImageUrl,
        followers: data.subscribersCount,
        total_views: data.totalViews,
        total_posts: data.videosCount,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform,username' });

      // Save all videos
      if (fetchVideos && data.videos.length > 0) {
        await saveVideosToDB(supabase, accountId, data.videos);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[YouTube Native] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
