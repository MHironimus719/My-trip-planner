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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!flightDate) {
      return new Response(
        JSON.stringify({ error: 'Flight date is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateFlightNumber(flightNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid flight number format. Expected format: AA123 or UAL1234' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateFlightDate(flightDate)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Expected format: YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const AERODATABOX_API_KEY = Deno.env.get('AERODATABOX_API_KEY');
    if (!AERODATABOX_API_KEY) {
      throw new Error('AERODATABOX_API_KEY is not configured');
    }

    const sanitizedFlightNumber = encodeURIComponent(flightNumber.toUpperCase().trim());
    const sanitizedFlightDate = encodeURIComponent(flightDate.trim());

    console.log(`Fetching flight status for: ${sanitizedFlightNumber} on ${sanitizedFlightDate}`);

    // AeroDataBox API endpoint via API.Market
    const apiUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${sanitizedFlightNumber}/${sanitizedFlightDate}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': AERODATABOX_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      return new Response(
        JSON.stringify({
          error: 'No flight found',
          message: 'Flight number not found for the given date. Try entering the flight information manually.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const body = await response.text();
      console.error('AeroDataBox API error:', response.status, body);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch flight data',
          message: 'Unable to connect to flight data service. Please try again later or enter flight details manually.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Flight data received successfully');

    // AeroDataBox returns an array of flights
    const flights = Array.isArray(data) ? data : [data];
    if (!flights || flights.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No flight found',
          message: 'No flight data available for this flight number and date. Try entering the flight information manually.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const flight = flights[0];

    // Map AeroDataBox response to our FlightInfo shape
    const flightInfo = {
      flightNumber: flight.number || flightNumber,
      airline: flight.airline?.name || 'Unknown',
      status: flight.status || 'unknown',
      departure: {
        airport: flight.departure?.airport?.name || 'Unknown',
        iata: flight.departure?.airport?.iata || '',
        terminal: flight.departure?.terminal || null,
        gate: flight.departure?.gate || null,
        scheduledTime: flight.departure?.scheduledTime?.local || flight.departure?.scheduledTime?.utc || null,
        estimatedTime: flight.departure?.revisedTime?.local || flight.departure?.revisedTime?.utc || null,
        actualTime: flight.departure?.actualTime?.local || flight.departure?.actualTime?.utc || null,
        delay: flight.departure?.delay ?? null,
      },
      arrival: {
        airport: flight.arrival?.airport?.name || 'Unknown',
        iata: flight.arrival?.airport?.iata || '',
        terminal: flight.arrival?.terminal || null,
        gate: flight.arrival?.gate || null,
        scheduledTime: flight.arrival?.scheduledTime?.local || flight.arrival?.scheduledTime?.utc || null,
        estimatedTime: flight.arrival?.revisedTime?.local || flight.arrival?.revisedTime?.utc || null,
        actualTime: flight.arrival?.actualTime?.local || flight.arrival?.actualTime?.utc || null,
        delay: flight.arrival?.delay ?? null,
      },
      aircraft: {
        type: flight.aircraft?.model || null,
      },
    };

    return new Response(
      JSON.stringify(flightInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in get-flight-status function:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'An error occurred while fetching flight status. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
