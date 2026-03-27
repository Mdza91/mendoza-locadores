import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface Seccion {
  id: string;
  seccion: string;
  nombre_display: string;
  visible: boolean;
  orden: number;
}

interface ItemSeccion {
  id: string;
  seccion_id: string;
  item_key: string;
  nombre_display: string;
  visible: boolean;
  orden: number;
}

export const SeccionesVisiblesLocadores = () => {
  const queryClient = useQueryClient();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const { data: secciones, isLoading: loadingSecciones } = useQuery({
    queryKey: ["config-secciones-visibles-locadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_secciones_visibles_locadores")
        .select("*")
        .order("orden");

      if (error) throw error;
      return data as Seccion[];
    },
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["config-items-seccion-locadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_items_seccion_locadores")
        .select("*")
        .order("orden");

      if (error) throw error;
      return data as ItemSeccion[];
    },
  });

  const toggleSeccionMutation = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from("config_secciones_visibles_locadores")
        .update({ visible })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-secciones-visibles-locadores"] });
      toast.success("Sección actualizada");
    },
    onError: (error) => {
      console.error("Error al actualizar sección:", error);
      toast.error("Error al actualizar la sección");
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from("config_items_seccion_locadores")
        .update({ visible })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-items-seccion-locadores"] });
      toast.success("Item actualizado");
    },
    onError: (error) => {
      console.error("Error al actualizar item:", error);
      toast.error("Error al actualizar el item");
    },
  });

  const toggleSection = (seccionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [seccionId]: !prev[seccionId]
    }));
  };

  const getItemsForSeccion = (seccionId: string) => {
    return items?.filter(item => item.seccion_id === seccionId) || [];
  };

  if (loadingSecciones || loadingItems) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Perfil Locadores
        </CardTitle>
        <CardDescription>
          Controla qué secciones y elementos pueden ver los locadores en su perfil personal.
          Desactiva una sección completa o expande para configurar elementos individuales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {secciones?.map((seccion) => {
            const seccionItems = getItemsForSeccion(seccion.id);
            const isOpen = openSections[seccion.id];
            const visibleItemsCount = seccionItems.filter(i => i.visible).length;

            return (
              <div
                key={seccion.id}
                className="rounded-lg border bg-card overflow-hidden"
              >
                {/* Sección Header */}
                <div className="flex items-center justify-between p-4 bg-muted/30">
                  <div className="flex items-center gap-3 flex-1">
                    <Collapsible open={isOpen} onOpenChange={() => toggleSection(seccion.id)}>
                      <CollapsibleTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded transition-colors">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                    </Collapsible>
                    
                    {seccion.visible ? (
                      <Eye className="h-5 w-5 text-green-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    
                    <div className="flex-1">
                      <Label
                        htmlFor={`seccion-${seccion.id}`}
                        className="text-sm font-semibold cursor-pointer"
                      >
                        {seccion.nombre_display}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {seccion.visible 
                          ? `${visibleItemsCount} de ${seccionItems.length} elementos visibles`
                          : "Sección oculta"
                        }
                      </p>
                    </div>
                  </div>
                  
                  <Switch
                    id={`seccion-${seccion.id}`}
                    checked={seccion.visible}
                    onCheckedChange={(checked) => {
                      toggleSeccionMutation.mutate({
                        id: seccion.id,
                        visible: checked,
                      });
                    }}
                    disabled={toggleSeccionMutation.isPending}
                  />
                </div>

                {/* Items de la sección */}
                <Collapsible open={isOpen}>
                  <CollapsibleContent>
                    <div className="border-t bg-background">
                      {seccionItems.length > 0 ? (
                        <div className="divide-y">
                          {seccionItems.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between px-4 py-3 pl-14 hover:bg-muted/30 transition-colors ${
                                !seccion.visible ? 'opacity-50 pointer-events-none' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {item.visible && seccion.visible ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )}
                                <Label
                                  htmlFor={`item-${item.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {item.nombre_display}
                                </Label>
                              </div>
                              <Switch
                                id={`item-${item.id}`}
                                checked={item.visible}
                                onCheckedChange={(checked) => {
                                  toggleItemMutation.mutate({
                                    id: item.id,
                                    visible: checked,
                                  });
                                }}
                                disabled={toggleItemMutation.isPending || !seccion.visible}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground p-4 pl-14">
                          No hay elementos configurables para esta sección.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
