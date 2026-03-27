import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldCheck, UserCog } from "lucide-react";

export const TimeoutInactividadConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [habilitado, setHabilitado] = useState(true);
  const [minutos, setMinutos] = useState(30);
  const [habilitadoAdmin, setHabilitadoAdmin] = useState(true);
  const [minutosAdmin, setMinutosAdmin] = useState(30);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("config_timeout_inactividad")
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setConfigId(data.id);
        setHabilitado(data.habilitado);
        setMinutos(data.minutos_inactividad);
        setHabilitadoAdmin((data as any).habilitado_admin ?? true);
        setMinutosAdmin((data as any).minutos_inactividad_admin ?? 30);
      }
    } catch (error) {
      console.error("Error al cargar configuración:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!configId) return;
    
    if (minutos < 1 || minutosAdmin < 1) {
      toast.error("El tiempo debe ser al menos 1 minuto");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("config_timeout_inactividad")
        .update({
          habilitado,
          minutos_inactividad: minutos,
          habilitado_admin: habilitadoAdmin,
          minutos_inactividad_admin: minutosAdmin,
        } as any)
        .eq("id", configId);

      if (error) throw error;

      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Locadores */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserCog className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Perfil Locador</CardTitle>
              <CardDescription className="text-sm">
                Cierre automático para sesiones de locadores
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="timeout-locador" className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Habilitar cierre automático</span>
              <span className="text-xs font-normal text-muted-foreground">
                Cierra la sesión del locador tras inactividad
              </span>
            </Label>
            <Switch
              id="timeout-locador"
              checked={habilitado}
              onCheckedChange={setHabilitado}
            />
          </div>

          {habilitado && (
            <div className="space-y-1.5 pl-0">
              <Label htmlFor="timeout-locador-min" className="text-sm">
                Tiempo de inactividad (minutos)
              </Label>
              <Input
                id="timeout-locador-min"
                type="number"
                min="1"
                value={minutos}
                onChange={(e) => setMinutos(parseInt(e.target.value) || 1)}
                className="max-w-[120px] rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Se cerrará después de {minutos} minuto{minutos !== 1 ? "s" : ""} sin actividad
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Administrador */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Perfil Administrador</CardTitle>
              <CardDescription className="text-sm">
                Cierre automático para sesiones de administradores
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="timeout-admin" className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Habilitar cierre automático</span>
              <span className="text-xs font-normal text-muted-foreground">
                Cierra la sesión del administrador tras inactividad
              </span>
            </Label>
            <Switch
              id="timeout-admin"
              checked={habilitadoAdmin}
              onCheckedChange={setHabilitadoAdmin}
            />
          </div>

          {habilitadoAdmin && (
            <div className="space-y-1.5 pl-0">
              <Label htmlFor="timeout-admin-min" className="text-sm">
                Tiempo de inactividad (minutos)
              </Label>
              <Input
                id="timeout-admin-min"
                type="number"
                min="1"
                value={minutosAdmin}
                onChange={(e) => setMinutosAdmin(parseInt(e.target.value) || 1)}
                className="max-w-[120px] rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Se cerrará después de {minutosAdmin} minuto{minutosAdmin !== 1 ? "s" : ""} sin actividad
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar configuración
      </Button>
    </div>
  );
};
