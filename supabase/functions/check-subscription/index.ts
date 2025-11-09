import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    // Create client with user's auth context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );
    
    logStep("Authenticating user");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Create service role client for admin operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if user is admin
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleData) {
      logStep("User is admin, granting full access");
      return new Response(JSON.stringify({ 
        subscribed: true,
        tier: 'enterprise',
        is_admin: true,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await serviceClient
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          subscription_status: null,
          stripe_subscription_id: null
        })
        .eq('id', user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: 'free',
        is_admin: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let tier = 'free';
    let subscriptionEnd = null;
    let subscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const priceId = subscription.items.data[0].price.id;
      
      // Map price IDs to tiers
      if (priceId === 'price_1SRLJ0DAZiZpMiexaU6J5qNG') {
        tier = 'pro';
      } else if (priceId === 'price_1SRLJ0DAZiZpMiexGhJpwc6p') {
        tier = 'enterprise';
      }
      
      logStep("Active subscription found", { subscriptionId, tier, endDate: subscriptionEnd });

      // Update profile with subscription info
      await serviceClient
        .from('profiles')
        .update({ 
          subscription_tier: tier,
          subscription_status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_end_date: subscriptionEnd
        })
        .eq('id', user.id);
    } else {
      logStep("No active subscription found");
      await serviceClient
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          subscription_status: null,
          stripe_subscription_id: null
        })
        .eq('id', user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier: tier,
      subscription_end: subscriptionEnd,
      is_admin: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
