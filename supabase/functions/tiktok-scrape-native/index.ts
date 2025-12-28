import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
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
  nextCursor?: string;
}

function parseCount(text?: string | number | null): number {
  if (text === null || text === undefined) return 0;
  if (typeof text === 'number') return Number.isFinite(text) ? Math.round(text) : 0;

  const raw = String(text).trim();
  if (!raw) return 0;

  // Examples: "1.2M", "12.345", "12,345", "987" (pt/en variants)
  const match = raw
    .replace(/\s+/g, '')
    .match(/^([\d.,]+)([KMB]|mil|mi)?$/i);

  // Fallback: strip everything except digits
  if (!match) return parseInt(raw.replace(/\D/g, ''), 10) || 0;

  const numberPart = match[1];
  const suffix = match[2]?.toLowerCase();

  // If there's a suffix, treat "." as decimal separator and "," as thousands
  // If there's no suffix, treat both "." and "," as thousands separators.
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

// Extract all videos from any JSON structure recursively
function extractVideosFromData(data: any, username: string): TikTokVideo[] {
  const videos: TikTokVideo[] = [];
  const seenIds = new Set<string>();

  const normalizeItem = (item: any) => item?.itemStruct || item?.item || item?.aweme_info || item;

  function extractVideoFromItem(rawItem: any): TikTokVideo | null {
    const item = normalizeItem(rawItem);

    const videoId =
      item?.id ||
      item?.video?.id ||
      item?.itemInfos?.id ||
      item?.aweme_id ||
      item?.itemId;

    // Validate videoId - must be numeric and at least 10 digits (TikTok video IDs are 19 digits)
    const videoIdStr = String(videoId || '');
    const isValidVideoId = /^\d{10,}$/.test(videoIdStr);
    
    if (!isValidVideoId || seenIds.has(videoIdStr)) return null;
    seenIds.add(videoIdStr);

    const stats =
      item?.stats ||
      item?.statsV2 ||
      item?.statistics ||
      item?.itemInfos ||
      item?.itemStats ||
      {};

    // Thumbnail
    let thumbnailUrl: string | undefined;
    const cover =
      item?.video?.cover ||
      item?.video?.originCover ||
      item?.cover ||
      item?.thumbnail ||
      item?.image_url;

    if (typeof cover === 'string') {
      thumbnailUrl = cover;
    } else if (cover?.url_list?.[0]) {
      thumbnailUrl = cover.url_list[0];
    } else if (cover?.urlList?.[0]) {
      thumbnailUrl = cover.urlList[0];
    }

    const views =
      stats.playCount ||
      stats.play_count ||
      stats.viewCount ||
      stats.views ||
      item?.playCount ||
      item?.play_count ||
      item?.views ||
      0;

    const likes =
      stats.diggCount ||
      stats.digg_count ||
      stats.likeCount ||
      stats.likes ||
      item?.diggCount ||
      item?.digg_count ||
      item?.likes ||
      0;

    const comments =
      stats.commentCount ||
      stats.comment_count ||
      item?.commentCount ||
      item?.comment_count ||
      item?.comments ||
      0;

    const shares =
      stats.shareCount ||
      stats.share_count ||
      item?.shareCount ||
      item?.share_count ||
      item?.shares ||
      0;

    const createTime = item?.createTime || item?.create_time || item?.createtime || item?.create_time_str;
    const createTimeNum = typeof createTime === 'string' ? parseInt(createTime, 10) : createTime;

    return {
      videoId: String(videoId),
      videoUrl: `https://www.tiktok.com/@${username}/video/${String(videoId)}`,
      caption: item?.desc || item?.description || item?.title,
      thumbnailUrl,
      viewsCount: parseCount(views),
      likesCount: parseCount(likes),
      commentsCount: parseCount(comments),
      sharesCount: parseCount(shares),
      duration: item?.video?.duration || item?.duration,
      postedAt: createTimeNum ? new Date(createTimeNum * 1000).toISOString() : undefined,
    };
  }

  function walkObject(obj: any, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 30) return;

    const asVideo = extractVideoFromItem(obj);
    if (asVideo) videos.push(asVideo);

    const lists = [
      obj.itemList,
      obj.item_list,
      obj.itemListData,
      obj.items,
      obj.aweme_list,
      obj.ItemList,
    ];

    for (const list of lists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          const v = extractVideoFromItem(item);
          if (v) videos.push(v);
        }
      }
    }

    // ItemModule (older format)
    if (obj.ItemModule && typeof obj.ItemModule === 'object') {
      for (const key of Object.keys(obj.ItemModule)) {
        const item = obj.ItemModule[key];
        const video = extractVideoFromItem(item);
        if (video) videos.push(video);
      }
    }

    if (Array.isArray(obj)) {
      for (const item of obj) walkObject(item, depth + 1);
    } else {
      for (const key of Object.keys(obj)) {
        // avoid infinite recursion on very large repeated branches
        if (key === 'ItemModule') continue;
        walkObject(obj[key], depth + 1);
      }
    }
  }

  walkObject(data);
  return videos;
}

// Recursively find user/stats data in any JSON structure
function findUserDataRecursively(obj: any, username: string, depth = 0): { user: any; stats: any } {
  if (!obj || typeof obj !== 'object' || depth > 15) return { user: null, stats: null };
  
  let user: any = null;
  let stats: any = null;
  
  // Check if this object looks like user data
  if (obj.uniqueId === username || obj.unique_id === username || 
      (obj.nickname && (obj.followerCount !== undefined || obj.stats))) {
    user = obj;
    stats = obj.stats;
  }
  
  // Check for userInfo pattern
  if (obj.userInfo?.user) {
    user = obj.userInfo.user;
    stats = obj.userInfo.stats || obj.userInfo.user.stats;
  }
  
  // Check for stats with followerCount
  if (!stats && obj.followerCount !== undefined && obj.followingCount !== undefined) {
    stats = obj;
  }
  
  if (user && stats) return { user, stats };
  
  // Recurse into children
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findUserDataRecursively(item, username, depth + 1);
      if (found.user || found.stats) {
        user = user || found.user;
        stats = stats || found.stats;
        if (user && stats) return { user, stats };
      }
    }
  } else {
    for (const key of Object.keys(obj)) {
      const found = findUserDataRecursively(obj[key], username, depth + 1);
      if (found.user || found.stats) {
        user = user || found.user;
        stats = stats || found.stats;
        if (user && stats) return { user, stats };
      }
    }
  }
  
  return { user, stats };
}

// Extract user data from any JSON structure
function extractUserData(data: any, username: string): Partial<TikTokScrapedData> {
  let userData: any = null;
  let statsData: any = null;
  
  // Try specific known paths first
  const userPaths = [
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.user,
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.user,
    data?.UserModule?.users?.[username],
    data?.UserPage?.userInfo?.user,
    data?.userInfo?.user,
    data?.user,
  ];
  
  for (const path of userPaths) {
    if (path) {
      userData = path;
      break;
    }
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
    if (path) {
      statsData = path;
      break;
    }
  }
  
  // If we didn't find data, try recursive search
  if (!userData || !statsData) {
    const found = findUserDataRecursively(data, username);
    if (!userData && found.user) userData = found.user;
    if (!statsData && found.stats) statsData = found.stats;
  }
  
  // Extract counts from various possible field names
  const followers = parseCount(
    statsData?.followerCount ?? statsData?.follower_count ?? 
    userData?.followerCount ?? userData?.follower_count ?? 
    userData?.fans ?? userData?.fansCount ?? 0
  );
  
  const following = parseCount(
    statsData?.followingCount ?? statsData?.following_count ?? 
    userData?.followingCount ?? userData?.following_count ?? 0
  );
  
  const likes = parseCount(
    statsData?.heartCount ?? statsData?.heart ?? statsData?.diggCount ??
    userData?.heartCount ?? userData?.heart ?? userData?.diggCount ?? 
    userData?.totalLikes ?? 0
  );
  
  const videos = parseCount(
    statsData?.videoCount ?? statsData?.video_count ?? 
    userData?.videoCount ?? userData?.video_count ?? 
    userData?.aweme_count ?? 0
  );
  
  const result: Partial<TikTokScrapedData> = {
    username: userData?.uniqueId || userData?.unique_id || username,
    displayName: userData?.nickname || userData?.name || userData?.display_name,
    bio: userData?.signature || userData?.bio || userData?.desc,
    followersCount: followers,
    followingCount: following,
    likesCount: likes,
    videosCount: videos,
  };
  
  // Get avatar from various possible fields
  const avatar = userData?.avatarLarger || userData?.avatarMedium || userData?.avatarThumb ||
                 userData?.avatar_larger || userData?.avatar_medium || userData?.avatar ||
                 userData?.avatar_url || userData?.cover_url?.[0];
  if (avatar) {
    result.profileImageUrl = typeof avatar === 'string' ? avatar : avatar?.url_list?.[0];
  }

  // Keep secUid if present (used for pagination)
  const secUid =
    userData?.secUid ||
    userData?.sec_uid ||
    userData?.sec_uid_str ||
    userData?.secUidStr;

  if (secUid) {
    (result as any).secUid = String(secUid);
  }
  
  console.log(`[TikTok Native] extractUserData: followers=${followers}, videos=${videos}, likes=${likes}`);
  
  return result;
}

// Fetch and parse TikTok profile page
async function fetchProfilePage(username: string): Promise<{ userData: Partial<TikTokScrapedData>; videos: TikTokVideo[]; cursor?: string }> {
  console.log(`[TikTok Native] Fetching profile page for: ${username}`);
  
  const url = `https://www.tiktok.com/@${username}`;
  
  try {
    const response = await fetch(url, { headers: browserHeaders });
    
    if (!response.ok) {
      console.warn(`[TikTok Native] Profile fetch failed: ${response.status}`);
      return { userData: { username }, videos: [] };
    }
    
    const html = await response.text();
    
    // Check if profile exists
    if (html.includes('Could not find this account') || 
        html.includes("couldn't find this account") ||
        html.includes('Esta conta não existe')) {
      console.warn(`[TikTok Native] Profile not found: ${username}`);
      return { userData: { username }, videos: [] };
    }
    
    // Try to extract JSON data from various script tags
    let jsonData: any = null;

    // IMPORTANT: script contents can contain "<" inside strings, so we must not use [^<]+.
    const patterns: Array<{ name: string; re: RegExp; preprocess?: (s: string) => string }> = [
      {
        name: '__UNIVERSAL_DATA_FOR_REHYDRATION__',
        re: /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
      },
      {
        name: 'SIGI_STATE',
        re: /<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
      },
      {
        name: "window['SIGI_STATE']",
        re: /window\['SIGI_STATE'\]\s*=\s*({[\s\S]*?})\s*;?/,
      },
      {
        name: '__INITIAL_STATE__',
        re: /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?/,
      },
    ];

    for (const p of patterns) {
      const match = html.match(p.re);
      if (!match) continue;

      const raw = (match[1] || '').trim();
      if (!raw) continue;

      try {
        jsonData = JSON.parse(raw);
        console.log(`[TikTok Native] Found JSON via ${p.name}`);
        break;
      } catch (e) {
        console.log(`[TikTok Native] Failed to parse JSON via ${p.name}, trying next pattern`);
      }
    }
    
    if (!jsonData) {
      console.log('[TikTok Native] No JSON found, extracting from meta tags');
      return extractFromMeta(html, username);
    }
    
    // Extract user data
    const userData = extractUserData(jsonData, username);
    
    // Extract videos
    const videos = extractVideosFromData(jsonData, username);
    
    console.log(`[TikTok Native] Extracted: ${Object.keys(userData).length} user fields, ${videos.length} videos`);
    
    // Try to find cursor for pagination
    let cursor: string | undefined;
    const cursorPaths = [
      jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.cursor,
      jsonData?.ItemList?.user?.cursor,
    ];
    for (const c of cursorPaths) {
      if (c) {
        cursor = String(c);
        break;
      }
    }
    
    return { userData, videos, cursor };
  } catch (error) {
    console.error(`[TikTok Native] Error fetching profile:`, error);
    return { userData: { username }, videos: [] };
  }
}

// Extract from meta tags as fallback
function extractFromMeta(html: string, username: string): { userData: Partial<TikTokScrapedData>; videos: TikTokVideo[] } {
  console.log('[TikTok Native] Extracting from meta tags');
  
  const userData: Partial<TikTokScrapedData> = { username };
  
  // Extract profile image
  const imgMatch = html.match(/<meta\s+(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/) ||
                   html.match(/content="([^"]+)"\s+(?:property="og:image"|name="twitter:image")/);
  if (imgMatch) userData.profileImageUrl = imgMatch[1];
  
  // Extract display name from title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    const parts = titleMatch[1].split(/[(@|]/);
    if (parts[0]) userData.displayName = parts[0].trim();
  }
  
  // Extract stats from description - handle multiple formats
  const descMatch = html.match(/<meta\s+(?:name="description"|property="og:description")\s+content="([^"]+)"/) ||
                    html.match(/content="([^"]+)"\s+(?:name="description"|property="og:description")/);
  if (descMatch) {
    const desc = descMatch[1];
    
    // Try various patterns for followers/following/likes
    // English: "123 Followers, 456 Following, 789 Likes"
    // Portuguese: "123 Seguidores, 456 Seguindo, 789 Curtidas"
    const followersPatterns = [
      /([\d.,]+[KMB]?)\s*Followers/i,
      /([\d.,]+[KMB]?)\s*Seguidores/i,
      /([\d.,]+[KMB]?)\s*seguidores/i,
    ];
    const followingPatterns = [
      /([\d.,]+[KMB]?)\s*Following/i,
      /([\d.,]+[KMB]?)\s*Seguindo/i,
    ];
    const likesPatterns = [
      /([\d.,]+[KMB]?)\s*Likes/i,
      /([\d.,]+[KMB]?)\s*Curtidas/i,
    ];
    
    for (const pattern of followersPatterns) {
      const match = desc.match(pattern);
      if (match) { userData.followersCount = parseCount(match[1]); break; }
    }
    for (const pattern of followingPatterns) {
      const match = desc.match(pattern);
      if (match) { userData.followingCount = parseCount(match[1]); break; }
    }
    for (const pattern of likesPatterns) {
      const match = desc.match(pattern);
      if (match) { userData.likesCount = parseCount(match[1]); break; }
    }
  }
  
  console.log(`[TikTok Native] Meta extraction: followers=${userData.followersCount}, likes=${userData.likesCount}`);
  
  return { userData, videos: [] };
}

// Fetch more videos using TikTok's internal API
async function fetchMoreVideos(username: string, secUid: string, cursor: string): Promise<{ videos: TikTokVideo[]; nextCursor?: string; hasMore: boolean }> {
  console.log(`[TikTok Native] Fetching more videos, cursor: ${cursor.substring(0, 20)}...`);
  
  const url = `https://www.tiktok.com/api/post/item_list/?WebIdLastTime=1704000000&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0&channel=tiktok_web&cookie_enabled=true&count=30&coverFormat=2&cursor=${cursor}&device_id=1234567890123456789&device_platform=web_pc&focus_state=true&from_page=user&history_len=1&is_fullscreen=false&is_page_visible=true&language=en&os=windows&priority_region=&referer=&region=US&screen_height=1080&screen_width=1920&secUid=${encodeURIComponent(secUid)}&tz_name=America/New_York&webcast_language=en`;
  
  try {
    const response = await fetch(url, {
      headers: {
        ...browserHeaders,
        'Referer': `https://www.tiktok.com/@${username}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`[TikTok Native] API request failed: ${response.status}`);
      return { videos: [], hasMore: false };
    }
    
    const data = await response.json();
    
    if (!data?.itemList || data.itemList.length === 0) {
      return { videos: [], hasMore: false };
    }
    
    const videos = extractVideosFromData(data, username);
    
    return {
      videos,
      nextCursor: data.cursor ? String(data.cursor) : undefined,
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    console.error('[TikTok Native] Error fetching more videos:', error);
    return { videos: [], hasMore: false };
  }
}

// Main scraping function
async function scrapeAllVideos(username: string, startCursor?: string): Promise<TikTokScrapedData> {
  console.log(`[TikTok Native] Starting full scrape for: ${username}`);

  // Get initial page
  const { userData, videos: initialVideos, cursor: initialCursor } = await fetchProfilePage(username);

  const secUid: string | undefined = (userData as any)?.secUid;

  // Merge/dedupe videos by videoId
  const videoMap = new Map<string, TikTokVideo>();
  for (const v of initialVideos) {
    if (v?.videoId) videoMap.set(v.videoId, v);
  }

  // TikTok internal API commonly accepts cursor=0 for the first page.
  // Sometimes the HTML doesn't expose a cursor, so we still try pagination as long as we have secUid.
  let cursor: string | undefined = startCursor ?? initialCursor ?? '0';
  let pages = 0;

  // Try pagination when possible
  if (secUid) {
    console.log(`[TikTok Native] Pagination enabled. startCursor=${String(cursor).slice(0, 24)}...`);

    // Hard limits to avoid timeouts / blocks
    const maxPages = 10;
    const targetCount = userData.videosCount && userData.videosCount > 0 ? userData.videosCount : Number.POSITIVE_INFINITY;

    while (pages < maxPages && videoMap.size < targetCount) {
      const res = await fetchMoreVideos(username, secUid, String(cursor));
      pages++;

      for (const v of res.videos) {
        if (v?.videoId) videoMap.set(v.videoId, v);
      }

      if (!res.hasMore || !res.nextCursor) {
        cursor = res.nextCursor;
        break;
      }

      // Stop if API returns no new videos
      if (res.videos.length === 0) break;

      cursor = res.nextCursor;

      console.log(`[TikTok Native] Page ${pages}: total videos now ${videoMap.size}`);
    }
  } else {
    console.log('[TikTok Native] Pagination not available (missing secUid)');
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
    nextCursor: cursor,
  };

  console.log(`[TikTok Native] Scrape complete: ${result.scrapedVideosCount} videos, ${result.totalViews} views`);

  return result;
}

// Save videos to database
async function saveVideosToDB(supabase: any, accountId: string, username: string, videos: TikTokVideo[]) {
  console.log(`[TikTok Native] Saving ${videos.length} videos to database...`);
  
  let savedCount = 0;
  let updatedCount = 0;
  
  const batchSize = 50;
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    
    for (const video of batch) {
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
    
    console.log(`[TikTok Native] Batch ${Math.ceil((i + 1) / batchSize)}: ${savedCount} new, ${updatedCount} updated`);
  }
  
  return { savedCount, updatedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountId, username, fetchVideos = true, continueFrom = false } = await req.json();

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

    // If we are continuing, load the stored cursor so we can paginate further
    let storedCursor: string | null = null;
    let existingAccount: any = null;

    if (accountId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: acc } = await supabase
        .from('tiktok_accounts')
        .select('id, next_cursor, scraped_videos_count, total_views, followers_count, likes_count, videos_count')
        .eq('id', accountId)
        .maybeSingle();

      existingAccount = acc;
      storedCursor = acc?.next_cursor ?? null;

      if (continueFrom) {
        console.log('[TikTok Native] ContinueFrom requested, stored cursor:', storedCursor);
      }

      // Scrape
      const data = await scrapeAllVideos(cleanUsername, continueFrom ? storedCursor ?? undefined : undefined);

      console.log('[TikTok Native] Scrape complete:', {
        username: data.username,
        displayName: data.displayName,
        followers: data.followersCount,
        videos: data.scrapedVideosCount,
        totalViews: data.totalViews,
        continueFrom,
      });

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

      // Avoid overwriting existing totals with zeros when TikTok blocks scraping
      const safeFollowers = data.followersCount > 0 ? data.followersCount : Number(existingAccount?.followers_count || 0);
      const safeLikes = data.likesCount > 0 ? data.likesCount : Number(existingAccount?.likes_count || 0);
      const safeVideosCount = data.videosCount > 0 ? data.videosCount : Number(existingAccount?.videos_count || 0);
      const safeScraped = data.scrapedVideosCount > 0 ? data.scrapedVideosCount : Number(existingAccount?.scraped_videos_count || 0);
      const safeTotalViews = data.totalViews > 0 ? data.totalViews : Number(existingAccount?.total_views || 0);

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
        next_cursor: data.nextCursor ?? storedCursor,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      // Save videos we managed to fetch
      if (fetchVideos && data.videos.length > 0) {
        await saveVideosToDB(supabase, accountId, cleanUsername, data.videos);
      }

      // Save metrics history (only if we got something useful)
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

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No accountId: just scrape and return
    const data = await scrapeAllVideos(cleanUsername);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[TikTok Native] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    // Return partial success instead of 500
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
