import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCRAPECREATORS_API_URL = 'https://api.scrapecreators.com';

interface YouTubeScrapedData {
  channelId?: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  bannerUrl?: string;
  description?: string;
  subscribersCount: number;
  videosCount: number;
  totalViews: number;
  videos?: Array<{
    videoId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    publishedAt?: string;
    duration?: number;
    isShort?: boolean;
  }>;
}

// ScrapeCreators API client
async function fetchScrapeCreators(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
  if (!apiKey) {
    throw new Error('SCRAPECREATORS_API_KEY não configurada');
  }

  const queryParams = new URLSearchParams(params);
  const url = `${SCRAPECREATORS_API_URL}${endpoint}?${queryParams}`;
  
  console.log(`[ScrapeCreators] Fetching: ${endpoint}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ScrapeCreators] API error: ${response.status}`, errorText);
    
    if (response.status === 401) {
      throw new Error('API key do ScrapeCreators inválida ou expirada');
    } else if (response.status === 402) {
      throw new Error('Créditos do ScrapeCreators esgotados');
    } else if (response.status === 429) {
      throw new Error('Rate limit do ScrapeCreators atingido');
    }
    
    throw new Error(`ScrapeCreators API error: ${response.status}`);
  }

  return response.json();
}

// Parse subscriber count from text like "2.75M subscribers"
function parseSubscriberCount(text?: string): number {
  if (!text) return 0;
  
  const match = text.match(/([\d.]+)\s*(K|M|B)?/i);
  if (!match) return 0;
  
  let value = parseFloat(match[1]);
  const multiplier = match[2]?.toUpperCase();
  
  if (multiplier === 'K') value *= 1000;
  else if (multiplier === 'M') value *= 1000000;
  else if (multiplier === 'B') value *= 1000000000;
  
  return Math.round(value);
}

// Parse view count from text like "2,170,355,382 views"
function parseViewCount(text?: string): number {
  if (!text) return 0;
  const cleanText = text.replace(/[,\s]/g, '').replace(/views?/i, '');
  return parseInt(cleanText) || 0;
}

// Parse video count from text like "9,221 videos"
function parseVideoCount(text?: string): number {
  if (!text) return 0;
  const cleanText = text.replace(/[,\s]/g, '').replace(/videos?/i, '');
  return parseInt(cleanText) || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountId, username, fetchVideos = true } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!apiKey) {
      console.error('[ScrapeCreators] API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SCRAPECREATORS_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up username/handle
    const handle = username.startsWith('@') ? username : `@${username}`;
    const cleanUsername = username.replace('@', '').trim();
    
    console.log(`[ScrapeCreators] Scraping YouTube channel: ${handle}`);

    // Fetch channel info from ScrapeCreators
    const channelResult = await fetchScrapeCreators('/v1/youtube/channel', { handle });
    
    console.log('[ScrapeCreators] Channel data received:', channelResult?.name);

    // Get avatar URL from the sources array
    let avatarUrl = undefined;
    if (channelResult?.avatar?.image?.sources?.length > 0) {
      // Get the largest avatar available
      const sources = channelResult.avatar.image.sources;
      avatarUrl = sources[sources.length - 1]?.url || sources[0]?.url;
    }

    const data: YouTubeScrapedData = {
      channelId: channelResult?.channelId,
      username: channelResult?.channel?.replace('http://www.youtube.com/@', '')?.replace('https://www.youtube.com/@', '') || cleanUsername,
      displayName: channelResult?.name,
      profileImageUrl: avatarUrl,
      bannerUrl: undefined, // Banner not included in basic channel endpoint
      description: channelResult?.description?.substring(0, 500) || undefined,
      subscribersCount: parseSubscriberCount(channelResult?.subscriberCountText) || channelResult?.subscriberCount || 0,
      videosCount: parseVideoCount(channelResult?.videoCountText) || 0,
      totalViews: parseViewCount(channelResult?.viewCountText) || 0,
      videos: [],
    };

    // Fetch videos if requested
    if (fetchVideos && data.channelId) {
      try {
        // Fetch channel videos
        const videosResult = await fetchScrapeCreators('/v1/youtube/channel-videos', {
          channelId: data.channelId,
        });

        const videosArray = videosResult?.videos || videosResult?.data?.videos || [];
        
        if (Array.isArray(videosArray) && videosArray.length > 0) {
          console.log(`[ScrapeCreators] Found ${videosArray.length} videos`);
          
          data.videos = videosArray.slice(0, 30).map((video: any) => ({
            videoId: video?.videoId || video?.video_id || '',
            title: video?.title || '',
            description: video?.description?.substring(0, 500) || undefined,
            thumbnailUrl: video?.thumbnail?.url || video?.thumbnails?.[0]?.url || undefined,
            viewsCount: parseInt(video?.viewCount || video?.view_count || '0') || 0,
            likesCount: parseInt(video?.likeCount || video?.like_count || '0') || 0,
            commentsCount: parseInt(video?.commentCount || video?.comment_count || '0') || 0,
            publishedAt: video?.publishedAt || video?.published_at || undefined,
            duration: video?.duration || video?.lengthSeconds || undefined,
            isShort: false,
          }));
        }

        // Try to fetch shorts as well
        try {
          const shortsResult = await fetchScrapeCreators('/v1/youtube/channel/shorts/simple', {
            channelId: data.channelId,
            limit: '20',
          });

          const shortsArray = shortsResult?.shorts || shortsResult?.data?.shorts || [];
          
          if (Array.isArray(shortsArray) && shortsArray.length > 0) {
            console.log(`[ScrapeCreators] Found ${shortsArray.length} shorts`);
            
            const shorts = shortsArray.slice(0, 20).map((short: any) => ({
              videoId: short?.videoId || short?.video_id || '',
              title: short?.title || '',
              description: undefined,
              thumbnailUrl: short?.thumbnail?.url || undefined,
              viewsCount: parseInt(short?.viewCount || short?.view_count || '0') || 0,
              likesCount: parseInt(short?.likeCount || short?.like_count || '0') || 0,
              commentsCount: parseInt(short?.commentCount || short?.comment_count || '0') || 0,
              publishedAt: short?.publishedAt || undefined,
              duration: short?.duration || undefined,
              isShort: true,
            }));
            
            data.videos = [...(data.videos || []), ...shorts];
          }
        } catch (shortsError) {
          console.error('[ScrapeCreators] Error fetching shorts:', shortsError);
          // Continue without shorts
        }
      } catch (videosError) {
        console.error('[ScrapeCreators] Error fetching videos:', videosError);
        // Continue without videos - don't fail the whole request
      }
    }

    console.log('[ScrapeCreators] Parsed channel data:', data.displayName, 'with', data.videos?.length || 0, 'videos');

    // Update database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (accountId) {
      const { error: updateError } = await supabase
        .from('youtube_accounts')
        .update({
          channel_id: data.channelId,
          display_name: data.displayName,
          profile_image_url: data.profileImageUrl,
          banner_url: data.bannerUrl,
          description: data.description,
          subscribers_count: data.subscribersCount,
          videos_count: data.videosCount,
          total_views: data.totalViews,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('[ScrapeCreators] Error updating account:', updateError);
      } else {
        console.log('[ScrapeCreators] Account updated successfully');
      }

      // Save metrics history
      const { error: metricsError } = await supabase
        .from('youtube_metrics_history')
        .insert({
          account_id: accountId,
          subscribers_count: data.subscribersCount,
          views_count: data.totalViews,
        });

      if (metricsError) {
        console.error('[ScrapeCreators] Error saving metrics history:', metricsError);
      }

      // Save videos to database
      if (data.videos && data.videos.length > 0) {
        for (const video of data.videos) {
          if (!video.videoId) continue;
          
          const videoUrl = video.isShort 
            ? `https://www.youtube.com/shorts/${video.videoId}`
            : `https://www.youtube.com/watch?v=${video.videoId}`;
          
          const { data: existingVideo } = await supabase
            .from('youtube_videos')
            .select('id')
            .eq('account_id', accountId)
            .eq('video_id', video.videoId)
            .maybeSingle();

          if (existingVideo) {
            await supabase
              .from('youtube_videos')
              .update({
                title: video.title,
                description: video.description,
                thumbnail_url: video.thumbnailUrl,
                views_count: video.viewsCount,
                likes_count: video.likesCount,
                comments_count: video.commentsCount,
                duration: video.duration,
                video_url: videoUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingVideo.id);
          } else {
            await supabase
              .from('youtube_videos')
              .insert({
                account_id: accountId,
                video_id: video.videoId,
                video_url: videoUrl,
                title: video.title,
                description: video.description,
                thumbnail_url: video.thumbnailUrl,
                views_count: video.viewsCount,
                likes_count: video.likesCount,
                comments_count: video.commentsCount,
                duration: video.duration,
                published_at: video.publishedAt,
              });
          }
        }
        console.log(`[ScrapeCreators] Saved ${data.videos.length} videos/shorts to database`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[ScrapeCreators] Error scraping YouTube:', error);
    
    let errorMessage = 'Failed to fetch YouTube data';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('API key') || errorMessage.includes('401')) {
        statusCode = 401;
      } else if (errorMessage.includes('Créditos') || errorMessage.includes('402')) {
        statusCode = 402;
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        statusCode = 429;
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});