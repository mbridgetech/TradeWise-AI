import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { Trade } from "@/types/trade";

interface AIFeedbackProps {
  trades: Trade[];
}

const AIFeedback = ({ trades }: AIFeedbackProps) => {
  const [feedback, setFeedback] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<number>(0);
  const { toast } = useToast();

  const COOLDOWN_MS = 30000; // 30 seconds between analyses

  const getFeedback = async () => {
    if (trades.length === 0) {
      toast({
        title: "No trades",
        description: "Add some trades first to get AI feedback",
      });
      return;
    }

    // Rate limiting check
    const now = Date.now();
    const timeRemaining = Math.ceil((COOLDOWN_MS - (now - lastAnalysis)) / 1000);
    if (lastAnalysis > 0 && now - lastAnalysis < COOLDOWN_MS) {
      toast({
        title: "Please wait",
        description: `You can analyze again in ${timeRemaining} seconds`,
      });
      return;
    }

    setLoading(true);
    setLastAnalysis(now);
    
    try {
      const lastFive = trades.slice(-5);
      const { data, error } = await supabase.functions.invoke("analyze-trades", {
        body: { trades: lastFive },
      });

      if (error) throw error;
      setFeedback(data.feedback);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Trading Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get AI-powered feedback on your last 5 trades and suggestions to improve your trading
          strategy.
        </p>
        <Button onClick={getFeedback} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze My Trades"
          )}
        </Button>
        {feedback && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Analysis & Recommendations:</h4>
            <div className="text-sm whitespace-pre-wrap">{feedback}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIFeedback;