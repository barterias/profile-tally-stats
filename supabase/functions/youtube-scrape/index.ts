import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  }>;
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

    console.log(`Scraping YouTube channel: ${username}, fetchVideos: ${fetchVideos}`);

    const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!apiKey) {
      console.error('SCRAPECREATORS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch channel data from ScrapeCreators
    const profileResponse = await fetch(
      `https://api.scrapecreators.com/v1/youtube/channel?handle=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('ScrapeCreators API error:', profileResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `API error: ${profileResponse.status}` }),
        { status: profileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = await profileResponse.json();
    console.log('Profile data received');

    // Parse the channel data from ScrapeCreators API
    const channelData = profileData.data || profileData;
    
    const data: YouTubeScrapedData = {
      channelId: channelData.channel_id || channelData.channelId || undefined,
      username: channelData.custom_url?.replace('@', '') || channelData.handle?.replace('@', '') || username,
      displayName: channelData.title || channelData.name || undefined,
      profileImageUrl: channelData.thumbnail?.url || channelData.thumbnails?.high?.url || channelData.avatar || undefined,
      bannerUrl: channelData.banner?.url || channelData.brandingSettings?.image?.bannerExternalUrl || undefined,
      description: channelData.description?.substring(0, 500) || undefined,
      subscribersCount: channelData.subscriber_count || channelData.subscriberCount || channelData.statistics?.subscriberCount || 0,
      videosCount: channelData.video_count || channelData.videoCount || channelData.statistics?.videoCount || 0,
      totalViews: channelData.view_count || channelData.viewCount || channelData.statistics?.viewCount || 0,
      videos: [],
    };

    // Fetch videos if requested - use correct endpoint
    if (fetchVideos) {
      try {
        // Use channel-videos endpoint with handle
        const videosResponse = await fetch(
          `https://api.scrapecreators.com/v1/youtube/channel-videos?handle=${encodeURIComponent(username)}&limit=20`,
          {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          const videosArray = videosData.data?.videos || videosData.data || videosData.videos || [];
          
          console.log(`Found ${videosArray.length} videos from channel-videos endpoint`);
          
          data.videos = videosArray.slice(0, 20).map((video: any) => ({
            videoId: video.video_id || video.videoId || video.id || '',
            title: video.title || '',
            description: video.description?.substring(0, 500) || undefined,
            thumbnailUrl: video.thumbnail?.url || video.thumbnails?.high?.url || video.thumbnail_url || video.thumbnail || undefined,
            viewsCount: parseInt(video.view_count || video.viewCount || video.views || '0') || 0,
            likesCount: parseInt(video.like_count || video.likeCount || video.likes || '0') || 0,
            commentsCount: parseInt(video.comment_count || video.commentCount || video.comments || '0') || 0,
            publishedAt: video.published_at || video.publishedAt || video.upload_date || undefined,
            duration: video.duration || video.length_seconds || undefined,
          }));
        } else {
          console.error('Videos endpoint failed:', videosResponse.status);
        }
      } catch (videosError) {
        console.error('Error fetching videos:', videosError);
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
          const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
          
          // Upsert video
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
        console.log(`Saved ${data.videos.length} videos to database`);
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
