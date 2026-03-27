import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExternalLink, Link2, Save, Loader2 } from "lucide-react";

interface LinkSolicitud {
  id: string;
  tipo_documento: string;
  nombre_display: string;
  url_solicitud: string | null;
  habilitado: boolean;
}

export const LinksSolicitudConfig = () => {
  const queryClient = useQueryClient();
  const [editedLinks, setEditedLinks] = useState<Record<string, { url: string; habilitado: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: links, isLoading } = useQuery({
    queryKey: ["config-links-solicitud"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_links_solicitud_documentos")
        .select("*")
        .order("nombre_display");
      
      if (error) throw error;
      return data as LinkSolicitud[];
    },
  });

  const getEditedValue = (link: LinkSolicitud) => {
    if (editedLinks[link.id]) {
      return editedLinks[link.id];
    }
    return { url: link.url_solicitud || "", habilitado: link.habilitado };
  };

  const handleUrlChange = (linkId: string, url: string) => {
    const link = links?.find(l => l.id === linkId);
    if (!link) return;
    
    setEditedLinks(prev => ({
      ...prev,
      [linkId]: {
        ...getEditedValue(link),
        url,
      },
    }));
  };

  const handleToggle = async (link: LinkSolicitud) => {
    const currentValue = getEditedValue(link);
    const newHabilitado = !currentValue.habilitado;
    
    // Si se está habilitando y no hay URL, no permitir
    if (newHabilitado && !currentValue.url) {
      toast.error("Debes ingresar una URL antes de habilitar el link");
      return;
    }

    setSaving(link.id);
    
    const { error } = await supabase
      .from("config_links_solicitud_documentos")
      .update({ 
        habilitado: newHabilitado,
        url_solicitud: currentValue.url || null,
      })
      .eq("id", link.id);
    
    if (error) {
      toast.error("Error al actualizar el estado");
    } else {
      toast.success(newHabilitado ? "Link habilitado" : "Link deshabilitado");
      queryClient.invalidateQueries({ queryKey: ["config-links-solicitud"] });
      setEditedLinks(prev => {
        const newState = { ...prev };
        delete newState[link.id];
        return newState;
      });
    }
    
    setSaving(null);
  };

  const handleSave = async (link: LinkSolicitud) => {
    const edited = editedLinks[link.id];
    if (!edited) return;
    
    setSaving(link.id);
    
    const { error } = await supabase
      .from("config_links_solicitud_documentos")
      .update({ 
        url_solicitud: edited.url || null,
        habilitado: edited.habilitado,
      })
      .eq("id", link.id);
    
    if (error) {
      toast.error("Error al guardar el link");
    } else {
      toast.success("Link guardado correctamente");
      queryClient.invalidateQueries({ queryKey: ["config-links-solicitud"] });
      setEditedLinks(prev => {
        const newState = { ...prev };
        delete newState[link.id];
        return newState;
      });
    }
    
    setSaving(null);
  };

  const hasChanges = (link: LinkSolicitud) => {
    const edited = editedLinks[link.id];
    if (!edited) return false;
    return edited.url !== (link.url_solicitud || "") || edited.habilitado !== link.habilitado;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Links de Solicitud de Documentos
        </CardTitle>
        <CardDescription>
          Configura los enlaces externos donde los locadores pueden solicitar cada documento.
          Cuando esté habilitado, aparecerá un botón "Solicita Aquí" en el perfil del locador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {links?.map((link) => {
          const edited = getEditedValue(link);
          const changed = hasChanges(link);
          
          return (
            <div 
              key={link.id} 
              className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <Label className="font-medium text-base">{link.nombre_display}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {edited.habilitado ? "Visible" : "Oculto"}
                  </span>
                  <Switch 
                    checked={edited.habilitado}
                    onCheckedChange={() => handleToggle(link)}
                    disabled={saving === link.id}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="https://ejemplo.com/solicitar-documento"
                    value={edited.url}
                    onChange={(e) => handleUrlChange(link.id, e.target.value)}
                    className="pr-10"
                  />
                  {edited.url && (
                    <a 
                      href={edited.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {changed && (
                  <Button 
                    size="sm" 
                    onClick={() => handleSave(link)}
                    disabled={saving === link.id}
                  >
                    {saving === link.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default LinksSolicitudConfig;
