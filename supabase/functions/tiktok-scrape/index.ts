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
  
  console.log(`[TikTok Scrape] Fetching: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TikTok Scrape] API error: ${response.status}`, errorText);
    
    if (response.status === 401) {
      throw new Error('API key do ScrapeCreators inválida ou expirada');
    } else if (response.status === 402) {
      throw new Error('Créditos do ScrapeCreators esgotados');
    } else if (response.status === 429) {
      throw new Error('Rate limit do ScrapeCreators atingido');
    }
    
    throw new Error(`ScrapeCreators API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[TikTok Scrape] Response received for ${endpoint}`);
  return data;
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
      console.error('[TikTok Scrape] API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SCRAPECREATORS_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean username
    const cleanUsername = username.replace('@', '').trim();
    
    console.log(`[TikTok Scrape] Scraping profile: ${cleanUsername}`);

    // Fetch user profile from ScrapeCreators
    const profileResult = await fetchScrapeCreators('/v1/tiktok/profile', { handle: cleanUsername });
    
    const userData = profileResult?.user || profileResult?.data?.user || profileResult;
    const statsData = profileResult?.stats || userData?.stats || profileResult?.data?.stats || {};
    
    console.log('[TikTok Scrape] Profile data:', {
      uniqueId: userData?.uniqueId,
      nickname: userData?.nickname,
      followers: statsData?.followerCount,
      videos: statsData?.videoCount,
    });

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
        // CORRECTED: Use /v3/tiktok/profile/videos (not /v3/tiktok/profile-videos)
        console.log('[TikTok Scrape] Fetching videos...');
        const videosResult = await fetchScrapeCreators('/v3/tiktok/profile/videos', {
          handle: cleanUsername,
          count: '30',
        });

        console.log('[TikTok Scrape] Videos response keys:', Object.keys(videosResult || {}));

        // ScrapeCreators v3 returns videos in "aweme_list" field
        const videosArray =
          (Array.isArray(videosResult?.aweme_list) ? videosResult.aweme_list : null) ||
          (Array.isArray(videosResult?.itemList) ? videosResult.itemList : null) ||
          (Array.isArray(videosResult?.data?.itemList) ? videosResult.data.itemList : null) ||
          (Array.isArray(videosResult?.data?.aweme_list) ? videosResult.data.aweme_list : null) ||
          (Array.isArray(videosResult?.data) ? videosResult.data : null) ||
          (Array.isArray(videosResult?.videos) ? videosResult.videos : null) ||
          [];
        
        const toInt = (v: any) => {
          if (v === null || v === undefined) return 0;
          const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9]/g, ''));
          return Number.isFinite(n) ? Math.trunc(n) : 0;
        };

        if (Array.isArray(videosArray) && videosArray.length > 0) {
          console.log(`[TikTok Scrape] Found ${videosArray.length} videos`);
          
          data.videos = videosArray.slice(0, 50).map((video: any) => {
            const videoId = video?.id || video?.aweme_id || video?.videoId || '';
            const stats = video?.stats || video?.statistics || {};
            
            // Extract thumbnail URL from various possible formats
            const coverObj = video?.video?.cover || video?.video?.origin_cover || video?.cover;
            let thumbnailUrl = undefined;
            if (typeof coverObj === 'string') {
              thumbnailUrl = coverObj;
            } else if (coverObj?.url_list?.[0]) {
              thumbnailUrl = coverObj.url_list[0];
            } else if (video?.thumbnailUrl) {
              thumbnailUrl = typeof video.thumbnailUrl === 'string' ? video.thumbnailUrl : video.thumbnailUrl?.url_list?.[0];
            }
            
            return {
              videoId,
              videoUrl: `https://www.tiktok.com/@${cleanUsername}/video/${videoId}`,
              caption: video?.desc || video?.description || video?.caption || undefined,
              thumbnailUrl,
              viewsCount: toInt(stats?.playCount ?? stats?.play_count ?? video?.playCount ?? video?.views),
              likesCount: toInt(stats?.diggCount ?? stats?.digg_count ?? video?.diggCount ?? video?.likes),
              commentsCount: toInt(stats?.commentCount ?? stats?.comment_count ?? video?.commentCount ?? video?.comments),
              sharesCount: toInt(stats?.shareCount ?? stats?.share_count ?? video?.shareCount ?? video?.shares),
              musicTitle: video?.music?.title || video?.musicTitle || undefined,
              duration: toInt(video?.video?.duration ?? video?.duration),
              postedAt: video?.createTime ? new Date(video.createTime * 1000).toISOString() : 
                       video?.postedAt || video?.posted_at || undefined,
            };
          });

          console.log(`[TikTok Scrape] Mapped ${data.videos.length} videos with metrics`);
        } else {
          console.log('[TikTok Scrape] No videos found in response');
        }
      } catch (videosError) {
        console.error('[TikTok Scrape] Error fetching videos:', videosError);
        // Continue without videos - don't fail the whole request
      }
    }

    console.log('[TikTok Scrape] Summary:', {
      username: data.username,
      displayName: data.displayName,
      followers: data.followersCount,
      videos: data.videos?.length || 0,
    });

    // Update database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (accountId) {
      // Download and store profile image in Supabase Storage
      let storedProfileImageUrl = data.profileImageUrl;
      if (data.profileImageUrl) {
        try {
          console.log('[TikTok Scrape] Downloading profile image...');
          const imageResponse = await fetch(data.profileImageUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            const imageBuffer = await imageBlob.arrayBuffer();
            const fileName = `tiktok/${accountId}.png`;
            
            // Upload to storage (overwrite if exists)
            const { error: uploadError } = await supabase.storage
              .from('profile-avatars')
              .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: true
              });

            if (uploadError) {
              console.error('[TikTok Scrape] Error uploading image:', uploadError);
            } else {
              // Get public URL
              const { data: publicUrlData } = supabase.storage
                .from('profile-avatars')
                .getPublicUrl(fileName);
              
              storedProfileImageUrl = publicUrlData.publicUrl + `?t=${Date.now()}`;
              console.log('[TikTok Scrape] Profile image stored:', storedProfileImageUrl);
            }
          }
        } catch (imgError) {
          console.error('[TikTok Scrape] Error processing profile image:', imgError);
        }
      }

      // Calculate total views from all videos
      const totalViewsFromVideos = (data.videos || []).reduce((sum, v) => sum + (v.viewsCount || 0), 0);
      
      const { error: updateError } = await supabase
        .from('tiktok_accounts')
        .update({
          display_name: data.displayName,
          profile_image_url: storedProfileImageUrl,
          bio: data.bio,
          followers_count: data.followersCount,
          following_count: data.followingCount,
          likes_count: data.likesCount,
          videos_count: data.videosCount,
          total_views: totalViewsFromVideos,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
      
      console.log(`[TikTok Scrape] Account total_views calculated: ${totalViewsFromVideos}`);

      if (updateError) {
        console.error('[TikTok Scrape] Error updating account:', updateError);
      } else {
        console.log('[TikTok Scrape] Account updated successfully');
      }

      // Save metrics history
      const hasAnyVideos = (data.videos || []).length > 0;
      const totalViews = (data.videos || []).reduce((sum, v) => sum + (v.viewsCount || 0), 0);
      const totalLikes = (data.videos || []).reduce((sum, v) => sum + (v.likesCount || 0), 0);
      const totalComments = (data.videos || []).reduce((sum, v) => sum + (v.commentsCount || 0), 0);
      const totalShares = (data.videos || []).reduce((sum, v) => sum + (v.sharesCount || 0), 0);

      const { error: metricsError } = await supabase
        .from('tiktok_metrics_history')
        .insert({
          account_id: accountId,
          followers_count: data.followersCount,
          likes_count: data.likesCount,
          views_count: hasAnyVideos ? totalViews : null,
          comments_count: hasAnyVideos ? totalComments : null,
          shares_count: hasAnyVideos ? totalShares : null,
        });

      if (metricsError) {
        console.error('[TikTok Scrape] Error saving metrics history:', metricsError);
      } else {
        console.log('[TikTok Scrape] Metrics history saved');
      }

      // Update unified profile_metrics table (triggers realtime)
      const { error: profileMetricsError } = await supabase
        .from('profile_metrics')
        .upsert({
          profile_id: accountId,
          platform: 'tiktok',
          username: data.username,
          display_name: data.displayName,
          profile_image_url: storedProfileImageUrl,
          followers: data.followersCount || 0,
          following: data.followingCount || 0,
          total_views: hasAnyVideos ? totalViews : 0,
          total_likes: data.likesCount || 0,
          total_posts: data.videosCount || 0,
          total_comments: hasAnyVideos ? totalComments : 0,
          total_shares: hasAnyVideos ? totalShares : 0,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'platform,username' });

      if (profileMetricsError) {
        console.error('[TikTok Scrape] Error updating profile_metrics:', profileMetricsError);
      } else {
        console.log('[TikTok Scrape] profile_metrics updated');
      }

      // Save videos to database
      if (data.videos && data.videos.length > 0) {
        let savedCount = 0;
        let updatedCount = 0;
        
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
            updatedCount++;
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
            savedCount++;
          }
        }
        console.log(`[TikTok Scrape] Saved ${savedCount} new videos, updated ${updatedCount} existing`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...data,
          profileImageUrl: accountId ? undefined : data.profileImageUrl, // Don't expose external URL
        },
        ...(debug ? { raw: { profile: profileResult } } : {}) 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[TikTok Scrape] Error:', error);
    
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
