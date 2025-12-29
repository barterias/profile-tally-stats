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
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

interface InstagramPost {
  postUrl: string;
  type: string;
  thumbnailUrl?: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  postedAt?: string;
}

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
  posts: InstagramPost[];
  nextCursor?: string;
}

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

// Multiple GraphQL query hashes to try
const QUERY_HASHES = [
  'e769aa130647d2354c40ea6a439bfc08',
  '003056d32c2554def87228bc3fd9668a',
  '42323d64886122307be10013ad2dcc44',
  '472f257a40c653c64c666ce877d59d2b',
];

// Extract posts from various JSON structures
function extractPostsFromData(data: any): InstagramPost[] {
  const posts: InstagramPost[] = [];
  
  function processNode(node: any) {
    if (!node) return;
    
    const isVideo = node.__typename === 'GraphVideo' || node.is_video || node.media_type === 2;
    const shortcode = node.shortcode || node.code;
    
    if (!shortcode) return;
    
    posts.push({
      postUrl: `https://www.instagram.com/p/${shortcode}/`,
      type: isVideo ? 'video' : (node.__typename === 'GraphSidecar' || node.carousel_media ? 'carousel' : 'post'),
      thumbnailUrl: node.display_url || node.thumbnail_src || node.image_versions2?.candidates?.[0]?.url,
      caption: (node.edge_media_to_caption?.edges?.[0]?.node?.text || node.caption?.text || '').substring(0, 200),
      likesCount: node.edge_liked_by?.count || node.like_count || 0,
      commentsCount: node.edge_media_to_comment?.count || node.comment_count || 0,
      viewsCount: isVideo ? (node.video_view_count || node.view_count || node.play_count || 0) : 0,
      postedAt: node.taken_at_timestamp 
        ? new Date(node.taken_at_timestamp * 1000).toISOString() 
        : node.taken_at 
          ? new Date(node.taken_at * 1000).toISOString()
          : undefined,
    });
  }
  
  // Try different paths
  const edges = data?.edge_owner_to_timeline_media?.edges 
    || data?.edge_felix_video_timeline?.edges
    || data?.user?.edge_owner_to_timeline_media?.edges
    || [];
    
  edges.forEach((edge: any) => processNode(edge.node || edge));
  
  // Try items array (API v1 format)
  const items = data?.items || data?.user?.items || [];
  items.forEach((item: any) => processNode(item));
  
  return posts;
}

async function fetchUserInfo(username: string): Promise<any | null> {
  console.log(`[Instagram Native] Fetching user info for: ${username}`);
  
  try {
    // Method 1: web_profile_info API
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          ...browserHeaders,
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'X-ASBD-ID': '129477',
          'X-IG-WWW-Claim': '0',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data?.data?.user) {
        console.log('[Instagram Native] Got user data from web_profile_info API');
        return data.data.user;
      }
    }
    
    // Method 2: Profile page HTML with embedded JSON
    console.log('[Instagram Native] Trying HTML scraping...');
    const htmlResponse = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        ...browserHeaders,
        'Cookie': 'ig_cb=2',
      },
    });
    
    if (!htmlResponse.ok) {
      console.warn(`[Instagram Native] Profile not found or private: ${username} (status: ${htmlResponse.status})`);
      return null;
    }
    
    const html = await htmlResponse.text();
    
    // Check if profile is private or doesn't exist
    if (html.includes('Esta página não está disponível') || 
        html.includes("Sorry, this page isn't available") ||
        html.includes('Esta conta é privada') ||
        html.includes('This account is private')) {
      console.warn(`[Instagram Native] Profile unavailable or private: ${username}`);
      return null;
    }
    
    // Try multiple JSON extraction methods
    let userData = null;
    
    // Try _sharedData
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/s);
    if (sharedDataMatch) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        userData = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
        if (userData) {
          console.log('[Instagram Native] Got user data from _sharedData');
          return userData;
        }
      } catch (e) {}
    }
    
    // Try __additionalData
    const additionalDataMatch = html.match(/window\.__additionalDataLoaded\s*\([^,]+,\s*({.+?})\);/s);
    if (additionalDataMatch) {
      try {
        const additionalData = JSON.parse(additionalDataMatch[1]);
        userData = additionalData?.graphql?.user || additionalData?.user;
        if (userData) {
          console.log('[Instagram Native] Got user data from __additionalDataLoaded');
          return userData;
        }
      } catch (e) {}
    }
    
    // Try require("PolarisQueryPreloaderCache") format
    const preloaderMatch = html.match(/"user":\s*({[^}]+?"username":\s*"[^"]+?"[^}]*})/);
    if (preloaderMatch) {
      try {
        // This is partial, need to build user object from meta
        console.log('[Instagram Native] Found partial user data in preloader');
      } catch (e) {}
    }
    
    // Extract from meta tags as last resort
    const metaMatch = html.match(/<meta\s+(?:content="([^"]+)"\s+property="og:description"|property="og:description"\s+content="([^"]+)")/i);
    const imgMatch = html.match(/<meta\s+(?:content="([^"]+)"\s+property="og:image"|property="og:image"\s+content="([^"]+)")/i);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    
    if (metaMatch) {
      const desc = metaMatch[1] || metaMatch[2];
      // Try different patterns
      let statsMatch = desc.match(/([\d,.]+[KMB]?)\s*Followers[,\s]+([\d,.]+[KMB]?)\s*Following[,\s]+([\d,.]+[KMB]?)\s*Posts/i);
      if (!statsMatch) {
        statsMatch = desc.match(/([\d,.]+[KMB]?)\s*seguidores[,\s]+([\d,.]+[KMB]?)\s*seguindo[,\s]+([\d,.]+[KMB]?)\s*publica/i);
      }
      
      // Extract display name from title
      let displayName = '';
      if (titleMatch) {
        const titleParts = titleMatch[1].match(/^([^(@]+)/);
        if (titleParts) displayName = titleParts[1].trim();
      }
      
      if (statsMatch) {
        console.log('[Instagram Native] Extracted from meta tags:', { followers: statsMatch[1], following: statsMatch[2], posts: statsMatch[3] });
        return {
          username,
          full_name: displayName,
          profile_pic_url: imgMatch?.[1] || imgMatch?.[2],
          edge_followed_by: { count: parseCount(statsMatch[1]) },
          edge_follow: { count: parseCount(statsMatch[2]) },
          edge_owner_to_timeline_media: { count: parseCount(statsMatch[3]), edges: [] },
        };
      }
    }
    
    console.warn(`[Instagram Native] Could not extract profile data: ${username}`);
    return null;
  } catch (error) {
    console.error(`[Instagram Native] Error fetching user info for ${username}:`, error);
    return null;
  }
}

async function fetchUserMedia(userId: string, username: string, endCursor?: string): Promise<{ posts: InstagramPost[]; nextCursor?: string; hasNextPage: boolean }> {
  console.log(`[Instagram Native] Fetching media for user ${userId}, cursor: ${endCursor ? 'yes' : 'initial'}`);
  
  // Method 1: Try GraphQL query hashes
  for (const queryHash of QUERY_HASHES) {
    try {
      const variables = {
        id: userId,
        first: 50,
        after: endCursor || null,
      };
      
      const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
      
      const response = await fetch(url, {
        headers: {
          ...browserHeaders,
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'X-ASBD-ID': '129477',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const media = data?.data?.user?.edge_owner_to_timeline_media;
        
        if (media?.edges?.length > 0) {
          console.log(`[Instagram Native] GraphQL succeeded with hash ${queryHash.substring(0, 8)}...`);
          const posts = extractPostsFromData({ edge_owner_to_timeline_media: media });
          
          return {
            posts,
            nextCursor: media.page_info?.end_cursor,
            hasNextPage: media.page_info?.has_next_page || false,
          };
        }
      }
    } catch (e) {
      console.log(`[Instagram Native] Query hash ${queryHash.substring(0, 8)}... failed`);
    }
  }
  
  console.log('[Instagram Native] GraphQL failed, trying alternative API...');
  
  // Method 2: Try the mobile/v1 API
  try {
    const apiUrl = `https://i.instagram.com/api/v1/users/${userId}/feed/?count=50${endCursor ? `&max_id=${endCursor}` : ''}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        ...browserHeaders,
        'X-IG-App-ID': '936619743392459',
        'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100)',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.items?.length > 0) {
        console.log(`[Instagram Native] Mobile API succeeded: ${data.items.length} items`);
        const posts = extractPostsFromData(data);
        return {
          posts,
          nextCursor: data.next_max_id,
          hasNextPage: data.more_available || false,
        };
      }
    } else {
      console.log(`[Instagram Native] Mobile API failed: ${response.status}`);
    }
  } catch (e) {
    console.log('[Instagram Native] Mobile API error:', e);
  }
  
  // Method 3: Try scraping profile page with scroll simulation (different URL)
  try {
    const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    
    const response = await fetch(profileUrl, {
      headers: {
        ...browserHeaders,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      const media = data?.data?.user?.edge_owner_to_timeline_media;
      
      if (media?.edges?.length > 0) {
        console.log(`[Instagram Native] web_profile_info API succeeded: ${media.edges.length} items`);
        const posts = extractPostsFromData({ edge_owner_to_timeline_media: media });
        return {
          posts,
          nextCursor: media.page_info?.end_cursor,
          hasNextPage: media.page_info?.has_next_page || false,
        };
      }
    }
  } catch (e) {
    console.log('[Instagram Native] web_profile_info error:', e);
  }
  
  console.log('[Instagram Native] All pagination methods failed');
  return { posts: [], hasNextPage: false };
}

// Main function - fetches ALL posts with pagination
async function scrapeAllPosts(username: string): Promise<InstagramScrapedData> {
  console.log(`[Instagram Native] Starting full scrape for: ${username}`);
  
  // Get user info
  const userInfo = await fetchUserInfo(username);
  
  // If profile not found, return empty data instead of throwing error
  if (!userInfo) {
    console.warn(`[Instagram Native] Profile not found or unavailable: ${username}, returning empty data`);
    return {
      username,
      displayName: undefined,
      profileImageUrl: undefined,
      bio: undefined,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      scrapedPostsCount: 0,
      totalViews: 0,
      posts: [],
      error: `Perfil não encontrado ou privado: ${username}`,
    } as InstagramScrapedData & { error?: string };
  }
  
  const userId = userInfo.id || userInfo.pk;
  
  const result: InstagramScrapedData = {
    username: userInfo.username || username,
    displayName: userInfo.full_name,
    profileImageUrl: userInfo.profile_pic_url_hd || userInfo.profile_pic_url,
    bio: userInfo.biography,
    followersCount: userInfo.edge_followed_by?.count || userInfo.follower_count || 0,
    followingCount: userInfo.edge_follow?.count || userInfo.following_count || 0,
    postsCount: userInfo.edge_owner_to_timeline_media?.count || userInfo.media_count || 0,
    scrapedPostsCount: 0,
    totalViews: 0,
    posts: [],
  };
  
  // FIRST: Extract posts embedded in userInfo (from web_profile_info)
  const embeddedEdges = userInfo.edge_owner_to_timeline_media?.edges || [];
  console.log(`[Instagram Native] Found ${embeddedEdges.length} posts embedded in profile data`);
  
  for (const edge of embeddedEdges) {
    const node = edge.node || edge;
    if (!node) continue;
    
    const isVideo = node.__typename === 'GraphVideo' || node.is_video || node.media_type === 2;
    const shortcode = node.shortcode || node.code;
    
    if (shortcode) {
      result.posts.push({
        postUrl: `https://www.instagram.com/p/${shortcode}/`,
        type: isVideo ? 'video' : (node.__typename === 'GraphSidecar' || node.carousel_media ? 'carousel' : 'post'),
        thumbnailUrl: node.display_url || node.thumbnail_src || node.image_versions2?.candidates?.[0]?.url,
        caption: (node.edge_media_to_caption?.edges?.[0]?.node?.text || node.caption?.text || '').substring(0, 200),
        likesCount: node.edge_liked_by?.count || node.like_count || 0,
        commentsCount: node.edge_media_to_comment?.count || node.comment_count || 0,
        viewsCount: isVideo ? (node.video_view_count || node.view_count || node.play_count || 0) : 0,
        postedAt: node.taken_at_timestamp 
          ? new Date(node.taken_at_timestamp * 1000).toISOString() 
          : node.taken_at 
            ? new Date(node.taken_at * 1000).toISOString()
            : undefined,
      });
    }
  }
  
  console.log(`[Instagram Native] Extracted ${result.posts.length} posts from embedded data`);
  
  // Get cursor for pagination from embedded data
  const embeddedPageInfo = userInfo.edge_owner_to_timeline_media?.page_info;
  let cursor = embeddedPageInfo?.end_cursor as string | undefined;

  // Some payloads don't reliably provide has_next_page; if we have a cursor (or postsCount suggests more), try pagination.
  let hasMore = !!cursor || (userId && result.postsCount > result.posts.length);

  // If we have user ID and we likely have more pages, try to fetch them via GraphQL/mobile APIs
  if (userId && hasMore) {
    let pageCount = 0;
    const maxPages = 10; // Limit pages to avoid timeouts

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      console.log(`[Instagram Native] Fetching page ${pageCount}...`);

      try {
        const { posts, nextCursor, hasNextPage } = await fetchUserMedia(userId, result.username, cursor);

        if (posts.length === 0) {
          console.log('[Instagram Native] No more posts from pagination');
          break;
        }

        // Add only posts not already in the list
        const existingUrls = new Set(result.posts.map((p) => p.postUrl));
        const newPosts = posts.filter((p) => !existingUrls.has(p.postUrl));
        result.posts.push(...newPosts);

        cursor = nextCursor;

        // Continue if API says there is a next page OR we still have a cursor
        hasMore = (hasNextPage && !!nextCursor) || (!!cursor && newPosts.length > 0);

        console.log(
          `[Instagram Native] Page ${pageCount}: ${newPosts.length} new posts, total: ${result.posts.length}, cursor: ${cursor ? 'yes' : 'no'}, hasMore: ${hasMore}`
        );

        // If we already reached the expected total, stop early
        if (result.postsCount > 0 && result.posts.length >= result.postsCount) {
          console.log('[Instagram Native] Reached postsCount, stopping pagination');
          break;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[Instagram Native] Error fetching page ${pageCount}:`, error);
        break;
      }
    }

    result.nextCursor = cursor;
  }
  
  result.scrapedPostsCount = result.posts.length;
  result.totalViews = result.posts.reduce((sum, p) => sum + p.viewsCount, 0);
  
  console.log(`[Instagram Native] Scrape complete: ${result.scrapedPostsCount} posts, ${result.totalViews} views`);
  
  return result;
}

// Save posts to database in batches
async function savePostsToDB(supabase: any, accountId: string, posts: InstagramPost[]) {
  console.log(`[Instagram Native] Saving ${posts.length} posts to database...`);
  
  let savedCount = 0;
  let updatedCount = 0;
  
  const batchSize = 50;
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    
    for (const post of batch) {
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
        updatedCount++;
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
        savedCount++;
      }
    }
    
    console.log(`[Instagram Native] Batch ${Math.ceil((i + 1) / batchSize)}: ${savedCount} new, ${updatedCount} updated`);
  }
  
  return { savedCount, updatedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, username: usernameParam, accountId, fetchVideos = true } = await req.json();

    // Accept either profileUrl or username
    const inputValue = profileUrl || usernameParam;
    
    if (!inputValue) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL do perfil ou username é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean username
    let username = inputValue.trim();
    const urlMatch = inputValue.match(/instagram\.com\/([^\/\?]+)/);
    if (urlMatch) {
      username = urlMatch[1];
    }
    username = username.replace(/^@/, '').replace(/\/$/, '');

    const data = await scrapeAllPosts(username);

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
      await supabase.from('instagram_accounts').update({
        display_name: data.displayName,
        profile_image_url: storedProfileImageUrl,
        bio: data.bio,
        followers_count: data.followersCount,
        following_count: data.followingCount,
        posts_count: data.postsCount,
        total_views: data.totalViews,
        scraped_posts_count: data.scrapedPostsCount,
        next_cursor: data.nextCursor,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      // Save all posts
      if (fetchVideos && data.posts.length > 0) {
        await savePostsToDB(supabase, accountId, data.posts);
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
    }

    // Check if we got an error from scraping (profile not found but not throwing)
    const hasError = (data as any).error;
    
    return new Response(
      JSON.stringify({ 
        success: !hasError, 
        data,
        warning: hasError ? (data as any).error : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Instagram Native] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Return partial success with error info instead of 500
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        data: {
          username: '',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          scrapedPostsCount: 0,
          totalViews: 0,
          posts: [],
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
