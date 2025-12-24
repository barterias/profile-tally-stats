import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ScrapeCreators client
// NOTE: In this runtime (Deno) env vars are read via Deno.env.get(...)
// (equivalent to process.env.* in Node).
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
  videos?: Array<{
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

function parseCompactCount(input?: string | number | null): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : 0;

  const text = String(input).trim();
  if (!text) return 0;

  // normalize: remove words and spaces
  // handles examples like: "603K subscribers", "305,644,721 views", "3,708 videos"
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

  // 1) Channel details - using /youtube/channel endpoint (docs say handle WITHOUT @)
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
    videos: [],
  };

  let videosResult: any = null;
  let shortsResult: any = null;

  // 2) Channel videos - prefer channelId, fallback to cleanHandle
  if (fetchVideos && (data.channelId || cleanHandle)) {
    try {
      videosResult = await scrapeCreatorsClient.get('/youtube/channel-videos', {
        ...(data.channelId ? { channelId: data.channelId } : {}),
        ...(cleanHandle && !data.channelId ? { handle: cleanHandle } : {}),
      });

      const videosArray = videosResult?.videos || videosResult?.data?.videos || [];
      console.log(`[ScrapeCreators] Found ${videosArray.length} videos`);
      
      if (Array.isArray(videosArray) && videosArray.length > 0) {
        data.videos = videosArray.slice(0, 30).map((video: any) => ({
          videoId: video?.id || video?.videoId || '',
          title: video?.title || '',
          description: typeof video?.description === 'string' ? video.description.substring(0, 500) : undefined,
          thumbnailUrl: video?.thumbnail || undefined,
          viewsCount: video?.viewCountInt ?? parseCompactCount(video?.viewCountText),
          likesCount: video?.likeCountInt ?? parseCompactCount(video?.likeCountText),
          commentsCount: video?.commentCountInt ?? parseCompactCount(video?.commentCountText),
          publishedAt: video?.publishedTime || undefined,
          duration: video?.lengthSeconds || undefined,
          isShort: video?.type === 'short',
        }));
      }

      // 3) Shorts (optional) – keep non-fatal
      try {
        if (data.channelId) {
          shortsResult = await scrapeCreatorsClient.get('/youtube/channel/shorts/simple', {
            channelId: data.channelId,
            limit: 20,
          });

          const shortsArray = shortsResult?.shorts || shortsResult?.data?.shorts || [];
          if (Array.isArray(shortsArray) && shortsArray.length > 0) {
            const shorts = shortsArray.slice(0, 20).map((short: any) => ({
              videoId: short?.videoId || short?.video_id || short?.id || '',
              title: short?.title || '',
              description: undefined,
              thumbnailUrl: short?.thumbnail?.url || short?.thumbnailUrl || undefined,
              viewsCount: parseCompactCount(short?.viewCount ?? short?.views ?? short?.view_count),
              likesCount: parseCompactCount(short?.likeCount ?? short?.likes ?? short?.like_count),
              commentsCount: parseCompactCount(short?.commentCount ?? short?.comments ?? short?.comment_count),
              publishedAt: short?.publishedAt || short?.published_at || undefined,
              duration: short?.duration || short?.duration_seconds || undefined,
              isShort: true,
            }));

            data.videos = [...(data.videos || []), ...shorts];
          }
        }
      } catch (shortsError) {
        console.error('[ScrapeCreators] Error fetching shorts:', shortsError);
      }
    } catch (videosError) {
      console.error('[ScrapeCreators] Error fetching videos:', videosError);
    }
  }

  // Aggregate likes/comments from fetched items (if available)
  if (Array.isArray(data.videos) && data.videos.length > 0) {
    data.totalLikes = data.videos.reduce((sum, v) => sum + (v.likesCount || 0), 0);
    data.totalComments = data.videos.reduce((sum, v) => sum + (v.commentsCount || 0), 0);
  }

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
      // backwards compatible: existing frontend sends "username"
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
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('[ScrapeCreators] Error updating account:', updateError);
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

      // Save videos to database
      if (Array.isArray(data.videos) && data.videos.length > 0) {
        for (const video of data.videos) {
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
