import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoDetails {
  platform: string;
  videoId: string;
  videoUrl: string;
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
      // TikTok: https://www.tiktok.com/@user/video/1234567890
      const match = url.match(/video\/(\d+)/);
      return match ? match[1] : null;
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

async function fetchTikTokVideo(videoId: string, apiKey: string): Promise<VideoDetails | null> {
  console.log(`Fetching TikTok video: ${videoId}`);
  
  const response = await fetch(
    `https://api.scrapecreators.com/v2/tiktok/video?video_id=${encodeURIComponent(videoId)}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.error('TikTok video API error:', response.status);
    return null;
  }

  const data = await response.json();
  const video = data.data || data;
  
  console.log('TikTok video data received:', JSON.stringify(video).substring(0, 500));

  return {
    platform: 'tiktok',
    videoId: video.id || video.aweme_id || videoId,
    videoUrl: video.share_url || video.video?.playAddr || `https://www.tiktok.com/@${video.author?.unique_id || 'user'}/video/${videoId}`,
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
}

async function fetchInstagramPost(postId: string, apiKey: string): Promise<VideoDetails | null> {
  console.log(`Fetching Instagram post: ${postId}`);
  
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
    console.error('Instagram post API error:', response.status);
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
}

async function fetchYouTubeVideo(videoId: string, apiKey: string): Promise<VideoDetails | null> {
  console.log(`Fetching YouTube video: ${videoId}`);
  
  try {
    const response = await fetch(
      `https://api.scrapecreators.com/v1/youtube/video?video_id=${encodeURIComponent(videoId)}`,
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
      return null;
    }

    const data = await response.json();
    console.log('YouTube raw response:', JSON.stringify(data).substring(0, 1000));
    
    const video = data.data || data;
    
    // Handle different response formats from ScrapeCreators
    const channelHandle = video.channel?.handle || video.channel?.custom_url || video.channelHandle || '';
    const cleanUsername = channelHandle.replace('@', '').replace('/', '');

    return {
      platform: 'youtube',
      videoId: video.id || video.video_id || video.videoId || videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
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
    return null;
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

    if (videoUrl) {
      platform = detectPlatform(videoUrl);
      if (!platform) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not detect platform from URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      videoId = extractVideoId(videoUrl, platform);
      if (!videoId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not extract video ID from URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Fetching ${platform} video: ${videoId}`);

    let videoDetails: VideoDetails | null = null;

    switch (platform) {
      case 'tiktok':
        videoDetails = await fetchTikTokVideo(videoId, apiKey);
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
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch video details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update database if requested
    if (updateDatabase && tableId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Determine which table to update based on platform
      let tableName: string;
      let updateData: Record<string, any>;

      switch (platform) {
        case 'tiktok':
          tableName = 'tiktok_videos';
          updateData = {
            views_count: videoDetails.viewsCount,
            likes_count: videoDetails.likesCount,
            comments_count: videoDetails.commentsCount,
            shares_count: videoDetails.sharesCount,
            updated_at: new Date().toISOString(),
          };
          break;
        case 'instagram':
          tableName = 'instagram_posts';
          updateData = {
            views_count: videoDetails.viewsCount,
            likes_count: videoDetails.likesCount,
            comments_count: videoDetails.commentsCount,
            shares_count: videoDetails.sharesCount,
            updated_at: new Date().toISOString(),
          };
          break;
        case 'youtube':
          tableName = 'youtube_videos';
          updateData = {
            views_count: videoDetails.viewsCount,
            likes_count: videoDetails.likesCount,
            comments_count: videoDetails.commentsCount,
            updated_at: new Date().toISOString(),
          };
          break;
        default:
          tableName = '';
          updateData = {};
      }

      if (tableName) {
        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', tableId);

        if (error) {
          console.error(`Error updating ${tableName}:`, error);
        } else {
          console.log(`Updated ${tableName} record ${tableId}`);
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
