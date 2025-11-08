import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, images } = await req.json();
    console.log('Received request with text:', text, 'and', images?.length || 0, 'images');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

    if (userContent.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text or images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      model: "google/gemini-2.5-flash",
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

    console.log('Calling Lovable AI with payload');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from Lovable AI');

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
