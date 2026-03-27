import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { AlertTriangle, FileWarning, Save, Info } from "lucide-react";

interface ConfigDocumentoEmergencia {
  id: string;
  documento_key: string;
  nombre_display: string;
  habilitado: boolean;
  subtitulo: string;
  texto_ayuda: string;
}

export const DocumentosEmergenciaConfig = () => {
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<Record<string, { nombre_display: string; habilitado: boolean; subtitulo: string; texto_ayuda: string }>>({});

  const { data: configDocs, isLoading } = useQuery({
    queryKey: ["config-documentos-emergencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_documentos_emergencia")
        .select("*")
        .order("documento_key");

      if (error) throw error;
      return data as ConfigDocumentoEmergencia[];
    },
  });

  useEffect(() => {
    if (configDocs) {
      const configs: Record<string, { nombre_display: string; habilitado: boolean; subtitulo: string; texto_ayuda: string }> = {};
      configDocs.forEach((doc) => {
        configs[doc.documento_key] = {
          nombre_display: doc.nombre_display,
          habilitado: doc.habilitado,
          subtitulo: (doc as any).subtitulo || "",
          texto_ayuda: (doc as any).texto_ayuda || "",
        };
      });
      setLocalConfig(configs);
    }
  }, [configDocs]);

  const updateMutation = useMutation({
    mutationFn: async ({
      documento_key,
      nombre_display,
      habilitado,
      subtitulo,
      texto_ayuda,
    }: {
      documento_key: string;
      nombre_display: string;
      habilitado: boolean;
      subtitulo: string;
      texto_ayuda: string;
    }) => {
      const { error } = await supabase
        .from("config_documentos_emergencia")
        .update({ nombre_display, habilitado, subtitulo, texto_ayuda } as any)
        .eq("documento_key", documento_key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-documentos-emergencia"] });
      toast.success("Configuración actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar configuración");
    },
  });

  const handleToggle = (documentoKey: string, habilitado: boolean) => {
    const config = localConfig[documentoKey];
    if (!config) return;

    setLocalConfig({
      ...localConfig,
      [documentoKey]: { ...config, habilitado },
    });

    updateMutation.mutate({
      documento_key: documentoKey,
      nombre_display: config.nombre_display,
      habilitado,
      subtitulo: config.subtitulo,
      texto_ayuda: config.texto_ayuda,
    });
  };

  const handleFieldChange = (documentoKey: string, field: string, value: string) => {
    const config = localConfig[documentoKey];
    if (!config) return;

    setLocalConfig({
      ...localConfig,
      [documentoKey]: { ...config, [field]: value },
    });
  };

  const handleSave = (documentoKey: string) => {
    const config = localConfig[documentoKey];
    if (!config) return;

    updateMutation.mutate({
      documento_key: documentoKey,
      nombre_display: config.nombre_display,
      habilitado: config.habilitado,
      subtitulo: config.subtitulo,
      texto_ayuda: config.texto_ayuda,
    });
  };

  const alguno_habilitado = Object.values(localConfig).some(c => c.habilitado);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileWarning className="h-6 w-6 text-orange-500" />
          <div>
            <CardTitle>Documentos de Emergencia</CardTitle>
            <CardDescription>
              Configura documentos especiales que los locadores pueden subir bajo demanda (hasta 4)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {alguno_habilitado && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-950/20 dark:border-orange-900">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Los documentos habilitados aparecerán en la sección "Mis Entregas" del perfil de cada locador
            </p>
          </div>
        )}

        {configDocs?.map((doc) => {
          const config = localConfig[doc.documento_key] || {
            nombre_display: doc.nombre_display,
            habilitado: doc.habilitado,
            subtitulo: (doc as any).subtitulo || "",
            texto_ayuda: (doc as any).texto_ayuda || "",
          };

          return (
            <div key={doc.documento_key} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={config.habilitado ? "default" : "secondary"}>
                    {doc.documento_key.replace("_", " ").toUpperCase()}
                  </Badge>
                  <Label className="text-base font-medium">
                    {config.habilitado ? "Habilitado" : "Deshabilitado"}
                  </Label>
                </div>
                <Switch
                  checked={config.habilitado}
                  onCheckedChange={(checked) => handleToggle(doc.documento_key, checked)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Nombre del documento (visible para locadores)
                    </Label>
                    <Input
                      value={config.nombre_display}
                      onChange={(e) => handleFieldChange(doc.documento_key, "nombre_display", e.target.value)}
                      placeholder="Nombre del documento"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Subtítulo (aparece en azul debajo del nombre)
                  </Label>
                  <Input
                    value={config.subtitulo}
                    onChange={(e) => handleFieldChange(doc.documento_key, "subtitulo", e.target.value)}
                    placeholder="Ej: Documento obligatorio para pago"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">
                      Texto de ayuda (!) — aparece al hacer clic en el ícono de información
                    </Label>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Textarea
                    value={config.texto_ayuda}
                    onChange={(e) => handleFieldChange(doc.documento_key, "texto_ayuda", e.target.value)}
                    placeholder="Ej: Sube este documento **antes del viernes**. Debe estar *firmado* por el responsable."
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa **texto** para <strong>negrita</strong> y *texto* para <em>cursiva</em>
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleSave(doc.documento_key)}
                  disabled={updateMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
              </div>
            </div>
          );
        })}

        <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="font-medium mb-2">Información:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Habilita los documentos que necesitas que los locadores suban de forma urgente</li>
            <li>Puedes personalizar el nombre, subtítulo y texto de ayuda de cada documento</li>
            <li>Los documentos habilitados aparecerán en el menú "Descargas" para su inclusión en expedientes</li>
            <li>Los locadores verán la sección "Mis Entregas" solo si hay documentos habilitados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
