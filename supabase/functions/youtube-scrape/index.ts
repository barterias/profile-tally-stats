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

// ScrapeCreators client
const SCRAPECREATORS_BASE_URL = 'https://api.scrapecreators.com/v1';

type ScrapeCreatorsParams = Record<string, string | number | boolean | undefined | null>;

function toQueryParams(params: ScrapeCreatorsParams) {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qp.set(k, String(v));
  }
  return qp;
}

const scrapeCreatorsClient = {
  async get(path: string, params: ScrapeCreatorsParams) {
    const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!apiKey) throw new Error('SCRAPECREATORS_API_KEY não configurada');

    const qp = toQueryParams(params);
    const url = `${SCRAPECREATORS_BASE_URL}${path}${qp.toString() ? `?${qp.toString()}` : ''}`;

    console.log(`[ScrapeCreators] GET ${path}`);

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

      if (response.status === 401) throw new Error('API key do ScrapeCreators inválida ou expirada');
      if (response.status === 402) throw new Error('Créditos do ScrapeCreators esgotados');
      if (response.status === 429) throw new Error('Rate limit do ScrapeCreators atingido');
      if (response.status === 404) throw new Error('Canal não encontrado (ScrapeCreators 404)');

      throw new Error(`ScrapeCreators API error: ${response.status}`);
    }

    return response.json();
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
  channelId?: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  bannerUrl?: string;
  description?: string;
  subscribersCount: number;
  videosCount: number;
  totalViews: number;
  totalLikes?: number;
  totalComments?: number;
  scrapedVideosCount: number;
  videos?: YouTubeVideo[];
}

// ========== NATIVE SCRAPING FUNCTIONS ==========

function parseCompactCountNative(text?: string | number | null): number {
  if (text === null || text === undefined) return 0;
  if (typeof text === 'number') return Math.round(text);

  const raw = String(text).trim();
  const lower = raw.toLowerCase();

  const match = lower.match(/([\d][\d\s.,]*)\s*(k|m|b|mil|mi|bi|thousand|million|billion)?/i);
  if (!match) return parseInt(lower.replace(/\D/g, ''), 10) || 0;

  const numToken = (match[1] || '').replace(/\s+/g, '');
  const suffix = (match[2] || '').toLowerCase();

  const hasDot = numToken.includes('.');
  const hasComma = numToken.includes(',');

  let normalized = numToken;
  if (hasDot && hasComma) {
    const lastDot = numToken.lastIndexOf('.');
    const lastComma = numToken.lastIndexOf(',');
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    normalized = numToken.split(thousandsSep).join('');
    normalized = normalized.replace(decimalSep, '.');
  } else if (hasDot || hasComma) {
    const sep = hasDot ? '.' : ',';
    const parts = numToken.split(sep);
    const decimals = parts[1] || '';
    if (!suffix && decimals.length === 3) {
      normalized = parts.join('');
    } else {
      normalized = parts[0] + '.' + decimals;
    }
  }

  let value = parseFloat(normalized.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value)) value = parseInt(lower.replace(/\D/g, ''), 10) || 0;

  if (suffix === 'k' || suffix === 'mil' || suffix === 'thousand') value *= 1_000;
  else if (suffix === 'm' || suffix === 'mi' || suffix === 'million') value *= 1_000_000;
  else if (suffix === 'b' || suffix === 'bi' || suffix === 'billion') value *= 1_000_000_000;

  return Math.round(value);
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

function extractShortsFromData(data: any): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const seenIds = new Set<string>();
  
  function walkObject(obj: any, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 20) return;
    
    // reelItemRenderer (old shorts format)
    if (obj.reelItemRenderer) {
      const renderer = obj.reelItemRenderer;
      const videoId = renderer?.videoId;
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        const viewCountText = renderer?.viewCountText?.simpleText ||
                             renderer?.viewCountText?.runs?.[0]?.text ||
                             renderer?.shortViewCountText?.simpleText || '';
        videos.push({
          videoId,
          title: renderer?.title?.runs?.[0]?.text || renderer?.headline?.simpleText || '',
          thumbnailUrl: renderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
          viewsCount: parseCompactCountNative(viewCountText),
          likesCount: 0,
          commentsCount: 0,
          isShort: true,
        });
      }
    }
    
    // shortsLockupViewModel (new shorts format)
    if (obj.shortsLockupViewModel) {
      const videoId = obj.shortsLockupViewModel?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        const accessibilityText = obj.shortsLockupViewModel?.accessibilityText || '';
        const inlineStats = obj.shortsLockupViewModel?.overlayMetadata?.secondaryText?.content || '';
        
        const inlineMatch = inlineStats.match(/([\d.,\s]+)\s*(views?|visualizações?|vistas?|vues?)/i);
        const accessMatch = !inlineMatch ? accessibilityText.match(/([\d.,\s]+[KMB]?)\s*(views|visualizações|visualizacoes|vistas|vues|aufrufe|просмотр)/i) : null;
        const suffixMatch = !inlineMatch && !accessMatch ? accessibilityText.match(/([\d.,]+)\s*([KMB]|mil|mi)\b/i) : null;
        const truncatedMatch = !inlineMatch && !accessMatch && !suffixMatch ? accessibilityText.match(/([\d.,]+)\s*view/i) : null;
        const lastResort = !inlineMatch && !accessMatch && !suffixMatch && !truncatedMatch ? accessibilityText.match(/([\d.,]+)/) : null;
        
        const extractedViews = inlineMatch ? parseCompactCountNative(inlineMatch[1]) 
          : accessMatch ? parseCompactCountNative(accessMatch[1])
          : suffixMatch ? parseCompactCountNative(suffixMatch[1] + suffixMatch[2])
          : truncatedMatch ? parseCompactCountNative(truncatedMatch[1])
          : lastResort ? parseCompactCountNative(lastResort[1])
          : 0;
        
        videos.push({
          videoId,
          title: obj.shortsLockupViewModel?.overlayMetadata?.primaryText?.content || '',
          thumbnailUrl: obj.shortsLockupViewModel?.thumbnail?.sources?.slice(-1)[0]?.url,
          viewsCount: extractedViews,
          likesCount: 0,
          commentsCount: 0,
          isShort: true,
        });
      }
    }
    
    if (Array.isArray(obj)) {
      for (const item of obj) walkObject(item, depth + 1);
    } else {
      for (const key of Object.keys(obj)) walkObject(obj[key], depth + 1);
    }
  }
  
  walkObject(data);
  return videos;
}

async function fetchShortsNative(channelId: string): Promise<YouTubeVideo[]> {
  console.log(`[YouTube Native] Fetching shorts tab for channel: ${channelId}`);
  
  const tabUrl = `https://www.youtube.com/channel/${channelId}/shorts`;
  const response = await fetch(tabUrl, { headers: browserHeaders });
  
  if (!response.ok) {
    console.error(`[YouTube Native] Failed to fetch shorts tab: ${response.status}`);
    return [];
  }
  
  const html = await response.text();
  
  // Extract ytInitialData
  const dataMatch = html.match(/var\s+ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s) ||
                    html.match(/window\["ytInitialData"\]\s*=\s*(\{.+?\});\s*<\/script>/s);
  
  if (!dataMatch) {
    console.warn('[YouTube Native] Could not find ytInitialData');
    return [];
  }
  
  let data: any;
  try {
    data = JSON.parse(dataMatch[1]);
  } catch (e) {
    console.error('[YouTube Native] Failed to parse ytInitialData');
    return [];
  }
  
  const shorts = extractShortsFromData(data);
  console.log(`[YouTube Native] Extracted ${shorts.length} shorts from native scraping`);
  
  return shorts;
}

// ========== END NATIVE SCRAPING FUNCTIONS ==========

function parseCompactCount(input?: string | number | null): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : 0;

  const text = String(input).trim();
  if (!text) return 0;

  // normalize: remove words and spaces
  const cleaned = text
    .replace(/subscribers?|inscritos?/gi, '')
    .replace(/views?|visualiza(ç|c)ões?/gi, '')
    .replace(/videos?/gi, '')
    .replace(/,/g, '')
    .trim();

  const match = cleaned.match(/([\d.]+)\s*(K|M|B)?/i);
  if (!match) {
    const fallback = parseInt(cleaned.replace(/\D/g, ''), 10);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  let value = parseFloat(match[1]);
  const multiplier = match[2]?.toUpperCase();

  if (multiplier === 'K') value *= 1_000;
  if (multiplier === 'M') value *= 1_000_000;
  if (multiplier === 'B') value *= 1_000_000_000;

  return Number.isFinite(value) ? Math.round(value) : 0;
}

function normalizeYoutubeIdentifier(identifier: string): { handle?: string; channelId?: string; url?: string } {
  const raw = identifier.trim();
  if (!raw) return {};

  // URL
  if (/^https?:\/\//i.test(raw)) {
    return { url: raw };
  }

  // ChannelId
  if (/^UC[\w-]{20,30}$/.test(raw)) {
    return { channelId: raw };
  }

  // Handle
  const handle = raw.replace(/^@/, '').trim();
  return { handle };
}

function pick<T extends Record<string, any>>(obj: T | null | undefined, keys: (keyof T)[]) {
  const out: Record<string, any> = {};
  if (!obj) return out;
  for (const k of keys) out[String(k)] = obj[k];
  return out;
}

async function getYoutubeChannelMetrics(identifier: string, fetchVideos: boolean): Promise<{ data: YouTubeScrapedData; raw: any }> {
  const { handle, channelId, url } = normalizeYoutubeIdentifier(identifier);

  // 1) Channel details
  const cleanHandle = handle ? handle.replace(/^@/, '') : undefined;
  const profileResult = await scrapeCreatorsClient.get('/youtube/channel', {
    ...(cleanHandle ? { handle: cleanHandle } : {}),
    ...(channelId ? { channelId } : {}),
    ...(url ? { url } : {}),
  });

  // Parse avatar URL (largest source)
  let avatarUrl: string | undefined;
  const sources = profileResult?.avatar?.image?.sources;
  if (Array.isArray(sources) && sources.length > 0) {
    avatarUrl = sources[sources.length - 1]?.url || sources[0]?.url;
  }

  const resolvedHandle =
    (typeof profileResult?.handle === 'string' ? profileResult.handle : undefined) ||
    (typeof profileResult?.channel === 'string'
      ? profileResult.channel.replace('http://www.youtube.com/@', '').replace('https://www.youtube.com/@', '')
      : undefined) ||
    handle ||
    identifier;

  const data: YouTubeScrapedData = {
    channelId: profileResult?.channelId,
    username: String(resolvedHandle).replace(/^@/, ''),
    displayName: profileResult?.name,
    profileImageUrl: avatarUrl,
    bannerUrl: undefined,
    description: typeof profileResult?.description === 'string' ? profileResult.description.substring(0, 500) : undefined,
    subscribersCount: parseCompactCount(profileResult?.subscriberCount ?? profileResult?.subscriberCountText),
    videosCount: parseCompactCount(profileResult?.videoCount ?? profileResult?.videoCountText),
    totalViews: parseCompactCount(profileResult?.viewCount ?? profileResult?.viewCountText),
    scrapedVideosCount: 0,
    videos: [],
  };

  let videosResult: any = null;
  let shortsResult: any = null;

  // 2) Fetch ONLY SHORTS - with native fallback when ScrapeCreators returns 0
  if (fetchVideos && (data.channelId || cleanHandle)) {
    let shortsFromApi: YouTubeVideo[] = [];
    
    // First, try ScrapeCreators API
    try {
      console.log(`[ScrapeCreators] Fetching channel feed for: ${data.channelId || cleanHandle}`);
      videosResult = await scrapeCreatorsClient.get('/youtube/channel-videos', {
        ...(data.channelId ? { channelId: data.channelId } : {}),
        ...(cleanHandle && !data.channelId ? { handle: cleanHandle } : {}),
        limit: 50,
      });

      const videosArray = videosResult?.videos || videosResult?.data?.videos || [];
      console.log(`[ScrapeCreators] Found ${videosArray.length} items in channel feed`);

      shortsFromApi = (Array.isArray(videosArray) ? videosArray : [])
        .map((video: any) => ({
          videoId: video?.id || video?.videoId || '',
          title: video?.title || '',
          description: typeof video?.description === 'string' ? video.description.substring(0, 500) : undefined,
          thumbnailUrl: video?.thumbnail || undefined,
          viewsCount: video?.viewCountInt ?? parseCompactCount(video?.viewCountText),
          likesCount: video?.likeCountInt ?? parseCompactCount(video?.likeCountText),
          commentsCount: video?.commentCountInt ?? parseCompactCount(video?.commentCountText),
          publishedAt: video?.publishedTime || undefined,
          duration: video?.lengthSeconds || undefined,
          isShort: video?.type === 'short' || video?.isShort === true,
        }))
        .filter((v: any) => v.videoId);

      console.log(`[ScrapeCreators] Videos from API: ${shortsFromApi.length}`);
    } catch (videosError) {
      console.error('[ScrapeCreators] Error fetching channel feed:', videosError);
    }

    // If ScrapeCreators returned 0 items, fallback to native shorts scraping
    if (shortsFromApi.length === 0) {
      console.log('[YouTube] ScrapeCreators returned 0 items, trying native shorts scraping...');

      // Resolve channelId if we don't have it
      let resolvedChannelId = data.channelId;
      if (!resolvedChannelId && cleanHandle) {
        try {
          const resolved = await resolveChannelId(cleanHandle);
          resolvedChannelId = resolved.channelId;
          if (resolvedChannelId) {
            data.channelId = resolvedChannelId;
          }
        } catch (e) {
          console.error('[YouTube Native] Error resolving channel ID:', e);
        }
      }

      if (resolvedChannelId) {
        try {
          const nativeShorts = await fetchShortsNative(resolvedChannelId);
          if (nativeShorts.length > 0) {
            shortsFromApi = nativeShorts;
            console.log(`[YouTube Native] Got ${nativeShorts.length} shorts via native scraping`);
          }
        } catch (nativeError) {
          console.error('[YouTube Native] Error in native shorts scraping:', nativeError);
        }
      }
    }

    // Keep only top 10 by views for storage/UI
    data.videos = shortsFromApi
      .slice()
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
      .slice(0, 10);

    console.log(`[YouTube] Final top videos count: ${data.videos.length}`);
  }

  // Set scraped videos count
  data.scrapedVideosCount = data.videos?.length || 0;

  // Aggregate likes/comments from fetched items (if available)
  if (Array.isArray(data.videos) && data.videos.length > 0) {
    data.totalLikes = data.videos.reduce((sum, v) => sum + (v.likesCount || 0), 0);
    data.totalComments = data.videos.reduce((sum, v) => sum + (v.commentsCount || 0), 0);
  }

  console.log('[ScrapeCreators] Summary:', {
    username: data.username,
    videosCount: data.videosCount,
    scrapedVideosCount: data.scrapedVideosCount,
    totalViews: data.totalViews,
  });

  const raw = {
    profile: pick(profileResult, [
      'channelId',
      'channel',
      'handle',
      'name',
      'subscriberCount',
      'subscriberCountText',
      'viewCount',
      'viewCountText',
      'videoCount',
      'videoCountText',
    ] as any),
    videosSample: (() => {
      const arr = videosResult?.videos || videosResult?.data?.videos;
      const first = Array.isArray(arr) ? arr[0] : null;
      return first
        ? pick(first, ['videoId', 'title', 'viewCount', 'likeCount', 'commentCount', 'publishedAt'] as any)
        : null;
    })(),
    shortsSample: (() => {
      const arr = shortsResult?.shorts || shortsResult?.data?.shorts;
      const first = Array.isArray(arr) ? arr[0] : null;
      return first ? pick(first, ['videoId', 'title', 'viewCount', 'likeCount', 'commentCount'] as any) : null;
    })(),
  };

  return { data, raw };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      accountId,
      username,
      identifier,
      channelId,
      url,
      fetchVideos = true,
      debug = false,
    } = body || {};

    const channelIdentifier = identifier || username || channelId || url;

    if (!channelIdentifier) {
      return new Response(JSON.stringify({ success: false, error: 'Identificador do canal é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ScrapeCreators] Scraping YouTube: ${channelIdentifier}`);

    const { data, raw } = await getYoutubeChannelMetrics(String(channelIdentifier), !!fetchVideos);

    console.log(
      '[ScrapeCreators] Parsed metrics:',
      JSON.stringify(
        {
          username: data.username,
          subscribersCount: data.subscribersCount,
          totalViews: data.totalViews,
          totalLikes: data.totalLikes,
          videosFetched: data.videos?.length || 0,
          scrapedVideosCount: data.scrapedVideosCount,
        },
        null,
        0,
      ),
    );

    // Update database (only when accountId provided)
    if (accountId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('youtube_accounts')
        .update({
          channel_id: data.channelId,
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
        console.error('[ScrapeCreators] Error updating account:', updateError);
      } else {
        console.log('[ScrapeCreators] Account updated with scraped_videos_count');
      }

      // Save metrics history (include likes when available)
      const { error: metricsError } = await supabase.from('youtube_metrics_history').insert({
        account_id: accountId,
        subscribers_count: data.subscribersCount,
        views_count: data.totalViews,
        likes_count: data.totalLikes ?? null,
        comments_count: data.totalComments ?? null,
      });

      if (metricsError) {
        console.error('[ScrapeCreators] Error saving metrics history:', metricsError);
      }

      // Update unified profile_metrics table (triggers realtime)
      const { error: profileMetricsError } = await supabase
        .from('profile_metrics')
        .upsert({
          profile_id: accountId,
          platform: 'youtube',
          username: data.username,
          display_name: data.displayName,
          profile_image_url: data.profileImageUrl,
          followers: data.subscribersCount || 0,
          following: 0,
          total_views: data.totalViews || 0,
          total_likes: data.totalLikes || 0,
          total_posts: data.videosCount || 0,
          total_comments: data.totalComments || 0,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'platform,username' });

      if (profileMetricsError) {
        console.error('[ScrapeCreators] Error updating profile_metrics:', profileMetricsError);
      } else {
        console.log('[ScrapeCreators] profile_metrics updated (realtime trigger)');
      }

      // Save videos to database
      if (Array.isArray(data.videos) && data.videos.length > 0) {
        const fetchedIds = Array.from(
          new Set(
            data.videos
              .map((v) => v.videoId)
              .filter((id): id is string => typeof id === 'string' && id.length > 0),
          ),
        ).slice(0, 10);

        for (const video of data.videos.slice(0, 10)) {
          if (!video.videoId) continue;

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
            await supabase
              .from('youtube_videos')
              .update({
                title: video.title,
                description: video.description,
                thumbnail_url: video.thumbnailUrl,
                views_count: video.viewsCount,
                likes_count: video.likesCount,
                comments_count: video.commentsCount,
                duration: video.duration,
                video_url: videoUrl,
                published_at: video.publishedAt,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingVideo.id);
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

        // Keep only latest fetched videos in DB (prevents accumulating old videos > 10)
        if (fetchedIds.length > 0) {
          const inList = `(${fetchedIds.map((id) => `"${id}"`).join(',')})`;
          const { error: cleanupError } = await supabase
            .from('youtube_videos')
            .delete()
            .eq('account_id', accountId)
            .not('video_id', 'in', inList);

          if (cleanupError) {
            console.error('[ScrapeCreators] Error cleaning up old youtube_videos:', cleanupError);
          }

          // Align scraped_videos_count with what's stored (max 10)
          const { error: recountError } = await supabase
            .from('youtube_accounts')
            .update({
              scraped_videos_count: fetchedIds.length,
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);

          if (recountError) {
            console.error('[ScrapeCreators] Error updating scraped_videos_count after cleanup:', recountError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data, ...(debug ? { raw } : {}) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('[ScrapeCreators] Error scraping YouTube:', error);

    let errorMessage = 'Métricas indisponíveis no momento';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;

      if (errorMessage.includes('API key') || errorMessage.includes('401')) statusCode = 401;
      else if (errorMessage.includes('Créditos') || errorMessage.includes('402')) statusCode = 402;
      else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) statusCode = 429;
      else if (errorMessage.includes('não encontrado') || errorMessage.includes('404')) statusCode = 404;
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});