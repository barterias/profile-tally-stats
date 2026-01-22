import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoDetails {
  platform: string;
  videoId: string;
  videoUrl: string;
  source?: 'native' | 'api';
  title?: string;
  caption?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  duration?: number;
  publishedAt?: string;
  author?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

function detectPlatform(url: string): string | null {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return null;
}

function extractVideoId(url: string, platform: string): string | null {
  try {
    if (platform === 'tiktok') {
      // Common TikTok formats:
      // - https://www.tiktok.com/@user/video/1234567890
      // - https://www.tiktok.com/@user?item_id=1234567890 (sometimes after redirects)
      // - https://www.tiktok.com/t/ZXXXX/ (short link -> needs redirect resolving)
      // - https://vm.tiktok.com/XXXX/ / https://vt.tiktok.com/XXXX/ (short link)
      // After resolving, most end up with /@user/video/<id>

      // 1) Path-based IDs
      const match = url.match(/\/(?:video|v)\/(\d{8,25})/);
      if (match) return match[1];

      // 2) Query-param IDs
      try {
        const u = new URL(url);
        const qpId =
          u.searchParams.get('item_id') ||
          u.searchParams.get('share_item_id') ||
          u.searchParams.get('video_id') ||
          u.searchParams.get('aweme_id');
        if (qpId && /^\d{8,25}$/.test(qpId)) return qpId;
      } catch {
        // ignore URL parsing failures
      }

      return null;
    }

    if (platform === 'instagram') {
      // Instagram: https://www.instagram.com/p/ABC123/ or /reel/ABC123/
      const match = url.match(/\/(p|reel|reels)\/([^\/\?]+)/);
      return match ? match[2] : null;
    }

    if (platform === 'youtube') {
      // YouTube: https://www.youtube.com/watch?v=ABC123 or https://youtu.be/ABC123 or /shorts/ABC123
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
      if (url.includes('/shorts/')) {
        const match = url.match(/\/shorts\/([^\/\?]+)/);
        return match ? match[1] : null;
      }
      return urlObj.searchParams.get('v');
    }

    return null;
  } catch {
    return null;
  }
}

function isTikTokShortLink(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    // Common TikTok short-link subdomains: vm, vt, m, and tiktok.com/t/...
    const shortSubdomains = ['vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'];
    if (shortSubdomains.includes(host)) return true;
    if (host === 'tiktok.com' && u.pathname.startsWith('/t/')) return true;
    return false;
  } catch {
    return false;
  }
}

function extractTikTokUsername(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/(@[^\/]+)\/video\//) || u.pathname.match(/^\/@([^\/\?]+)\/video\//);
    const username = match?.[1]?.replace('@', '') || null;
    if (!username || username === '_' || username === 'user') return null;
    return username;
  } catch {
    return null;
  }
}

async function resolveFinalUrl(url: string, maxHops = 5): Promise<string> {
  // Use GET with redirect-follow to resolve TikTok short links; returns final response.url
  let current = url;

  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    // If fetch followed redirects, res.url will be the final URL already.
    if (res.url && res.url !== current) {
      current = res.url;
    }

    // If it already looks like a canonical TikTok video URL, stop.
    if (current.includes('tiktok.com') && current.includes('/video/')) {
      return current;
    }

    // Otherwise, no more useful information to gain.
    return current;
  }

  return current;
}

async function fetchTikTokVideo(videoId: string, apiKey: string, inputUrl?: string): Promise<VideoDetails | null> {
  console.log(`Fetching TikTok video: ${videoId}`);

  const preferredUrl = inputUrl || `https://www.tiktok.com/@_/video/${videoId}`;
  const usernameFromUrl = inputUrl ? extractTikTokUsername(inputUrl) : null;

  // Try paid API first - ScrapeCreators V1 endpoint with full URL
  try {
    const response = await fetch(
      `https://api.scrapecreators.com/v1/tiktok/video?url=${encodeURIComponent(preferredUrl)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const video = data.data || data;

      console.log('TikTok video data received:', JSON.stringify(video).substring(0, 500));

      // Some responses are "success" but contain a restriction (e.g. cross_border_violation)
      const statusMsg = String(video.statusMsg || video.status_msg || '').toLowerCase();
      const statusCode = Number(video.statusCode || video.status_code || 0);
      const isRestricted = statusCode === 10231 || statusMsg.includes('cross_border');

      const mapped: VideoDetails = {
        platform: 'tiktok',
        source: 'api',
        videoId: video.id || video.aweme_id || videoId,
        videoUrl:
          video.share_url ||
          video.video?.playAddr ||
          (usernameFromUrl ? `https://www.tiktok.com/@${usernameFromUrl}/video/${videoId}` : `https://www.tiktok.com/@_/video/${videoId}`),
        caption: video.desc || video.description,
        thumbnailUrl: video.video?.cover || video.video?.originCover || video.cover,
        viewsCount: video.stats?.playCount || video.play_count || video.statistics?.playCount || 0,
        likesCount: video.stats?.diggCount || video.digg_count || video.statistics?.diggCount || 0,
        commentsCount: video.stats?.commentCount || video.comment_count || video.statistics?.commentCount || 0,
        sharesCount: video.stats?.shareCount || video.share_count || video.statistics?.shareCount || 0,
        duration: video.video?.duration || video.duration,
        publishedAt: video.createTime ? new Date(video.createTime * 1000).toISOString() : undefined,
        author: {
          username: video.author?.unique_id || video.author?.uniqueId,
          displayName: video.author?.nickname,
          avatarUrl: video.author?.avatar_larger || video.author?.avatarLarger,
        },
      };

      // If API returned real metrics, we're done
      const hasAnyMetrics = (mapped.viewsCount || 0) > 0 || (mapped.likesCount || 0) > 0 || (mapped.commentsCount || 0) > 0;
      if (hasAnyMetrics && !isRestricted) return mapped;

      // Otherwise: try the profile-videos endpoint (this is what the working tiktok-scrape flow uses)
      if (usernameFromUrl) {
        const fromProfile = await fetchTikTokVideoFromProfileVideos(videoId, usernameFromUrl, apiKey);
        if (fromProfile) return fromProfile;
      }

      // If restricted and we still have basic info, return it (frontend may accept for manual validation)
      if (mapped.caption || mapped.thumbnailUrl) return { ...mapped, viewsCount: 0, likesCount: 0, commentsCount: 0, sharesCount: 0 };
    } else {
      console.error('TikTok video API error:', response.status);
    }
  } catch (e) {
    console.error('TikTok fetch error:', e);
  }

  // Fallback: native scraping using oembed endpoint (no metrics)
  console.log('[TikTok] Trying native oembed fallback...');
  return await fetchTikTokVideoNative(videoId, preferredUrl);
}

async function fetchTikTokVideoFromProfileVideos(videoId: string, username: string, apiKey: string): Promise<VideoDetails | null> {
  try {
    const cleanUsername = username.replace('@', '').trim();

    console.log(`[TikTok] Profile videos fallback: ${cleanUsername}`);

    const pageSize = 30;
    const maxPages = 10;
    let cursor: string | null = null;

    for (let page = 0; page < maxPages; page++) {
      const url = new URL('https://api.scrapecreators.com/v3/tiktok/profile/videos');
      url.searchParams.set('handle', cleanUsername);
      url.searchParams.set('count', String(pageSize));
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        console.error('[TikTok] Profile videos fallback error:', res.status);
        return null;
      }

      const data = await res.json();

      const list =
        (Array.isArray(data?.aweme_list) ? data.aweme_list : null) ||
        (Array.isArray(data?.data?.aweme_list) ? data.data.aweme_list : null) ||
        (Array.isArray(data?.itemList) ? data.itemList : null) ||
        (Array.isArray(data?.data?.itemList) ? data.data.itemList : null) ||
        [];

      const hit = list.find((v: any) => String(v?.id || v?.aweme_id || v?.videoId || '') === String(videoId));
      if (hit) {
        const stats = hit?.stats || hit?.statistics || {};
        const coverObj = hit?.video?.cover || hit?.video?.origin_cover || hit?.cover;

        const thumbnailUrl =
          typeof coverObj === 'string'
            ? coverObj
            : coverObj?.url_list?.[0]
              ? coverObj.url_list[0]
              : undefined;

        const viewsCount = Number(stats?.playCount ?? stats?.play_count ?? hit?.playCount ?? hit?.views ?? 0) || 0;
        const likesCount = Number(stats?.diggCount ?? stats?.digg_count ?? hit?.diggCount ?? hit?.likes ?? 0) || 0;
        const commentsCount = Number(stats?.commentCount ?? stats?.comment_count ?? hit?.commentCount ?? hit?.comments ?? 0) || 0;
        const sharesCount = Number(stats?.shareCount ?? stats?.share_count ?? hit?.shareCount ?? hit?.shares ?? 0) || 0;

        return {
          platform: 'tiktok',
          source: 'api',
          videoId: String(hit?.id || hit?.aweme_id || videoId),
          videoUrl: `https://www.tiktok.com/@${cleanUsername}/video/${videoId}`,
          caption: hit?.desc || hit?.description || hit?.caption,
          thumbnailUrl,
          viewsCount,
          likesCount,
          commentsCount,
          sharesCount,
          duration: hit?.video?.duration || hit?.duration,
          publishedAt: hit?.createTime ? new Date(hit.createTime * 1000).toISOString() : undefined,
          author: { username: cleanUsername },
        };
      }

      const next = data?.cursor || data?.next_cursor || data?.data?.cursor || null;
      const hasMore = !!next && String(next) !== String(cursor);

      console.log(`[TikTok] Profile videos fallback page ${page + 1}: ${Array.isArray(list) ? list.length : 0} items, hasMore=${hasMore}`);

      cursor = next ? String(next) : null;
      if (!hasMore) break;
    }

    console.log('[TikTok] Profile videos fallback: video not found after pagination');
    return null;
  } catch (e) {
    console.error('[TikTok] Profile videos fallback exception:', e);
    return null;
  }
}


async function fetchTikTokVideoNative(videoId: string, videoUrl?: string): Promise<VideoDetails | null> {
  const videoPageUrl = videoUrl || `https://www.tiktok.com/@_/video/${videoId}`;
  
  let viewsCount = 0;
  let likesCount = 0;
  let commentsCount = 0;
  let sharesCount = 0;
  let caption = '';
  let thumbnailUrl = '';
  let authorUsername = '';
  let authorDisplayName = '';

  // Step 1: Try oembed first (most reliable for basic info, sometimes includes thumbnail)
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoPageUrl)}`;
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (res.ok) {
      const oembed = await res.json();
      console.log('[TikTok Native] oembed success:', JSON.stringify(oembed).substring(0, 400));
      
      caption = oembed.title || '';
      thumbnailUrl = oembed.thumbnail_url || '';
      authorUsername = oembed.author_unique_id || oembed.author_url?.match(/@([^\/\?]+)/)?.[1] || '';
      authorDisplayName = oembed.author_name || '';
    } else {
      console.log('[TikTok Native] oembed failed with status:', res.status);
    }
  } catch (e) {
    console.log('[TikTok Native] oembed error:', e);
  }

  // Step 2: Try HTML scraping for metrics (may be blocked by TikTok)
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  };

  try {
    console.log('[TikTok Native] Fetching video page HTML...');
    const pageRes = await fetch(videoPageUrl, { 
      headers: browserHeaders,
      redirect: 'follow',
    });
    
    if (pageRes.ok) {
      const html = await pageRes.text();
      console.log('[TikTok Native] HTML length:', html.length);

      // Only try to parse if we got a substantial response (not a block page)
      if (html.length > 5000) {
        // Try UNIVERSAL_DATA
        const universalDataMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
        if (universalDataMatch) {
          try {
            const jsonData = JSON.parse(universalDataMatch[1]);
            const scope = jsonData?.__DEFAULT_SCOPE__ || jsonData;
            const videoDetail = scope?.['webapp.video-detail'] || scope?.videoDetail;
            const itemStruct = videoDetail?.itemInfo?.itemStruct || videoDetail?.itemStruct;
            
            if (itemStruct) {
              const stats = itemStruct.stats || itemStruct.statistics || {};
              viewsCount = Number(stats.playCount || stats.play_count || 0);
              likesCount = Number(stats.diggCount || stats.digg_count || 0);
              commentsCount = Number(stats.commentCount || stats.comment_count || 0);
              sharesCount = Number(stats.shareCount || stats.share_count || 0);
              
              if (!caption) caption = itemStruct.desc || '';
              if (!thumbnailUrl) thumbnailUrl = itemStruct.video?.cover || itemStruct.video?.originCover || '';
              if (!authorUsername) authorUsername = itemStruct.author?.uniqueId || '';
              if (!authorDisplayName) authorDisplayName = itemStruct.author?.nickname || '';
              
              console.log('[TikTok Native] Extracted from UNIVERSAL_DATA:', { viewsCount, likesCount });
            }
          } catch (parseErr) {
            console.log('[TikTok Native] Failed to parse UNIVERSAL_DATA');
          }
        }

        // Try SIGI_STATE
        if (viewsCount === 0) {
          const sigiMatch = html.match(/<script[^>]*id="SIGI_STATE"[^>]*>([^<]+)<\/script>/);
          if (sigiMatch) {
            try {
              const sigiData = JSON.parse(sigiMatch[1]);
              const itemModule = sigiData?.ItemModule || {};
              const videoData = itemModule[videoId] || Object.values(itemModule)[0];
              
              if (videoData) {
                const stats = videoData.stats || {};
                viewsCount = Number(stats.playCount || 0);
                likesCount = Number(stats.diggCount || 0);
                commentsCount = Number(stats.commentCount || 0);
                sharesCount = Number(stats.shareCount || 0);
                
                console.log('[TikTok Native] Extracted from SIGI_STATE:', { viewsCount, likesCount });
              }
            } catch (parseErr) {
              console.log('[TikTok Native] Failed to parse SIGI_STATE');
            }
          }
        }

        // Regex fallback for playCount
        if (viewsCount === 0) {
          const playCountMatch = html.match(/"playCount"\s*:\s*(\d+)/);
          if (playCountMatch) {
            viewsCount = Number(playCountMatch[1]);
            console.log('[TikTok Native] Extracted playCount from regex:', viewsCount);
          }
          
          const diggMatch = html.match(/"diggCount"\s*:\s*(\d+)/);
          if (diggMatch) likesCount = Number(diggMatch[1]);
          
          const commentMatch = html.match(/"commentCount"\s*:\s*(\d+)/);
          if (commentMatch) commentsCount = Number(commentMatch[1]);
          
          const shareMatch = html.match(/"shareCount"\s*:\s*(\d+)/);
          if (shareMatch) sharesCount = Number(shareMatch[1]);
        }

        // Meta tags fallback
        if (!thumbnailUrl) {
          const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
          if (ogImageMatch) thumbnailUrl = ogImageMatch[1];
        }
        
        if (!caption) {
          const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
          if (descMatch) caption = descMatch[1];
        }
      } else {
        console.log('[TikTok Native] HTML too small, likely blocked by TikTok');
      }
    }
  } catch (e) {
    console.log('[TikTok Native] HTML fetch error:', e);
  }

  console.log('[TikTok Native] Final result:', { viewsCount, likesCount, commentsCount, caption: caption.substring(0, 50), authorUsername });

  return {
    platform: 'tiktok',
    videoId,
    videoUrl: videoPageUrl,
    source: 'native',
    caption,
    title: caption,
    thumbnailUrl,
    viewsCount,
    likesCount,
    commentsCount,
    sharesCount,
    author: {
      username: authorUsername,
      displayName: authorDisplayName,
    },
  };
}


async function fetchInstagramPost(postId: string, apiKey: string): Promise<VideoDetails | null> {
  console.log(`Fetching Instagram post: ${postId}`);
  
  try {
    const response = await fetch(
      `https://api.scrapecreators.com/v1/instagram/post?shortcode=${encodeURIComponent(postId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Instagram post API error:', response.status, errorText);
      
      // Return null with more context logged
      if (response.status === 400) {
        console.error('Instagram API 400 error - post may be private, deleted, or API rate limited');
      }
      return null;
    }

    const data = await response.json();
    const post = data.data || data;
    
    console.log('Instagram post data received:', JSON.stringify(post).substring(0, 500));

    return {
      platform: 'instagram',
      videoId: post.shortcode || post.id || postId,
      videoUrl: post.url || `https://www.instagram.com/p/${postId}/`,
      caption: post.edge_media_to_caption?.edges?.[0]?.node?.text || post.caption,
      thumbnailUrl: post.display_url || post.thumbnail_url || post.thumbnail_src,
      viewsCount: post.video_view_count || post.play_count || 0,
      likesCount: post.edge_media_preview_like?.count || post.edge_liked_by?.count || post.like_count || 0,
      commentsCount: post.edge_media_to_comment?.count || post.comment_count || 0,
      sharesCount: post.share_count || 0,
      publishedAt: post.taken_at_timestamp ? new Date(post.taken_at_timestamp * 1000).toISOString() : undefined,
      author: {
        username: post.owner?.username,
        displayName: post.owner?.full_name,
        avatarUrl: post.owner?.profile_pic_url,
      },
    };
  } catch (error) {
    console.error('Instagram fetch error:', error);
    return null;
  }
}

// Native YouTube scraping (no API key needed)
async function fetchYouTubeVideoNative(videoId: string): Promise<VideoDetails | null> {
  console.log(`[YouTube Native] Fetching video: ${videoId}`);
  
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  };

  try {
    // Try shorts URL first, then regular video URL
    const isShort = videoId.length === 11; // YouTube video IDs are always 11 chars
    const urls = [
      `https://www.youtube.com/shorts/${videoId}`,
      `https://www.youtube.com/watch?v=${videoId}`,
    ];

    let html = '';
    let successUrl = '';
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { headers: browserHeaders });
        if (response.ok) {
          html = await response.text();
          successUrl = url;
          break;
        }
      } catch (e) {
        console.log(`[YouTube Native] Failed to fetch ${url}`);
      }
    }

    if (!html) {
      console.error(`[YouTube Native] Could not fetch video page for ${videoId}`);
      return null;
    }

    console.log(`[YouTube Native] Fetched from: ${successUrl}, HTML length: ${html.length}`);

    // Extract embedded JSON objects robustly (YouTube changes script formatting often)
    const extractJsonObject = (source: string, marker: string): any | null => {
      const idx = source.indexOf(marker);
      if (idx === -1) return null;

      // Find first "{" after marker
      const start = source.indexOf('{', idx + marker.length);
      if (start === -1) return null;

      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let i = start; i < source.length; i++) {
        const ch = source[i];

        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (ch === '\\') {
            escaped = true;
          } else if (ch === '"') {
            inString = false;
          }
          continue;
        }

        if (ch === '"') {
          inString = true;
          continue;
        }

        if (ch === '{') depth++;
        if (ch === '}') depth--;

        if (depth === 0) {
          const jsonText = source.slice(start, i + 1);
          try {
            return JSON.parse(jsonText);
          } catch {
            return null;
          }
        }
      }

      return null;
    };

    const playerData =
      extractJsonObject(html, 'var ytInitialPlayerResponse = ') ||
      extractJsonObject(html, 'ytInitialPlayerResponse = ');

    const initialData =
      extractJsonObject(html, 'var ytInitialData = ') ||
      extractJsonObject(html, 'ytInitialData = ');

    let viewsCount = 0;
    let likesCount = 0;
    let commentsCount = 0;
    let title = '';
    let thumbnailUrl = '';
    let channelName = '';
    let channelUsername = '';

    // Parse player response for canonical video details
    if (playerData?.videoDetails) {
      const vd = playerData.videoDetails;
      viewsCount = parseInt(vd.viewCount || '0', 10) || 0;
      title = vd.title || '';
      channelName = vd.author || '';
      thumbnailUrl = vd.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
    } else {
      console.log('[YouTube Native] Failed to parse player response');
    }

    // Fallback: extract from HTML meta tags and patterns
    if (viewsCount === 0) {
      // Try various patterns for view count
      const viewPatterns = [
        /"viewCount":"(\d+)"/,
        /"viewCount":\s*"(\d+)"/,
        /viewCount.*?(\d+)/,
        /"views":"([\d,]+)"/,
        /(\d[\d,]*)\s*(?:views|visualizações)/i,
      ];

      for (const pattern of viewPatterns) {
        const match = html.match(pattern);
        if (match) {
          viewsCount = parseInt(match[1].replace(/,/g, ''), 10);
          if (viewsCount > 0) break;
        }
      }
    }

    // Extract title from meta tags if not found
    if (!title) {
      const titleMatch =
        html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) ||
        html.match(/<meta\s+name='title'\s+content='([^']+)'/i) ||
        html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
        html.match(/<meta\s+property='og:title'\s+content='([^']+)'/i) ||
        html.match(/<meta\s+itemprop="name"\s+content="([^"]+)"/i);

      if (titleMatch) {
        title = titleMatch[1];
      }
    }

    // Extract thumbnail
    if (!thumbnailUrl) {
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    // Try to get likes count from engagement panel
    const likesMatch = html.match(/"accessibilityText":"([\d,\.]+[KMB]?)\s*likes"/i) ||
                       html.match(/"likeCount":(\d+)/);
    if (likesMatch) {
      likesCount = parseCompactNumber(likesMatch[1]);
    }

    // Try to get comment count
    const commentsMatch = html.match(/"commentCount":"(\d+)"/) ||
                          html.match(/(\d+)\s*Comments/i);
    if (commentsMatch) {
      commentsCount = parseInt(commentsMatch[1], 10);
    }

    console.log(`[YouTube Native] Extracted: views=${viewsCount}, likes=${likesCount}, comments=${commentsCount}, title=${title.substring(0, 50)}`);

    if (viewsCount === 0 && !title) {
      console.error('[YouTube Native] Could not extract any video data');
      return null;
    }

    return {
      platform: 'youtube',
      videoId,
      videoUrl: successUrl || `https://www.youtube.com/watch?v=${videoId}`,
      source: 'native',
      title,
      thumbnailUrl,
      viewsCount,
      likesCount,
      commentsCount,
      author: {
        username: channelUsername || channelName.toLowerCase().replace(/\s+/g, ''),
        displayName: channelName,
      },
    };
  } catch (error) {
    console.error('[YouTube Native] Error:', error);
    return null;
  }
}

// Helper to parse compact numbers like "1.4K", "2.3M"
function parseCompactNumber(text: string): number {
  if (!text) return 0;
  const clean = text.replace(/,/g, '').trim();
  const match = clean.match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return parseInt(clean, 10) || 0;
  
  let value = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  
  if (suffix === 'K') value *= 1000;
  else if (suffix === 'M') value *= 1000000;
  else if (suffix === 'B') value *= 1000000000;
  
  return Math.round(value);
}

async function fetchYouTubeVideo(videoId: string, apiKey: string): Promise<VideoDetails | null> {
  console.log(`Fetching YouTube video: ${videoId}`);
  
  // Try native scraping first (free, no API limits)
  const nativeResult = await fetchYouTubeVideoNative(videoId);
  if (nativeResult && nativeResult.viewsCount > 0) {
    console.log(`[YouTube] Using native scrape result: ${nativeResult.viewsCount} views`);
    return nativeResult;
  }

  // Fallback to paid API if native fails
  console.log(`[YouTube] Native scrape failed, trying paid API...`);
  
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await fetch(
      `https://api.scrapecreators.com/v1/youtube/video?url=${encodeURIComponent(videoUrl)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube video API error:', response.status, errorText);
      // Return native result even if views is 0, better than nothing
      return nativeResult;
    }

    const data = await response.json();
    console.log('YouTube raw response:', JSON.stringify(data).substring(0, 1000));
    
    const video = data.data || data;
    
    const channelHandle = video.channel?.handle || video.channel?.custom_url || video.channelHandle || '';
    const cleanUsername = channelHandle.replace('@', '').replace('/', '');

    return {
      platform: 'youtube',
      videoId: video.id || video.video_id || video.videoId || videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      source: 'api',
      title: video.title,
      thumbnailUrl: video.thumbnail?.url || video.thumbnails?.high?.url || video.thumbnail,
      viewsCount: parseInt(video.viewCountInt || video.view_count || video.viewCount || '0') || 0,
      likesCount: parseInt(video.likeCountInt || video.like_count || video.likeCount || '0') || 0,
      commentsCount: parseInt(video.commentCountInt || video.comment_count || video.commentCount || '0') || 0,
      duration: video.duration || video.lengthSeconds,
      publishedAt: video.published_at || video.publishedAt || video.upload_date || video.publishDate,
      author: {
        username: cleanUsername || video.channel?.title?.toLowerCase().replace(/\s+/g, ''),
        displayName: video.channel?.title || video.channel?.name || video.channelTitle,
        avatarUrl: video.channel?.thumbnail?.url || video.channel?.avatar,
      },
    };
  } catch (error) {
    console.error('YouTube fetch error:', error);
    // Return native result as fallback
    return nativeResult;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, platform: providedPlatform, videoId: providedVideoId, updateDatabase = false, tableId } = await req.json();

    if (!videoUrl && (!providedPlatform || !providedVideoId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video URL or platform+videoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!apiKey) {
      console.error('SCRAPECREATORS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let platform = providedPlatform;
    let videoId = providedVideoId;
    let resolvedUrl: string | undefined;

    if (videoUrl) {
      const rawUrl = String(videoUrl).trim();
      let workingUrl = rawUrl;

      platform = detectPlatform(workingUrl);
      if (!platform) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not detect platform from URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // TikTok short links often don't contain /video/<id> until redirects are resolved.
      if (platform === 'tiktok' && isTikTokShortLink(workingUrl)) {
        try {
          workingUrl = await resolveFinalUrl(workingUrl);
        } catch (e) {
          console.error('[video-details] failed to resolve TikTok short link:', e);
        }
      }

      resolvedUrl = workingUrl;

      videoId = extractVideoId(workingUrl, platform);
      if (!videoId) {
        // Provide more specific error message based on URL pattern
        let errorMessage = 'Could not extract video ID from URL';
        if (platform === 'instagram') {
          if (!workingUrl.includes('/p/') && !workingUrl.includes('/reel')) {
            errorMessage = 'URL deve ser de um post ou reel do Instagram (não perfil)';
          }
        } else if (platform === 'tiktok') {
          if (!workingUrl.includes('/video/') && !workingUrl.includes('/v/')) {
            errorMessage = 'URL deve ser de um vídeo do TikTok (não perfil)';
          }
        } else if (platform === 'youtube') {
          if (!workingUrl.includes('/shorts/') && !workingUrl.includes('watch?v=') && !workingUrl.includes('youtu.be/')) {
            errorMessage = 'URL deve ser de um vídeo ou short do YouTube';
          }
        }
        return new Response(
          JSON.stringify({ success: false, error: errorMessage, invalidUrl: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Fetching ${platform} video: ${videoId}`);

    let videoDetails: VideoDetails | null = null;

    switch (platform) {
      case 'tiktok':
        videoDetails = await fetchTikTokVideo(videoId, apiKey, resolvedUrl);
        break;
      case 'instagram':
        videoDetails = await fetchInstagramPost(videoId, apiKey);
        break;
      case 'youtube':
        videoDetails = await fetchYouTubeVideo(videoId, apiKey);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unsupported platform: ${platform}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!videoDetails) {
      // Return partial success so frontend can still accept the submission with manual validation
      // We know the video ID was extracted; we just couldn't fetch metrics.
      const videoUrl = platform === 'tiktok'
        ? `https://www.tiktok.com/@_/video/${videoId}`
        : platform === 'instagram'
        ? `https://www.instagram.com/p/${videoId}/`
        : `https://www.youtube.com/watch?v=${videoId}`;

      return new Response(
        JSON.stringify({
          success: true,
          partial: true,
          error: 'Não foi possível obter métricas (vídeo pode ser privado). O vídeo será validado manualmente.',
          data: {
            platform,
            videoId,
            videoUrl,
            viewsCount: 0,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            author: null,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update database if requested
    if (updateDatabase) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // tableId can be either the video row id OR the account_id
      // If it's an account_id, we need to upsert based on video_url/video_id
      const isAccountId = tableId && !tableId.includes('-'); // Simple heuristic, UUIDs have dashes
      
      console.log(`[video-details] updateDatabase=true, tableId=${tableId}, platform=${platform}, videoId=${videoId}`);

      if (platform === 'youtube') {
        // For YouTube, try to find existing video by video_id first
        const { data: existingVideo } = await supabase
          .from('youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();

        if (existingVideo) {
          const updateBase: Record<string, any> = {
            views_count: videoDetails.viewsCount,
            title: videoDetails.title,
            thumbnail_url: videoDetails.thumbnailUrl,
            updated_at: new Date().toISOString(),
          };

          // Native scrape is unreliable for likes/comments on Shorts; don't overwrite stored values
          if (videoDetails.source !== 'native') {
            updateBase.likes_count = videoDetails.likesCount;
            updateBase.comments_count = videoDetails.commentsCount;
          }

          const { error } = await supabase
            .from('youtube_videos')
            .update(updateBase)
            .eq('id', existingVideo.id);

          if (error) {
            console.error(`Error updating youtube_videos:`, error);
          } else {
            console.log(`Updated youtube_videos record ${existingVideo.id} with views=${videoDetails.viewsCount}`);
          }
        } else if (tableId) {
          // No existing video found - insert new one (tableId should be account_id)
          const videoUrl = videoDetails.videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
          
          const { error } = await supabase
            .from('youtube_videos')
            .insert({
              account_id: tableId,
              video_id: videoId,
              video_url: videoUrl,
              title: videoDetails.title,
              thumbnail_url: videoDetails.thumbnailUrl,
              views_count: videoDetails.viewsCount,
              // Native scrape is unreliable for likes/comments; avoid writing bogus numbers
              likes_count: videoDetails.source === 'native' ? null : videoDetails.likesCount,
              comments_count: videoDetails.source === 'native' ? null : videoDetails.commentsCount,
              duration: videoDetails.duration,
              published_at: videoDetails.publishedAt,
            });

          if (error) {
            console.error(`Error inserting youtube_videos:`, error);
          } else {
            console.log(`Inserted new youtube_videos record for ${videoId} with views=${videoDetails.viewsCount}`);
          }
        }
      } else if (platform === 'tiktok' && tableId) {
        // For TikTok, similar upsert logic
        const { data: existingVideo } = await supabase
          .from('tiktok_videos')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();

        if (existingVideo) {
          const { error } = await supabase
            .from('tiktok_videos')
            .update({
              views_count: videoDetails.viewsCount,
              likes_count: videoDetails.likesCount,
              comments_count: videoDetails.commentsCount,
              shares_count: videoDetails.sharesCount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingVideo.id);

          if (error) console.error(`Error updating tiktok_videos:`, error);
          else console.log(`Updated tiktok_videos record ${existingVideo.id}`);
        } else {
          const { error } = await supabase
            .from('tiktok_videos')
            .insert({
              account_id: tableId,
              video_id: videoId,
              video_url: videoDetails.videoUrl,
              caption: videoDetails.caption,
              thumbnail_url: videoDetails.thumbnailUrl,
              views_count: videoDetails.viewsCount,
              likes_count: videoDetails.likesCount,
              comments_count: videoDetails.commentsCount,
              shares_count: videoDetails.sharesCount,
              duration: videoDetails.duration,
              posted_at: videoDetails.publishedAt,
            });

          if (error) console.error(`Error inserting tiktok_videos:`, error);
          else console.log(`Inserted new tiktok_videos record for ${videoId}`);
        }
      } else if (platform === 'instagram' && tableId) {
        // For Instagram, similar upsert logic
        const postUrl = videoDetails.videoUrl || `https://www.instagram.com/p/${videoId}/`;
        
        const { data: existingPost } = await supabase
          .from('instagram_posts')
          .select('id')
          .eq('post_url', postUrl)
          .maybeSingle();

        if (existingPost) {
          const { error } = await supabase
            .from('instagram_posts')
            .update({
              views_count: videoDetails.viewsCount,
              likes_count: videoDetails.likesCount,
              comments_count: videoDetails.commentsCount,
              shares_count: videoDetails.sharesCount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPost.id);

          if (error) console.error(`Error updating instagram_posts:`, error);
          else console.log(`Updated instagram_posts record ${existingPost.id}`);
        } else {
          const { error } = await supabase
            .from('instagram_posts')
            .insert({
              account_id: tableId,
              post_url: postUrl,
              caption: videoDetails.caption,
              thumbnail_url: videoDetails.thumbnailUrl,
              views_count: videoDetails.viewsCount,
              likes_count: videoDetails.likesCount,
              comments_count: videoDetails.commentsCount,
              shares_count: videoDetails.sharesCount,
              posted_at: videoDetails.publishedAt,
            });

          if (error) console.error(`Error inserting instagram_posts:`, error);
          else console.log(`Inserted new instagram_posts record for ${videoId}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: videoDetails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching video details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
