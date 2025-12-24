import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENSEMBLEDATA_API_URL = 'https://ensembledata.com/apis';

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

async function fetchEnsembleData(endpoint: string, params: Record<string, string>): Promise<any> {
  const token = Deno.env.get('ENSEMBLEDATA_TOKEN');
  if (!token) {
    throw new Error('ENSEMBLEDATA_TOKEN not configured');
  }

  const queryParams = new URLSearchParams({ ...params, token });
  const url = `${ENSEMBLEDATA_API_URL}${endpoint}?${queryParams}`;
  
  console.log(`Fetching EnsembleData: ${endpoint}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('EnsembleData API error:', response.status, errorText);
    throw new Error(`EnsembleData API error: ${response.status}`);
  }

  return response.json();
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

    console.log(`Scraping YouTube channel via EnsembleData: ${username}`);

    const token = Deno.env.get('ENSEMBLEDATA_TOKEN');
    if (!token) {
      console.error('ENSEMBLEDATA_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'EnsembleData token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up username/handle
    const handle = username.startsWith('@') ? username : `@${username}`;
    
    // Fetch channel info from EnsembleData YouTube API
    const channelResult = await fetchEnsembleData('/youtube/channel/info', { handle });
    const channelData = channelResult.data || channelResult;
    
    const data: YouTubeScrapedData = {
      channelId: channelData.channel_id || channelData.channelId || undefined,
      username: channelData.handle?.replace('@', '') || username.replace('@', ''),
      displayName: channelData.title || channelData.name || undefined,
      profileImageUrl: channelData.thumbnail?.url || channelData.thumbnails?.high?.url || undefined,
      bannerUrl: channelData.banner?.url || undefined,
      description: channelData.description?.substring(0, 500) || undefined,
      subscribersCount: channelData.subscriber_count || channelData.subscriberCount || 0,
      videosCount: channelData.video_count || channelData.videoCount || 0,
      totalViews: channelData.view_count || channelData.viewCount || 0,
      videos: [],
    };

    // Fetch videos and shorts if requested
    if (fetchVideos && data.channelId) {
      try {
        // Fetch regular videos
        const videosResult = await fetchEnsembleData('/youtube/channel/videos', {
          browseId: data.channelId,
          depth: '1',
        });

        const videosArray = videosResult.data?.videos || videosResult.data || [];
        
        if (Array.isArray(videosArray)) {
          console.log(`Found ${videosArray.length} videos`);
          data.videos = videosArray.slice(0, 50).map((video: any) => ({
            videoId: video.video_id || video.videoId || video.id || '',
            title: video.title || '',
            description: video.description?.substring(0, 500) || undefined,
            thumbnailUrl: video.thumbnail?.url || video.thumbnails?.high?.url || undefined,
            viewsCount: parseInt(video.view_count || video.viewCount || '0') || 0,
            likesCount: parseInt(video.like_count || video.likeCount || '0') || 0,
            commentsCount: parseInt(video.comment_count || video.commentCount || '0') || 0,
            publishedAt: video.published_at || video.publishedAt || undefined,
            duration: video.duration || video.length_seconds || undefined,
            isShort: false,
          }));
        }

        // Fetch shorts
        const shortsResult = await fetchEnsembleData('/youtube/channel/shorts', {
          browseId: data.channelId,
          depth: '1',
        });

        const shortsArray = shortsResult.data?.shorts || shortsResult.data || [];
        
        if (Array.isArray(shortsArray)) {
          console.log(`Found ${shortsArray.length} shorts`);
          const shorts = shortsArray.slice(0, 50).map((short: any) => ({
            videoId: short.video_id || short.videoId || short.id || '',
            title: short.title || '',
            description: short.description?.substring(0, 500) || undefined,
            thumbnailUrl: short.thumbnail?.url || undefined,
            viewsCount: parseInt(short.viewCountInt || short.view_count || '0') || 0,
            likesCount: parseInt(short.likeCountInt || short.like_count || '0') || 0,
            commentsCount: parseInt(short.commentCountInt || short.comment_count || '0') || 0,
            publishedAt: short.publishDate || short.published_at || undefined,
            duration: short.duration || undefined,
            isShort: true,
          }));
          
          data.videos = [...(data.videos || []), ...shorts];
        }
      } catch (videosError) {
        console.error('Error fetching videos/shorts:', videosError);
      }
    }

    console.log('Parsed channel data:', data.displayName, 'with', data.videos?.length || 0, 'videos');

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
        console.error('Error updating account:', updateError);
        throw updateError;
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
        console.error('Error saving metrics history:', metricsError);
      }

      // Save videos to database
      if (data.videos && data.videos.length > 0) {
        for (const video of data.videos) {
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
        console.log(`Saved ${data.videos.length} videos/shorts to database`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error scraping YouTube:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
