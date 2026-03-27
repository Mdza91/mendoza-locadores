import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadToR2, deleteFromR2, getR2PublicUrl } from "@/lib/r2Storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Upload, Trash2, Loader2, ImageIcon } from "lucide-react";

export function AjustesGeneralesConfig() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nombreApp, setNombreApp] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_app_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      if (!initialized && data) {
        setNombreApp(data.nombre_app);
        setInitialized(true);
      }
      return data;
    },
  });

  const handleSaveName = async () => {
    if (!settings || !nombreApp.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("config_app_settings")
        .update({ nombre_app: nombreApp.trim() })
        .eq("id", settings.id);
      if (error) throw error;
      toast.success("Nombre de la aplicación actualizado");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } catch {
      toast.error("Error al guardar el nombre");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `app-logo/logo.${ext}`;

      // Delete old logo if exists
      if (settings.logo_url) {
        await deleteFromR2([settings.logo_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("config_app_settings")
        .update({ logo_url: path })
        .eq("id", settings.id);
      if (updateError) throw updateError;

      toast.success("Logo actualizado");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } catch {
      toast.error("Error al subir el logo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings?.logo_url) return;
    setSaving(true);
    try {
      await supabase.storage.from("documentos").remove([settings.logo_url]);
      const { error } = await supabase
        .from("config_app_settings")
        .update({ logo_url: null })
        .eq("id", settings.id);
      if (error) throw error;
      toast.success("Logo eliminado");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } catch {
      toast.error("Error al eliminar el logo");
    } finally {
      setSaving(false);
    }
  };

  const logoPublicUrl = settings?.logo_url
    ? supabase.storage.from("documentos").getPublicUrl(settings.logo_url).data.publicUrl
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Nombre de la Aplicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app-name">Nombre que se muestra en el sidebar y encabezado</Label>
            <div className="flex gap-3">
              <Input
                id="app-name"
                value={nombreApp}
                onChange={(e) => setNombreApp(e.target.value)}
                placeholder="Nombre de la app"
                className="max-w-sm"
              />
              <Button
                onClick={handleSaveName}
                disabled={saving || nombreApp === settings?.nombre_app}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-primary" />
            Logo de la Aplicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sube una imagen para usarla como logo. Se recomienda una imagen cuadrada de al menos 64x64px (máx. 2MB).
          </p>

          {/* Logo Preview */}
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
              {logoPublicUrl ? (
                <img
                  src={logoPublicUrl}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {logoPublicUrl ? "Cambiar logo" : "Subir logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadLogo}
                    />
                  </label>
                </Button>
                {logoPublicUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG • Máx. 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
