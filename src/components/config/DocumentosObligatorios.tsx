import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const DocumentosObligatorios = () => {
  const queryClient = useQueryClient();

  const { data: denominaciones } = useQuery({
    queryKey: ["denominaciones-obligatorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("denominaciones")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      requiere_habilidad,
    }: {
      id: string;
      requiere_habilidad: boolean;
    }) => {
      const { error } = await supabase
        .from("denominaciones")
        .update({ requiere_habilidad })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denominaciones-obligatorias"] });
      toast.success("Configuración actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar configuración");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Habilidad Vigente Obligatoria</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Configure qué denominaciones de servicio requieren el documento de Habilidad
          Vigente de manera obligatoria.
        </p>
        <div className="space-y-3">
          {denominaciones?.map((denominacion) => (
            <div
              key={denominacion.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <Label
                htmlFor={`habilidad-${denominacion.id}`}
                className="flex-1 cursor-pointer"
              >
                {denominacion.nombre}
              </Label>
              <Switch
                id={`habilidad-${denominacion.id}`}
                checked={denominacion.requiere_habilidad}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({
                    id: denominacion.id,
                    requiere_habilidad: checked,
                  })
                }
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
