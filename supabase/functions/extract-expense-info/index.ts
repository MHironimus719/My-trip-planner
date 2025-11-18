import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication is now handled by Supabase automatically (verify_jwt enabled by default)
    // The request will only reach here if the JWT is valid
    
    const { text, images } = await req.json();

    // Validate that we have at least one input source
    const hasText = text && typeof text === 'string' && text.trim().length > 0;
    const hasImages = images && Array.isArray(images) && images.length > 0;

    if (!hasText && !hasImages) {
      return new Response(
        JSON.stringify({ error: 'Either text description or images are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate text length only if text is provided
    if (hasText && text.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Text must be less than 10000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate images
    if (images && (!Array.isArray(images) || images.length > 10)) {
      return new Response(
        JSON.stringify({ error: 'Images must be an array with maximum 10 items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting expense info with', hasText ? 'text' : 'no text', 'and', images?.length || 0, 'images');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI assistant that extracts expense information from receipts and text descriptions. 
Extract all relevant details including:
- merchant: Name of the business/vendor
- amount: Total amount spent (numeric value only, no currency symbols)
- date: Date of transaction in YYYY-MM-DD format
- category: One of: "Meal", "Flight", "Hotel", "Car", "Rideshare/Taxi", "Entertainment", "Supplies", "Fees", "Other"
- payment_method: One of: "Personal Card", "Business Card", "Company Card", "Cash", "Other"
- description: Brief description of the purchase
- reimbursable: Boolean indicating if this expense should be reimbursed
- currency: Currency code (default to "USD" if not clear)

If you're unsure about reimbursability, ask the user to clarify. Default to true if it appears to be a business expense.
Use the extract_expense_info function to return the structured data.`;

    const userContent: any[] = [];
    
    if (text) {
      userContent.push({
        type: "text",
        text: text
      });
    }

    if (images && images.length > 0) {
      for (const imageData of images) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: imageData
          }
        });
      }
    }

    const payload = {
      model: "gpt-5-mini-2025-08-07",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_expense_info",
            description: "Extract structured expense information from receipt or description",
            parameters: {
              type: "object",
              properties: {
                merchant: { type: "string", description: "Name of the business/vendor" },
                amount: { type: "number", description: "Total amount spent" },
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                category: { 
                  type: "string", 
                  enum: ["Meal", "Flight", "Hotel", "Car", "Rideshare/Taxi", "Entertainment", "Supplies", "Fees", "Other"],
                  description: "Expense category"
                },
                payment_method: {
                  type: "string",
                  enum: ["Personal Card", "Business Card", "Company Card", "Cash", "Other"],
                  description: "Payment method used"
                },
                description: { type: "string", description: "Brief description of the purchase" },
                reimbursable: { type: "boolean", description: "Whether this expense is reimbursable" },
                currency: { type: "string", description: "Currency code (e.g., USD)" },
                needs_clarification: { type: "boolean", description: "Set to true if you need to ask about reimbursability" },
                clarification_question: { type: "string", description: "Question to ask user if needs_clarification is true" }
              },
              required: ["merchant", "amount", "date", "category"],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_expense_info" } }
    };

    console.log('Calling OpenAI API with payload');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from OpenAI');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted expense data:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: extractedData
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in extract-expense-info function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
