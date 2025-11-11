import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[GOOGLE-OAUTH] Request received:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('[GOOGLE-OAUTH] Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse JSON body for POST requests
    const { code, action } = await req.json();
    console.log('[GOOGLE-OAUTH] Request body:', { code: code ? 'present' : 'missing', action });

    // Handle get_auth_url action
    if (action === 'get_auth_url') {
      console.log('[GOOGLE-OAUTH] Generating auth URL');
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
      
      // Get the app URL from the request origin
      const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '';
      const callbackUrl = `${origin}/oauth/callback`;
      console.log('[GOOGLE-OAUTH] Using callback URL:', callbackUrl);
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', callbackUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      console.log('[GOOGLE-OAUTH] Auth URL generated successfully');
      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code) {
      console.error('[GOOGLE-OAUTH] No authorization code provided');
      return new Response(
        JSON.stringify({ error: 'Authorization code required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID from JWT
    console.log('[GOOGLE-OAUTH] Extracting user from JWT');
    const authHeader = req.headers.get('authorization');
    console.log('[GOOGLE-OAUTH] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('[GOOGLE-OAUTH] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[GOOGLE-OAUTH] User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GOOGLE-OAUTH] User authenticated:', user.id);

    // Exchange code for tokens
    console.log('[GOOGLE-OAUTH] Exchanging code for tokens');
    
    // Get the app URL from the request origin for the redirect URI
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '';
    const redirectUri = `${origin}/oauth/callback`;
    console.log('[GOOGLE-OAUTH] Using redirect URI for token exchange:', redirectUri);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[GOOGLE-OAUTH] Token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;
    console.log('[GOOGLE-OAUTH] Tokens received successfully');

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store tokens in profiles table
    console.log('[GOOGLE-OAUTH] Storing tokens in database');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_access_token: access_token,
        google_refresh_token: refresh_token,
        google_token_expires_at: expiresAt.toISOString(),
        google_calendar_connected: true,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[GOOGLE-OAUTH] Failed to store tokens:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to store tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GOOGLE-OAUTH] Success! Calendar connected for user:', user.id);
    return new Response(
      JSON.stringify({ success: true, message: 'Google Calendar connected successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[GOOGLE-OAUTH] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});