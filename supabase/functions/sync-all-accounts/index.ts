import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function syncs all active accounts from all platforms using EnsembleData
// Should be called by a cron job every 6 hours
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auto-sync for all accounts via EnsembleData...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = Deno.env.get('ENSEMBLEDATA_TOKEN');

    if (!token) {
      console.error('ENSEMBLEDATA_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'EnsembleData token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      instagram: { synced: 0, errors: 0 },
      youtube: { synced: 0, errors: 0 },
      tiktok: { synced: 0, errors: 0 },
    };

    // Sync Instagram accounts
    const { data: instagramAccounts } = await supabase
      .from('instagram_accounts')
      .select('id, username, profile_url')
      .eq('is_active', true);

    if (instagramAccounts) {
      for (const account of instagramAccounts) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/instagram-scrape`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              profileUrl: account.profile_url,
              accountId: account.id,
              fetchVideos: true,
            }),
          });

          if (response.ok) {
            results.instagram.synced++;
            console.log(`Synced Instagram account: ${account.username}`);
          } else {
            results.instagram.errors++;
            console.error(`Failed to sync Instagram account: ${account.username}`);
          }
        } catch (error) {
          results.instagram.errors++;
          console.error(`Error syncing Instagram account ${account.username}:`, error);
        }
      }
    }

    // Sync YouTube accounts
    const { data: youtubeAccounts } = await supabase
      .from('youtube_accounts')
      .select('id, username')
      .eq('is_active', true);

    if (youtubeAccounts) {
      for (const account of youtubeAccounts) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/youtube-scrape`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: account.username,
              accountId: account.id,
              fetchVideos: true,
            }),
          });

          if (response.ok) {
            results.youtube.synced++;
            console.log(`Synced YouTube account: ${account.username}`);
          } else {
            results.youtube.errors++;
            console.error(`Failed to sync YouTube account: ${account.username}`);
          }
        } catch (error) {
          results.youtube.errors++;
          console.error(`Error syncing YouTube account ${account.username}:`, error);
        }
      }
    }

    // Sync TikTok accounts
    const { data: tiktokAccounts } = await supabase
      .from('tiktok_accounts')
      .select('id, username')
      .eq('is_active', true);

    if (tiktokAccounts) {
      for (const account of tiktokAccounts) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/tiktok-scrape`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: account.username,
              accountId: account.id,
              fetchVideos: true,
            }),
          });

          if (response.ok) {
            results.tiktok.synced++;
            console.log(`Synced TikTok account: ${account.username}`);
          } else {
            results.tiktok.errors++;
            console.error(`Failed to sync TikTok account: ${account.username}`);
          }
        } catch (error) {
          results.tiktok.errors++;
          console.error(`Error syncing TikTok account ${account.username}:`, error);
        }
      }
    }

    console.log('Auto-sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-sync completed via EnsembleData',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in auto-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
