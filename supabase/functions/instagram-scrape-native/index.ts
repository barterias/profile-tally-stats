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

// GraphQL query hash for user media
const QUERY_HASH = 'e769aa130647d2354c40ea6a439bfc08';

async function fetchUserInfo(username: string): Promise<any | null> {
  console.log(`[Instagram Native] Fetching user info for: ${username}`);
  
  try {
    // Try web_profile_info endpoint
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          ...browserHeaders,
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data?.data?.user) {
        return data.data.user;
      }
    }
    
    // Fallback: scrape from HTML
    console.log('[Instagram Native] Falling back to HTML scraping...');
    const htmlResponse = await fetch(`https://www.instagram.com/${username}/`, {
      headers: browserHeaders,
    });
    
    if (!htmlResponse.ok) {
      console.warn(`[Instagram Native] Profile not found or private: ${username} (status: ${htmlResponse.status})`);
      return null;
    }
    
    const html = await htmlResponse.text();
    
    // Check if profile is private or doesn't exist
    if (html.includes('Esta página não está disponível') || 
        html.includes("Sorry, this page isn't available") ||
        html.includes('Esta conta é privada')) {
      console.warn(`[Instagram Native] Profile unavailable or private: ${username}`);
      return null;
    }
    
    // Try to find shared data
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/);
    if (sharedDataMatch) {
      const sharedData = JSON.parse(sharedDataMatch[1]);
      return sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
    }
    
    // Extract from meta tags
    const metaMatch = html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/);
    const imgMatch = html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/);
    
    if (metaMatch) {
      const desc = metaMatch[1];
      const statsMatch = desc.match(/([\d,.]+[KMB]?)\s*Followers.*?([\d,.]+[KMB]?)\s*Following.*?([\d,.]+[KMB]?)\s*Posts/i);
      
      if (statsMatch) {
        return {
          username,
          profile_pic_url: imgMatch?.[1],
          edge_followed_by: { count: parseCount(statsMatch[1]) },
          edge_follow: { count: parseCount(statsMatch[2]) },
          edge_owner_to_timeline_media: { count: parseCount(statsMatch[3]) },
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

async function fetchUserMedia(userId: string, endCursor?: string): Promise<{ posts: InstagramPost[]; nextCursor?: string; hasNextPage: boolean }> {
  console.log(`[Instagram Native] Fetching media for user ${userId}, cursor: ${endCursor ? 'yes' : 'initial'}`);
  
  const variables = {
    id: userId,
    first: 50,
    after: endCursor || null,
  };
  
  const url = `https://www.instagram.com/graphql/query/?query_hash=${QUERY_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
  
  const response = await fetch(url, {
    headers: {
      ...browserHeaders,
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  
  if (!response.ok) {
    console.log(`[Instagram Native] GraphQL request failed: ${response.status}`);
    return { posts: [], hasNextPage: false };
  }
  
  const data = await response.json();
  const media = data?.data?.user?.edge_owner_to_timeline_media;
  
  if (!media) {
    return { posts: [], hasNextPage: false };
  }
  
  const posts: InstagramPost[] = media.edges.map((edge: any) => {
    const node = edge.node;
    const isVideo = node.__typename === 'GraphVideo' || node.is_video;
    
    return {
      postUrl: node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : '',
      type: isVideo ? 'video' : (node.__typename === 'GraphSidecar' ? 'carousel' : 'post'),
      thumbnailUrl: node.display_url || node.thumbnail_src,
      caption: node.edge_media_to_caption?.edges?.[0]?.node?.text?.substring(0, 200) || '',
      likesCount: node.edge_liked_by?.count || 0,
      commentsCount: node.edge_media_to_comment?.count || 0,
      viewsCount: isVideo ? (node.video_view_count || 0) : 0,
      postedAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : undefined,
    };
  });
  
  return {
    posts,
    nextCursor: media.page_info?.end_cursor,
    hasNextPage: media.page_info?.has_next_page || false,
  };
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
  
  // If we have user ID, fetch ALL posts with pagination
  if (userId) {
    let cursor: string | undefined;
    let hasMore = true;
    let pageCount = 0;
    
    while (hasMore) {
      pageCount++;
      console.log(`[Instagram Native] Fetching page ${pageCount}...`);
      
      try {
        const { posts, nextCursor, hasNextPage } = await fetchUserMedia(userId, cursor);
        
        if (posts.length === 0) {
          console.log('[Instagram Native] No more posts found');
          break;
        }
        
        result.posts.push(...posts);
        cursor = nextCursor;
        hasMore = hasNextPage && !!nextCursor;
        
        console.log(`[Instagram Native] Page ${pageCount}: ${posts.length} posts, total: ${result.posts.length}, hasMore: ${hasMore}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Instagram Native] Error fetching page ${pageCount}:`, error);
        break;
      }
    }
    
    result.nextCursor = cursor;
  } else {
    // Fallback: use embedded posts from profile
    const edges = userInfo.edge_owner_to_timeline_media?.edges || [];
    result.posts = edges.map((edge: any) => {
      const node = edge.node;
      const isVideo = node.__typename === 'GraphVideo' || node.is_video;
      
      return {
        postUrl: node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : '',
        type: isVideo ? 'video' : 'post',
        thumbnailUrl: node.display_url,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text?.substring(0, 200) || '',
        likesCount: node.edge_liked_by?.count || 0,
        commentsCount: node.edge_media_to_comment?.count || 0,
        viewsCount: isVideo ? (node.video_view_count || 0) : 0,
        postedAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : undefined,
      };
    });
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
    const { profileUrl, accountId, fetchVideos = true } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL do perfil é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean username
    let username = profileUrl.trim();
    const urlMatch = profileUrl.match(/instagram\.com\/([^\/\?]+)/);
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
