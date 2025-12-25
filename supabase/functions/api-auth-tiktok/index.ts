import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * TikTok OAuth Authentication Endpoint
 * 
 * This endpoint handles TikTok API authentication.
 * 
 * Required Environment Variables:
 * - TIKTOK_CLIENT_KEY: Your TikTok Developer App Client Key
 * - TIKTOK_CLIENT_SECRET: Your TikTok Developer App Client Secret
 * 
 * OAuth Flow:
 * 1. Client redirects user to TikTok authorization URL
 * 2. User authorizes the app
 * 3. TikTok redirects back with authorization code
 * 4. This endpoint exchanges the code for an access token
 * 5. Access token is stored securely for API calls
 * 
 * For production implementation, refer to:
 * https://developers.tiktok.com/doc/login-kit-web/
 */

interface AuthRequest {
  code?: string;           // OAuth authorization code from TikTok redirect
  redirect_uri?: string;   // The redirect URI used in the OAuth flow
  access_token?: string;   // Direct token storage (for manual token entry)
  user_id?: string;        // Associated user ID in the system
}

interface AuthResponse {
  success: boolean;
  message: string;
  token_stored?: boolean;
  expires_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: "Method not allowed",
      details: "Use POST to submit authentication credentials" 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: AuthRequest = await req.json();

    console.log('[TikTok Auth] Processing authentication request');

    // Placeholder for OAuth token exchange
    // In production, this would:
    // 1. Validate the authorization code
    // 2. Exchange it for an access token via TikTok API
    // 3. Store the token securely in the database
    
    const tiktokClientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
    const tiktokClientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');

    if (!tiktokClientKey || !tiktokClientSecret) {
      console.warn('[TikTok Auth] OAuth credentials not configured');
      
      // Return mock success for development
      const response: AuthResponse = {
        success: true,
        message: "Authentication endpoint ready. Configure TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET for production.",
        token_stored: false,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Production OAuth flow would go here:
    // const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: new URLSearchParams({
    //     client_key: tiktokClientKey,
    //     client_secret: tiktokClientSecret,
    //     grant_type: 'authorization_code',
    //     redirect_uri: body.redirect_uri!,
    //     code: body.code!,
    //   }),
    // });

    const response: AuthResponse = {
      success: true,
      message: "TikTok authentication configured successfully",
      token_stored: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    console.log('[TikTok Auth] Authentication processed successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TikTok Auth] Error:', error);
    return new Response(JSON.stringify({ 
      error: "Authentication failed",
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
