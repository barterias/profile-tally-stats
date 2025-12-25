import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function syncs all active accounts from all platforms using ScrapeCreators
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting batch sync for all accounts via ScrapeCreators...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      instagram: { synced: 0, errors: 0, accounts: [] as string[] },
      youtube: { synced: 0, errors: 0, accounts: [] as string[] },
      tiktok: { synced: 0, errors: 0, accounts: [] as string[] },
      totalAccounts: 0,
      totalSynced: 0,
      totalErrors: 0,
    };

    // Sync Instagram accounts
    console.log('📸 Syncing Instagram accounts...');
    const { data: instagramAccounts } = await supabase
      .from('instagram_accounts')
      .select('id, username, profile_url')
      .or('is_active.is.null,is_active.eq.true');

    if (instagramAccounts && instagramAccounts.length > 0) {
      results.totalAccounts += instagramAccounts.length;
      
      for (const account of instagramAccounts) {
        try {
          console.log(`  → Syncing Instagram: ${account.username}`);
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
            results.instagram.accounts.push(account.username);
            console.log(`  ✅ Synced Instagram: ${account.username}`);
          } else {
            const errorText = await response.text();
            results.instagram.errors++;
            console.error(`  ❌ Failed Instagram: ${account.username} - ${errorText}`);
          }
        } catch (error) {
          results.instagram.errors++;
          console.error(`  ❌ Error Instagram ${account.username}:`, error);
        }
      }
    }

    // Sync YouTube accounts
    console.log('📺 Syncing YouTube accounts...');
    const { data: youtubeAccounts } = await supabase
      .from('youtube_accounts')
      .select('id, username, channel_id')
      .or('is_active.is.null,is_active.eq.true');

    if (youtubeAccounts && youtubeAccounts.length > 0) {
      results.totalAccounts += youtubeAccounts.length;
      
      for (const account of youtubeAccounts) {
        try {
          console.log(`  → Syncing YouTube: ${account.username}`);
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
            results.youtube.accounts.push(account.username);
            console.log(`  ✅ Synced YouTube: ${account.username}`);
          } else {
            const errorText = await response.text();
            results.youtube.errors++;
            console.error(`  ❌ Failed YouTube: ${account.username} - ${errorText}`);
          }
        } catch (error) {
          results.youtube.errors++;
          console.error(`  ❌ Error YouTube ${account.username}:`, error);
        }
      }
    }

    // Sync TikTok accounts
    console.log('🎵 Syncing TikTok accounts...');
    const { data: tiktokAccounts } = await supabase
      .from('tiktok_accounts')
      .select('id, username')
      .or('is_active.is.null,is_active.eq.true');

    if (tiktokAccounts && tiktokAccounts.length > 0) {
      results.totalAccounts += tiktokAccounts.length;
      
      for (const account of tiktokAccounts) {
        try {
          console.log(`  → Syncing TikTok: ${account.username}`);
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
            results.tiktok.accounts.push(account.username);
            console.log(`  ✅ Synced TikTok: ${account.username}`);
          } else {
            const errorText = await response.text();
            results.tiktok.errors++;
            console.error(`  ❌ Failed TikTok: ${account.username} - ${errorText}`);
          }
        } catch (error) {
          results.tiktok.errors++;
          console.error(`  ❌ Error TikTok ${account.username}:`, error);
        }
      }
    }

    // Calculate totals
    results.totalSynced = results.instagram.synced + results.youtube.synced + results.tiktok.synced;
    results.totalErrors = results.instagram.errors + results.youtube.errors + results.tiktok.errors;

    const completedAt = new Date().toISOString();
    console.log('🏁 Batch sync completed:', JSON.stringify(results, null, 2));

    // Send email notification if there are errors
    if (results.totalErrors > 0) {
      try {
        console.log('📧 Sending failure notification email...');
        const notificationType = results.totalSynced === 0 ? 'failure' : 'partial';
        
        await fetch(`${supabaseUrl}/functions/v1/send-sync-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: notificationType,
            results,
            completedAt,
          }),
        });
        console.log('✅ Notification email sent');
      } catch (emailError) {
        console.error('❌ Failed to send notification email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída: ${results.totalSynced}/${results.totalAccounts} contas atualizadas`,
        results,
        completedAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('❌ Error in batch sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
