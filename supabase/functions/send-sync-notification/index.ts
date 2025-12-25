import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncNotificationRequest {
  type: 'success' | 'failure' | 'partial';
  results: {
    instagram: { synced: number; errors: number; accounts: string[] };
    youtube: { synced: number; errors: number; accounts: string[] };
    tiktok: { synced: number; errors: number; accounts: string[] };
    totalAccounts: number;
    totalSynced: number;
    totalErrors: number;
  };
  completedAt: string;
  adminEmail?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const { type, results, completedAt, adminEmail }: SyncNotificationRequest = await req.json();

    // Default admin email - you can change this or fetch from database
    const toEmail = adminEmail || 'admin@example.com';

    const statusEmoji = type === 'success' ? '✅' : type === 'partial' ? '⚠️' : '❌';
    const statusText = type === 'success' ? 'Sucesso' : type === 'partial' ? 'Parcial' : 'Falha';

    const failedAccounts = [
      ...results.instagram.accounts.filter((_, i) => i >= results.instagram.synced),
      ...results.youtube.accounts.filter((_, i) => i >= results.youtube.synced),
      ...results.tiktok.accounts.filter((_, i) => i >= results.tiktok.synced),
    ];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; }
          .header { text-align: center; margin-bottom: 24px; }
          .status { font-size: 48px; margin-bottom: 8px; }
          .title { font-size: 24px; font-weight: bold; color: #333; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
          .stat-card { background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .success { color: #22c55e; }
          .error { color: #ef4444; }
          .platform { margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; }
          .platform-name { font-weight: bold; margin-bottom: 8px; }
          .footer { text-align: center; margin-top: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="status">${statusEmoji}</div>
            <div class="title">Sincronização em Lote - ${statusText}</div>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${results.totalAccounts}</div>
              <div class="stat-label">Total de Contas</div>
            </div>
            <div class="stat-card">
              <div class="stat-value success">${results.totalSynced}</div>
              <div class="stat-label">Sincronizadas</div>
            </div>
            <div class="stat-card">
              <div class="stat-value error">${results.totalErrors}</div>
              <div class="stat-label">Erros</div>
            </div>
          </div>
          
          <div class="platform">
            <div class="platform-name">📸 Instagram</div>
            <div>Sincronizadas: ${results.instagram.synced} | Erros: ${results.instagram.errors}</div>
          </div>
          
          <div class="platform">
            <div class="platform-name">📺 YouTube</div>
            <div>Sincronizadas: ${results.youtube.synced} | Erros: ${results.youtube.errors}</div>
          </div>
          
          <div class="platform">
            <div class="platform-name">🎵 TikTok</div>
            <div>Sincronizadas: ${results.tiktok.synced} | Erros: ${results.tiktok.errors}</div>
          </div>
          
          <div class="footer">
            Sincronização concluída em ${new Date(completedAt).toLocaleString('pt-BR')}
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`📧 Sending sync notification email (${type}) to ${toEmail}`);

    const { data, error } = await resend.emails.send({
      from: 'Sync Bot <onboarding@resend.dev>',
      to: [toEmail],
      subject: `${statusEmoji} Sincronização em Lote - ${statusText} (${results.totalSynced}/${results.totalAccounts})`,
      html: htmlContent,
    });

    if (error) {
      console.error('Error sending email:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Email sent successfully:', data);
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-sync-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
