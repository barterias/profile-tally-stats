import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
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
  
  const str = String(text).trim().replace(/,/g, '');
  const match = str.match(/([\d.]+)\s*(K|M|B)?/i);
  if (!match) return parseInt(str.replace(/\D/g, ''), 10) || 0;
  
  let value = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  
  if (suffix === 'K') value *= 1_000;
  else if (suffix === 'M') value *= 1_000_000;
  else if (suffix === 'B') value *= 1_000_000_000;
  
  return Math.round(value);
}

// Fetch initial page data
async function fetchProfilePage(username: string): Promise<{ userData: any; videos: TikTokVideo[]; cursor?: string }> {
  console.log(`[TikTok Native] Fetching profile page for: ${username}`);
  
  const url = `https://www.tiktok.com/@${username}`;
  const response = await fetch(url, {
    headers: browserHeaders,
  });
  
  if (!response.ok) {
    throw new Error(`Perfil não encontrado: ${username}`);
  }
  
  const html = await response.text();
  
  // Try to extract SIGI_STATE or UNIVERSAL_DATA
  const patterns = [
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/,
    /<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/,
  ];
  
  let jsonData: any = null;
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        jsonData = JSON.parse(match[1]);
        console.log('[TikTok Native] Found JSON data in HTML');
        break;
      } catch (e) {
        console.log('[TikTok Native] Failed to parse JSON');
      }
    }
  }
  
  if (!jsonData) {
    // Fallback: extract from meta tags
    return extractFromMeta(html, username);
  }
  
  // Parse user data
  const userData = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.user ||
                   jsonData?.UserModule?.users?.[username];
  
  const statsData = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.stats ||
                    jsonData?.UserModule?.stats?.[username] || {};
  
  // Parse videos
  const itemList = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.itemList ||
                   Object.values(jsonData?.ItemModule || {});
  
  const videos: TikTokVideo[] = [];
  
  for (const item of itemList) {
    if (!item?.id) continue;
    
    const stats = item?.stats || {};
    const coverObj = item?.video?.cover || item?.cover;
    let thumbnailUrl: string | undefined;
    
    if (typeof coverObj === 'string') {
      thumbnailUrl = coverObj;
    } else if (coverObj?.url_list?.[0]) {
      thumbnailUrl = coverObj.url_list[0];
    }
    
    videos.push({
      videoId: item.id,
      videoUrl: `https://www.tiktok.com/@${username}/video/${item.id}`,
      caption: item.desc,
      thumbnailUrl,
      viewsCount: stats.playCount || item.playCount || 0,
      likesCount: stats.diggCount || item.diggCount || 0,
      commentsCount: stats.commentCount || item.commentCount || 0,
      sharesCount: stats.shareCount || item.shareCount || 0,
      duration: item?.video?.duration,
      postedAt: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
    });
  }
  
  return {
    userData: {
      ...userData,
      ...statsData,
    },
    videos,
    cursor: jsonData?.cursor,
  };
}

function extractFromMeta(html: string, username: string): { userData: any; videos: TikTokVideo[]; cursor?: string } {
  console.log('[TikTok Native] Extracting from meta tags');
  
  const userData: any = { uniqueId: username };
  
  // Extract profile image
  const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (imgMatch) userData.avatarLarger = imgMatch[1];
  
  // Extract display name
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
  if (titleMatch) {
    userData.nickname = titleMatch[1].split(/[(@|]/)[0]?.trim();
  }
  
  // Extract stats from description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (descMatch) {
    const desc = descMatch[1];
    const statsMatch = desc.match(/([\d.]+[KMB]?)\s*Followers.*?([\d.]+[KMB]?)\s*Following.*?([\d.]+[KMB]?)\s*Likes/i);
    
    if (statsMatch) {
      userData.followerCount = parseCount(statsMatch[1]);
      userData.followingCount = parseCount(statsMatch[2]);
      userData.heartCount = parseCount(statsMatch[3]);
    }
  }
  
  return { userData, videos: [], cursor: undefined };
}

// Fetch more videos using API
async function fetchMoreVideos(username: string, cursor: string): Promise<{ videos: TikTokVideo[]; nextCursor?: string; hasMore: boolean }> {
  console.log(`[TikTok Native] Fetching more videos, cursor: ${cursor}`);
  
  // TikTok API endpoint for user videos
  const url = `https://www.tiktok.com/api/post/item_list/?aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0&count=35&cursor=${cursor}&secUid=&uniqueId=${username}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        ...browserHeaders,
        'Referer': `https://www.tiktok.com/@${username}`,
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
    
    const videos: TikTokVideo[] = data.itemList.map((item: any) => {
      const stats = item?.stats || {};
      const coverObj = item?.video?.cover;
      let thumbnailUrl: string | undefined;
      
      if (typeof coverObj === 'string') {
        thumbnailUrl = coverObj;
      } else if (coverObj?.url_list?.[0]) {
        thumbnailUrl = coverObj.url_list[0];
      }
      
      return {
        videoId: item.id,
        videoUrl: `https://www.tiktok.com/@${username}/video/${item.id}`,
        caption: item.desc,
        thumbnailUrl,
        viewsCount: stats.playCount || 0,
        likesCount: stats.diggCount || 0,
        commentsCount: stats.commentCount || 0,
        sharesCount: stats.shareCount || 0,
        duration: item?.video?.duration,
        postedAt: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
      };
    });
    
    return {
      videos,
      nextCursor: data.cursor,
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    console.error('[TikTok Native] Error fetching more videos:', error);
    return { videos: [], hasMore: false };
  }
}

// Main function - fetch ALL videos
async function scrapeAllVideos(username: string): Promise<TikTokScrapedData> {
  console.log(`[TikTok Native] Starting full scrape for: ${username}`);
  
  // Get initial page
  const { userData, videos: initialVideos, cursor: initialCursor } = await fetchProfilePage(username);
  
  const result: TikTokScrapedData = {
    username: userData?.uniqueId || username,
    displayName: userData?.nickname,
    profileImageUrl: userData?.avatarLarger || userData?.avatarMedium,
    bio: userData?.signature,
    followersCount: userData?.followerCount || 0,
    followingCount: userData?.followingCount || 0,
    likesCount: userData?.heartCount || userData?.heart || 0,
    videosCount: userData?.videoCount || 0,
    scrapedVideosCount: 0,
    totalViews: 0,
    videos: [...initialVideos],
  };
  
  console.log(`[TikTok Native] Initial: ${initialVideos.length} videos`);
  
  // Fetch ALL pages
  let cursor = initialCursor;
  let hasMore = !!cursor;
  let pageCount = 1;
  
  while (hasMore && cursor) {
    pageCount++;
    console.log(`[TikTok Native] Fetching page ${pageCount}...`);
    
    try {
      const { videos, nextCursor, hasMore: moreAvailable } = await fetchMoreVideos(username, cursor);
      
      if (videos.length === 0) {
        console.log('[TikTok Native] No more videos found');
        break;
      }
      
      result.videos.push(...videos);
      cursor = nextCursor;
      hasMore = moreAvailable && !!nextCursor;
      
      console.log(`[TikTok Native] Page ${pageCount}: ${videos.length} videos, total: ${result.videos.length}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[TikTok Native] Error on page ${pageCount}:`, error);
      break;
    }
  }
  
  result.nextCursor = cursor;
  result.scrapedVideosCount = result.videos.length;
  result.totalViews = result.videos.reduce((sum, v) => sum + v.viewsCount, 0);
  
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
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
