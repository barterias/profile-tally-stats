import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENSEMBLEDATA_API_URL = 'https://ensembledata.com/apis';

interface TikTokScrapedData {
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  videosCount: number;
  videos?: Array<{
    videoId: string;
    videoUrl: string;
    caption?: string;
    thumbnailUrl?: string;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    musicTitle?: string;
    duration?: number;
    postedAt?: string;
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

    console.log(`Scraping TikTok profile via EnsembleData: ${username}`);

    const token = Deno.env.get('ENSEMBLEDATA_TOKEN');
    if (!token) {
      console.error('ENSEMBLEDATA_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'EnsembleData token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user info from EnsembleData TikTok API
    const userInfoResult = await fetchEnsembleData('/tt/user/info', { username });
    const userData = userInfoResult.data?.user || userInfoResult.data || userInfoResult;
    const statsData = userInfoResult.data?.stats || userData.stats || {};
    
    const data: TikTokScrapedData = {
      username: userData.uniqueId || userData.unique_id || username,
      displayName: userData.nickname || userData.displayName || undefined,
      profileImageUrl: userData.avatarLarger || userData.avatarMedium || userData.avatar || undefined,
      bio: userData.signature || userData.bio || undefined,
      followersCount: statsData.followerCount || statsData.followers || 0,
      followingCount: statsData.followingCount || statsData.following || 0,
      likesCount: statsData.heartCount || statsData.heart || statsData.diggCount || 0,
      videosCount: statsData.videoCount || statsData.videos || 0,
      videos: [],
    };

    // Fetch user videos if requested
    if (fetchVideos && (userData.secUid || userData.sec_uid)) {
      try {
        const secUid = userData.secUid || userData.sec_uid;
        const videosResult = await fetchEnsembleData('/tt/user/posts', {
          secUid,
          depth: '1',
          oldest_createtime: '0',
        });

        const videosArray = videosResult.data || [];
        
        if (Array.isArray(videosArray)) {
          console.log(`Found ${videosArray.length} videos`);
          data.videos = videosArray.slice(0, 50).map((video: any) => {
            const videoId = video.aweme_id || video.id || '';
            return {
              videoId,
              videoUrl: `https://www.tiktok.com/@${username}/video/${videoId}`,
              caption: video.desc || video.description || undefined,
              thumbnailUrl: video.video?.cover || video.video?.origin_cover || undefined,
              viewsCount: video.statistics?.play_count || video.stats?.playCount || 0,
              likesCount: video.statistics?.digg_count || video.stats?.diggCount || 0,
              commentsCount: video.statistics?.comment_count || video.stats?.commentCount || 0,
              sharesCount: video.statistics?.share_count || video.stats?.shareCount || 0,
              musicTitle: video.music?.title || undefined,
              duration: video.video?.duration || video.duration || undefined,
              postedAt: video.create_time ? new Date(video.create_time * 1000).toISOString() : undefined,
            };
          });
        }
      } catch (videosError) {
        console.error('Error fetching videos:', videosError);
      }
    }

    console.log('Parsed profile data:', data.displayName, 'with', data.videos?.length || 0, 'videos');

    // Update database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (accountId) {
      const { error: updateError } = await supabase
        .from('tiktok_accounts')
        .update({
          display_name: data.displayName,
          profile_image_url: data.profileImageUrl,
          bio: data.bio,
          followers_count: data.followersCount,
          following_count: data.followingCount,
          likes_count: data.likesCount,
          videos_count: data.videosCount,
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
        .from('tiktok_metrics_history')
        .insert({
          account_id: accountId,
          followers_count: data.followersCount,
          likes_count: data.likesCount,
        });

      if (metricsError) {
        console.error('Error saving metrics history:', metricsError);
      }

      // Save videos to database
      if (data.videos && data.videos.length > 0) {
        for (const video of data.videos) {
          const { data: existingVideo } = await supabase
            .from('tiktok_videos')
            .select('id')
            .eq('account_id', accountId)
            .eq('video_id', video.videoId)
            .maybeSingle();

          if (existingVideo) {
            await supabase
              .from('tiktok_videos')
              .update({
                caption: video.caption,
                thumbnail_url: video.thumbnailUrl,
                views_count: video.viewsCount,
                likes_count: video.likesCount,
                comments_count: video.commentsCount,
                shares_count: video.sharesCount,
                music_title: video.musicTitle,
                duration: video.duration,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingVideo.id);
          } else {
            await supabase
              .from('tiktok_videos')
              .insert({
                account_id: accountId,
                video_id: video.videoId,
                video_url: video.videoUrl,
                caption: video.caption,
                thumbnail_url: video.thumbnailUrl,
                views_count: video.viewsCount,
                likes_count: video.likesCount,
                comments_count: video.commentsCount,
                shares_count: video.sharesCount,
                music_title: video.musicTitle,
                duration: video.duration,
                posted_at: video.postedAt,
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
    console.error('Error scraping TikTok:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
