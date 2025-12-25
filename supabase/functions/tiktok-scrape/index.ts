import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCRAPECREATORS_API_URL = 'https://api.scrapecreators.com';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountId, username, fetchVideos = true, debug = false } = await req.json();

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

    // Clean username
    const cleanUsername = username.replace('@', '').trim();
    
    console.log(`[ScrapeCreators] Scraping TikTok profile: ${cleanUsername}`);

    // Fetch user profile from ScrapeCreators - use 'handle' as parameter
    const profileResult = await fetchScrapeCreators('/v1/tiktok/profile', { handle: cleanUsername });
    
    const userData = profileResult?.user || profileResult;
    const statsData = profileResult?.stats || userData?.stats || {};
    
    console.log('[ScrapeCreators] Profile data received:', userData?.uniqueId || userData?.nickname);

    const data: TikTokScrapedData = {
      username: userData?.uniqueId || cleanUsername,
      displayName: userData?.nickname || undefined,
      profileImageUrl: userData?.avatarLarger || userData?.avatarMedium || userData?.avatarThumb || undefined,
      bio: userData?.signature || undefined,
      followersCount: statsData?.followerCount || 0,
      followingCount: statsData?.followingCount || 0,
      likesCount: statsData?.heartCount || statsData?.heart || 0,
      videosCount: statsData?.videoCount || 0,
      videos: [],
    };

    // Fetch user videos if requested
    if (fetchVideos) {
      try {
        // Use the profile videos endpoint - use 'handle' as parameter
        const videosResult = await fetchScrapeCreators('/v3/tiktok/profile-videos', {
          handle: cleanUsername,
          count: '30',
        });

        const videosArray =
          (Array.isArray(videosResult?.itemList) ? videosResult.itemList : null) ||
          (Array.isArray(videosResult?.data?.itemList) ? videosResult.data.itemList : null) ||
          (Array.isArray(videosResult?.data) ? videosResult.data : null) ||
          (Array.isArray(videosResult?.itemListData) ? videosResult.itemListData : null) ||
          [];
        
        const toInt = (v: any) => {
          if (v === null || v === undefined) return 0;
          const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9]/g, ''));
          return Number.isFinite(n) ? Math.trunc(n) : 0;
        };

        if (Array.isArray(videosArray) && videosArray.length > 0) {
          console.log(`[ScrapeCreators] Found ${videosArray.length} videos`);
          
          data.videos = videosArray.slice(0, 50).map((video: any) => {
            const videoId = video?.id || video?.aweme_id || '';
            const stats = video?.stats || video?.statistics || {};
            
            return {
              videoId,
              videoUrl: `https://www.tiktok.com/@${cleanUsername}/video/${videoId}`,
              caption: video?.desc || video?.description || undefined,
              thumbnailUrl: video?.video?.cover || video?.video?.originCover || video?.cover || undefined,
              viewsCount: toInt(stats?.playCount ?? stats?.play_count ?? video?.playCount),
              likesCount: toInt(stats?.diggCount ?? stats?.digg_count ?? video?.diggCount),
              commentsCount: toInt(stats?.commentCount ?? stats?.comment_count ?? video?.commentCount),
              sharesCount: toInt(stats?.shareCount ?? stats?.share_count ?? video?.shareCount),
              musicTitle: video?.music?.title || undefined,
              duration: toInt(video?.video?.duration ?? video?.duration),
              postedAt: video?.createTime ? new Date(video.createTime * 1000).toISOString() : undefined,
            };
          });
        }
      } catch (videosError) {
        console.error('[ScrapeCreators] Error fetching videos:', videosError);
        // Continue without videos - don't fail the whole request
      }
    }

    console.log('[ScrapeCreators] Parsed profile data:', data.displayName, 'with', data.videos?.length || 0, 'videos');

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
        console.error('[ScrapeCreators] Error updating account:', updateError);
      } else {
        console.log('[ScrapeCreators] Account updated successfully');
      }

       // Save metrics history
       const hasAnyVideos = (data.videos || []).length > 0;
       const totalViews = (data.videos || []).reduce((sum, v) => sum + (v.viewsCount || 0), 0);

       const { error: metricsError } = await supabase
         .from('tiktok_metrics_history')
         .insert({
           account_id: accountId,
           followers_count: data.followersCount,
           likes_count: data.likesCount,
           views_count: hasAnyVideos ? totalViews : null,
         });

      if (metricsError) {
        console.error('[ScrapeCreators] Error saving metrics history:', metricsError);
      }

      // Save videos to database
      if (data.videos && data.videos.length > 0) {
        for (const video of data.videos) {
          if (!video.videoId) continue;
          
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
        console.log(`[ScrapeCreators] Saved ${data.videos.length} videos to database`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data, ...(debug ? { raw: { profile: profileResult } } : {}) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[ScrapeCreators] Error scraping TikTok:', error);
    
    let errorMessage = 'Failed to fetch TikTok data';
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