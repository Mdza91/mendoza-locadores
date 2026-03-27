import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const OcultamientoInactivosConfig = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["config-ocultamiento-inactivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_ocultamiento_inactivos")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (ocultar: boolean) => {
      const { error } = await supabase
        .from("config_ocultamiento_inactivos")
        .update({ ocultar_inactivos: ocultar, updated_at: new Date().toISOString() })
        .eq("id", config?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-ocultamiento-inactivos"] });
      queryClient.invalidateQueries({ queryKey: ["locadores"] });
      toast.success("Configuración actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar la configuración");
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Visibilidad de Usuarios Inactivos</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Configura si deseas ocultar los locadores/usuarios inactivos de las listas principales.
      </p>
      
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="ocultar-inactivos" className="text-base font-medium">
            Ocultar usuarios inactivos
          </Label>
          <p className="text-sm text-muted-foreground">
            Los locadores con estado "Inactivo" no aparecerán en la lista de Locadores ni Usuarios
          </p>
        </div>
        <Switch
          id="ocultar-inactivos"
          checked={config?.ocultar_inactivos ?? false}
          onCheckedChange={(checked) => updateMutation.mutate(checked)}
          disabled={updateMutation.isPending}
        />
      </div>
    </Card>
  );
};

export default OcultamientoInactivosConfig;
