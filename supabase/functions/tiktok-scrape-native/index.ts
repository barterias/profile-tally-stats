import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multiple user agents to rotate
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getBrowserHeaders(): Record<string, string> {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
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
  nextCursor?: string;
  secUid?: string;
}

function parseCount(text?: string | number | null): number {
  if (text === null || text === undefined) return 0;
  if (typeof text === 'number') return Number.isFinite(text) ? Math.round(text) : 0;

  const raw = String(text).trim();
  if (!raw) return 0;

  const match = raw.replace(/\s+/g, '').match(/^([\d.,]+)([KMB]|mil|mi)?$/i);
  if (!match) return parseInt(raw.replace(/\D/g, ''), 10) || 0;

  const numberPart = match[1];
  const suffix = match[2]?.toLowerCase();

  let value = 0;
  if (suffix) {
    const normalized = numberPart.replace(/,/g, '');
    value = parseFloat(normalized);
  } else {
    const normalized = numberPart.replace(/[.,]/g, '');
    value = parseFloat(normalized);
  }

  if (!Number.isFinite(value)) return 0;

  if (suffix === 'k' || suffix === 'mil') value *= 1_000;
  else if (suffix === 'm' || suffix === 'mi') value *= 1_000_000;
  else if (suffix === 'b') value *= 1_000_000_000;

  return Math.round(value);
}

// Extract video from item with multiple field name support
function extractVideoFromItem(item: any, username: string, seenIds: Set<string>): TikTokVideo | null {
  const normalized = item?.itemStruct || item?.item || item?.aweme_info || item;

  const videoId =
    normalized?.id ||
    normalized?.video?.id ||
    normalized?.itemInfos?.id ||
    normalized?.aweme_id ||
    normalized?.itemId;

  const videoIdStr = String(videoId || '');
  if (!/^\d{10,}$/.test(videoIdStr) || seenIds.has(videoIdStr)) return null;
  seenIds.add(videoIdStr);

  const stats = normalized?.stats || normalized?.statsV2 || normalized?.statistics || normalized?.itemInfos || {};

  let thumbnailUrl: string | undefined;
  const cover = normalized?.video?.cover || normalized?.video?.originCover || normalized?.cover || normalized?.thumbnail;
  if (typeof cover === 'string') {
    thumbnailUrl = cover;
  } else if (cover?.url_list?.[0]) {
    thumbnailUrl = cover.url_list[0];
  } else if (cover?.urlList?.[0]) {
    thumbnailUrl = cover.urlList[0];
  }

  const views = stats.playCount || stats.play_count || stats.viewCount || normalized?.playCount || normalized?.play_count || 0;
  const likes = stats.diggCount || stats.digg_count || stats.likeCount || normalized?.diggCount || 0;
  const comments = stats.commentCount || stats.comment_count || normalized?.commentCount || 0;
  const shares = stats.shareCount || stats.share_count || normalized?.shareCount || 0;

  const createTime = normalized?.createTime || normalized?.create_time;
  const createTimeNum = typeof createTime === 'string' ? parseInt(createTime, 10) : createTime;

  return {
    videoId: videoIdStr,
    videoUrl: `https://www.tiktok.com/@${username}/video/${videoIdStr}`,
    caption: normalized?.desc || normalized?.description || normalized?.title,
    thumbnailUrl,
    viewsCount: parseCount(views),
    likesCount: parseCount(likes),
    commentsCount: parseCount(comments),
    sharesCount: parseCount(shares),
    duration: normalized?.video?.duration || normalized?.duration,
    postedAt: createTimeNum ? new Date(createTimeNum * 1000).toISOString() : undefined,
  };
}

// Recursively extract all videos from any JSON structure
function extractVideosFromData(data: any, username: string): TikTokVideo[] {
  const videos: TikTokVideo[] = [];
  const seenIds = new Set<string>();

  function walk(obj: any, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 25) return;

    // Try to extract video from current object
    const video = extractVideoFromItem(obj, username, seenIds);
    if (video) videos.push(video);

    // Check known list fields
    const lists = [obj.itemList, obj.item_list, obj.itemListData, obj.items, obj.aweme_list, obj.ItemList];
    for (const list of lists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          const v = extractVideoFromItem(item, username, seenIds);
          if (v) videos.push(v);
        }
      }
    }

    // ItemModule (older format)
    if (obj.ItemModule && typeof obj.ItemModule === 'object') {
      for (const key of Object.keys(obj.ItemModule)) {
        const v = extractVideoFromItem(obj.ItemModule[key], username, seenIds);
        if (v) videos.push(v);
      }
    }

    // Recurse
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, depth + 1);
    } else {
      for (const key of Object.keys(obj)) {
        if (key === 'ItemModule') continue;
        walk(obj[key], depth + 1);
      }
    }
  }

  walk(data);
  return videos;
}

// Extract all possible secUid values from HTML
function extractSecUid(html: string): string | null {
  const patterns = [
    /"secUid"\s*:\s*"([^"]+)"/,
    /"sec_uid"\s*:\s*"([^"]+)"/,
    /secUid['"]\s*:\s*['"]([^'"]+)['"]/,
    /\\"secUid\\":\\"([^\\]+)\\"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const secUid = match[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (secUid.length > 20) {
        console.log(`[TikTok Native] Found secUid via pattern: ${pattern.source.substring(0, 30)}`);
        return secUid;
      }
    }
  }

  return null;
}

// Extract user data from JSON
function extractUserData(data: any, username: string): Partial<TikTokScrapedData> {
  let userData: any = null;
  let statsData: any = null;

  // Try specific known paths
  const userPaths = [
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.user,
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.user,
    data?.UserModule?.users?.[username],
    data?.UserPage?.userInfo?.user,
    data?.userInfo?.user,
    data?.user,
  ];

  for (const path of userPaths) {
    if (path) { userData = path; break; }
  }

  const statsPaths = [
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.stats,
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.stats,
    data?.UserModule?.stats?.[username],
    data?.UserPage?.userInfo?.stats,
    data?.userInfo?.stats,
    userData?.stats,
  ];

  for (const path of statsPaths) {
    if (path) { statsData = path; break; }
  }

  const followers = parseCount(statsData?.followerCount ?? userData?.followerCount ?? 0);
  const following = parseCount(statsData?.followingCount ?? userData?.followingCount ?? 0);
  const likes = parseCount(statsData?.heartCount ?? statsData?.heart ?? userData?.heartCount ?? 0);
  const videosCount = parseCount(statsData?.videoCount ?? userData?.videoCount ?? 0);

  const result: Partial<TikTokScrapedData> = {
    username: userData?.uniqueId || userData?.unique_id || username,
    displayName: userData?.nickname || userData?.name,
    bio: userData?.signature || userData?.bio,
    followersCount: followers,
    followingCount: following,
    likesCount: likes,
    videosCount: videosCount,
  };

  const avatar = userData?.avatarLarger || userData?.avatarMedium || userData?.avatarThumb || userData?.avatar;
  if (avatar) {
    result.profileImageUrl = typeof avatar === 'string' ? avatar : avatar?.url_list?.[0];
  }

  const secUid = userData?.secUid || userData?.sec_uid;
  if (secUid) {
    result.secUid = String(secUid);
  }

  console.log(`[TikTok Native] extractUserData: followers=${followers}, videos=${videosCount}, likes=${likes}`);
  return result;
}

// Fetch profile page and extract data
async function fetchProfilePage(username: string): Promise<{ userData: Partial<TikTokScrapedData>; videos: TikTokVideo[] }> {
  console.log(`[TikTok Native] Fetching profile page for: ${username}`);

  const url = `https://www.tiktok.com/@${username}`;

  try {
    const response = await fetch(url, { headers: getBrowserHeaders() });
    if (!response.ok) {
      console.warn(`[TikTok Native] Profile fetch failed: ${response.status}`);
      return { userData: { username }, videos: [] };
    }

    const html = await response.text();

    if (html.includes('Could not find this account') || html.includes("couldn't find this account")) {
      console.warn(`[TikTok Native] Profile not found: ${username}`);
      return { userData: { username }, videos: [] };
    }

    // Try to extract JSON data
    let jsonData: any = null;
    const patterns = [
      { name: '__UNIVERSAL_DATA_FOR_REHYDRATION__', re: /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/ },
      { name: 'SIGI_STATE', re: /<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/ },
      { name: "window['SIGI_STATE']", re: /window\['SIGI_STATE'\]\s*=\s*({[\s\S]*?})\s*;?/ },
    ];

    for (const p of patterns) {
      const match = html.match(p.re);
      if (match?.[1]) {
        try {
          jsonData = JSON.parse(match[1].trim());
          console.log(`[TikTok Native] Found JSON via ${p.name}`);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    let userData: Partial<TikTokScrapedData> = { username };
    let videos: TikTokVideo[] = [];

    if (jsonData) {
      userData = extractUserData(jsonData, username);
      videos = extractVideosFromData(jsonData, username);
    }

    // Always try to extract secUid from HTML if not found
    if (!userData.secUid) {
      const secUid = extractSecUid(html);
      if (secUid) {
        userData.secUid = secUid;
      }
    }

    console.log(`[TikTok Native] Extracted: secUid=${!!userData.secUid}, ${videos.length} videos from HTML`);
    return { userData, videos };
  } catch (error) {
    console.error(`[TikTok Native] Error fetching profile:`, error);
    return { userData: { username }, videos: [] };
  }
}

// Fetch videos using TikTok's internal API with pagination
async function fetchVideosFromAPI(username: string, secUid: string, cursor: string = '0'): Promise<{ videos: TikTokVideo[]; nextCursor?: string; hasMore: boolean }> {
  console.log(`[TikTok Native] API fetch, cursor: ${cursor}`);

  // Generate random device_id
  const deviceId = String(Math.floor(Math.random() * 9000000000000000000) + 1000000000000000000);
  const webIdLastTime = String(Math.floor(Date.now() / 1000) - 86400);

  const params = new URLSearchParams({
    WebIdLastTime: webIdLastTime,
    aid: '1988',
    app_language: 'en',
    app_name: 'tiktok_web',
    browser_language: 'en-US',
    browser_name: 'Mozilla',
    browser_online: 'true',
    browser_platform: 'Win32',
    browser_version: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    channel: 'tiktok_web',
    cookie_enabled: 'true',
    count: '35',
    coverFormat: '2',
    cursor: cursor,
    device_id: deviceId,
    device_platform: 'web_pc',
    focus_state: 'true',
    from_page: 'user',
    history_len: String(Math.floor(Math.random() * 10) + 1),
    is_fullscreen: 'false',
    is_page_visible: 'true',
    language: 'en',
    os: 'windows',
    priority_region: '',
    referer: '',
    region: 'US',
    screen_height: '1080',
    screen_width: '1920',
    secUid: secUid,
    tz_name: 'America/New_York',
    webcast_language: 'en',
  });

  const url = `https://www.tiktok.com/api/post/item_list/?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        ...getBrowserHeaders(),
        'Referer': `https://www.tiktok.com/@${username}`,
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      console.log(`[TikTok Native] API failed: ${response.status}`);
      return { videos: [], hasMore: false };
    }

    // Get response text first to check if it's valid
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      console.log(`[TikTok Native] API returned empty response`);
      return { videos: [], hasMore: false };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.log(`[TikTok Native] API returned invalid JSON, length: ${text.length}`);
      return { videos: [], hasMore: false };
    }

    if (!data?.itemList || data.itemList.length === 0) {
      console.log(`[TikTok Native] API returned no items`);
      return { videos: [], hasMore: false };
    }

    const videos = extractVideosFromData(data, username);
    console.log(`[TikTok Native] API returned ${videos.length} videos, hasMore: ${data.hasMore}`);

    return {
      videos,
      nextCursor: data.cursor ? String(data.cursor) : undefined,
      hasMore: data.hasMore === true,
    };
  } catch (error) {
    console.error('[TikTok Native] API error:', error);
    return { videos: [], hasMore: false };
  }
}

// Main scraping function - combines HTML extraction + API pagination
async function scrapeAllVideos(username: string): Promise<TikTokScrapedData> {
  console.log(`[TikTok Native] Starting full scrape for: ${username}`);

  // Step 1: Get initial data from profile page
  const { userData, videos: initialVideos } = await fetchProfilePage(username);

  const videoMap = new Map<string, TikTokVideo>();
  for (const v of initialVideos) {
    if (v?.videoId) videoMap.set(v.videoId, v);
  }

  const secUid = userData.secUid;
  const targetCount = userData.videosCount || 0;

  console.log(`[TikTok Native] Initial: ${videoMap.size} videos, target: ${targetCount}, secUid: ${!!secUid}`);

  // Step 2: If we have secUid, paginate through API to get all videos
  if (secUid && targetCount > 0) {
    let cursor = '0';
    let pages = 0;
    const maxPages = 20; // Up to 20 pages * 35 videos = 700 videos max

    while (pages < maxPages && videoMap.size < targetCount) {
      const result = await fetchVideosFromAPI(username, secUid, cursor);
      pages++;

      let newCount = 0;
      for (const v of result.videos) {
        if (v?.videoId && !videoMap.has(v.videoId)) {
          videoMap.set(v.videoId, v);
          newCount++;
        }
      }

      console.log(`[TikTok Native] Page ${pages}: +${newCount} new, total: ${videoMap.size}/${targetCount}`);

      if (!result.hasMore || !result.nextCursor) {
        console.log(`[TikTok Native] Pagination ended: hasMore=${result.hasMore}`);
        break;
      }

      if (newCount === 0 && result.videos.length === 0) {
        console.log(`[TikTok Native] No new videos, stopping`);
        break;
      }

      cursor = result.nextCursor;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } else {
    console.log('[TikTok Native] Pagination not available (missing secUid or videosCount)');
  }

  const videos = Array.from(videoMap.values());

  const result: TikTokScrapedData = {
    username: userData.username || username,
    displayName: userData.displayName,
    profileImageUrl: userData.profileImageUrl,
    bio: userData.bio,
    followersCount: userData.followersCount || 0,
    followingCount: userData.followingCount || 0,
    likesCount: userData.likesCount || 0,
    videosCount: userData.videosCount || 0,
    scrapedVideosCount: videos.length,
    totalViews: videos.reduce((sum, v) => sum + v.viewsCount, 0),
    videos,
    secUid: userData.secUid,
  };

  console.log(`[TikTok Native] Scrape complete: ${result.scrapedVideosCount}/${result.videosCount} videos, ${result.totalViews} views`);

  return result;
}

// Save videos to database
async function saveVideosToDB(supabase: any, accountId: string, username: string, videos: TikTokVideo[]) {
  console.log(`[TikTok Native] Saving ${videos.length} videos to database...`);

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

  console.log(`[TikTok Native] Saved: ${savedCount} new, ${updatedCount} updated`);
  return { savedCount, updatedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountId, username, fetchVideos = true } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean username
    let cleanUsername = username.replace(/^@/, '').trim();
    const urlMatch = cleanUsername.match(/tiktok\.com\/@?([^\/\?]+)/);
    if (urlMatch) cleanUsername = urlMatch[1];

    // Scrape all videos
    const data = await scrapeAllVideos(cleanUsername);

    console.log('[TikTok Native] Scrape result:', {
      username: data.username,
      displayName: data.displayName,
      followers: data.followersCount,
      videosCount: data.videosCount,
      scrapedVideos: data.scrapedVideosCount,
      totalViews: data.totalViews,
    });

    // If accountId provided, save to database
    if (accountId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get existing account data to avoid overwriting with zeros
      const { data: existingAccount } = await supabase
        .from('tiktok_accounts')
        .select('followers_count, likes_count, videos_count, total_views, scraped_videos_count')
        .eq('id', accountId)
        .maybeSingle();

      // Use new values if > 0, otherwise keep existing
      const safeFollowers = data.followersCount > 0 ? data.followersCount : (existingAccount?.followers_count || 0);
      const safeLikes = data.likesCount > 0 ? data.likesCount : (existingAccount?.likes_count || 0);
      const safeVideosCount = data.videosCount > 0 ? data.videosCount : (existingAccount?.videos_count || 0);
      const safeTotalViews = data.totalViews > 0 ? data.totalViews : (existingAccount?.total_views || 0);
      const safeScraped = data.scrapedVideosCount > 0 ? data.scrapedVideosCount : (existingAccount?.scraped_videos_count || 0);

      // Download and store profile image
      let storedProfileImageUrl = data.profileImageUrl;
      if (data.profileImageUrl) {
        try {
          const imageResponse = await fetch(data.profileImageUrl);
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
          console.error('[TikTok Native] Error storing image:', e);
        }
      }

      // Update account
      await supabase.from('tiktok_accounts').update({
        display_name: data.displayName,
        profile_image_url: storedProfileImageUrl,
        bio: data.bio,
        followers_count: safeFollowers,
        following_count: data.followingCount,
        likes_count: safeLikes,
        videos_count: safeVideosCount,
        total_views: safeTotalViews,
        scraped_videos_count: safeScraped,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      // Save videos
      if (fetchVideos && data.videos.length > 0) {
        await saveVideosToDB(supabase, accountId, cleanUsername, data.videos);
      }

      // Save metrics history
      if (safeFollowers > 0 || safeTotalViews > 0) {
        await supabase.from('tiktok_metrics_history').insert({
          account_id: accountId,
          followers_count: safeFollowers,
          likes_count: safeLikes,
          views_count: safeTotalViews,
          comments_count: data.videos.reduce((sum, v) => sum + v.commentsCount, 0),
          shares_count: data.videos.reduce((sum, v) => sum + v.sharesCount, 0),
        });

        // Update profile_metrics
        await supabase.from('profile_metrics').upsert({
          profile_id: accountId,
          platform: 'tiktok',
          username: data.username,
          display_name: data.displayName,
          profile_image_url: storedProfileImageUrl,
          followers: safeFollowers,
          following: data.followingCount,
          total_views: safeTotalViews,
          total_posts: safeVideosCount,
          total_likes: safeLikes,
          total_comments: data.videos.reduce((sum, v) => sum + v.commentsCount, 0),
          total_shares: data.videos.reduce((sum, v) => sum + v.sharesCount, 0),
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'platform,username' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[TikTok Native] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        data: {
          username: '',
          followersCount: 0,
          followingCount: 0,
          likesCount: 0,
          videosCount: 0,
          scrapedVideosCount: 0,
          totalViews: 0,
          videos: [],
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
