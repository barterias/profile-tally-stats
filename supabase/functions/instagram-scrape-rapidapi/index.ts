import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
}

function toInt(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function safeString(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

// Instagram Scraper 2025 by DavidGelling
const RAPIDAPI_HOST = 'instagram-scraper-20251.p.rapidapi.com';

// Get user info
async function getUserInfo(rapidApiKey: string, username: string): Promise<any> {
  console.log(`[Instagram RapidAPI] Getting user info for: ${username}`);

  const url = `https://${RAPIDAPI_HOST}/userinfo?username_or_id=${encodeURIComponent(username)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });

  const text = await response.text();
  console.log(`[Instagram RapidAPI] User info response status: ${response.status}`);

  if (!response.ok) {
    console.error(`[Instagram RapidAPI] User info failed: ${response.status} - ${text.slice(0, 500)}`);
    throw new Error(`RapidAPI user info failed: ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error(`[Instagram RapidAPI] Invalid JSON response: ${text.slice(0, 500)}`);
    throw new Error('RapidAPI returned invalid JSON');
  }
}

// Get user posts with pagination
async function getUserPosts(rapidApiKey: string, username: string, count: number = 50, cursor?: string): Promise<any> {
  console.log(`[Instagram RapidAPI] Getting posts for: ${username}, count: ${count}, cursor: ${cursor || 'initial'}`);

  let url = `https://${RAPIDAPI_HOST}/userposts?username_or_id=${encodeURIComponent(username)}&count=${count}`;
  if (cursor) {
    url += `&end_cursor=${encodeURIComponent(cursor)}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });

  const text = await response.text();
  console.log(`[Instagram RapidAPI] Posts response status: ${response.status}`);

  if (!response.ok) {
    console.error(`[Instagram RapidAPI] Posts failed: ${response.status} - ${text.slice(0, 500)}`);
    throw new Error(`RapidAPI posts failed: ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error(`[Instagram RapidAPI] Invalid JSON response: ${text.slice(0, 500)}`);
    throw new Error('RapidAPI returned invalid JSON');
  }
}

// Get ALL posts with pagination
async function getAllPosts(rapidApiKey: string, username: string, maxPosts: number = 500): Promise<any[]> {
  const allPosts: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let pageCount = 0;
  const postsPerPage = 50;

  while (hasMore && allPosts.length < maxPosts && pageCount < 20) {
    try {
      const response = await getUserPosts(rapidApiKey, username, postsPerPage, cursor);
      const items = response.data?.items || response.items || response.posts || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        hasMore = false;
        break;
      }

      allPosts.push(...items);
      cursor = response.data?.end_cursor || response.end_cursor || response.next_cursor || response.pagination?.end_cursor;
      hasMore = !!cursor && items.length >= postsPerPage;
      pageCount++;

      console.log(`[Instagram RapidAPI] Posts page ${pageCount}: got ${items.length}, total: ${allPosts.length}, hasMore: ${hasMore}`);

      // Small delay to avoid rate limiting
      if (hasMore && allPosts.length < maxPosts) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`[Instagram RapidAPI] Error on posts page ${pageCount + 1}:`, error);
      break;
    }
  }

  return allPosts;
}

// Get user reels with pagination
async function getUserReels(rapidApiKey: string, username: string, count: number = 50, cursor?: string): Promise<any> {
  console.log(`[Instagram RapidAPI] Getting reels for: ${username}, count: ${count}, cursor: ${cursor || 'initial'}`);

  let url = `https://${RAPIDAPI_HOST}/userreels?username_or_id=${encodeURIComponent(username)}&count=${count}`;
  if (cursor) {
    url += `&end_cursor=${encodeURIComponent(cursor)}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });

  const text = await response.text();
  console.log(`[Instagram RapidAPI] Reels response status: ${response.status}`);

  if (!response.ok) {
    console.warn(`[Instagram RapidAPI] Reels failed: ${response.status} - ${text.slice(0, 300)}`);
    return { items: [] };
  }

  try {
    return JSON.parse(text);
  } catch {
    console.warn(`[Instagram RapidAPI] Invalid JSON for reels`);
    return { items: [] };
  }
}

// Get ALL reels with pagination
async function getAllReels(rapidApiKey: string, username: string, maxReels: number = 500): Promise<any[]> {
  const allReels: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let pageCount = 0;
  const reelsPerPage = 50;

  while (hasMore && allReels.length < maxReels && pageCount < 20) {
    try {
      const response = await getUserReels(rapidApiKey, username, reelsPerPage, cursor);
      const items = response.data?.items || response.items || response.reels || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        hasMore = false;
        break;
      }

      allReels.push(...items);
      cursor = response.data?.end_cursor || response.end_cursor || response.next_cursor || response.pagination?.end_cursor;
      hasMore = !!cursor && items.length >= reelsPerPage;
      pageCount++;

      console.log(`[Instagram RapidAPI] Reels page ${pageCount}: got ${items.length}, total: ${allReels.length}, hasMore: ${hasMore}`);

      // Small delay to avoid rate limiting
      if (hasMore && allReels.length < maxReels) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`[Instagram RapidAPI] Error on reels page ${pageCount + 1}:`, error);
      break;
    }
  }

  return allReels;
}

// Map API response to our post format
function mapPosts(items: any[]): InstagramPost[] {
  const posts: InstagramPost[] = [];
  const seenUrls = new Set<string>();

  for (const item of items) {
    // Try to extract post URL from various possible fields
    const code = item.code || item.shortcode || item.id;
    let postUrl = item.link || item.post_url || item.url;
    
    if (!postUrl && code) {
      postUrl = `https://www.instagram.com/p/${code}/`;
    }
    
    if (!postUrl) continue;
    if (seenUrls.has(postUrl)) continue;
    seenUrls.add(postUrl);

    const isVideo = item.is_video || item.media_type === 2 || item.product_type === 'clips' || item.type === 'video';
    
    let postedAt: string | undefined;
    const timestamp = item.taken_at || item.taken_at_timestamp || item.timestamp || item.created_at;
    if (timestamp) {
      try {
        const ts = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
        if (Number.isFinite(ts) && ts > 0) {
          postedAt = new Date(ts).toISOString();
        }
      } catch {
        // Invalid date
      }
    }

    posts.push({
      postUrl,
      type: isVideo ? 'video' : 'post',
      thumbnailUrl: safeString(item.thumbnail_url || item.display_url || item.image_url || item.thumbnail),
      caption: safeString(item.caption?.text || item.caption || item.text),
      likesCount: toInt(item.like_count || item.likes_count || item.likes),
      commentsCount: toInt(item.comment_count || item.comments_count || item.comments),
      viewsCount: toInt(item.play_count || item.video_view_count || item.view_count || item.views || 0),
      postedAt,
    });
  }

  return posts;
}

// Save posts to database
async function savePostsToDB(supabase: any, accountId: string, posts: InstagramPost[]) {
  console.log(`[Instagram RapidAPI] Saving ${posts.length} posts to database...`);
  
  let savedCount = 0;
  let updatedCount = 0;

  for (const post of posts) {
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
        posted_at: post.postedAt,
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

  console.log(`[Instagram RapidAPI] Saved ${savedCount} new, updated ${updatedCount}`);
  return { savedCount, updatedCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { profileUrl, accountId, username: inputUsername, resultsLimit = 500, fetchAll = true } = await req.json();

    // Extract username from profileUrl or use inputUsername
    let username = inputUsername;
    if (!username && profileUrl) {
      const match = String(profileUrl).match(/instagram\.com\/([^\/?#]+)/i);
      username = (match?.[1] || '').replace(/^@/, '').replace(/\/$/, '');
    }

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean username
    username = username.replace(/^@/, '').trim();

    console.log(`[Instagram RapidAPI] Starting scrape for: ${username}, fetchAll: ${fetchAll}, limit: ${resultsLimit}`);

    // Get user info
    const userInfoResponse = await getUserInfo(rapidApiKey, username);
    const userData = userInfoResponse.data || userInfoResponse.user || userInfoResponse;

    console.log(`[Instagram RapidAPI] User info received:`, JSON.stringify(userData).slice(0, 500));

    // Get ALL posts and reels with pagination
    const [allPostsItems, allReelsItems] = await Promise.all([
      getAllPosts(rapidApiKey, username, resultsLimit),
      getAllReels(rapidApiKey, username, resultsLimit),
    ]);

    console.log(`[Instagram RapidAPI] Got ${allPostsItems.length} posts, ${allReelsItems.length} reels`);

    // Map and combine all content
    const allItems = [...allPostsItems, ...allReelsItems];
    const mappedPosts = mapPosts(allItems);

    const result: InstagramScrapedData = {
      username: userData.username || username,
      displayName: safeString(userData.full_name || userData.fullname || userData.name),
      profileImageUrl: safeString(userData.profile_pic_url || userData.profile_pic_url_hd || userData.profile_image || userData.avatar || userData.hd_profile_pic_url_info?.url),
      bio: safeString(userData.biography || userData.bio),
      followersCount: toInt(userData.follower_count || userData.followers_count || userData.followers),
      followingCount: toInt(userData.following_count || userData.followings_count || userData.following),
      postsCount: toInt(userData.media_count || userData.posts_count || userData.posts),
      scrapedPostsCount: mappedPosts.length,
      totalViews: mappedPosts.reduce((sum: number, p: InstagramPost) => sum + p.viewsCount, 0),
      posts: mappedPosts,
    };

    console.log(`[Instagram RapidAPI] Scrape complete: ${result.scrapedPostsCount} posts, ${result.totalViews} views`);

    // If accountId provided, save to database
    if (accountId) {
      // Save posts
      if (mappedPosts.length > 0) {
        await savePostsToDB(supabase, accountId, mappedPosts);
      }

      // Download and store profile image
      let storedProfileImageUrl = result.profileImageUrl;
      if (result.profileImageUrl) {
        try {
          const imageResponse = await fetch(result.profileImageUrl);
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
          console.error('[Instagram RapidAPI] Error storing image:', e);
        }
      }

      // Recalculate from DB for consistency
      const { data: allDbPosts } = await supabase.from('instagram_posts').select('views_count, likes_count, comments_count').eq('account_id', accountId);
      const totalViewsFromDb = (allDbPosts || []).reduce((sum: number, p: any) => sum + (p.views_count || 0), 0);
      const totalLikesFromDb = (allDbPosts || []).reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
      const totalCommentsFromDb = (allDbPosts || []).reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
      const totalCountFromDb = (allDbPosts || []).length;

      // Update account
      await supabase.from('instagram_accounts').update({
        display_name: result.displayName,
        profile_image_url: storedProfileImageUrl,
        bio: result.bio,
        followers_count: result.followersCount,
        following_count: result.followingCount,
        posts_count: result.postsCount,
        total_views: totalViewsFromDb,
        scraped_posts_count: totalCountFromDb,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      // Save metrics history
      await supabase.from('instagram_metrics_history').insert({
        account_id: accountId,
        followers_count: result.followersCount,
        likes_count: totalLikesFromDb,
        comments_count: totalCommentsFromDb,
        views_count: totalViewsFromDb,
      });

      // Update profile_metrics
      await supabase.from('profile_metrics').upsert({
        profile_id: accountId,
        platform: 'instagram',
        username: result.username,
        display_name: result.displayName,
        profile_image_url: storedProfileImageUrl,
        followers: result.followersCount,
        following: result.followingCount,
        total_views: totalViewsFromDb,
        total_posts: result.postsCount,
        total_likes: totalLikesFromDb,
        total_comments: totalCommentsFromDb,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform,username' });
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Instagram RapidAPI] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    // Check for rate limit errors
    const isRateLimit = errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit');
    
    if (isRateLimit) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'RATE_LIMIT',
          error: 'Limite de requisições atingido. Tente novamente em alguns minutos.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
