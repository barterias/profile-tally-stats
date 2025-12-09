import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// External Supabase for video metrics
const EXTERNAL_SUPABASE_URL = "https://vgyhklhrzaeekiymsltr.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZneWhrbGhyemFlZWtpeW1zbHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzE0MTQsImV4cCI6MjA3OTAwNzQxNH0.7lAiL3RuDaUts0tH_OyvJ0Ceg8cmNaDDnKG3XQvUxgQ";

interface ExternalVideo {
  id: number;
  platform: string;
  video_id?: string;
  youtube_id?: string;
  video_url?: string;
  link?: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  downloads?: number;
  thumbnail?: string;
  title?: string;
  creator_username?: string;
  creator_nickname?: string;
  creator_avatar?: string;
}

// Extract YouTube video ID from various URL formats
function extractYoutubeId(link: string): string | null {
  if (!link) return null;
  
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = link.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
  if (watchMatch) return watchMatch[1];
  
  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = link.match(/\/shorts\/([A-Za-z0-9_-]+)/i);
  if (shortsMatch) return shortsMatch[1];
  
  // youtu.be/VIDEO_ID
  const shortMatch = link.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
  if (shortMatch) return shortMatch[1];
  
  return null;
}

// Normalize video link for matching
function normalizeLink(link: string): string {
  if (!link) return "";
  
  let normalized = link.trim().toLowerCase();
  
  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, "");
  
  // Remove query params and fragments
  normalized = normalized.split("?")[0].split("#")[0];
  
  // Handle Instagram links
  if (normalized.includes("instagram.com")) {
    const match = normalized.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
    if (match) {
      return `instagram:${match[1]}`;
    }
  }
  
  // Handle TikTok links
  if (normalized.includes("tiktok.com")) {
    const match = normalized.match(/\/video\/(\d+)/i);
    if (match) {
      return `tiktok:${match[1]}`;
    }
    // TikTok short links
    const vmMatch = normalized.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/i);
    if (vmMatch) {
      return `tiktok:${vmMatch[1]}`;
    }
  }
  
  // Handle YouTube links
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) {
    // youtube.com/watch?v=VIDEO_ID
    const watchMatch = link.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
    if (watchMatch) {
      return `youtube:${watchMatch[1]}`;
    }
    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = normalized.match(/\/shorts\/([A-Za-z0-9_-]{11})/i);
    if (shortsMatch) {
      return `youtube:${shortsMatch[1]}`;
    }
    // youtu.be/VIDEO_ID
    const shortMatch = normalized.match(/youtu\.be\/([A-Za-z0-9_-]{11})/i);
    if (shortMatch) {
      return `youtube:${shortMatch[1]}`;
    }
  }
  
  return normalized;
}

// Fetch videos from external sources
async function fetchExternalVideos(): Promise<ExternalVideo[]> {
  const headers = {
    apikey: EXTERNAL_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };

  const allVideos: ExternalVideo[] = [];

  // Fetch from 'videos' table (Instagram)
  try {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/videos?select=*`,
      { headers }
    );
    if (response.ok) {
      const data = await response.json();
      allVideos.push(...data.map((v: any) => ({
        ...v,
        platform: "instagram",
        link: v.link || v.video_url,
      })));
      console.log(`Fetched ${data.length} Instagram videos from 'videos' table`);
    }
  } catch (error) {
    console.error("Error fetching Instagram videos:", error);
  }

  // Fetch from 'social_videos' table (TikTok and others)
  try {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/social_videos?select=*`,
      { headers }
    );
    if (response.ok) {
      const data = await response.json();
      allVideos.push(...data.map((v: any) => ({
        ...v,
        link: v.link || v.video_url,
      })));
      console.log(`Fetched ${data.length} TikTok videos from 'social_videos' table`);
    }
  } catch (error) {
    console.error("Error fetching social videos:", error);
  }

  // Fetch from 'youtube_videos' table (YouTube)
  try {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/youtube_videos?select=*`,
      { headers }
    );
    if (response.ok) {
      const data = await response.json();
      allVideos.push(...data.map((v: any) => ({
        id: v.id,
        platform: "youtube",
        video_id: v.youtube_id,
        youtube_id: v.youtube_id, // Keep the raw youtube_id for matching
        video_url: v.video_download_url,
        link: `https://youtube.com/shorts/${v.youtube_id}`,
        views: v.views || 0,
        likes: v.likes || 0,
        comments: v.comments || 0,
        shares: 0,
        thumbnail: v.thumbnail_url,
        title: v.title,
        creator_username: v.channel_name,
        creator_nickname: v.channel_name,
      })));
      console.log(`Fetched ${data.length} YouTube videos from 'youtube_videos' table`);
    }
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
  }

  return allVideos;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting video metrics synchronization...");

    // 1. Fetch all campaign videos that need syncing
    const { data: campaignVideos, error: fetchError } = await supabase
      .from("campaign_videos")
      .select("id, video_link, platform, views, likes, comments, shares, campaign_id");

    if (fetchError) {
      throw new Error(`Error fetching campaign videos: ${fetchError.message}`);
    }

    console.log(`Found ${campaignVideos?.length || 0} campaign videos to sync`);

    if (!campaignVideos || campaignVideos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No videos to sync",
          synced: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch external videos
    const externalVideos = await fetchExternalVideos();
    console.log(`Fetched ${externalVideos.length} external videos`);

    // Create maps for quick lookup
    const externalMap = new Map<string, ExternalVideo>();
    const youtubeIdMap = new Map<string, ExternalVideo>(); // Separate map for YouTube IDs
    
    for (const video of externalVideos) {
      const key = normalizeLink(video.link || video.video_url || "");
      if (key) {
        externalMap.set(key, video);
      }
      // Also add to YouTube ID map if it's a YouTube video
      if (video.platform === "youtube" && video.youtube_id) {
        youtubeIdMap.set(video.youtube_id.toLowerCase(), video);
        console.log(`Added YouTube ID to map: ${video.youtube_id}`);
      }
    }

    console.log(`YouTube ID map has ${youtubeIdMap.size} entries`);

    // 3. Match and update campaign videos
    let syncedCount = 0;
    let historyCount = 0;
    const today = new Date().toISOString().split("T")[0];

    for (const campaignVideo of campaignVideos) {
      const normalizedLink = normalizeLink(campaignVideo.video_link);
      let externalVideo = externalMap.get(normalizedLink);
      
      // If not found and it's a YouTube video, try matching by extracted YouTube ID
      if (!externalVideo && campaignVideo.platform === "youtube") {
        const youtubeId = extractYoutubeId(campaignVideo.video_link);
        if (youtubeId) {
          externalVideo = youtubeIdMap.get(youtubeId.toLowerCase());
          console.log(`YouTube ID lookup: ${youtubeId} -> ${externalVideo ? 'FOUND' : 'NOT FOUND'}`);
        }
      }

      if (externalVideo) {
        const newViews = externalVideo.views || 0;
        const newLikes = externalVideo.likes || 0;
        const newComments = externalVideo.comments || 0;
        const newShares = externalVideo.shares || 0;

        // Only update if there are changes
        if (
          newViews !== campaignVideo.views ||
          newLikes !== campaignVideo.likes ||
          newComments !== campaignVideo.comments ||
          newShares !== campaignVideo.shares
        ) {
          // Update campaign_videos
          const { error: updateError } = await supabase
            .from("campaign_videos")
            .update({
              views: newViews,
              likes: newLikes,
              comments: newComments,
              shares: newShares,
            })
            .eq("id", campaignVideo.id);

          if (updateError) {
            console.error(`Error updating video ${campaignVideo.id}:`, updateError);
          } else {
            syncedCount++;
            console.log(`Updated video ${campaignVideo.id}: views=${newViews}, likes=${newLikes}`);
          }
        }

        // Insert into history (daily snapshot)
        const { error: historyError } = await supabase
          .from("video_metrics_history")
          .upsert({
            video_id: campaignVideo.id,
            campaign_id: campaignVideo.campaign_id,
            date: today,
            views: newViews,
            likes: newLikes,
            comments: newComments,
            shares: newShares,
          }, {
            onConflict: "video_id,date",
          });

        if (historyError) {
          console.error(`Error inserting history for video ${campaignVideo.id}:`, historyError);
        } else {
          historyCount++;
        }
      } else {
        console.log(`No external match found for: ${campaignVideo.video_link}`);
      }
    }

    console.log(`Sync complete: ${syncedCount} videos updated, ${historyCount} history records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sync completed",
        synced: syncedCount,
        historyRecords: historyCount,
        totalVideos: campaignVideos.length,
        externalVideos: externalVideos.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
