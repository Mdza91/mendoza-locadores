import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const TIPOS_NOTIFICACION = [
  { tipo: "habilidad_vigente", label: "Vencimiento de Habilidad Vigente" },
];

export const NotificacionesConfig = () => {
  const queryClient = useQueryClient();
  const [configuraciones, setConfiguraciones] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ["config-notificaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_notificaciones")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      const configs: any = {};
      data.forEach((config: any) => {
        configs[config.tipo] = {
          activa: config.activa,
          dias_anticipacion: config.dias_anticipacion,
        };
      });
      setConfiguraciones(configs);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async ({
      tipo,
      activa,
      dias_anticipacion,
    }: {
      tipo: string;
      activa: boolean;
      dias_anticipacion: number;
    }) => {
      const { error } = await supabase
        .from("config_notificaciones")
        .upsert(
          { tipo, activa, dias_anticipacion },
          { onConflict: "tipo" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-notificaciones"] });
      toast.success("Configuración actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar configuración");
    },
  });

  const handleToggle = (tipo: string, activa: boolean) => {
    const config = configuraciones[tipo] || { dias_anticipacion: 7 };
    setConfiguraciones({
      ...configuraciones,
      [tipo]: { ...config, activa },
    });
    updateMutation.mutate({
      tipo,
      activa,
      dias_anticipacion: config.dias_anticipacion,
    });
  };

  const handleDiasChange = (tipo: string, dias: number) => {
    const config = configuraciones[tipo] || { activa: true };
    setConfiguraciones({
      ...configuraciones,
      [tipo]: { ...config, dias_anticipacion: dias },
    });
  };

  const handleSaveDias = (tipo: string) => {
    const config = configuraciones[tipo];
    if (config) {
      updateMutation.mutate({
        tipo,
        activa: config.activa,
        dias_anticipacion: config.dias_anticipacion,
      });
    }
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Notificaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {TIPOS_NOTIFICACION.map(({ tipo, label }) => {
          const config = configuraciones[tipo] || {
            activa: true,
            dias_anticipacion: 7,
          };

          return (
            <div key={tipo} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor={tipo} className="text-base">
                  {label}
                </Label>
                <Switch
                  id={tipo}
                  checked={config.activa}
                  onCheckedChange={(checked) => handleToggle(tipo, checked)}
                />
              </div>

              {config.activa && (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`${tipo}-dias`} className="text-sm">
                      Días de anticipación
                    </Label>
                    <Input
                      id={`${tipo}-dias`}
                      type="number"
                      min="1"
                      max="30"
                      value={config.dias_anticipacion}
                      onChange={(e) =>
                        handleDiasChange(tipo, parseInt(e.target.value) || 7)
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveDias(tipo)}
                    disabled={updateMutation.isPending}
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="font-medium mb-1">Información:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Las notificaciones te avisarán antes de que venzan los documentos
            </li>
            <li>
              La Habilidad Vigente vence según la fecha indicada al subirla
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
