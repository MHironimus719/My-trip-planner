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
      // Calculate adjusted end date (Google Calendar treats end dates as exclusive for all-day events)
      const endDate = new Date(trip.ending_date);
      endDate.setDate(endDate.getDate() + 1);
      const adjustedEndDate = endDate.toISOString().split('T')[0];

      // Build enhanced description with comprehensive trip details
      let description = trip.trip_name;

      if (trip.client_or_event) {
        description += `\n\nClient/Event: ${trip.client_or_event}`;
      }

      // Flight details
      if (trip.flight_needed && (trip.airline || trip.flight_number || trip.return_airline || trip.return_flight_number)) {
        description += '\n\nFlight Details:';
        if (trip.airline || trip.flight_number) {
          description += `\n- Outbound: ${trip.airline || ''} ${trip.flight_number || ''}`;
          if (trip.departure_time) {
            description += ` departing ${trip.departure_time}`;
          }
        }
        if (trip.return_airline || trip.return_flight_number) {
          description += `\n- Return: ${trip.return_airline || ''} ${trip.return_flight_number || ''}`;
          if (trip.return_departure_time) {
            description += ` departing ${trip.return_departure_time}`;
          }
        }
        if (trip.flight_confirmation || trip.return_flight_confirmation) {
          description += `\n- Confirmation: ${trip.flight_confirmation || trip.return_flight_confirmation || ''}`;
        }
      }

      // Hotel details
      if (trip.hotel_needed && trip.hotel_name) {
        description += '\n\nHotel:';
        description += `\n- ${trip.hotel_name}`;
        if (trip.hotel_checkin_date) {
          description += `\n- Check-in: ${trip.hotel_checkin_date}`;
        }
        if (trip.hotel_checkout_date) {
          description += `\n- Check-out: ${trip.hotel_checkout_date}`;
        }
        if (trip.hotel_confirmation) {
          description += `\n- Confirmation: ${trip.hotel_confirmation}`;
        }
      }

      // Car rental details
      if (trip.car_needed && trip.car_rental_company) {
        description += '\n\nCar Rental:';
        description += `\n- ${trip.car_rental_company}`;
        if (trip.car_pickup_datetime) {
          description += `\n- Pickup: ${trip.car_pickup_datetime}`;
        }
        if (trip.car_dropoff_datetime) {
          description += `\n- Dropoff: ${trip.car_dropoff_datetime}`;
        }
        if (trip.car_confirmation) {
          description += `\n- Confirmation: ${trip.car_confirmation}`;
        }
      }

      // Notes
      if (trip.internal_notes) {
        description += `\n\nNotes: ${trip.internal_notes}`;
      }

      // Create/update calendar event
      const event = {
        summary: trip.trip_name,
        description: description,
        start: {
          date: trip.beginning_date,
          timeZone: 'UTC',
        },
        end: {
          date: adjustedEndDate,
          timeZone: 'UTC',
        },
        location: trip.city && trip.country ? `${trip.city}, ${trip.country}` : trip.city || '',
      };

      let calendarResponse;
      let method = 'POST';
      let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

      // If updating and we have an event ID, use PATCH to update existing event
      if (action === 'update' && trip.google_calendar_event_id) {
        method = 'PATCH';
        url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${trip.google_calendar_event_id}`;
      }

      calendarResponse = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('Calendar API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to sync with Google Calendar', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const calendarEvent = await calendarResponse.json();

      // Store the event ID in the trip if it's a new event
      if (!trip.google_calendar_event_id) {
        await supabase
          .from('trips')
          .update({ google_calendar_event_id: calendarEvent.id })
          .eq('trip_id', tripId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          eventId: calendarEvent.id,
          message: action === 'create' ? 'Trip added to Google Calendar' : 'Trip updated in Google Calendar'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete' && trip.google_calendar_event_id) {
      // Delete calendar event
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${trip.google_calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!calendarResponse.ok && calendarResponse.status !== 404) {
        const errorText = await calendarResponse.text();
        console.error('Calendar API delete error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to delete from Google Calendar', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear the event ID from the trip
      await supabase
        .from('trips')
        .update({ google_calendar_event_id: null })
        .eq('trip_id', tripId);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Trip removed from Google Calendar'
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