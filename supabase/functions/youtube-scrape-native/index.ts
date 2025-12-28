import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// YouTube semi-public endpoints (no API key required)
const YOUTUBE_BROWSE_URL = 'https://www.youtube.com/youtubei/v1/browse';
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/channel';

// Innertube context for YouTube API
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
  videos: Array<{
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
  }>;
}

// Parse compact count (1.5M, 500K, etc)
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

// Parse duration string (PT4M30S -> seconds)
function parseDuration(duration?: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Resolve channel identifier to channel ID
async function resolveChannelId(identifier: string): Promise<{ channelId: string; handle?: string }> {
  const trimmed = identifier.trim();
  
  // Already a channel ID
  if (/^UC[\w-]{20,24}$/.test(trimmed)) {
    return { channelId: trimmed };
  }
  
  // Extract from URL or clean handle
  let handle = trimmed;
  
  // Handle various YouTube URL formats
  const urlMatch = trimmed.match(/youtube\.com\/(channel\/|@|c\/|user\/)?([^\/\?]+)/);
  if (urlMatch) {
    handle = urlMatch[2];
    if (urlMatch[1] === 'channel/') {
      return { channelId: handle };
    }
  }
  
  // Clean handle
  handle = handle.replace(/^@/, '').replace(/\/$/, '');
  
  console.log(`[YouTube Native] Resolving handle: ${handle}`);
  
  // Fetch channel page to get channel ID
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
  
  // Extract channel ID from various patterns
  const channelIdMatch = html.match(/"channelId":"(UC[\w-]+)"/) ||
                         html.match(/channel_id=(UC[\w-]+)/) ||
                         html.match(/"externalId":"(UC[\w-]+)"/);
  
  if (!channelIdMatch) {
    throw new Error(`Não foi possível extrair o Channel ID de: ${handle}`);
  }
  
  return { channelId: channelIdMatch[1], handle };
}

// Fetch channel metadata using YouTube Innertube API
async function fetchChannelData(channelId: string): Promise<any> {
  console.log(`[YouTube Native] Fetching channel data for: ${channelId}`);
  
  const response = await fetch(YOUTUBE_BROWSE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      ...INNERTUBE_CONTEXT,
      browseId: channelId,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar dados do canal: ${response.status}`);
  }
  
  return response.json();
}

// Fetch channel videos using Innertube API
async function fetchChannelVideos(channelId: string): Promise<any> {
  console.log(`[YouTube Native] Fetching videos for: ${channelId}`);
  
  // Fetch videos tab
  const response = await fetch(YOUTUBE_BROWSE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      ...INNERTUBE_CONTEXT,
      browseId: channelId,
      params: 'EgZ2aWRlb3PyBgQKAjoA', // Videos tab params
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar vídeos: ${response.status}`);
  }
  
  return response.json();
}

// Parse channel data from YouTube response
function parseChannelData(data: any): Partial<YouTubeScrapedData> {
  const header = data?.header?.c4TabbedHeaderRenderer || 
                 data?.header?.pageHeaderRenderer ||
                 data?.metadata?.channelMetadataRenderer;
  
  const metadata = data?.metadata?.channelMetadataRenderer || {};
  
  // Extract avatar
  const avatarSources = header?.avatar?.thumbnails || 
                        header?.image?.thumbnails ||
                        [];
  const profileImageUrl = avatarSources[avatarSources.length - 1]?.url || 
                          avatarSources[0]?.url;
  
  // Extract banner
  const bannerSources = header?.banner?.thumbnails || [];
  const bannerUrl = bannerSources[bannerSources.length - 1]?.url;
  
  // Extract subscriber count
  const subscriberText = header?.subscriberCountText?.simpleText ||
                         header?.subscriberCountText?.runs?.[0]?.text ||
                         '';
  
  // Extract video count
  const videoCountText = header?.videosCountText?.simpleText ||
                         header?.videosCountText?.runs?.[0]?.text ||
                         '';
  
  return {
    channelId: metadata?.externalId || data?.header?.c4TabbedHeaderRenderer?.channelId || '',
    username: metadata?.vanityChannelUrl?.split('@')[1] || metadata?.title || '',
    displayName: header?.title || metadata?.title || '',
    profileImageUrl: profileImageUrl?.replace(/=s\d+/, '=s400'),
    bannerUrl,
    description: metadata?.description?.substring(0, 500),
    subscribersCount: parseCompactCount(subscriberText),
    videosCount: parseCompactCount(videoCountText),
    totalViews: 0, // Will be calculated from videos
  };
}

// Parse videos from YouTube response
function parseVideos(data: any): YouTubeScrapedData['videos'] {
  const videos: YouTubeScrapedData['videos'] = [];
  
  // Navigate through the response structure
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const videosTab = tabs.find((t: any) => 
    t?.tabRenderer?.title === 'Videos' || 
    t?.tabRenderer?.selected
  );
  
  const content = videosTab?.tabRenderer?.content || 
                  data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content;
  
  const gridRenderer = content?.richGridRenderer ||
                       content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.gridRenderer;
  
  const items = gridRenderer?.contents || 
                content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || 
                [];
  
  for (const item of items.slice(0, 50)) {
    const videoRenderer = item?.richItemRenderer?.content?.videoRenderer ||
                         item?.gridVideoRenderer ||
                         item?.videoRenderer;
    
    if (!videoRenderer?.videoId) continue;
    
    const viewCountText = videoRenderer?.viewCountText?.simpleText ||
                         videoRenderer?.viewCountText?.runs?.[0]?.text ||
                         '0';
    
    const publishedText = videoRenderer?.publishedTimeText?.simpleText ||
                         videoRenderer?.publishedTimeText?.runs?.[0]?.text;
    
    // Check if it's a short
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
      likesCount: 0, // Not available in browse response
      commentsCount: 0, // Not available in browse response
      publishedAt: publishedText,
      duration: parseDuration(videoRenderer?.lengthText?.simpleText),
      isShort,
    });
  }
  
  console.log(`[YouTube Native] Parsed ${videos.length} videos`);
  return videos;
}

// Alternative: scrape from channel page HTML (more reliable fallback)
async function scrapeFromHtml(identifier: string): Promise<YouTubeScrapedData> {
  const { channelId, handle } = await resolveChannelId(identifier);
  
  console.log(`[YouTube Native] Scraping HTML for channel: ${channelId}`);
  
  // Fetch channel page
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
  
  // Extract initial data JSON
  const dataMatch = html.match(/var ytInitialData = ({.+?});<\/script>/);
  if (!dataMatch) {
    throw new Error('Não foi possível extrair dados do canal');
  }
  
  const ytData = JSON.parse(dataMatch[1]);
  
  // Parse channel info
  const channelData = parseChannelData(ytData);
  const videos = parseVideos(ytData);
  
  // Calculate total views from videos
  const totalViews = videos.reduce((sum, v) => sum + v.viewsCount, 0);
  
  return {
    channelId,
    username: handle || channelData.username || '',
    displayName: channelData.displayName || '',
    profileImageUrl: channelData.profileImageUrl,
    bannerUrl: channelData.bannerUrl,
    description: channelData.description,
    subscribersCount: channelData.subscribersCount || 0,
    videosCount: channelData.videosCount || videos.length,
    totalViews,
    scrapedVideosCount: videos.length,
    videos,
  };
}

// Main scraping function
async function scrapeYouTubeChannel(identifier: string, fetchVideos: boolean): Promise<YouTubeScrapedData> {
  try {
    // First try Innertube API
    const { channelId, handle } = await resolveChannelId(identifier);
    
    const channelResponse = await fetchChannelData(channelId);
    const channelData = parseChannelData(channelResponse);
    
    let videos: YouTubeScrapedData['videos'] = [];
    
    if (fetchVideos) {
      const videosResponse = await fetchChannelVideos(channelId);
      videos = parseVideos(videosResponse);
    }
    
    const totalViews = videos.reduce((sum, v) => sum + v.viewsCount, 0);
    
    return {
      channelId,
      username: handle || channelData.username || '',
      displayName: channelData.displayName || '',
      profileImageUrl: channelData.profileImageUrl,
      bannerUrl: channelData.bannerUrl,
      description: channelData.description,
      subscribersCount: channelData.subscribersCount || 0,
      videosCount: channelData.videosCount || videos.length,
      totalViews,
      scrapedVideosCount: videos.length,
      videos,
    };
  } catch (error) {
    console.log('[YouTube Native] Innertube API failed, trying HTML scraping...', error);
    // Fallback to HTML scraping
    return await scrapeFromHtml(identifier);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { accountId, username, identifier, channelId, url, fetchVideos = true, debug = false } = body || {};

    const channelIdentifier = identifier || username || channelId || url;

    if (!channelIdentifier) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identificador do canal é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[YouTube Native] Starting scrape for: ${channelIdentifier}`);

    const data = await scrapeYouTubeChannel(String(channelIdentifier), !!fetchVideos);

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
      const { error: updateError } = await supabase
        .from('youtube_accounts')
        .update({
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
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('[YouTube Native] Error updating account:', updateError);
      }

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

      // Save videos
      if (data.videos.length > 0) {
        for (const video of data.videos) {
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
          }
        }
        console.log(`[YouTube Native] Saved ${data.videos.length} videos`);
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
