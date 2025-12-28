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
  if (typeof text === 'number') return Math.round(text);
  
  const str = String(text).trim().replace(/,/g, '').replace(/\./g, '');
  const match = str.match(/([\d,.]+)\s*(K|M|B|mil|mi)?/i);
  if (!match) return parseInt(str.replace(/\D/g, ''), 10) || 0;
  
  let value = parseFloat(match[1].replace(',', '.'));
  const suffix = match[2]?.toLowerCase();
  
  if (suffix === 'k' || suffix === 'mil') value *= 1_000;
  else if (suffix === 'm' || suffix === 'mi') value *= 1_000_000;
  else if (suffix === 'b') value *= 1_000_000_000;
  
  return Math.round(value);
}

// Extract all videos from any JSON structure recursively
function extractVideosFromData(data: any, username: string): TikTokVideo[] {
  const videos: TikTokVideo[] = [];
  const seenIds = new Set<string>();
  
  function extractVideoFromItem(item: any): TikTokVideo | null {
    const videoId = item?.id || item?.video?.id || item?.itemInfos?.id;
    if (!videoId || seenIds.has(videoId)) return null;
    seenIds.add(videoId);
    
    const stats = item?.stats || item?.statistics || item?.itemInfos || {};
    
    // Get thumbnail
    let thumbnailUrl: string | undefined;
    const cover = item?.video?.cover || item?.cover || item?.video?.originCover;
    if (typeof cover === 'string') {
      thumbnailUrl = cover;
    } else if (cover?.url_list?.[0]) {
      thumbnailUrl = cover.url_list[0];
    } else if (cover?.urlList?.[0]) {
      thumbnailUrl = cover.urlList[0];
    }
    
    // Get views
    const views = stats.playCount || stats.play_count || stats.views || 
                  item.playCount || item.play_count || item.views || 0;
    
    // Get likes
    const likes = stats.diggCount || stats.digg_count || stats.likes ||
                  item.diggCount || item.digg_count || item.likes || 0;
    
    // Get comments
    const comments = stats.commentCount || stats.comment_count || stats.comments ||
                     item.commentCount || item.comment_count || item.comments || 0;
    
    // Get shares
    const shares = stats.shareCount || stats.share_count || stats.shares ||
                   item.shareCount || item.share_count || item.shares || 0;
    
    // Get timestamp
    const createTime = item.createTime || item.create_time || item.createtime;
    
    return {
      videoId,
      videoUrl: `https://www.tiktok.com/@${username}/video/${videoId}`,
      caption: item.desc || item.description || item.title,
      thumbnailUrl,
      viewsCount: parseCount(views),
      likesCount: parseCount(likes),
      commentsCount: parseCount(comments),
      sharesCount: parseCount(shares),
      duration: item?.video?.duration || item?.duration,
      postedAt: createTime ? new Date(createTime * 1000).toISOString() : undefined,
    };
  }
  
  function walkObject(obj: any, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 20) return;
    
    // Check if this object looks like a video item
    if (obj.id && (obj.desc !== undefined || obj.video || obj.stats || obj.createTime)) {
      const video = extractVideoFromItem(obj);
      if (video) videos.push(video);
    }
    
    // Check for itemList arrays
    if (obj.itemList && Array.isArray(obj.itemList)) {
      for (const item of obj.itemList) {
        const video = extractVideoFromItem(item);
        if (video) videos.push(video);
      }
    }
    
    // Check ItemModule (older format)
    if (obj.ItemModule && typeof obj.ItemModule === 'object') {
      for (const key of Object.keys(obj.ItemModule)) {
        const item = obj.ItemModule[key];
        const video = extractVideoFromItem(item);
        if (video) videos.push(video);
      }
    }
    
    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      for (const item of obj) {
        walkObject(item, depth + 1);
      }
    } else {
      for (const key of Object.keys(obj)) {
        if (key !== 'itemList' && key !== 'ItemModule') {
          walkObject(obj[key], depth + 1);
        }
      }
    }
  }
  
  walkObject(data);
  return videos;
}

// Extract user data from any JSON structure
function extractUserData(data: any, username: string): Partial<TikTokScrapedData> {
  let userData: any = null;
  let statsData: any = null;
  
  // Try different paths
  const userPaths = [
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.user,
    data?.UserModule?.users?.[username],
    data?.UserPage?.userInfo?.user,
    data?.userInfo?.user,
  ];
  
  for (const path of userPaths) {
    if (path) {
      userData = path;
      break;
    }
  }
  
  const statsPaths = [
    data?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.stats,
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
  
  const result: Partial<TikTokScrapedData> = {
    username: userData?.uniqueId || userData?.unique_id || username,
    displayName: userData?.nickname || userData?.name,
    bio: userData?.signature || userData?.bio,
    followersCount: parseCount(statsData?.followerCount || userData?.followerCount || userData?.fans || 0),
    followingCount: parseCount(statsData?.followingCount || userData?.followingCount || userData?.following || 0),
    likesCount: parseCount(statsData?.heartCount || statsData?.heart || userData?.heartCount || userData?.heart || 0),
    videosCount: parseCount(statsData?.videoCount || userData?.videoCount || userData?.video || 0),
  };
  
  // Get avatar
  const avatar = userData?.avatarLarger || userData?.avatarMedium || userData?.avatar_larger || userData?.avatar;
  if (avatar) {
    result.profileImageUrl = avatar;
  }
  
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
    
    const patterns = [
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/,
      /<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/,
      /window\['SIGI_STATE'\]\s*=\s*({.+?});/,
      /<script[^>]*>\s*window\.__INITIAL_STATE__\s*=\s*({.+?});?\s*<\/script>/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          jsonData = JSON.parse(match[1]);
          console.log('[TikTok Native] Found JSON data in HTML');
          break;
        } catch (e) {
          console.log('[TikTok Native] Failed to parse JSON, trying next pattern');
        }
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
  
  // Extract stats from description
  const descMatch = html.match(/<meta\s+(?:name="description"|property="og:description")\s+content="([^"]+)"/) ||
                    html.match(/content="([^"]+)"\s+(?:name="description"|property="og:description")/);
  if (descMatch) {
    const desc = descMatch[1];
    
    // Try to parse "123 Followers, 456 Following, 789 Likes"
    const followersMatch = desc.match(/([\d.]+[KMB]?)\s*Followers/i);
    const followingMatch = desc.match(/([\d.]+[KMB]?)\s*Following/i);
    const likesMatch = desc.match(/([\d.]+[KMB]?)\s*Likes/i);
    
    if (followersMatch) userData.followersCount = parseCount(followersMatch[1]);
    if (followingMatch) userData.followingCount = parseCount(followingMatch[1]);
    if (likesMatch) userData.likesCount = parseCount(likesMatch[1]);
  }
  
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
async function scrapeAllVideos(username: string): Promise<TikTokScrapedData> {
  console.log(`[TikTok Native] Starting full scrape for: ${username}`);
  
  // Get initial page
  const { userData, videos: initialVideos, cursor: initialCursor } = await fetchProfilePage(username);
  
  const result: TikTokScrapedData = {
    username: userData.username || username,
    displayName: userData.displayName,
    profileImageUrl: userData.profileImageUrl,
    bio: userData.bio,
    followersCount: userData.followersCount || 0,
    followingCount: userData.followingCount || 0,
    likesCount: userData.likesCount || 0,
    videosCount: userData.videosCount || 0,
    scrapedVideosCount: 0,
    totalViews: 0,
    videos: [...initialVideos],
  };
  
  console.log(`[TikTok Native] Initial: ${initialVideos.length} videos, followers: ${result.followersCount}`);
  
  // Note: TikTok's API requires secUid for pagination which is harder to get without cookies
  // The initial page usually contains the most recent videos (up to 30-35)
  // For now, we'll work with what we can get from the initial page
  
  result.scrapedVideosCount = result.videos.length;
  result.totalViews = result.videos.reduce((sum, v) => sum + v.viewsCount, 0);
  
  // If we got 0 videos but the account has videos, try alternative approach
  if (result.videos.length === 0 && result.videosCount > 0) {
    console.log('[TikTok Native] No videos from initial scrape, trying alternative...');
    // The videos might be loaded client-side - we can only get the profile info
  }
  
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
    if (urlMatch) {
      cleanUsername = urlMatch[1];
    }

    const data = await scrapeAllVideos(cleanUsername);

    console.log('[TikTok Native] Scrape complete:', {
      username: data.username,
      displayName: data.displayName,
      followers: data.followersCount,
      videos: data.scrapedVideosCount,
      totalViews: data.totalViews,
    });

    // Update database if accountId provided
    if (accountId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

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
        followers_count: data.followersCount,
        following_count: data.followingCount,
        likes_count: data.likesCount,
        videos_count: data.videosCount,
        total_views: data.totalViews,
        scraped_videos_count: data.scrapedVideosCount,
        next_cursor: data.nextCursor,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      // Save all videos
      if (fetchVideos && data.videos.length > 0) {
        await saveVideosToDB(supabase, accountId, cleanUsername, data.videos);
      }

      // Save metrics history
      await supabase.from('tiktok_metrics_history').insert({
        account_id: accountId,
        followers_count: data.followersCount,
        likes_count: data.likesCount,
        views_count: data.totalViews,
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
        followers: data.followersCount,
        following: data.followingCount,
        total_views: data.totalViews,
        total_posts: data.videosCount,
        total_likes: data.likesCount,
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
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
