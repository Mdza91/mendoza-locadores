import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Save, User, Building2, CreditCard, CalendarDays } from "lucide-react";
import { locadorSchemaWithRefinement, type LocadorFormData } from "@/lib/validationSchemas";

const NuevoLocador = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    apellidos: "", nombres: "", tipo_documento: "DNI", numero_documento: "", ruc: "",
    celular: "", correo: "", remuneracion: "", banco: "", cci: "", direccion: "",
    unidad_id: "", denominacion_id: "", inicio_actividades: "", activo: true,
    tiene_fin_actividades: false, fin_actividades: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: unidades } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => { const { data, error } = await supabase.from("unidades").select("*"); if (error) throw error; return data; },
  });

  const { data: denominaciones } = useQuery({
    queryKey: ["denominaciones"],
    queryFn: async () => { const { data, error } = await supabase.from("denominaciones").select("*"); if (error) throw error; return data; },
  });

  useEffect(() => { if (isEditing) loadLocador(); }, [id]);

  const loadLocador = async () => {
    const { data, error } = await supabase.from("locadores").select("*").eq("id", id).single();
    if (error) { toast.error("Error al cargar locador"); return; }
    const formatDateForInput = (dateString: string | null) => { if (!dateString) return ""; return dateString.split('T')[0]; };
    setFormData({
      ...data, remuneracion: data.remuneracion.toString(),
      inicio_actividades: formatDateForInput(data.inicio_actividades),
      tiene_fin_actividades: data.tiene_fin_actividades || false,
      fin_actividades: formatDateForInput(data.fin_actividades),
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) { const { error } = await supabase.from("locadores").update(data).eq("id", id); if (error) throw error; }
      else { const { error } = await supabase.from("locadores").insert(data); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["locadores"] }); toast.success(isEditing ? "Locador actualizado exitosamente" : "Locador creado exitosamente"); navigate("/"); },
    onError: (error: any) => {
      if (error.message.includes("duplicate")) toast.error("Ya existe un locador con estos datos");
      else toast.error(error.message ? `Error: ${error.message}` : "Error al guardar locador.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      const validatedData = locadorSchemaWithRefinement.parse(formData);
      saveMutation.mutate({
        ...validatedData, remuneracion: parseFloat(validatedData.remuneracion),
        inicio_actividades: validatedData.inicio_actividades + 'T12:00:00',
        fin_actividades: validatedData.tiene_fin_actividades && validatedData.fin_actividades ? validatedData.fin_actividades + 'T12:00:00' : null,
      });
    } catch (error: any) {
      if (error.errors?.length > 0) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => { errors[err.path[0]] = err.message; });
        setFieldErrors(errors);
        toast.error(error.errors[0].message);
      } else toast.error("Error de validación. Verifique los datos ingresados");
    }
  };

  const renderField = (id: string, label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; maxLength?: number; step?: string; colSpan?: boolean }) => (
    <div className={`space-y-2 ${opts?.colSpan ? 'md:col-span-2' : ''}`}>
      <Label htmlFor={id} className={`text-xs font-medium uppercase tracking-wider ${fieldErrors[id] ? "text-destructive" : "text-muted-foreground"}`}>{label} *</Label>
      <Input
        id={id} type={opts?.type || "text"} step={opts?.step} maxLength={opts?.maxLength}
        value={value} onChange={(e) => { onChange(e.target.value); setFieldErrors({ ...fieldErrors, [id]: "" }); }}
        className={`rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all duration-200 h-11 ${fieldErrors[id] ? "border-destructive ring-1 ring-destructive/20" : ""}`}
        required
      />
      {fieldErrors[id] && <p className="text-xs text-destructive animate-fade-in">{fieldErrors[id]}</p>}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl hover:bg-muted/60 transition-all duration-200 h-11 w-11">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            {isEditing ? <Save className="h-6 w-6 text-primary" /> : <UserPlus className="h-6 w-6 text-primary" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Editar Locador" : "Nuevo Locador"}</h1>
            <p className="text-muted-foreground text-sm">{isEditing ? "Actualice la información del locador" : "Complete el formulario para registrar un nuevo locador"}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="bg-muted/30 px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Datos Personales</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField("apellidos", "Apellidos", formData.apellidos, (v) => setFormData({ ...formData, apellidos: v.toUpperCase() }))}
              {renderField("nombres", "Nombres", formData.nombres, (v) => setFormData({ ...formData, nombres: v.toUpperCase() }))}

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de Documento *</Label>
                <Select value={formData.tipo_documento} onValueChange={(v) => setFormData({ ...formData, tipo_documento: v })}>
                  <SelectTrigger className="rounded-xl bg-muted/30 border-border/40 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="DNI">DNI</SelectItem><SelectItem value="CE">C.E.</SelectItem></SelectContent>
                </Select>
              </div>

              {renderField("numero_documento", `Número de ${formData.tipo_documento}`, formData.numero_documento, (v) => setFormData({ ...formData, numero_documento: v.replace(/\D/g, "") }), { maxLength: formData.tipo_documento === "DNI" ? 8 : 9 })}
              {renderField("ruc", "RUC", formData.ruc, (v) => setFormData({ ...formData, ruc: v.replace(/\D/g, "") }), { maxLength: 11 })}
              {renderField("celular", "Celular", formData.celular, (v) => setFormData({ ...formData, celular: v }))}
              {renderField("correo", "Correo Electrónico", formData.correo, (v) => setFormData({ ...formData, correo: v }), { type: "email" })}
              {renderField("direccion", "Dirección", formData.direccion, (v) => setFormData({ ...formData, direccion: v }), { colSpan: true })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="bg-muted/30 px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Datos Laborales</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={`text-xs font-medium uppercase tracking-wider ${fieldErrors.unidad_id ? "text-destructive" : "text-muted-foreground"}`}>Unidad *</Label>
                <Select value={formData.unidad_id} onValueChange={(v) => { setFormData({ ...formData, unidad_id: v }); setFieldErrors({ ...fieldErrors, unidad_id: "" }); }}>
                  <SelectTrigger className={`rounded-xl bg-muted/30 border-border/40 h-11 ${fieldErrors.unidad_id ? "border-destructive ring-1 ring-destructive/20" : ""}`}>
                    <SelectValue placeholder="Seleccione una unidad" />
                  </SelectTrigger>
                  <SelectContent>{unidades?.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent>
                </Select>
                {fieldErrors.unidad_id && <p className="text-xs text-destructive animate-fade-in">{fieldErrors.unidad_id}</p>}
              </div>

              <div className="space-y-2">
                <Label className={`text-xs font-medium uppercase tracking-wider ${fieldErrors.denominacion_id ? "text-destructive" : "text-muted-foreground"}`}>Denominación *</Label>
                <Select value={formData.denominacion_id} onValueChange={(v) => { setFormData({ ...formData, denominacion_id: v }); setFieldErrors({ ...fieldErrors, denominacion_id: "" }); }}>
                  <SelectTrigger className={`rounded-xl bg-muted/30 border-border/40 h-11 ${fieldErrors.denominacion_id ? "border-destructive ring-1 ring-destructive/20" : ""}`}>
                    <SelectValue placeholder="Seleccione una denominación" />
                  </SelectTrigger>
                  <SelectContent>{denominaciones?.map((d) => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}</SelectContent>
                </Select>
                {fieldErrors.denominacion_id && <p className="text-xs text-destructive animate-fade-in">{fieldErrors.denominacion_id}</p>}
              </div>

              {renderField("remuneracion", "Remuneración (S/)", formData.remuneracion, (v) => setFormData({ ...formData, remuneracion: v }), { type: "number", step: "0.01" })}
              {renderField("inicio_actividades", "Inicio de Actividades", formData.inicio_actividades, (v) => setFormData({ ...formData, inicio_actividades: v }), { type: "date" })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="bg-muted/30 px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Datos Bancarios</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField("banco", "Banco", formData.banco, (v) => setFormData({ ...formData, banco: v }))}
              {renderField("cci", "CCI (20 dígitos)", formData.cci, (v) => setFormData({ ...formData, cci: v.replace(/\D/g, "") }), { maxLength: 20 })}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="bg-muted/30 px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Estado y Fechas</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                  <Switch id="tiene_fin_actividades" checked={formData.tiene_fin_actividades}
                    onCheckedChange={(checked) => setFormData({ ...formData, tiene_fin_actividades: checked, fin_actividades: checked ? formData.fin_actividades : "" })} />
                  <Label htmlFor="tiene_fin_actividades" className="text-sm font-medium cursor-pointer">Tiene Fin de Actividades</Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                  <Switch id="activo" checked={formData.activo} onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })} />
                  <Label htmlFor="activo" className="text-sm font-medium cursor-pointer">Locador Activo</Label>
                </div>
              </div>
              {formData.tiene_fin_actividades && (
                <div className="animate-fade-in">
                  {renderField("fin_actividades", "Fin de Actividades", formData.fin_actividades, (v) => setFormData({ ...formData, fin_actividades: v }), { type: "date" })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/")} className="rounded-xl h-11 px-6">
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}
            className="rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-11 px-6">
            {saveMutation.isPending ? "Guardando..." : isEditing ? "Actualizar Locador" : "Crear Locador"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NuevoLocador;
