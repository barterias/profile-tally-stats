import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ApifyRunResponse = {
  data?: {
    id: string;
    defaultDatasetId?: string;
    status?: string;
  };
};

type ApifyRunStatus = {
  data?: {
    id: string;
    status: string;
    defaultDatasetId?: string;
  };
};

type InstagramPost = {
  postUrl: string;
  type: string;
  thumbnailUrl?: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  postedAt?: string | null;
};

type InstagramScrapedData = {
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  scrapedPostsCount: number;
  totalViews: number;
  posts: InstagramPost[];
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

async function startApifyRun(apifyToken: string, profileUrl: string, resultsLimit: number): Promise<ApifyRunResponse> {
  console.log(`[Apify IG] Starting run for: ${profileUrl} (limit=${resultsLimit})`);

  const res = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apifyToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directUrls: [profileUrl],
      resultsType: "posts",
      resultsLimit,
      searchType: "user",
      searchLimit: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Apify IG] Failed to start run: ${res.status} ${text}`);
    throw new Error(`Apify start run failed: ${res.status}`);
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
    console.error(`[Apify IG] Failed to check status: ${res.status} ${text}`);
    throw new Error(`Apify status failed: ${res.status}`);
  }

  return res.json();
}

async function waitForRunCompletion(apifyToken: string, runId: string, maxWaitMs = 120_000): Promise<string> {
  const start = Date.now();
  const pollMs = 4_000;

  console.log(`[Apify IG] Waiting run ${runId}...`);

  while (Date.now() - start < maxWaitMs) {
    const st = await checkRunStatus(apifyToken, runId);
    const status = st?.data?.status;

    console.log(`[Apify IG] Status: ${status}`);

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
    console.error(`[Apify IG] Failed to get dataset items: ${res.status} ${text}`);
    throw new Error(`Apify dataset failed: ${res.status}`);
  }

  return res.json();
}

function mapApifyItemsToPosts(items: any[]): InstagramPost[] {
  const posts: InstagramPost[] = [];

  for (const it of items || []) {
    // Apify instagram-scraper returns posts with varying shapes. Try common fields.
    const url = safeString(it?.url || it?.postUrl || it?.permalink || it?.link || it?.shortCodeUrl);
    if (!url) continue;

    const caption = safeString(it?.caption || it?.text || it?.title);

    const typeRaw = it?.type || it?.mediaType || it?.productType || it?.__typename;
    const typeStr = String(typeRaw || "post").toLowerCase();
    const isVideo = typeStr.includes("video") || typeStr.includes("reel") || it?.isVideo === true;

    const thumbnailUrl = safeString(
      it?.displayUrl ||
        it?.thumbnailUrl ||
        it?.thumbnail ||
        it?.imageUrl ||
        it?.image?.url ||
        it?.images?.[0]
    );

    const likes = toInt(it?.likesCount ?? it?.likes ?? it?.likeCount);
    const comments = toInt(it?.commentsCount ?? it?.comments ?? it?.commentCount);
    const views = toInt(it?.videoViewCount ?? it?.videoPlayCount ?? it?.viewsCount ?? it?.viewCount ?? 0);

    const ts = it?.timestamp || it?.takenAtTimestamp || it?.takenAt || it?.createdAt;
    const postedAt = ts ? new Date(ts * 1000).toISOString() : null;

    posts.push({
      postUrl: url,
      type: isVideo ? "video" : "post",
      thumbnailUrl,
      caption,
      likesCount: likes,
      commentsCount: comments,
      viewsCount: views,
      postedAt,
    });
  }

  // Dedupe by URL
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.postUrl)) return false;
    seen.add(p.postUrl);
    return true;
  });
}

async function savePostsToDB(supabase: any, accountId: string, posts: InstagramPost[]) {
  console.log(`[Apify IG] Saving ${posts.length} posts...`);
  let saved = 0;
  let updated = 0;

  for (const post of posts) {
    if (!post.postUrl) continue;

    const { data: existing } = await supabase
      .from("instagram_posts")
      .select("id")
      .eq("account_id", accountId)
      .eq("post_url", post.postUrl)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("instagram_posts")
        .update({
          post_type: post.type,
          thumbnail_url: post.thumbnailUrl ?? null,
          caption: post.caption ?? null,
          likes_count: post.likesCount ?? null,
          comments_count: post.commentsCount ?? null,
          views_count: post.viewsCount ?? null,
          posted_at: post.postedAt ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      updated++;
    } else {
      await supabase.from("instagram_posts").insert({
        account_id: accountId,
        post_url: post.postUrl,
        post_type: post.type,
        thumbnail_url: post.thumbnailUrl ?? null,
        caption: post.caption ?? null,
        likes_count: post.likesCount ?? null,
        comments_count: post.commentsCount ?? null,
        views_count: post.viewsCount ?? null,
        posted_at: post.postedAt ?? null,
      });
      saved++;
    }
  }

  console.log(`[Apify IG] Saved: ${saved} new, Updated: ${updated}`);
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

    const { profileUrl, accountId, fetchVideos = true, resultsLimit = 200 } = await req.json();

    if (!profileUrl) {
      return new Response(JSON.stringify({ success: false, error: "URL do perfil é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Start Apify run
    const run = await startApifyRun(APIFY_API_TOKEN, profileUrl, Number(resultsLimit) || 200);
    const runId = run?.data?.id;
    if (!runId) throw new Error("Apify runId missing");

    const datasetId = await waitForRunCompletion(APIFY_API_TOKEN, runId);
    const items = await getDatasetItems(APIFY_API_TOKEN, datasetId);

    const posts = fetchVideos ? mapApifyItemsToPosts(items) : [];

    // Infer username from URL
    const match = String(profileUrl).match(/instagram\.com\/([^\/?#]+)/i);
    const username = (match?.[1] || "").replace(/^@/, "").replace(/\/$/, "") || "";

    const data: InstagramScrapedData = {
      username,
      displayName: safeString(items?.[0]?.ownerUsername || items?.[0]?.ownerFullName || items?.[0]?.ownerName),
      profileImageUrl: safeString(items?.[0]?.ownerProfilePicUrl || items?.[0]?.ownerProfilePic || items?.[0]?.ownerAvatarUrl),
      bio: safeString(items?.[0]?.ownerBio),
      followersCount: toInt(items?.[0]?.ownerFollowersCount),
      followingCount: toInt(items?.[0]?.ownerFollowingCount),
      postsCount: toInt(items?.[0]?.ownerPostsCount) || posts.length,
      scrapedPostsCount: posts.length,
      totalViews: posts.reduce((sum, p) => sum + (p.viewsCount || 0), 0),
      posts,
    };

    if (accountId) {
      if (posts.length > 0) {
        await savePostsToDB(supabase, accountId, posts);
      }

      // Recalculate from DB for consistency
      const { data: allPosts } = await supabase.from("instagram_posts").select("views_count").eq("account_id", accountId);
      const totalViewsFromDb = (allPosts || []).reduce((sum, p) => sum + (p.views_count || 0), 0);
      const totalCountFromDb = (allPosts || []).length;

      await supabase
        .from("instagram_accounts")
        .update({
          // keep profile info updated as well
          display_name: data.displayName ?? null,
          profile_image_url: data.profileImageUrl ?? null,
          bio: data.bio ?? null,
          followers_count: data.followersCount ?? 0,
          following_count: data.followingCount ?? 0,
          posts_count: data.postsCount ?? 0,
          total_views: totalViewsFromDb,
          scraped_posts_count: totalCountFromDb,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      await supabase.from("instagram_metrics_history").insert({
        account_id: accountId,
        followers_count: data.followersCount ?? 0,
        likes_count: posts.reduce((sum, p) => sum + (p.likesCount || 0), 0),
        comments_count: posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0),
        views_count: totalViewsFromDb,
      });

      await supabase.from("profile_metrics").upsert(
        {
          profile_id: accountId,
          platform: "instagram",
          username: data.username,
          display_name: data.displayName ?? null,
          profile_image_url: data.profileImageUrl ?? null,
          followers: data.followersCount ?? 0,
          following: data.followingCount ?? 0,
          total_views: totalViewsFromDb,
          total_posts: data.postsCount ?? 0,
          total_likes: posts.reduce((sum, p) => sum + (p.likesCount || 0), 0),
          total_comments: posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0),
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "platform,username" }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Apify IG] Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
