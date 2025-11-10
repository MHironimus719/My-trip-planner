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
    const { flightNumber } = await req.json();
    
    if (!flightNumber) {
      return new Response(
        JSON.stringify({ error: 'Flight number is required' }), 
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

    console.log(`Fetching flight status for: ${flightNumber}`);

    // AviationStack API call
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${flightNumber}`,
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
        scheduledTime: flight.departure?.scheduled || null,
        estimatedTime: flight.departure?.estimated || null,
        actualTime: flight.departure?.actual || null,
        delay: flight.departure?.delay || null,
      },
      arrival: {
        airport: flight.arrival?.airport || 'Unknown',
        iata: flight.arrival?.iata || '',
        terminal: flight.arrival?.terminal || null,
        gate: flight.arrival?.gate || null,
        scheduledTime: flight.arrival?.scheduled || null,
        estimatedTime: flight.arrival?.estimated || null,
        actualTime: flight.arrival?.actual || null,
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
