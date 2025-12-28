import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TikTok endpoints
const TIKTOK_WEB_API = 'https://www.tiktok.com/api';

// Browser-like headers
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

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
  videos: Array<{
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
  }>;
}

// Parse compact count
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

// Scrape TikTok profile from HTML page
async function scrapeFromHtml(username: string): Promise<TikTokScrapedData> {
  console.log(`[TikTok Native] Scraping HTML for: ${username}`);
  
  const url = `https://www.tiktok.com/@${username}`;
  
  const response = await fetch(url, {
    headers: {
      ...browserHeaders,
      'Cookie': 'tt_webid_v2=randomvalue123; tt_csrf_token=randomcsrf',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Perfil não encontrado: ${username}`);
  }
  
  const html = await response.text();
  
  // Try to find SIGI_STATE or __UNIVERSAL_DATA_FOR_REHYDRATION__
  const patterns = [
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/,
    /<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/,
    /window\['SIGI_STATE'\]\s*=\s*({.+?});/,
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
        console.log('[TikTok Native] Failed to parse JSON:', e);
      }
    }
  }
  
  if (!jsonData) {
    // Fallback: extract from meta tags
    return scrapeFromMeta(html, username);
  }
  
  // Parse UNIVERSAL_DATA format
  const userData = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.user ||
                   jsonData?.UserModule?.users?.[username] ||
                   jsonData?.userInfo?.user;
  
  const statsData = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo?.stats ||
                    jsonData?.UserModule?.stats?.[username] ||
                    jsonData?.userInfo?.stats ||
                    {};
  
  if (!userData) {
    return scrapeFromMeta(html, username);
  }
  
  const result: TikTokScrapedData = {
    username: userData.uniqueId || username,
    displayName: userData.nickname,
    profileImageUrl: userData.avatarLarger || userData.avatarMedium || userData.avatarThumb,
    bio: userData.signature,
    followersCount: statsData.followerCount || 0,
    followingCount: statsData.followingCount || 0,
    likesCount: statsData.heartCount || statsData.heart || 0,
    videosCount: statsData.videoCount || 0,
    scrapedVideosCount: 0,
    totalViews: 0,
    videos: [],
  };
  
  // Parse videos if available
  const itemModule = jsonData?.ItemModule || jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.itemList || {};
  const videos = Object.values(itemModule) as any[];
  
  for (const video of videos.slice(0, 50)) {
    if (!video?.id) continue;
    
    result.videos.push({
      videoId: video.id,
      videoUrl: `https://www.tiktok.com/@${username}/video/${video.id}`,
      caption: video.desc,
      thumbnailUrl: video.video?.cover || video.video?.originCover,
      viewsCount: video.stats?.playCount || video.playCount || 0,
      likesCount: video.stats?.diggCount || video.diggCount || 0,
      commentsCount: video.stats?.commentCount || video.commentCount || 0,
      sharesCount: video.stats?.shareCount || video.shareCount || 0,
      duration: video.video?.duration,
      postedAt: video.createTime ? new Date(video.createTime * 1000).toISOString() : undefined,
    });
  }
  
  result.scrapedVideosCount = result.videos.length;
  result.totalViews = result.videos.reduce((sum, v) => sum + v.viewsCount, 0);
  
  console.log(`[TikTok Native] Parsed ${result.videos.length} videos`);
  
  return result;
}

// Fallback: extract data from meta tags
function scrapeFromMeta(html: string, username: string): TikTokScrapedData {
  console.log('[TikTok Native] Falling back to meta tag scraping');
  
  const result: TikTokScrapedData = {
    username,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    videosCount: 0,
    scrapedVideosCount: 0,
    totalViews: 0,
    videos: [],
  };
  
  // Extract profile image
  const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (imgMatch) {
    result.profileImageUrl = imgMatch[1];
  }
  
  // Extract display name from title
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
  if (titleMatch) {
    const parts = titleMatch[1].split(/[(@|]/);
    result.displayName = parts[0]?.trim();
  }
  
  // Extract bio from description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (descMatch) {
    // Try to parse "X Followers, Y Following, Z Likes - Description"
    const desc = descMatch[1];
    const statsMatch = desc.match(/([\d.]+[KMB]?)\s*Followers.*?([\d.]+[KMB]?)\s*Following.*?([\d.]+[KMB]?)\s*Likes/i);
    
    if (statsMatch) {
      result.followersCount = parseCount(statsMatch[1]);
      result.followingCount = parseCount(statsMatch[2]);
      result.likesCount = parseCount(statsMatch[3]);
      
      // Extract bio (after " - ")
      const bioParts = desc.split(' - ');
      if (bioParts.length > 1) {
        result.bio = bioParts.slice(1).join(' - ').trim();
      }
    }
  }
  
  console.log('[TikTok Native] Extracted from meta:', {
    followers: result.followersCount,
    likes: result.likesCount,
  });
  
  return result;
}

// Alternative: Try TikTok's node API
async function scrapeFromNodeApi(username: string): Promise<TikTokScrapedData | null> {
  console.log(`[TikTok Native] Trying node API for: ${username}`);
  
  try {
    // This endpoint sometimes works without authentication
    const response = await fetch(
      `https://www.tiktok.com/node/share/user/@${username}`,
      {
        headers: {
          ...browserHeaders,
          'Referer': 'https://www.tiktok.com/',
        },
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const user = data?.userInfo?.user;
    const stats = data?.userInfo?.stats;
    
    if (!user) {
      return null;
    }
    
    return {
      username: user.uniqueId || username,
      displayName: user.nickname,
      profileImageUrl: user.avatarLarger || user.avatarMedium,
      bio: user.signature,
      followersCount: stats?.followerCount || 0,
      followingCount: stats?.followingCount || 0,
      likesCount: stats?.heartCount || 0,
      videosCount: stats?.videoCount || 0,
      scrapedVideosCount: 0,
      totalViews: 0,
      videos: [],
    };
  } catch (e) {
    console.log('[TikTok Native] Node API failed:', e);
    return null;
  }
}

// Main scraping function
async function scrapeTikTokProfile(username: string): Promise<TikTokScrapedData> {
  // Clean username
  let cleanUsername = username.replace(/^@/, '').trim();
  
  // Extract from URL if provided
  const urlMatch = cleanUsername.match(/tiktok\.com\/@?([^\/\?]+)/);
  if (urlMatch) {
    cleanUsername = urlMatch[1];
  }
  
  console.log(`[TikTok Native] Scraping profile: ${cleanUsername}`);
  
  // Try multiple methods
  const methods = [
    () => scrapeFromHtml(cleanUsername),
    () => scrapeFromNodeApi(cleanUsername),
  ];
  
  for (const method of methods) {
    try {
      const result = await method();
      if (result && result.username) {
        return result;
      }
    } catch (e) {
      console.log('[TikTok Native] Method failed, trying next...', e);
    }
  }
  
  throw new Error(`Não foi possível obter dados do perfil: ${cleanUsername}. O TikTok pode estar bloqueando requisições.`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountId, username, fetchVideos = true, debug = false } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await scrapeTikTokProfile(username);

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
      const { error: updateError } = await supabase
        .from('tiktok_accounts')
        .update({
          display_name: data.displayName,
          profile_image_url: storedProfileImageUrl,
          bio: data.bio,
          followers_count: data.followersCount,
          following_count: data.followingCount,
          likes_count: data.likesCount,
          videos_count: data.videosCount,
          total_views: data.totalViews,
          scraped_videos_count: data.scrapedVideosCount,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('[TikTok Native] Error updating account:', updateError);
      }

      // Save videos
      for (const video of data.videos) {
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
        }
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

      console.log(`[TikTok Native] Saved ${data.videos.length} videos to database`);
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
