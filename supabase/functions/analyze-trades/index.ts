import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Get allowed origin from environment, fallback to localhost for development
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Input validation
    if (!body || !Array.isArray(body.trades)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: trades array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { trades } = body;

    // Validate trades array
    if (trades.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one trade is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (trades.length > 10) {
      return new Response(
        JSON.stringify({ error: "Maximum 10 trades allowed per analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each trade object
    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      if (!t || typeof t !== "object") {
        return new Response(
          JSON.stringify({ error: `Invalid trade at position ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof t.crypto_pair !== "string" || t.crypto_pair.length === 0 || t.crypto_pair.length > 20) {
        return new Response(
          JSON.stringify({ error: `Invalid crypto_pair at trade ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof t.entry_price !== "number" || t.entry_price <= 0) {
        return new Response(
          JSON.stringify({ error: `Invalid entry_price at trade ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof t.stop_loss !== "number" || t.stop_loss <= 0) {
        return new Response(
          JSON.stringify({ error: `Invalid stop_loss at trade ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof t.risk_percent !== "number" || t.risk_percent < 0 || t.risk_percent > 100) {
        return new Response(
          JSON.stringify({ error: `Invalid risk_percent at trade ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const tradesText = trades
      .map(
        (t: any, i: number) =>
          `Trade ${i + 1}: ${t.crypto_pair} - Entry: $${t.entry_price}, Stop Loss: $${t.stop_loss}, Risk: ${t.risk_percent.toFixed(2)}%`
      )
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert crypto trading advisor. Analyze trades and provide actionable feedback on risk management, entry/exit strategies, and overall trading patterns. Be concise and practical.",
          },
          {
            role: "user",
            content: `Analyze these trades and provide feedback:\n\n${tradesText}\n\nProvide specific recommendations to improve risk management and trading strategy.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const feedback = data.choices[0].message.content;

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-trades function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});