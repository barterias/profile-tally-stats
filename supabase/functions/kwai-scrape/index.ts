import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ApifyRunResponse = {
  data?: { id: string; defaultDatasetId?: string; status?: string };
};

type ApifyRunStatus = {
  data?: { id: string; status: string; defaultDatasetId?: string };
};

type KwaiVideo = {
  videoUrl: string;
  videoId?: string;
  caption?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration?: number;
  musicTitle?: string;
  postedAt?: string | null;
};

type KwaiScrapedData = {
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  videosCount: number;
  likesCount: number;
  scrapedVideosCount: number;
  totalViews: number;
  videos: KwaiVideo[];
};

function toInt(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function safeString(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

async function startApifyRun(apifyToken: string, username: string, resultsLimit: number): Promise<ApifyRunResponse> {
  console.log(`[Apify Kwai] Starting run for: ${username} (limit=${resultsLimit})`);

  // Try the curious_coder/kwai-scraper actor
  const actorId = "curious_coder~kwai-scraper";
  const profileUrl = `https://www.kwai.com/@${username}`;

  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profileUrls: [profileUrl],
      maxItems: resultsLimit,
      username: username,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Apify Kwai] Failed to start run: ${res.status} ${text}`);
    throw new Error(`Apify start run failed: ${res.status} - ${text}`);
  }

  return res.json();
}

async function checkRunStatus(apifyToken: string, runId: string): Promise<ApifyRunStatus> {
  const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Apify Kwai] Failed to check status: ${res.status} ${text}`);
    throw new Error(`Apify status failed: ${res.status}`);
  }

  return res.json();
}

async function waitForRunCompletion(apifyToken: string, runId: string, maxWaitMs = 120_000): Promise<string> {
  const start = Date.now();
  const pollMs = 4_000;

  console.log(`[Apify Kwai] Waiting run ${runId}...`);

  while (Date.now() - start < maxWaitMs) {
    const st = await checkRunStatus(apifyToken, runId);
    const status = st?.data?.status;

    console.log(`[Apify Kwai] Status: ${status}`);

    if (status === "SUCCEEDED") {
      const datasetId = st?.data?.defaultDatasetId;
      if (!datasetId) throw new Error("Apify SUCCEEDED but no dataset id");
      return datasetId;
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status.toLowerCase()}`);
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(`Timeout waiting Apify run (${Math.round(maxWaitMs / 1000)}s)`);
}

async function getDatasetItems(apifyToken: string, datasetId: string): Promise<any[]> {
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&clean=true`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Apify Kwai] Failed to get dataset items: ${res.status} ${text}`);
    throw new Error(`Apify dataset failed: ${res.status}`);
  }

  return res.json();
}

function mapApifyItemsToVideos(items: any[]): KwaiVideo[] {
  const videos: KwaiVideo[] = [];

  for (const it of items || []) {
    // Handle various field naming patterns from Kwai scrapers
    const url = safeString(
      it?.videoUrl || it?.url || it?.shareUrl || it?.webShareUrl ||
      it?.kwaiUrl || it?.link || it?.videoLink
    );
    if (!url) continue;

    const videoId = safeString(it?.videoId || it?.id || it?.photoId);
    const caption = safeString(it?.caption || it?.title || it?.description || it?.text);

    const thumbnailUrl = safeString(
      it?.thumbnailUrl || it?.thumbnail || it?.coverUrl ||
      it?.cover || it?.imageUrl || it?.image
    );

    const views = toInt(it?.viewCount || it?.playCount || it?.viewsCount || it?.views || 0);
    const likes = toInt(it?.likeCount || it?.likesCount || it?.likes || 0);
    const comments = toInt(it?.commentCount || it?.commentsCount || it?.comments || 0);
    const shares = toInt(it?.shareCount || it?.sharesCount || it?.shares || 0);
    const duration = it?.duration ? toInt(it.duration) : undefined;
    const musicTitle = safeString(it?.musicTitle || it?.music?.title || it?.soundName);

    const ts = it?.timestamp || it?.createTime || it?.createdAt || it?.publishTime;
    let postedAt: string | null = null;
    if (ts) {
      try {
        const dateValue = typeof ts === "number" ? ts * 1000 : new Date(ts).getTime();
        if (Number.isFinite(dateValue) && dateValue > 0) {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) postedAt = d.toISOString();
        }
      } catch { /* ignore */ }
    }

    videos.push({
      videoUrl: url,
      videoId,
      caption,
      thumbnailUrl,
      viewsCount: views,
      likesCount: likes,
      commentsCount: comments,
      sharesCount: shares,
      duration,
      musicTitle,
      postedAt,
    });
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (seen.has(v.videoUrl)) return false;
    seen.add(v.videoUrl);
    return true;
  });
}

async function saveVideosToDB(supabase: any, accountId: string, videos: KwaiVideo[]) {
  console.log(`[Apify Kwai] Saving ${videos.length} videos...`);
  let saved = 0;
  let updated = 0;

  for (const video of videos) {
    if (!video.videoUrl) continue;

    const { data: existing } = await supabase
      .from("kwai_videos")
      .select("id")
      .eq("account_id", accountId)
      .eq("video_url", video.videoUrl)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("kwai_videos")
        .update({
          caption: video.caption ?? null,
          thumbnail_url: video.thumbnailUrl ?? null,
          views_count: video.viewsCount,
          likes_count: video.likesCount,
          comments_count: video.commentsCount,
          shares_count: video.sharesCount,
          duration: video.duration ?? null,
          music_title: video.musicTitle ?? null,
          posted_at: video.postedAt ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      updated++;
    } else {
      await supabase.from("kwai_videos").insert({
        account_id: accountId,
        video_id: video.videoId ?? null,
        video_url: video.videoUrl,
        caption: video.caption ?? null,
        thumbnail_url: video.thumbnailUrl ?? null,
        views_count: video.viewsCount,
        likes_count: video.likesCount,
        comments_count: video.commentsCount,
        shares_count: video.sharesCount,
        duration: video.duration ?? null,
        music_title: video.musicTitle ?? null,
        posted_at: video.postedAt ?? null,
      });
      saved++;
    }
  }

  console.log(`[Apify Kwai] Saved: ${saved} new, Updated: ${updated}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_API_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "APIFY_API_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { username, accountId, resultsLimit = 50 } = await req.json();

    if (!username) {
      return new Response(JSON.stringify({ success: false, error: "Username é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Start Apify run
    const run = await startApifyRun(APIFY_API_TOKEN, username.replace(/^@/, ""), Number(resultsLimit) || 50);
    const runId = run?.data?.id;
    if (!runId) throw new Error("Apify runId missing");

    const datasetId = await waitForRunCompletion(APIFY_API_TOKEN, runId);
    const items = await getDatasetItems(APIFY_API_TOKEN, datasetId);

    console.log(`[Apify Kwai] Dataset items count: ${items.length}`);

    const videos = mapApifyItemsToVideos(items);

    // Try to extract profile data from the items (may vary by actor)
    const firstItem = items?.[0] || {};
    const profileData: KwaiScrapedData = {
      username: safeString(firstItem?.username || firstItem?.authorUsername || firstItem?.userId) || username,
      displayName: safeString(firstItem?.displayName || firstItem?.nickname || firstItem?.authorName || firstItem?.name),
      profileImageUrl: safeString(firstItem?.avatarUrl || firstItem?.profileImage || firstItem?.avatar || firstItem?.authorAvatar),
      bio: safeString(firstItem?.bio || firstItem?.description || firstItem?.signature),
      followersCount: toInt(firstItem?.followersCount || firstItem?.followers || firstItem?.fanCount || 0),
      followingCount: toInt(firstItem?.followingCount || firstItem?.following || 0),
      videosCount: toInt(firstItem?.videoCount || firstItem?.videosCount || items.length),
      likesCount: toInt(firstItem?.totalLikes || firstItem?.likesCount || 0),
      scrapedVideosCount: videos.length,
      totalViews: videos.reduce((sum, v) => sum + (v.viewsCount || 0), 0),
      videos,
    };

    if (accountId) {
      if (videos.length > 0) {
        await saveVideosToDB(supabase, accountId, videos);
      }

      // Recalculate totals from DB
      const { data: allVideos } = await supabase.from("kwai_videos").select("views_count").eq("account_id", accountId);
      const totalViewsFromDb = (allVideos || []).reduce((sum: number, v: any) => sum + (v.views_count || 0), 0);
      const totalCountFromDb = (allVideos || []).length;

      await supabase
        .from("kwai_accounts")
        .update({
          display_name: profileData.displayName ?? null,
          profile_image_url: profileData.profileImageUrl ?? null,
          bio: profileData.bio ?? null,
          followers_count: profileData.followersCount,
          following_count: profileData.followingCount,
          videos_count: profileData.videosCount,
          likes_count: profileData.likesCount,
          total_views: totalViewsFromDb,
          scraped_videos_count: totalCountFromDb,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      await supabase.from("kwai_metrics_history").insert({
        account_id: accountId,
        followers_count: profileData.followersCount,
        likes_count: profileData.likesCount,
        comments_count: videos.reduce((sum, v) => sum + (v.commentsCount || 0), 0),
        shares_count: videos.reduce((sum, v) => sum + (v.sharesCount || 0), 0),
        views_count: totalViewsFromDb,
      });
    }

    return new Response(JSON.stringify({ success: true, data: profileData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Apify Kwai] Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
