import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Instagram semi-public endpoints
const IG_WEB_API = 'https://www.instagram.com/api/v1';
const IG_GRAPHQL_API = 'https://www.instagram.com/graphql/query';

// Common headers to mimic browser
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
  'Sec-Fetch-User': '?1',
};

interface InstagramScrapedData {
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  scrapedPostsCount: number;
  totalViews: number;
  posts: Array<{
    postUrl: string;
    type: string;
    thumbnailUrl?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
    postedAt?: string;
  }>;
}

// Parse compact count (1.5M, 500K, etc)
function parseCount(text?: string | number | null): number {
  if (text === null || text === undefined) return 0;
  if (typeof text === 'number') return Math.round(text);
  
  const str = String(text).trim().replace(/,/g, '');
  const match = str.match(/([\d.]+)\s*(K|M|B|mil|mi)?/i);
  if (!match) return parseInt(str.replace(/\D/g, ''), 10) || 0;
  
  let value = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  
  if (suffix === 'K' || suffix === 'MIL') value *= 1_000;
  else if (suffix === 'M' || suffix === 'MI') value *= 1_000_000;
  else if (suffix === 'B') value *= 1_000_000_000;
  
  return Math.round(value);
}

// Scrape profile from web page
async function scrapeProfileFromWeb(username: string): Promise<InstagramScrapedData> {
  console.log(`[Instagram Native] Scraping web profile for: ${username}`);
  
  // Try multiple endpoints
  const endpoints = [
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    `https://www.instagram.com/${username}/?__a=1&__d=dis`,
  ];
  
  let userData: any = null;
  let error: Error | null = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`[Instagram Native] Trying endpoint: ${endpoint.substring(0, 80)}...`);
      
      const response = await fetch(endpoint, {
        headers: {
          ...browserHeaders,
          'X-IG-App-ID': '936619743392459', // Instagram Web App ID
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        userData = data?.data?.user || data?.graphql?.user || data?.user;
        
        if (userData) {
          console.log(`[Instagram Native] Got user data from API`);
          break;
        }
      } else {
        console.log(`[Instagram Native] Endpoint returned ${response.status}`);
      }
    } catch (e) {
      error = e as Error;
      console.log(`[Instagram Native] Endpoint failed:`, e);
    }
  }
  
  // Fallback: scrape from HTML
  if (!userData) {
    console.log('[Instagram Native] Trying HTML scraping fallback...');
    userData = await scrapeProfileFromHtml(username);
  }
  
  if (!userData) {
    throw new Error(`Perfil não encontrado: ${username}`);
  }
  
  // Parse user data
  const result: InstagramScrapedData = {
    username: userData.username || username,
    displayName: userData.full_name || userData.fullName,
    profileImageUrl: userData.profile_pic_url_hd || userData.profile_pic_url || userData.profilePicUrl,
    bio: userData.biography || userData.bio,
    followersCount: userData.edge_followed_by?.count || userData.follower_count || userData.followersCount || 0,
    followingCount: userData.edge_follow?.count || userData.following_count || userData.followingCount || 0,
    postsCount: userData.edge_owner_to_timeline_media?.count || userData.media_count || userData.postsCount || 0,
    scrapedPostsCount: 0,
    totalViews: 0,
    posts: [],
  };
  
  // Parse posts if available
  const edges = userData.edge_owner_to_timeline_media?.edges || [];
  
  for (const edge of edges.slice(0, 50)) {
    const node = edge.node || edge;
    const isVideo = node.__typename === 'GraphVideo' || node.is_video;
    
    result.posts.push({
      postUrl: node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : '',
      type: isVideo ? 'video' : (node.__typename === 'GraphSidecar' ? 'carousel' : 'post'),
      thumbnailUrl: node.display_url || node.thumbnail_src,
      caption: node.edge_media_to_caption?.edges?.[0]?.node?.text?.substring(0, 200) || '',
      likesCount: node.edge_liked_by?.count || node.like_count || 0,
      commentsCount: node.edge_media_to_comment?.count || node.comment_count || 0,
      viewsCount: isVideo ? (node.video_view_count || node.play_count || 0) : 0,
      postedAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : undefined,
    });
  }
  
  result.scrapedPostsCount = result.posts.length;
  result.totalViews = result.posts.reduce((sum, p) => sum + p.viewsCount, 0);
  
  console.log(`[Instagram Native] Parsed ${result.posts.length} posts`);
  
  return result;
}

// Fallback: scrape from HTML page
async function scrapeProfileFromHtml(username: string): Promise<any> {
  try {
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: browserHeaders,
    });
    
    if (!response.ok) {
      console.log(`[Instagram Native] HTML page returned ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Try to find JSON data in various script tags
    const patterns = [
      /"user":\s*({[^}]+})/,
      /window\._sharedData\s*=\s*({.+?});<\/script>/,
      /{"props":{"pageProps":{.+?"user":\s*({[^}]+})/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.username || parsed.id) {
            return parsed;
          }
        } catch {
          // Continue to next pattern
        }
      }
    }
    
    // Extract basic info from meta tags
    const metaMatch = html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/);
    const imgMatch = html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/);
    const titleMatch = html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/);
    
    if (metaMatch) {
      // Parse "X Followers, Y Following, Z Posts - description"
      const desc = metaMatch[1];
      const numbersMatch = desc.match(/([\d,.]+[KMB]?)\s*Followers.*?([\d,.]+[KMB]?)\s*Following.*?([\d,.]+[KMB]?)\s*Posts/i);
      
      if (numbersMatch) {
        return {
          username,
          full_name: titleMatch?.[1]?.split('•')?.[0]?.trim() || username,
          profile_pic_url: imgMatch?.[1],
          biography: desc.split(' - ').slice(1).join(' - '),
          followersCount: parseCount(numbersMatch[1]),
          followingCount: parseCount(numbersMatch[2]),
          postsCount: parseCount(numbersMatch[3]),
        };
      }
    }
    
    console.log('[Instagram Native] Could not extract data from HTML');
    return null;
  } catch (e) {
    console.log('[Instagram Native] HTML scraping failed:', e);
    return null;
  }
}

// Alternative: Use i.instagram.com mobile API
async function scrapeMobileApi(username: string): Promise<InstagramScrapedData | null> {
  console.log(`[Instagram Native] Trying mobile API for: ${username}`);
  
  try {
    // First get user ID
    const searchResponse = await fetch(
      `https://www.instagram.com/web/search/topsearch/?query=${username}`,
      {
        headers: {
          ...browserHeaders,
          'X-IG-App-ID': '936619743392459',
        },
      }
    );
    
    if (!searchResponse.ok) {
      return null;
    }
    
    const searchData = await searchResponse.json();
    const user = searchData?.users?.find((u: any) => 
      u?.user?.username?.toLowerCase() === username.toLowerCase()
    )?.user;
    
    if (!user) {
      return null;
    }
    
    console.log(`[Instagram Native] Found user ID: ${user.pk}`);
    
    return {
      username: user.username,
      displayName: user.full_name,
      profileImageUrl: user.profile_pic_url,
      bio: '',
      followersCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      postsCount: user.media_count || 0,
      scrapedPostsCount: 0,
      totalViews: 0,
      posts: [],
    };
  } catch (e) {
    console.log('[Instagram Native] Mobile API failed:', e);
    return null;
  }
}

// Main scraping function with multiple fallbacks
async function scrapeInstagramProfile(username: string): Promise<InstagramScrapedData> {
  const cleanUsername = username.replace(/^@/, '').replace(/\/$/, '').trim();
  
  // Extract from URL if provided
  let handle = cleanUsername;
  const urlMatch = cleanUsername.match(/instagram\.com\/([^\/\?]+)/);
  if (urlMatch) {
    handle = urlMatch[1];
  }
  
  console.log(`[Instagram Native] Scraping profile: ${handle}`);
  
  // Try multiple methods
  const methods = [
    () => scrapeProfileFromWeb(handle),
    () => scrapeMobileApi(handle),
  ];
  
  for (const method of methods) {
    try {
      const result = await method();
      if (result && result.username) {
        return result;
      }
    } catch (e) {
      console.log('[Instagram Native] Method failed, trying next...', e);
    }
  }
  
  throw new Error(`Não foi possível obter dados do perfil: ${handle}. O Instagram pode estar bloqueando requisições.`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, accountId, fetchVideos = true, debug = false } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL do perfil é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await scrapeInstagramProfile(profileUrl);

    console.log('[Instagram Native] Scrape complete:', {
      username: data.username,
      displayName: data.displayName,
      followers: data.followersCount,
      posts: data.scrapedPostsCount,
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
            const fileName = `instagram/${accountId}.png`;
            
            await supabase.storage.from('profile-avatars').upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: true,
            });

            const { data: publicUrlData } = supabase.storage.from('profile-avatars').getPublicUrl(fileName);
            storedProfileImageUrl = publicUrlData.publicUrl + `?t=${Date.now()}`;
          }
        } catch (e) {
          console.error('[Instagram Native] Error storing image:', e);
        }
      }

      // Update account
      const { error: updateError } = await supabase
        .from('instagram_accounts')
        .update({
          display_name: data.displayName,
          profile_image_url: storedProfileImageUrl,
          bio: data.bio,
          followers_count: data.followersCount,
          following_count: data.followingCount,
          posts_count: data.postsCount,
          total_views: data.totalViews,
          scraped_posts_count: data.scrapedPostsCount,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('[Instagram Native] Error updating account:', updateError);
      }

      // Save posts
      for (const post of data.posts) {
        if (!post.postUrl) continue;
        
        const { data: existing } = await supabase
          .from('instagram_posts')
          .select('id')
          .eq('account_id', accountId)
          .eq('post_url', post.postUrl)
          .maybeSingle();

        if (existing) {
          await supabase.from('instagram_posts').update({
            post_type: post.type,
            thumbnail_url: post.thumbnailUrl,
            caption: post.caption,
            likes_count: post.likesCount,
            comments_count: post.commentsCount,
            views_count: post.viewsCount,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await supabase.from('instagram_posts').insert({
            account_id: accountId,
            post_url: post.postUrl,
            post_type: post.type,
            thumbnail_url: post.thumbnailUrl,
            caption: post.caption,
            likes_count: post.likesCount,
            comments_count: post.commentsCount,
            views_count: post.viewsCount,
            posted_at: post.postedAt,
          });
        }
      }

      // Save metrics history
      await supabase.from('instagram_metrics_history').insert({
        account_id: accountId,
        followers_count: data.followersCount,
        likes_count: data.posts.reduce((sum, p) => sum + p.likesCount, 0),
        comments_count: data.posts.reduce((sum, p) => sum + p.commentsCount, 0),
        views_count: data.totalViews,
      });

      // Update profile_metrics
      await supabase.from('profile_metrics').upsert({
        profile_id: accountId,
        platform: 'instagram',
        username: data.username,
        display_name: data.displayName,
        profile_image_url: storedProfileImageUrl,
        followers: data.followersCount,
        following: data.followingCount,
        total_views: data.totalViews,
        total_posts: data.postsCount,
        total_likes: data.posts.reduce((sum, p) => sum + p.likesCount, 0),
        total_comments: data.posts.reduce((sum, p) => sum + p.commentsCount, 0),
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform,username' });

      console.log(`[Instagram Native] Saved ${data.posts.length} posts to database`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Instagram Native] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
