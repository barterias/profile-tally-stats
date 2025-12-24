import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramScrapedData {
  username?: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  posts?: Array<{
    postUrl: string;
    type: string;
    thumbnailUrl?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
    sharesCount?: number;
  }>;
}

interface ApifyRunResponse {
  data: {
    id: string;
    actId: string;
    defaultDatasetId: string;
    status: string;
  };
}

interface ApifyRunStatus {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

// Função para iniciar o run do Actor Apify
async function startApifyRun(token: string, profileUrl: string, resultsLimit: number = 20): Promise<ApifyRunResponse> {
  console.log(`[Apify] Starting run for profile: ${profileUrl}`);
  
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [profileUrl],
        resultsLimit: resultsLimit,
        resultsType: "details",
        searchType: "user",
        searchLimit: 1,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Apify] Failed to start run. Status: ${response.status}, Body: ${errorText}`);
    
    if (response.status === 401) {
      throw new Error('Token do Apify inválido ou expirado');
    } else if (response.status === 402) {
      throw new Error('Créditos do Apify esgotados. Verifique sua conta.');
    } else if (response.status === 429) {
      throw new Error('Rate limit do Apify atingido. Tente novamente mais tarde.');
    }
    
    throw new Error(`Apify API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Apify] Run started successfully. Run ID: ${data.data?.id}`);
  return data;
}

// Função para verificar o status do run
async function checkRunStatus(token: string, runId: string): Promise<ApifyRunStatus> {
  const response = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Apify] Failed to check run status. Status: ${response.status}, Body: ${errorText}`);
    throw new Error(`Apify API error checking status: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Função para buscar os resultados do dataset
async function getDatasetItems(token: string, datasetId: string): Promise<any[]> {
  console.log(`[Apify] Fetching dataset items. Dataset ID: ${datasetId}`);
  
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Apify] Failed to get dataset items. Status: ${response.status}, Body: ${errorText}`);
    throw new Error(`Apify API error fetching dataset: ${response.status} - ${errorText}`);
  }

  const items = await response.json();
  console.log(`[Apify] Dataset items fetched. Count: ${items.length}`);
  return items;
}

// Função para aguardar o run terminar
async function waitForRunCompletion(token: string, runId: string, maxWaitMs: number = 180000): Promise<string> {
  const startTime = Date.now();
  const pollIntervalMs = 3000; // 3 segundos entre verificações

  console.log(`[Apify] Waiting for run ${runId} to complete...`);

  while (Date.now() - startTime < maxWaitMs) {
    const statusResponse = await checkRunStatus(token, runId);
    const status = statusResponse.data.status;
    
    console.log(`[Apify] Run status: ${status}`);

    if (status === 'SUCCEEDED') {
      return statusResponse.data.defaultDatasetId;
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${status.toLowerCase()}`);
    }

    // Aguardar antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timeout waiting for Apify run to complete (max ${maxWaitMs / 1000}s)`);
}

// Função para mapear dados do Apify para o formato esperado
function mapApifyDataToInstagramData(items: any[]): InstagramScrapedData {
  if (!items || items.length === 0) {
    console.log('[Apify] No items returned from dataset');
    return {};
  }

  // O primeiro item geralmente contém os dados do perfil
  const profileItem = items.find(item => item.username) || items[0];
  
  console.log('[Apify] Mapping profile data:', profileItem?.username);

  const data: InstagramScrapedData = {
    username: profileItem?.username || profileItem?.ownerUsername,
    displayName: profileItem?.fullName || profileItem?.ownerFullName,
    profileImageUrl: profileItem?.profilePicUrl || profileItem?.profilePicUrlHD,
    bio: profileItem?.biography,
    followersCount: profileItem?.followersCount || 0,
    followingCount: profileItem?.followsCount || profileItem?.followingCount || 0,
    postsCount: profileItem?.postsCount || profileItem?.mediaCount || 0,
    posts: [],
  };

  // Mapear posts/reels
  const posts = items.filter(item => item.type || item.shortCode || item.url);
  
  data.posts = posts.slice(0, 50).map((item: any) => {
    const postType = item.type || (item.videoUrl ? 'video' : 'post');
    return {
      postUrl: item.url || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : ''),
      type: postType === 'Video' || postType === 'Reel' ? 'video' : postType === 'Sidecar' ? 'carousel' : 'post',
      thumbnailUrl: item.displayUrl || item.thumbnailUrl || item.previewUrl,
      caption: item.caption?.substring(0, 200),
      likesCount: item.likesCount || 0,
      commentsCount: item.commentsCount || 0,
      viewsCount: item.videoViewCount || item.videoPlayCount || item.viewsCount || 0,
      sharesCount: 0,
    };
  });

  console.log(`[Apify] Mapped ${data.posts?.length || 0} posts`);
  
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, accountId, fetchVideos = true } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_API_TOKEN) {
      console.error('[Apify] APIFY_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'APIFY_API_TOKEN não configurado. Adicione o token nas variáveis de ambiente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract username from URL or use directly
    let username = profileUrl.trim();
    const usernameMatch = profileUrl.match(/instagram\.com\/([^\/\?]+)/);
    if (usernameMatch) {
      username = usernameMatch[1];
    }
    username = username.replace('@', '').replace('/', '');

    // Construir URL do perfil
    const fullProfileUrl = profileUrl.includes('instagram.com') 
      ? profileUrl 
      : `https://www.instagram.com/${username}/`;

    console.log(`[Apify] Fetching Instagram profile: ${username} (${fullProfileUrl})`);

    // Definir limite de resultados baseado em fetchVideos
    const resultsLimit = fetchVideos ? 20 : 1;

    // 1. Iniciar o run do Apify
    const runResponse = await startApifyRun(APIFY_API_TOKEN, fullProfileUrl, resultsLimit);
    const runId = runResponse.data.id;

    // 2. Aguardar conclusão
    const datasetId = await waitForRunCompletion(APIFY_API_TOKEN, runId);

    // 3. Buscar resultados
    const items = await getDatasetItems(APIFY_API_TOKEN, datasetId);

    // 4. Mapear para formato esperado
    const data = mapApifyDataToInstagramData(items);
    
    // Garantir que username está definido
    if (!data.username) {
      data.username = username;
    }

    console.log('[Apify] Parsed data:', data.displayName || data.username, 'with', data.posts?.length || 0, 'posts');

    // Update database if accountId is provided
    if (accountId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('instagram_accounts')
        .update({
          display_name: data.displayName,
          profile_image_url: data.profileImageUrl,
          bio: data.bio,
          followers_count: data.followersCount,
          following_count: data.followingCount,
          posts_count: data.postsCount,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('[Apify] Error updating account:', updateError);
      } else {
        console.log('[Apify] Account updated successfully');
      }

      // Save metrics history
      await supabase.from('instagram_metrics_history').insert({
        account_id: accountId,
        followers_count: data.followersCount,
      });

      // Save posts to database
      if (data.posts && data.posts.length > 0) {
        for (const post of data.posts) {
          if (!post.postUrl) continue;
          
          const { data: existingPost } = await supabase
            .from('instagram_posts')
            .select('id')
            .eq('account_id', accountId)
            .eq('post_url', post.postUrl)
            .maybeSingle();

          if (existingPost) {
            await supabase
              .from('instagram_posts')
              .update({
                post_type: post.type,
                thumbnail_url: post.thumbnailUrl,
                caption: post.caption,
                likes_count: post.likesCount,
                comments_count: post.commentsCount,
                views_count: post.viewsCount,
                shares_count: post.sharesCount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPost.id);
          } else {
            await supabase
              .from('instagram_posts')
              .insert({
                account_id: accountId,
                post_url: post.postUrl,
                post_type: post.type,
                thumbnail_url: post.thumbnailUrl,
                caption: post.caption,
                likes_count: post.likesCount,
                comments_count: post.commentsCount,
                views_count: post.viewsCount,
                shares_count: post.sharesCount,
              });
          }
        }
        console.log(`[Apify] Saved ${data.posts.length} posts to database`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Apify] Error scraping Instagram:', error);
    
    let errorMessage = 'Failed to fetch Instagram data';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('Token') || errorMessage.includes('401')) {
        statusCode = 401;
      } else if (errorMessage.includes('Créditos') || errorMessage.includes('402')) {
        statusCode = 402;
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        statusCode = 429;
      } else if (errorMessage.includes('Timeout')) {
        statusCode = 408;
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
