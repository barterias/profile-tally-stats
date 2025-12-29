import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  insights?: {
    data: Array<{
      name: string;
      values: Array<{ value: number }>;
    }>;
  };
}

interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  error?: { message: string };
}

interface MediaResponse {
  data?: InstagramMedia[];
  paging?: { next?: string };
  error?: { message: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const INSTAGRAM_TOKEN = Deno.env.get('INSTAGRAM_TOKEN');
    const FACEBOOK_PAGE_ID = Deno.env.get('INSTAGRAM_BUSINESS_ID'); // This is actually Facebook Page ID
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!INSTAGRAM_TOKEN || !FACEBOOK_PAGE_ID) {
      throw new Error('Instagram API credentials not configured');
    }

    const { action, accountId, username, userId } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[Instagram Official API] Action: ${action}, Username: ${username || 'N/A'}`);

    // Try to determine if the ID is a Facebook Page or Instagram Business Account
    let instagramAccountId = FACEBOOK_PAGE_ID;
    
    // First, check what type of object we have
    const checkUrl = `https://graph.facebook.com/v21.0/${FACEBOOK_PAGE_ID}?fields=id,name,instagram_business_account&access_token=${INSTAGRAM_TOKEN}`;
    console.log('[Instagram Official API] Checking ID type...');
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();
    
    console.log('[Instagram Official API] Check response:', JSON.stringify(checkData));
    
    if (checkData.error) {
      // Maybe it's already an Instagram Business Account ID, try to use it directly
      console.log('[Instagram Official API] Could not check ID, trying as Instagram Account directly');
    } else if (checkData.instagram_business_account?.id) {
      // It's a Facebook Page with connected Instagram
      instagramAccountId = checkData.instagram_business_account.id;
      console.log('[Instagram Official API] Found Instagram Business Account from Page:', instagramAccountId);
    } else if (checkData.name) {
      // It's a Page but no Instagram connected
      console.log('[Instagram Official API] This is a Facebook Page but no Instagram connected. Page name:', checkData.name);
      console.log('[Instagram Official API] Make sure your Instagram Business Account is connected to this Facebook Page');
      throw new Error(`Facebook Page "${checkData.name}" found, but no Instagram Business Account is connected. Please connect your Instagram account to this Facebook Page in Meta Business Suite.`);
    }

    if (action === 'get_profile') {
      // Get profile info using Instagram Business Account ID
      const profileUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count&access_token=${INSTAGRAM_TOKEN}`;
      
      console.log('[Instagram Official API] Fetching profile...');
      const profileRes = await fetch(profileUrl);
      const profile: InstagramProfile = await profileRes.json();

      if (profile.error) {
        console.error('[Instagram Official API] Profile error:', profile.error);
        throw new Error(profile.error.message || 'Failed to fetch profile');
      }

      console.log('[Instagram Official API] Profile fetched:', profile.username, 'Followers:', profile.followers_count);

      return new Response(JSON.stringify({
        success: true,
        profile: {
          id: profile.id,
          username: profile.username,
          displayName: profile.name || profile.username,
          bio: profile.biography,
          profileImageUrl: profile.profile_picture_url,
          followersCount: profile.followers_count,
          followingCount: profile.follows_count,
          postsCount: profile.media_count,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_media') {
      // Get media list with insights
      const mediaUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${INSTAGRAM_TOKEN}`;
      
      console.log('[Instagram Official API] Fetching media...');
      const mediaRes = await fetch(mediaUrl);
      const mediaData: MediaResponse = await mediaRes.json();

      if (mediaData.error) {
        console.error('[Instagram Official API] Media error:', mediaData.error);
        throw new Error(mediaData.error.message || 'Failed to fetch media');
      }

      const mediaList: InstagramMedia[] = mediaData.data || [];
      console.log(`[Instagram Official API] Fetched ${mediaList.length} media items`);

      // Get insights for videos (views)
      const mediaWithInsights = await Promise.all(
        mediaList.map(async (media) => {
          let views = 0;
          
          // Only videos/reels have view counts
          if (media.media_type === 'VIDEO' || media.media_type === 'REELS') {
            try {
              const insightsUrl = `https://graph.facebook.com/v21.0/${media.id}/insights?metric=plays,reach,saved&access_token=${INSTAGRAM_TOKEN}`;
              const insightsRes = await fetch(insightsUrl);
              const insightsData = await insightsRes.json();
              
              if (insightsData.data) {
                const playsMetric = insightsData.data.find((m: { name: string; values: Array<{ value: number }> }) => m.name === 'plays');
                views = playsMetric?.values?.[0]?.value || 0;
              }
            } catch (e) {
              console.log(`[Instagram Official API] Could not get insights for ${media.id}`);
            }
          }

          return {
            postId: media.id,
            postUrl: media.permalink,
            caption: media.caption,
            postType: media.media_type.toLowerCase(),
            thumbnailUrl: media.thumbnail_url || media.media_url,
            postedAt: media.timestamp,
            likesCount: media.like_count || 0,
            commentsCount: media.comments_count || 0,
            viewsCount: views,
            sharesCount: 0, // Not available via API
          };
        })
      );

      return new Response(JSON.stringify({
        success: true,
        media: mediaWithInsights,
        count: mediaWithInsights.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync_account') {
      // Sync account: get profile + media and save to DB
      console.log('[Instagram Official API] Starting full sync...');

      // 1. Get profile using instagramAccountId
      const profileUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count&access_token=${INSTAGRAM_TOKEN}`;
      const profileRes = await fetch(profileUrl);
      const profile: InstagramProfile = await profileRes.json();

      if (profile.error) {
        throw new Error(profile.error.message || 'Failed to fetch profile');
      }

      console.log('[Instagram Official API] Profile:', profile.username);

      // 2. Get all media with pagination
      let allMedia: InstagramMedia[] = [];
      let nextUrl: string | null = `https://graph.facebook.com/v21.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${INSTAGRAM_TOKEN}`;
      
      while (nextUrl && allMedia.length < 500) {
        const mediaRes: Response = await fetch(nextUrl);
        const mediaData: MediaResponse = await mediaRes.json();
        
        if (mediaData.error) {
          console.error('[Instagram Official API] Media pagination error:', mediaData.error);
          break;
        }
        
        allMedia = allMedia.concat(mediaData.data || []);
        nextUrl = mediaData.paging?.next || null;
        
        console.log(`[Instagram Official API] Fetched ${allMedia.length} media items so far...`);
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }

      console.log(`[Instagram Official API] Total media: ${allMedia.length}`);

      // 3. Get insights for videos
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;

      const postsToSave = await Promise.all(
        allMedia.map(async (media, index) => {
          let views = 0;
          
          if (media.media_type === 'VIDEO' || media.media_type === 'REELS') {
            try {
              const insightsUrl = `https://graph.facebook.com/v21.0/${media.id}/insights?metric=plays&access_token=${INSTAGRAM_TOKEN}`;
              const insightsRes = await fetch(insightsUrl);
              const insightsData = await insightsRes.json();
              
              if (insightsData.data) {
                const playsMetric = insightsData.data.find((m: { name: string; values: Array<{ value: number }> }) => m.name === 'plays');
                views = playsMetric?.values?.[0]?.value || 0;
              }
              
              // Rate limit handling
              if (index > 0 && index % 10 === 0) {
                await new Promise(r => setTimeout(r, 500));
              }
            } catch (e) {
              console.log(`[Instagram Official API] Insights error for ${media.id}`);
            }
          }

          totalViews += views;
          totalLikes += media.like_count || 0;
          totalComments += media.comments_count || 0;

          return {
            post_url: media.permalink,
            caption: media.caption || null,
            post_type: media.media_type.toLowerCase(),
            thumbnail_url: media.thumbnail_url || media.media_url || null,
            posted_at: media.timestamp,
            likes_count: media.like_count || 0,
            comments_count: media.comments_count || 0,
            views_count: views,
            shares_count: 0,
          };
        })
      );

      // 4. Update or create account in DB
      if (accountId) {
        // Update existing account
        const { error: updateError } = await supabase
          .from('instagram_accounts')
          .update({
            display_name: profile.name || profile.username,
            bio: profile.biography,
            profile_image_url: profile.profile_picture_url,
            followers_count: profile.followers_count,
            following_count: profile.follows_count,
            posts_count: profile.media_count,
            total_views: totalViews,
            scraped_posts_count: allMedia.length,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);

        if (updateError) {
          console.error('[Instagram Official API] Update account error:', updateError);
        }

        // Upsert posts
        for (const post of postsToSave) {
          await supabase
            .from('instagram_posts')
            .upsert({
              account_id: accountId,
              ...post,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'account_id,post_url',
            });
        }

        // Save metrics history
        await supabase
          .from('instagram_metrics_history')
          .insert({
            account_id: accountId,
            followers_count: profile.followers_count,
            views_count: totalViews,
            likes_count: totalLikes,
            comments_count: totalComments,
          });

        console.log('[Instagram Official API] Sync complete for existing account');
      }

      return new Response(JSON.stringify({
        success: true,
        profile: {
          username: profile.username,
          displayName: profile.name || profile.username,
          followersCount: profile.followers_count,
          postsCount: profile.media_count,
        },
        stats: {
          totalMedia: allMedia.length,
          totalViews,
          totalLikes,
          totalComments,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instagram Official API] Error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
