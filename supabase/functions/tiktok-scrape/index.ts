import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log(`Scraping TikTok profile: ${username}, fetchVideos: ${fetchVideos}`);

    const apiKey = Deno.env.get('SCRAPECREATORS_API_KEY');
    if (!apiKey) {
      console.error('SCRAPECREATORS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch profile data from ScrapeCreators
    const profileResponse = await fetch(
      `https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodeURIComponent(username)}`,
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

    // Parse the profile data from ScrapeCreators API
    const userData = profileData.data?.user || profileData.data || profileData;
    const statsData = profileData.data?.stats || userData.stats || userData;
    
    const data: TikTokScrapedData = {
      username: userData.uniqueId || userData.unique_id || userData.username || username,
      displayName: userData.nickname || userData.displayName || userData.name || undefined,
      profileImageUrl: userData.avatarLarger || userData.avatarMedium || userData.avatar || userData.profile_pic_url || undefined,
      bio: userData.signature || userData.bio || undefined,
      followersCount: statsData.followerCount || statsData.followers || statsData.follower_count || 0,
      followingCount: statsData.followingCount || statsData.following || statsData.following_count || 0,
      likesCount: statsData.heartCount || statsData.heart || statsData.likes || statsData.diggCount || 0,
      videosCount: statsData.videoCount || statsData.video_count || statsData.videos || 0,
      videos: [],
    };

    // Fetch videos if requested - use v3 endpoint
    if (fetchVideos) {
      try {
        const videosResponse = await fetch(
          `https://api.scrapecreators.com/v3/tiktok/profile/videos?handle=${encodeURIComponent(username)}&limit=20`,
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
          const videosArray = videosData.data?.videos || videosData.data?.itemList || videosData.data || [];
          
          console.log(`Found ${videosArray.length} videos from v3 endpoint`);
          
          data.videos = videosArray.slice(0, 20).map((video: any) => ({
            videoId: video.id || video.video_id || video.aweme_id || '',
            videoUrl: video.video?.playAddr || video.video_url || video.play_url || `https://www.tiktok.com/@${username}/video/${video.id || video.video_id}`,
            caption: video.desc || video.description || video.caption || undefined,
            thumbnailUrl: video.video?.cover || video.video?.originCover || video.cover || video.thumbnail || undefined,
            viewsCount: video.stats?.playCount || video.play_count || video.views || 0,
            likesCount: video.stats?.diggCount || video.digg_count || video.likes || 0,
            commentsCount: video.stats?.commentCount || video.comment_count || video.comments || 0,
            sharesCount: video.stats?.shareCount || video.share_count || video.shares || 0,
            musicTitle: video.music?.title || video.music_title || undefined,
            duration: video.video?.duration || video.duration || undefined,
            postedAt: video.createTime ? new Date(video.createTime * 1000).toISOString() : video.create_time || undefined,
          }));
        } else {
          console.error('Videos endpoint failed:', videosResponse.status);
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
          // Upsert video
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
