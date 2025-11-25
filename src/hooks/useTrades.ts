import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trade } from "@/types/trade";

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddTrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (trade: Omit<Trade, "id" | "created_at"> & { user_id: string }) => {
      const { data, error } = await supabase
        .from("trades")
        .insert(trade)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}

export function useDeleteTrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}
