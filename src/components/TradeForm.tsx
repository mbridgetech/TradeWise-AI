import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TradeFormProps {
  onTradeAdded: () => void;
}

const TradeForm = ({ onTradeAdded }: TradeFormProps) => {
  const [cryptoPair, setCryptoPair] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [accountSize, setAccountSize] = useState("");
  const [riskPercent, setRiskPercent] = useState<number | null>(null);
  const [riskAmount, setRiskAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Calculate risk using useEffect instead of setTimeout
  useEffect(() => {
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const position = parseFloat(positionSize);
    const account = parseFloat(accountSize);

    if (entry && stop && position && account && entry > 0 && account > 0 && position > 0) {
      // Calculate actual dollar risk
      const priceDiff = Math.abs(entry - stop);
      const dollarRisk = (priceDiff / entry) * position;
      const accountRiskPercent = (dollarRisk / account) * 100;
      
      setRiskAmount(dollarRisk);
      setRiskPercent(accountRiskPercent);
    } else {
      setRiskPercent(null);
      setRiskAmount(null);
    }
  }, [entryPrice, stopLoss, positionSize, accountSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (riskPercent === null) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please fill in all fields with valid numbers",
      });
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        crypto_pair: cryptoPair,
        entry_price: parseFloat(entryPrice),
        stop_loss: parseFloat(stopLoss),
        account_size: parseFloat(accountSize),
        risk_percent: riskPercent,
      });

      if (error) throw error;

      toast({ title: "Trade logged successfully!" });
      setCryptoPair("");
      setEntryPrice("");
      setStopLoss("");
      setPositionSize("");
      setAccountSize("");
      setRiskPercent(null);
      setRiskAmount(null);
      onTradeAdded();
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
        <CardTitle>Log New Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cryptoPair">Crypto Pair</Label>
            <Input
              id="cryptoPair"
              placeholder="BTC/USDT"
              value={cryptoPair}
              onChange={(e) => setCryptoPair(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price ($)</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss ($)</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="positionSize">Position Size ($)</Label>
              <Input
                id="positionSize"
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountSize">Account Size ($)</Label>
              <Input
                id="accountSize"
                type="number"
                step="0.01"
                placeholder="10000.00"
                value={accountSize}
                onChange={(e) => setAccountSize(e.target.value)}
                required
              />
            </div>
          </div>

          {riskPercent !== null && riskAmount !== null && (
            <Alert variant={riskPercent > 2 ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                Risk: {riskPercent.toFixed(2)}% (${riskAmount.toFixed(2)}) {riskPercent > 2 && "⚠️ HIGH RISK"}
              </AlertTitle>
              <AlertDescription>
                {riskPercent > 2
                  ? "Warning: Risk exceeds recommended 2% threshold!"
                  : "Risk is within acceptable limits"}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging..." : "Log Trade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TradeForm;