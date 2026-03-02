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
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  const raw = String(value).trim().toLowerCase().replace(/\s+/g, "");
  if (!raw) return 0;

  const match = raw.match(/^([-+]?\d[\d.,]*)(k|m|b|mil|mi|bi|w)?$/i);
  if (match) {
    let [, numPart, suffix] = match;

    const separators = (numPart.match(/[.,]/g) || []).length;
    if (separators === 1) {
      const sep = numPart.includes(",") ? "," : ".";
      const decimals = numPart.split(sep)[1] || "";

      if (decimals.length === 3) {
        // likely thousands separator: 1,234 or 1.234
        numPart = numPart.replace(/[.,]/g, "");
      } else {
        // likely decimal separator: 1,2 or 1.2
        numPart = numPart.replace(",", ".");
      }
    } else if (separators > 1) {
      // keep only the last separator as decimal, remove the others
      const lastDot = numPart.lastIndexOf(".");
      const lastComma = numPart.lastIndexOf(",");
      const lastSep = Math.max(lastDot, lastComma);
      const intPart = numPart.slice(0, lastSep).replace(/[.,]/g, "");
      const decPart = numPart.slice(lastSep + 1).replace(/[.,]/g, "");
      numPart = `${intPart}.${decPart}`;
    }

    const base = Number(numPart);
    if (Number.isFinite(base)) {
      const multiplier = (() => {
        switch ((suffix || "").toLowerCase()) {
          case "k":
          case "mil":
            return 1_000;
          case "m":
          case "mi":
            return 1_000_000;
          case "b":
          case "bi":
            return 1_000_000_000;
          case "w":
            return 10_000;
          default:
            return 1;
        }
      })();

      return Math.trunc(base * multiplier);
    }
  }

  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function safeString(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function normalizeKwaiUsername(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";

  let username = raw;

  // Accept full profile URLs too: https://www.kwai.com/@username
  const urlMatch = raw.match(/kwai\.com\/@([^/?#]+)/i);
  if (urlMatch?.[1]) {
    username = urlMatch[1];
  }

  // Preserve original case — Kwai URLs are case-sensitive
  return username.replace(/^@/, "").trim();
}

function getUsernameVariants(username: string): string[] {
  const variants = [username];
  const lower = username.toLowerCase();
  const upper = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  if (lower !== username) variants.push(lower);
  if (upper !== username && upper !== lower) variants.push(upper);
  return variants;
}

async function scrapeKwaiProfile(username: string): Promise<{
  displayName?: string;
  profileImageUrl?: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
}> {
  const profileUrl = `https://www.kwai.com/@${username}`;
  console.log(`[Kwai Profile] Fetching profile page: ${profileUrl}`);

  try {
    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`[Kwai Profile] HTTP ${res.status}`);
      return { followersCount: 0, followingCount: 0, likesCount: 0 };
    }

    const html = await res.text();

    // Extract from JSON-LD or embedded data
    const extract = (patterns: RegExp[]): number => {
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) {
          const n = Number(m[1].replace(/[.,]/g, ""));
          if (Number.isFinite(n)) return n;
        }
      }
      return 0;
    };

    // Try to extract profile data from the page's embedded JSON/scripts
    let displayName: string | undefined;
    let profileImageUrl: string | undefined;
    let followersCount = 0;
    let followingCount = 0;
    let likesCount = 0;

    // Try parsing __NEXT_DATA__ or similar embedded JSON
    const jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (jsonMatch?.[1]) {
      try {
        const nextData = JSON.parse(jsonMatch[1]);
        const findUserData = (obj: any, depth = 0): any => {
          if (!obj || depth > 8) return null;
          if (obj.fan !== undefined || obj.followerCount !== undefined || obj.fansCount !== undefined) return obj;
          if (typeof obj === "object") {
            for (const k of Object.keys(obj)) {
              const r = findUserData(obj[k], depth + 1);
              if (r) return r;
            }
          }
          return null;
        };
        const userData = findUserData(nextData);
        if (userData) {
          followersCount = toInt(userData.fan ?? userData.followerCount ?? userData.fansCount ?? 0);
          followingCount = toInt(userData.follow ?? userData.followingCount ?? 0);
          likesCount = toInt(userData.like ?? userData.likeCount ?? userData.liked ?? 0);
          displayName = safeString(userData.name ?? userData.userName ?? userData.user_name);
          profileImageUrl = safeString(userData.headUrl ?? userData.avatar ?? userData.photo);
          console.log(`[Kwai Profile] From __NEXT_DATA__: followers=${followersCount}, likes=${likesCount}`);
        }
      } catch (e) {
        console.warn(`[Kwai Profile] Failed to parse __NEXT_DATA__:`, e);
      }
    }

    // Fallback: extract from OG/meta tags and visible HTML patterns
    if (followersCount === 0) {
      // Try common patterns in Kwai HTML
      followersCount = extract([
        /\"fan\"\s*:\s*(\d+)/,
        /\"followerCount\"\s*:\s*(\d+)/,
        /\"fansCount\"\s*:\s*(\d+)/,
        /(\d[\d.,]*)\s*(?:Seguidores|Followers)/i,
      ]);
      followingCount = extract([
        /\"follow\"\s*:\s*(\d+)/,
        /\"followingCount\"\s*:\s*(\d+)/,
        /(\d[\d.,]*)\s*(?:Seguindo|Following)/i,
      ]);
      likesCount = extract([
        /\"like\"\s*:\s*(\d+)/,
        /\"likeCount\"\s*:\s*(\d+)/,
        /(\d[\d.,]*)\s*(?:Curtidas|Likes)/i,
      ]);
    }

    if (!displayName) {
      const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
      if (ogTitle?.[1]) displayName = safeString(ogTitle[1]);
    }

    if (!profileImageUrl) {
      const ogImg = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
      if (ogImg?.[1]) profileImageUrl = safeString(ogImg[1]);
    }

    console.log(`[Kwai Profile] Result: name=${displayName}, followers=${followersCount}, following=${followingCount}, likes=${likesCount}`);

    return { displayName, profileImageUrl, followersCount, followingCount, likesCount };
  } catch (e) {
    console.error(`[Kwai Profile] Error:`, e);
    return { followersCount: 0, followingCount: 0, likesCount: 0 };
  }
}

async function startApifyRun(apifyToken: string, username: string, resultsLimit: number): Promise<ApifyRunResponse> {
  console.log(`[Apify Kwai] Starting run for: ${username} (limit=${resultsLimit})`);

  // Use natanielsantos/kwai-scraper actor
  const actorId = "natanielsantos~kwai-scraper";
  const profileUrl = `https://www.kwai.com/@${username}`;

  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: [profileUrl],
      maxItems: resultsLimit,
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

    const { username, accountId, resultsLimit = 200 } = await req.json();

    const normalizedUsername = normalizeKwaiUsername(username);

    if (!normalizedUsername) {
      return new Response(JSON.stringify({ success: false, error: "Username é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedLimit = Math.min(Math.max(Number(resultsLimit) || 200, 50), 300);

    // Try username variants (original case, lowercase, capitalized) for both profile and Apify
    const variants = getUsernameVariants(normalizedUsername);
    let bestUsername = normalizedUsername;
    let profileScrape = { displayName: undefined as string | undefined, profileImageUrl: undefined as string | undefined, followersCount: 0, followingCount: 0, likesCount: 0 };
    let items: any[] = [];
    let videos: KwaiVideo[] = [];
    let foundUsefulData = false;
    let apifyFailureMessage: string | null = null;

    for (const variant of variants) {
      console.log(`[Kwai] Trying variant: ${variant}`);

      // Scrape profile + Apify in parallel for this variant
      const [profileResult, apifyResult] = await Promise.allSettled([
        scrapeKwaiProfile(variant),
        (async () => {
          const run = await startApifyRun(APIFY_API_TOKEN, variant, normalizedLimit);
          const runId = run?.data?.id;
          if (!runId) throw new Error("Apify runId missing");
          const datasetId = await waitForRunCompletion(APIFY_API_TOKEN, runId);
          return getDatasetItems(APIFY_API_TOKEN, datasetId);
        })(),
      ]);

      const pResult = profileResult.status === "fulfilled" ? profileResult.value : { followersCount: 0, followingCount: 0, likesCount: 0 };
      const apifyFailedForVariant = apifyResult.status === "rejected";
      const aItems = apifyResult.status === "fulfilled" ? apifyResult.value : [];

      if (apifyFailedForVariant) {
        apifyFailureMessage = apifyResult.reason instanceof Error
          ? apifyResult.reason.message
          : String(apifyResult.reason || "Erro ao coletar dados no Apify");
        console.warn(`[Kwai] Apify failed for variant "${variant}": ${apifyFailureMessage}`);
      }

      console.log(`[Kwai] Variant "${variant}": profile followers=${pResult.followersCount}, profile likes=${pResult.likesCount}, apify items=${aItems.length}`);

      // Consider profile-only data valid only when it has numeric signal.
      // If Apify failed and we only got a displayName, don't overwrite metrics with zeros.
      const isValidProfile = pResult.followersCount > 0 || pResult.likesCount > 0 || pResult.followingCount > 0;
      const hasDisplayName = !!(pResult.displayName && !pResult.displayName.toLowerCase().includes("kwai-nuxt"));

      if (aItems.length > 0 || isValidProfile || (hasDisplayName && !apifyFailedForVariant)) {
        bestUsername = variant;
        profileScrape = pResult;
        items = aItems;
        videos = mapApifyItemsToVideos(items);
        foundUsefulData = true;
        console.log(`[Kwai] Using variant "${variant}" — found data!`);
        break;
      }
    }

    console.log(`[Apify Kwai] Final dataset items count: ${items.length}`);

    if (videos.length === 0) {
      videos = mapApifyItemsToVideos(items);
    }

    const firstItem = items?.[0] || {};
    const profileData: KwaiScrapedData = {
      username: bestUsername,
      displayName: profileScrape.displayName || safeString(firstItem?.displayName || firstItem?.nickname || firstItem?.authorName || firstItem?.name),
      profileImageUrl: profileScrape.profileImageUrl || safeString(firstItem?.avatarUrl || firstItem?.profileImage || firstItem?.avatar || firstItem?.authorAvatar),
      bio: safeString(firstItem?.bio || firstItem?.description || firstItem?.signature),
      followersCount: profileScrape.followersCount || toInt(firstItem?.followersCount || firstItem?.followers || firstItem?.fanCount || 0),
      followingCount: profileScrape.followingCount || toInt(firstItem?.followingCount || firstItem?.following || 0),
      videosCount: Math.max(toInt(firstItem?.videoCount || firstItem?.videosCount || 0), videos.length),
      likesCount: profileScrape.likesCount || toInt(firstItem?.totalLikes || firstItem?.likesCount || 0),
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
          username: bestUsername,
          profile_url: `https://www.kwai.com/@${bestUsername}`,
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
