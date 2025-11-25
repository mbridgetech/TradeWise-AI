export interface Trade {
  id: string;
  crypto_pair: string;
  entry_price: number;
  stop_loss: number;
  account_size: number;
  risk_percent: number;
  created_at: string;
}
