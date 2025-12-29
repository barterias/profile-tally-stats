import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
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
  
  const str = String(text).trim().replace(/,/g, '').replace(/\./g, '');
  
  // Handle "123 views", "1.5K views", "2M views" etc.
  const match = str.match(/([\d,.]+)\s*(K|M|B|mil|mi|bi|thousand|million|billion)?/i);
  if (!match) return parseInt(str.replace(/\D/g, ''), 10) || 0;
  
  let value = parseFloat(match[1].replace(',', '.'));
  const suffix = match[2]?.toLowerCase();
  
  if (suffix === 'k' || suffix === 'mil' || suffix === 'thousand') value *= 1_000;
  else if (suffix === 'm' || suffix === 'mi' || suffix === 'million') value *= 1_000_000;
  else if (suffix === 'b' || suffix === 'bi' || suffix === 'billion') value *= 1_000_000_000;
  
  return Math.round(value);
}

function parseDuration(duration?: string): number {
  if (!duration) return 0;
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
  const response = await fetch(channelUrl, { headers: browserHeaders });
  
  if (!response.ok) {
    console.warn(`[YouTube Native] Channel not found: ${handle}`);
    return { channelId: '', handle };
  }
  
  const html = await response.text();
  
  const channelIdMatch = html.match(/"channelId":"(UC[\w-]+)"/) ||
                         html.match(/channel_id=(UC[\w-]+)/) ||
                         html.match(/"externalId":"(UC[\w-]+)"/);
  
  if (!channelIdMatch) {
    console.warn(`[YouTube Native] Could not extract channel ID from: ${handle}`);
    return { channelId: '', handle };
  }
  
  return { channelId: channelIdMatch[1], handle };
}

// Extract all video data from ytInitialData
function extractAllVideos(data: any): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const seenIds = new Set<string>();
  
  function extractFromRenderer(renderer: any, isShort = false): YouTubeVideo | null {
    const videoId = renderer?.videoId;
    if (!videoId || seenIds.has(videoId)) return null;
    seenIds.add(videoId);
    
    const viewCountText = renderer?.viewCountText?.simpleText ||
                         renderer?.viewCountText?.runs?.[0]?.text ||
                         renderer?.shortViewCountText?.simpleText ||
                         renderer?.shortViewCountText?.runs?.[0]?.text || '0';
    
    const title = renderer?.title?.runs?.[0]?.text || 
                  renderer?.title?.simpleText ||
                  renderer?.headline?.simpleText || '';
    
    return {
      videoId,
      title,
      description: renderer?.descriptionSnippet?.runs?.[0]?.text,
      thumbnailUrl: renderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
      viewsCount: parseCompactCount(viewCountText),
      likesCount: 0,
      commentsCount: 0,
      publishedAt: renderer?.publishedTimeText?.simpleText,
      duration: parseDuration(renderer?.lengthText?.simpleText),
      isShort,
    };
  }
  
  function walkObject(obj: any, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 20) return;
    
    // Check for video renderers
    if (obj.videoRenderer) {
      const video = extractFromRenderer(obj.videoRenderer, false);
      if (video) videos.push(video);
    }
    if (obj.gridVideoRenderer) {
      const video = extractFromRenderer(obj.gridVideoRenderer, false);
      if (video) videos.push(video);
    }
    if (obj.compactVideoRenderer) {
      const video = extractFromRenderer(obj.compactVideoRenderer, false);
      if (video) videos.push(video);
    }
    if (obj.reelItemRenderer) {
      const video = extractFromRenderer(obj.reelItemRenderer, true);
      if (video) videos.push(video);
    }
    if (obj.shortsLockupViewModel) {
      const videoId = obj.shortsLockupViewModel?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        const accessibilityText = obj.shortsLockupViewModel?.accessibilityText || '';
        const viewsMatch = accessibilityText.match(/([\d,.]+[KMB]?)\s*views/i);
        videos.push({
          videoId,
          title: obj.shortsLockupViewModel?.overlayMetadata?.primaryText?.content || '',
          thumbnailUrl: obj.shortsLockupViewModel?.thumbnail?.sources?.slice(-1)[0]?.url,
          viewsCount: viewsMatch ? parseCompactCount(viewsMatch[1]) : 0,
          likesCount: 0,
          commentsCount: 0,
          isShort: true,
        });
      }
    }
    
    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      for (const item of obj) {
        walkObject(item, depth + 1);
      }
    } else {
      for (const key of Object.keys(obj)) {
        walkObject(obj[key], depth + 1);
      }
    }
  }
  
  walkObject(data);
  return videos;
}

// Extract continuation token from data
function extractContinuation(data: any): string | undefined {
  let token: string | undefined;
  
  function walk(obj: any, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 15 || token) return;
    
    if (obj.continuationCommand?.token) {
      token = obj.continuationCommand.token;
      return;
    }
    if (obj.continuationEndpoint?.continuationCommand?.token) {
      token = obj.continuationEndpoint.continuationCommand.token;
      return;
    }
    
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, depth + 1);
    } else {
      for (const key of Object.keys(obj)) walk(obj[key], depth + 1);
    }
  }
  
  walk(data);
  return token;
}

// Parse channel metadata
function parseChannelData(data: any, html: string): Partial<YouTubeScrapedData> {
  const header = data?.header?.c4TabbedHeaderRenderer || 
                 data?.header?.pageHeaderRenderer;
  const metadata = data?.metadata?.channelMetadataRenderer || {};
  
  // Extract from header
  let displayName = header?.title || metadata?.title || '';
  let username = metadata?.vanityChannelUrl?.split('@')[1] || '';
  let channelId = metadata?.externalId || header?.channelId || '';
  let profileImageUrl = '';
  let bannerUrl = '';
  let subscribersCount = 0;
  let videosCount = 0;
  let description = metadata?.description?.substring(0, 500) || '';
  
  // Try to get avatar
  const avatarSources = header?.avatar?.thumbnails || [];
  profileImageUrl = avatarSources[avatarSources.length - 1]?.url || avatarSources[0]?.url || '';
  
  // Try banner
  const bannerSources = header?.banner?.thumbnails || [];
  bannerUrl = bannerSources[bannerSources.length - 1]?.url || '';
  
  // Subscribers - try multiple paths
  const subscriberText = header?.subscriberCountText?.simpleText ||
                         header?.subscriberCountText?.runs?.[0]?.text || '';
  subscribersCount = parseCompactCount(subscriberText);
  
  // Video count
  const videoCountText = header?.videosCountText?.simpleText ||
                         header?.videosCountText?.runs?.[0]?.text || '';
  videosCount = parseCompactCount(videoCountText);
  
  // Fallback: extract from HTML meta tags
  if (!displayName) {
    const titleMatch = html.match(/<meta\s+(?:property="og:title"|name="title")\s+content="([^"]+)"/);
    if (titleMatch) displayName = titleMatch[1].replace(' - YouTube', '');
  }
  
  if (!channelId) {
    const cidMatch = html.match(/"channelId":"(UC[\w-]+)"/);
    if (cidMatch) channelId = cidMatch[1];
  }
  
  // Extract subscriber count from HTML if needed - try MANY patterns
  if (subscribersCount === 0) {
    // Try simpleText format
    const subMatch1 = html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"\}/);
    if (subMatch1) subscribersCount = parseCompactCount(subMatch1[1]);
  }
  
  if (subscribersCount === 0) {
    // Try accessibilityData format
    const subMatch2 = html.match(/"subscriberCountText":\{[^}]*"accessibilityData":\{"label":"([^"]+)"\}/);
    if (subMatch2) subscribersCount = parseCompactCount(subMatch2[1]);
  }
  
  if (subscribersCount === 0) {
    // Try content format used in pageHeaderRenderer
    const subMatch3 = html.match(/"metadataParts":\[\{"text":\{"content":"([^"]+)"\}/);
    if (subMatch3) subscribersCount = parseCompactCount(subMatch3[1]);
  }
  
  if (subscribersCount === 0) {
    // Try description meta tag "X subscribers"
    const subMatch4 = html.match(/content="[^"]*?([\d,.]+[KMB]?)\s*(?:subscribers|inscritos)/i);
    if (subMatch4) subscribersCount = parseCompactCount(subMatch4[1]);
  }
  
  if (subscribersCount === 0) {
    // Try any occurrence of "X subscribers" or "X inscritos" in page
    const subMatch5 = html.match(/([\d,.]+[KMB]?)\s*(?:subscribers|inscritos)/i);
    if (subMatch5) subscribersCount = parseCompactCount(subMatch5[1]);
  }
  
  // Also try to find in JSON data recursively
  if (subscribersCount === 0) {
    function findSubscriberCount(obj: any, depth = 0): number {
      if (!obj || typeof obj !== 'object' || depth > 10) return 0;
      
      if (obj.subscriberCountText) {
        const text = obj.subscriberCountText.simpleText || 
                     obj.subscriberCountText.runs?.[0]?.text ||
                     obj.subscriberCountText.accessibility?.accessibilityData?.label;
        if (text) return parseCompactCount(text);
      }
      
      // Check for metadataParts pattern (new YouTube layout)
      if (obj.metadataParts && Array.isArray(obj.metadataParts)) {
        for (const part of obj.metadataParts) {
          const content = part?.text?.content;
          if (content && /subscriber|inscrit/i.test(content)) {
            return parseCompactCount(content);
          }
        }
      }
      
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const result = findSubscriberCount(item, depth + 1);
          if (result > 0) return result;
        }
      } else {
        for (const key of Object.keys(obj)) {
          const result = findSubscriberCount(obj[key], depth + 1);
          if (result > 0) return result;
        }
      }
      
      return 0;
    }
    
    subscribersCount = findSubscriberCount(data);
  }
  
  console.log(`[YouTube Native] Parsed channel data: subscribers=${subscribersCount}, videos=${videosCount}, displayName=${displayName}`);
  
  return {
    channelId,
    username,
    displayName,
    profileImageUrl: profileImageUrl?.replace(/=s\d+/, '=s400'),
    bannerUrl,
    description,
    subscribersCount,
    videosCount,
  };
}

// Fetch more videos with continuation
async function fetchMoreVideos(continuation: string): Promise<{ videos: YouTubeVideo[]; nextContinuation?: string }> {
  const response = await fetch('https://www.youtube.com/youtubei/v1/browse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...browserHeaders,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.00.00',
          hl: 'en',
          gl: 'US',
        },
      },
      continuation,
    }),
  });
  
  if (!response.ok) {
    console.error(`[YouTube Native] Continuation request failed: ${response.status}`);
    return { videos: [] };
  }
  
  const data = await response.json();
  const videos = extractAllVideos(data);
  const nextContinuation = extractContinuation(data);
  
  return { videos, nextContinuation };
}

// Fetch a specific tab (videos, shorts)
async function fetchChannelTab(channelId: string, tab: 'videos' | 'shorts'): Promise<{ videos: YouTubeVideo[]; continuation?: string; html: string; data: any }> {
  const url = `https://www.youtube.com/channel/${channelId}/${tab}`;
  console.log(`[YouTube Native] Fetching ${tab} tab: ${url}`);
  
  const response = await fetch(url, { headers: browserHeaders });
  
  if (!response.ok) {
    console.error(`[YouTube Native] Failed to fetch ${tab} tab: ${response.status}`);
    return { videos: [], html: '', data: {} };
  }
  
  const html = await response.text();
  
  // Extract ytInitialData
  const dataMatch = html.match(/var ytInitialData = ({.+?});<\/script>/) ||
                    html.match(/ytInitialData\s*=\s*({.+?});/);
  
  if (!dataMatch) {
    console.warn(`[YouTube Native] Could not extract ytInitialData from ${tab} tab`);
    return { videos: [], html, data: {} };
  }
  
  let data: any;
  try {
    data = JSON.parse(dataMatch[1]);
  } catch (e) {
    console.error(`[YouTube Native] Failed to parse ytInitialData:`, e);
    return { videos: [], html, data: {} };
  }
  
  const videos = extractAllVideos(data);
  const continuation = extractContinuation(data);
  
  console.log(`[YouTube Native] ${tab} tab: found ${videos.length} videos, continuation: ${!!continuation}`);
  
  return { videos, continuation, html, data };
}

// Main scraping function with pagination limits to avoid timeout
const MAX_VIDEO_PAGES = 10; // Limit regular video pages
const MAX_SHORTS_PAGES = 5; // Limit shorts pages
const MAX_TOTAL_VIDEOS = 500; // Max videos to scrape

async function scrapeAllVideos(channelId: string, handle?: string): Promise<YouTubeScrapedData> {
  console.log(`[YouTube Native] Starting scrape for channel: ${channelId} (limits: ${MAX_VIDEO_PAGES} video pages, ${MAX_SHORTS_PAGES} shorts pages, ${MAX_TOTAL_VIDEOS} max videos)`);
  
  if (!channelId) {
    console.warn('[YouTube Native] No channel ID provided');
    return {
      channelId: '',
      username: handle || '',
      displayName: handle || '',
      subscribersCount: 0,
      videosCount: 0,
      totalViews: 0,
      scrapedVideosCount: 0,
      videos: [],
    };
  }
  
  const allVideos: YouTubeVideo[] = [];
  const seenIds = new Set<string>();
  
  // 1. Fetch regular videos tab
  const { videos: regularVideos, continuation: videoCont, html, data } = await fetchChannelTab(channelId, 'videos');
  const channelData = parseChannelData(data, html);
  
  for (const v of regularVideos) {
    if (!seenIds.has(v.videoId) && allVideos.length < MAX_TOTAL_VIDEOS) {
      seenIds.add(v.videoId);
      allVideos.push(v);
    }
  }
  
  console.log(`[YouTube Native] Initial videos: ${allVideos.length}`);
  
  // Paginate through regular videos with limit
  let continuation = videoCont;
  let pageCount = 1;
  while (continuation && pageCount < MAX_VIDEO_PAGES && allVideos.length < MAX_TOTAL_VIDEOS) {
    pageCount++;
    console.log(`[YouTube Native] Fetching videos page ${pageCount}/${MAX_VIDEO_PAGES}...`);
    
    try {
      const { videos, nextContinuation } = await fetchMoreVideos(continuation);
      
      if (videos.length === 0) {
        console.log('[YouTube Native] No more videos in continuation');
        break;
      }
      
      for (const v of videos) {
        if (!seenIds.has(v.videoId) && allVideos.length < MAX_TOTAL_VIDEOS) {
          seenIds.add(v.videoId);
          allVideos.push(v);
        }
      }
      
      console.log(`[YouTube Native] Page ${pageCount}: +${videos.length} videos, total: ${allVideos.length}`);
      continuation = nextContinuation;
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`[YouTube Native] Error on page ${pageCount}:`, error);
      break;
    }
  }
  
  // 2. Fetch Shorts tab (if still under limit)
  if (allVideos.length < MAX_TOTAL_VIDEOS) {
    console.log('[YouTube Native] Fetching Shorts tab...');
    const { videos: shortsVideos, continuation: shortsCont } = await fetchChannelTab(channelId, 'shorts');
    
    for (const v of shortsVideos) {
      if (!seenIds.has(v.videoId) && allVideos.length < MAX_TOTAL_VIDEOS) {
        seenIds.add(v.videoId);
        v.isShort = true;
        allVideos.push(v);
      }
    }
    
    console.log(`[YouTube Native] Shorts initial: ${shortsVideos.length}, total now: ${allVideos.length}`);
    
    // Paginate Shorts with limit
    let shortsContinuation = shortsCont;
    let shortsPage = 1;
    while (shortsContinuation && shortsPage < MAX_SHORTS_PAGES && allVideos.length < MAX_TOTAL_VIDEOS) {
      shortsPage++;
      console.log(`[YouTube Native] Fetching Shorts page ${shortsPage}/${MAX_SHORTS_PAGES}...`);
      
      try {
        const { videos, nextContinuation } = await fetchMoreVideos(shortsContinuation);
        
        if (videos.length === 0) break;
        
        for (const v of videos) {
          if (!seenIds.has(v.videoId) && allVideos.length < MAX_TOTAL_VIDEOS) {
            seenIds.add(v.videoId);
            v.isShort = true;
            allVideos.push(v);
          }
        }
        
        console.log(`[YouTube Native] Shorts page ${shortsPage}: +${videos.length}, total: ${allVideos.length}`);
        shortsContinuation = nextContinuation;
        
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        console.error(`[YouTube Native] Error on Shorts page ${shortsPage}:`, error);
        break;
      }
    }
  }
  
  const totalViews = allVideos.reduce((sum, v) => sum + v.viewsCount, 0);
  
  console.log(`[YouTube Native] Scrape complete: ${allVideos.length} total videos, ${totalViews} total views`);
  
  return {
    channelId,
    username: handle || channelData.username || '',
    displayName: channelData.displayName || handle || '',
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

// Save videos to database
async function saveVideosToDB(supabase: any, accountId: string, videos: YouTubeVideo[]) {
  console.log(`[YouTube Native] Saving ${videos.length} videos to database...`);
  
  let savedCount = 0;
  let updatedCount = 0;
  
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
    
    console.log(`[YouTube Native] Batch ${Math.ceil((i + 1) / batchSize)}: ${savedCount} new, ${updatedCount} updated`);
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
        username: data.username || handle,
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
        username: data.username || handle,
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
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        data: {
          channelId: '',
          username: '',
          displayName: '',
          subscribersCount: 0,
          videosCount: 0,
          totalViews: 0,
          scrapedVideosCount: 0,
          videos: [],
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
