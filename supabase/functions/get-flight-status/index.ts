import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { flightNumber, flightDate } = await req.json();
    
    if (!flightNumber) {
      return new Response(
        JSON.stringify({ error: 'Flight number is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!flightDate) {
      return new Response(
        JSON.stringify({ error: 'Flight date is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const AVIATIONSTACK_API_KEY = Deno.env.get('AVIATIONSTACK_API_KEY');
    if (!AVIATIONSTACK_API_KEY) {
      throw new Error('AVIATIONSTACK_API_KEY is not configured');
    }

    console.log(`Fetching flight status for: ${flightNumber} on ${flightDate}`);

    // AviationStack API call with flight date
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${flightNumber}&flight_date=${flightDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('AviationStack API error:', response.status);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch flight data',
          message: 'Unable to connect to flight data service. Please try again later or enter flight details manually.'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('Flight data received:', JSON.stringify(data, null, 2));

    if (!data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No flight found',
          message: 'Flight number not found. This may be because the flight is not currently active, or the free tier API has limited coverage. Try entering the flight information manually.'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the most recent flight
    const flight = data.data[0];

    // Helper function to strip timezone from ISO string to treat as local time
    const stripTimezone = (isoString: string | null): string | null => {
      if (!isoString) return null;
      // Remove timezone offset (e.g., "+00:00" or "Z") to treat as local time
      return isoString.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '');
    };

    // Format the response with relevant flight information
    const flightInfo = {
      flightNumber: flight.flight?.iata || flightNumber,
      airline: flight.airline?.name || 'Unknown',
      status: flight.flight_status || 'unknown',
      departure: {
        airport: flight.departure?.airport || 'Unknown',
        iata: flight.departure?.iata || '',
        terminal: flight.departure?.terminal || null,
        gate: flight.departure?.gate || null,
        scheduledTime: stripTimezone(flight.departure?.scheduled),
        estimatedTime: stripTimezone(flight.departure?.estimated),
        actualTime: stripTimezone(flight.departure?.actual),
        delay: flight.departure?.delay || null,
      },
      arrival: {
        airport: flight.arrival?.airport || 'Unknown',
        iata: flight.arrival?.iata || '',
        terminal: flight.arrival?.terminal || null,
        gate: flight.arrival?.gate || null,
        scheduledTime: stripTimezone(flight.arrival?.scheduled),
        estimatedTime: stripTimezone(flight.arrival?.estimated),
        actualTime: stripTimezone(flight.arrival?.actual),
        delay: flight.arrival?.delay || null,
      },
      aircraft: {
        type: flight.aircraft?.iata || null,
      }
    };

    return new Response(
      JSON.stringify(flightInfo),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-flight-status function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
