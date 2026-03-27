import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  id: string;
  nombre_app: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_app_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as AppSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}
