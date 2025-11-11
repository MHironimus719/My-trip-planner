import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication is now handled by Supabase automatically (verify_jwt enabled by default)
    // The request will only reach here if the JWT is valid
    
    const { message, images, conversationHistory = [], currentData = {} } = await req.json();

    // Validate input - either we have a message/images or conversationHistory
    if ((!message || typeof message !== 'string') && conversationHistory.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or conversation history is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message && message.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Message must be less than 10000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (images && (!Array.isArray(images) || images.length > 10)) {
      return new Response(
        JSON.stringify({ error: 'Images must be an array with maximum 10 items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting trip info from authenticated user');
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemContent = `You are a helpful assistant that extracts trip information from user messages or images. 

IMPORTANT: The user may provide information iteratively across multiple messages. Always merge new information with existing data.

Current extracted data: ${JSON.stringify(currentData, null, 2)}

Extract as much relevant information as possible including dates, locations, flight details, hotel information, car rental details, fees, and client/event names. 

Rules:
- If information is not provided in the current message, check if it exists in currentData and preserve it
- Only update fields when new information is explicitly provided
- When multiple images are provided, combine all the information you find
- If the user corrects previous information, use the new information`;

    const messages: any[] = [
      {
        role: "system",
        content: systemContent
      },
      ...conversationHistory
    ];

    // The current user message is already in conversationHistory, so we don't add it again

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_trip_data",
              description: "Extract trip information from the provided text or image",
              parameters: {
                type: "object",
                properties: {
                  trip_name: { type: "string", description: "Name of the trip" },
                  city: { type: "string", description: "Destination city" },
                  country: { type: "string", description: "Destination country" },
                  beginning_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
                  ending_date: { type: "string", description: "End date in YYYY-MM-DD format" },
                  client_or_event: { type: "string", description: "Client name or event name" },
                  fee: { type: "number", description: "Trip fee amount" },
                  expenses_reimbursable: { type: "boolean", description: "Whether expenses are reimbursable" },
                  flight_needed: { type: "boolean", description: "Whether flight is needed" },
                  airline: { type: "string", description: "Airline name" },
                  flight_number: { type: "string", description: "Flight number" },
                  departure_time: { type: "string", description: "Departure date and time in ISO format" },
                  arrival_time: { type: "string", description: "Arrival date and time in ISO format" },
                  flight_confirmation: { type: "string", description: "Flight confirmation number" },
                  hotel_needed: { type: "boolean", description: "Whether hotel is needed" },
                  hotel_name: { type: "string", description: "Hotel name" },
                  hotel_address: { type: "string", description: "Hotel address" },
                  hotel_booking_service: { type: "string", description: "Hotel booking service used" },
                  hotel_checkin_date: { type: "string", description: "Hotel check-in date in YYYY-MM-DD format" },
                  hotel_checkout_date: { type: "string", description: "Hotel check-out date in YYYY-MM-DD format" },
                  hotel_confirmation: { type: "string", description: "Hotel confirmation number" },
                  car_needed: { type: "boolean", description: "Whether car rental is needed" },
                  car_rental_company: { type: "string", description: "Car rental company name" },
                  car_pickup_location: { type: "string", description: "Car pickup location" },
                  car_dropoff_location: { type: "string", description: "Car drop-off location" },
                  car_booking_service: { type: "string", description: "Car booking service used" },
                  car_pickup_datetime: { type: "string", description: "Car pickup date and time in ISO format" },
                  car_dropoff_datetime: { type: "string", description: "Car drop-off date and time in ISO format" },
                  car_confirmation: { type: "string", description: "Car rental confirmation number" },
                  internal_notes: { type: "string", description: "Any additional notes or details" }
                },
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_trip_data" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        message: "Trip information extracted successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-trip-info:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
