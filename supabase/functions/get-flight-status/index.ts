import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function validateFlightNumber(flightNumber: string): boolean {
  // Flight numbers: 2-3 letter airline code followed by 1-4 digits
  return /^[A-Z0-9]{2,3}\d{1,4}$/i.test(flightNumber);
}

function validateFlightDate(flightDate: string): boolean {
  // Date format: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
    return false;
  }
  const date = new Date(flightDate);
  return !isNaN(date.getTime());
}

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

    // Validate flight number format
    if (!validateFlightNumber(flightNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid flight number format. Expected format: AA123 or UAL1234' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate date format
    if (!validateFlightDate(flightDate)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Expected format: YYYY-MM-DD' }), 
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

    // Sanitize inputs for URL use
    const sanitizedFlightNumber = encodeURIComponent(flightNumber.toUpperCase().trim());
    const sanitizedFlightDate = encodeURIComponent(flightDate.trim());

    console.log(`Fetching flight status for: ${sanitizedFlightNumber} on ${sanitizedFlightDate}`);

    // Note: AviationStack API requires access_key as URL parameter (their API design)
    // We mitigate log exposure risk by using HTTPS and validated/sanitized inputs
    const response = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${sanitizedFlightNumber}&flight_date=${sanitizedFlightDate}`,
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
    console.log('Flight data received successfully');

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