import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tripId, action } = await req.json();

    // Get user's Google tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_access_token, google_token_expires_at, google_calendar_connected')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.google_calendar_connected) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    const expiresAt = new Date(profile.google_token_expires_at);
    if (expiresAt <= new Date()) {
      // Token expired, need to refresh
      const refreshResponse = await supabase.functions.invoke('refresh-google-token', {
        headers: { authorization: authHeader! }
      });
      
      if (refreshResponse.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get fresh token after potential refresh
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('google_access_token')
      .eq('id', user.id)
      .single();

    const accessToken = freshProfile?.google_access_token;

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: 'Trip not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create' || action === 'update') {
      // Create/update calendar event
      const event = {
        summary: trip.trip_name,
        description: `Trip to ${trip.city || 'destination'}${trip.client_or_event ? ` - ${trip.client_or_event}` : ''}`,
        start: {
          date: trip.beginning_date,
          timeZone: 'UTC',
        },
        end: {
          date: trip.ending_date,
          timeZone: 'UTC',
        },
        location: trip.city && trip.country ? `${trip.city}, ${trip.country}` : trip.city || '',
      };

      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!calendarResponse.ok) {
        console.error('Calendar API error:', await calendarResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to sync with Google Calendar' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const calendarEvent = await calendarResponse.json();

      return new Response(
        JSON.stringify({ 
          success: true, 
          eventId: calendarEvent.id,
          message: 'Trip synced to Google Calendar'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Calendar sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});