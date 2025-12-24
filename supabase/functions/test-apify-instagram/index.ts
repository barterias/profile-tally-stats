import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Função para iniciar o run do Actor
async function startApifyRun(token: string, profileUrl: string): Promise<ApifyRunResponse> {
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
        resultsLimit: 5,
        resultsType: "details",
        searchType: "user",
        searchLimit: 1,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Apify] Failed to start run. Status: ${response.status}, Body: ${errorText}`);
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
async function waitForRunCompletion(token: string, runId: string, maxWaitMs: number = 120000): Promise<string> {
  const startTime = Date.now();
  const pollIntervalMs = 5000; // 5 segundos entre verificações

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

// Função principal do scraper
async function scrapeInstagramProfile(token: string, profileUrl: string): Promise<any> {
  // 1. Iniciar o run
  const runResponse = await startApifyRun(token, profileUrl);
  const runId = runResponse.data.id;
  
  // 2. Aguardar conclusão
  const datasetId = await waitForRunCompletion(token, runId);
  
  // 3. Buscar resultados
  const items = await getDatasetItems(token, datasetId);
  
  return {
    runId,
    datasetId,
    items,
    itemsCount: items.length,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar token do Apify
    const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_API_TOKEN) {
      console.error('[Apify] APIFY_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'APIFY_API_TOKEN não configurado. Adicione o token nas variáveis de ambiente.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[Apify] Token found, length:', APIFY_API_TOKEN.length);

    // Verificar autenticação do usuário (deve ser admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se o usuário é admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar role do usuário
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter URL do perfil do body ou usar padrão de teste
    const body = await req.json().catch(() => ({}));
    const profileUrl = body.profileUrl || 'https://www.instagram.com/instagram/';

    console.log(`[Apify] Starting test scrape for: ${profileUrl}`);
    console.log(`[Apify] Requested by admin user: ${user.id}`);

    // Executar o scraper
    const result = await scrapeInstagramProfile(APIFY_API_TOKEN, profileUrl);

    console.log(`[Apify] Scrape completed successfully. Items: ${result.itemsCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Apify Instagram Scraper test completed',
        profileUrl,
        result,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[Apify] Error:', error);
    
    let errorMessage = 'Unknown error';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Detectar erros específicos do Apify
      if (errorMessage.includes('401')) {
        errorMessage = 'Token do Apify inválido ou expirado';
        statusCode = 401;
      } else if (errorMessage.includes('402')) {
        errorMessage = 'Créditos do Apify esgotados. Verifique sua conta.';
        statusCode = 402;
      } else if (errorMessage.includes('429')) {
        errorMessage = 'Rate limit do Apify atingido. Tente novamente mais tarde.';
        statusCode = 429;
      } else if (errorMessage.includes('Timeout')) {
        errorMessage = 'Timeout aguardando conclusão do scraper. O perfil pode ser muito grande.';
        statusCode = 408;
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
