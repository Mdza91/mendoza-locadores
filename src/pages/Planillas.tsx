import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronDown, ChevronRight, FileDown, Trash2, Edit, RefreshCw, FileText, Users, DollarSign, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DescargaExpediente } from "@/components/expediente/DescargaExpediente";
import { formatearMeses, calcularSueldoProrrateado } from "@/lib/dateUtils";
import * as XLSX from "xlsx";

const Planillas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openNueva, setOpenNueva] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [planillaEditando, setPlanillaEditando] = useState<any>(null);
  const [expandedPlanillas, setExpandedPlanillas] = useState<Record<string, boolean>>({});
  const [nuevaPlanilla, setNuevaPlanilla] = useState({
    mes: "Enero",
    año: new Date().getFullYear(),
    numero_entregables: 1,
  });
  const [selectedLocadores, setSelectedLocadores] = useState<Record<string, boolean>>({});

  const { data: planillas } = useQuery({
    queryKey: ["planillas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planillas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: locadoresActivos } = useQuery({
    queryKey: ["locadores-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locadores")
        .select(`
          *,
          unidades(nombre),
          denominaciones(nombre, requiere_habilidad)
        `)
        .eq("activo", true)
        .order("apellidos");
      if (error) throw error;
      return data;
    },
    enabled: openNueva || openEditar,
  });

  const { data: planillaLocadores } = useQuery({
    queryKey: ["planilla-locadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planilla_locadores").select(`*`);
      if (error) throw error;
      return data;
    },
  });

  const crearPlanillaMutation = useMutation({
    mutationFn: async () => {
      const locadoresSeleccionados = Object.entries(selectedLocadores)
        .filter(([_, selected]) => selected)
        .map(([id]) => id);

      if (locadoresSeleccionados.length === 0) throw new Error("Seleccione al menos un locador");

      const locadoresData = locadoresActivos?.filter((l) => locadoresSeleccionados.includes(l.id));
      
      const costoTotal = locadoresData?.reduce((sum, l) => {
        const sueldoProrrateado = calcularSueldoProrrateado(
          Number(l.remuneracion), nuevaPlanilla.mes, nuevaPlanilla.año,
          l.inicio_actividades, l.fin_actividades, l.tiene_fin_actividades
        );
        return sum + sueldoProrrateado;
      }, 0) || 0;

      const nombrePlanilla = `${nuevaPlanilla.mes} ${nuevaPlanilla.año}`;

      const { data: planilla, error: planillaError } = await supabase
        .from("planillas")
        .insert({
          nombre: nombrePlanilla,
          numero_entregables: nuevaPlanilla.numero_entregables,
          meses_correspondientes: [nuevaPlanilla.mes],
          total_locadores: locadoresSeleccionados.length,
          costo_total: costoTotal,
        })
        .select()
        .single();

      if (planillaError) throw planillaError;

      const planillaLocadoresInsert = locadoresSeleccionados.map((locadorId) => {
        const locador = locadoresData?.find(l => l.id === locadorId);
        if (!locador) return null;
        return {
          planilla_id: planilla.id, locador_id: locadorId,
          nombres_snapshot: locador.nombres, apellidos_snapshot: locador.apellidos,
          ruc_snapshot: locador.ruc, remuneracion_snapshot: Number(locador.remuneracion),
          unidad_nombre_snapshot: locador.unidades?.nombre || 'Sin unidad',
          denominacion_nombre_snapshot: locador.denominaciones?.nombre || 'Sin denominación',
          inicio_actividades_snapshot: locador.inicio_actividades,
          fin_actividades_snapshot: locador.fin_actividades,
          tiene_fin_actividades_snapshot: locador.tiene_fin_actividades,
        };
      }).filter(Boolean);

      const { error: locadoresError } = await supabase.from("planilla_locadores").insert(planillaLocadoresInsert);
      if (locadoresError) throw locadoresError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planillas"] });
      queryClient.invalidateQueries({ queryKey: ["planilla-locadores"] });
      toast.success("Planilla creada exitosamente");
      setOpenNueva(false);
      setNuevaPlanilla({ mes: "Enero", año: new Date().getFullYear(), numero_entregables: 1 });
      setSelectedLocadores({});
    },
    onError: (error: any) => toast.error(error.message || "Error al crear planilla"),
  });

  const editarPlanillaMutation = useMutation({
    mutationFn: async () => {
      if (!planillaEditando) return;
      const locadoresSeleccionados = Object.entries(selectedLocadores).filter(([_, selected]) => selected).map(([id]) => id);
      if (locadoresSeleccionados.length === 0) throw new Error("Seleccione al menos un locador");

      const locadoresData = locadoresActivos?.filter((l) => locadoresSeleccionados.includes(l.id));
      const costoTotal = locadoresData?.reduce((sum, l) => {
        return sum + calcularSueldoProrrateado(Number(l.remuneracion), planillaEditando.mes, planillaEditando.año, l.inicio_actividades, l.fin_actividades, l.tiene_fin_actividades);
      }, 0) || 0;

      const nombrePlanilla = `${planillaEditando.mes} ${planillaEditando.año}`;
      const { error: planillaError } = await supabase.from("planillas").update({
        nombre: nombrePlanilla, numero_entregables: planillaEditando.numero_entregables,
        meses_correspondientes: [planillaEditando.mes], total_locadores: locadoresSeleccionados.length, costo_total: costoTotal,
      }).eq("id", planillaEditando.id);
      if (planillaError) throw planillaError;

      const { error: deleteError } = await supabase.from("planilla_locadores").delete().eq("planilla_id", planillaEditando.id);
      if (deleteError) throw deleteError;

      const planillaLocadoresInsert = locadoresSeleccionados.map((locadorId) => {
        const locador = locadoresData?.find(l => l.id === locadorId);
        if (!locador) return null;
        return {
          planilla_id: planillaEditando.id, locador_id: locadorId,
          nombres_snapshot: locador.nombres, apellidos_snapshot: locador.apellidos,
          ruc_snapshot: locador.ruc, remuneracion_snapshot: Number(locador.remuneracion),
          unidad_nombre_snapshot: locador.unidades?.nombre || 'Sin unidad',
          denominacion_nombre_snapshot: locador.denominaciones?.nombre || 'Sin denominación',
          inicio_actividades_snapshot: locador.inicio_actividades,
          fin_actividades_snapshot: locador.fin_actividades,
          tiene_fin_actividades_snapshot: locador.tiene_fin_actividades,
        };
      }).filter(Boolean);

      const { error: locadoresError } = await supabase.from("planilla_locadores").insert(planillaLocadoresInsert);
      if (locadoresError) throw locadoresError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planillas"] });
      queryClient.invalidateQueries({ queryKey: ["planilla-locadores"] });
      toast.success("Planilla actualizada exitosamente");
      setOpenEditar(false);
      setPlanillaEditando(null);
      setSelectedLocadores({});
    },
    onError: (error: any) => toast.error(error.message || "Error al actualizar planilla"),
  });

  const eliminarPlanillaMutation = useMutation({
    mutationFn: async (planillaId: string) => {
      const { error } = await supabase.from("planillas").delete().eq("id", planillaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planilla eliminada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["planillas"] });
      queryClient.invalidateQueries({ queryKey: ["planilla-locadores"] });
    },
    onError: (error: any) => toast.error("Error al eliminar planilla: " + error.message),
  });

  const actualizarPlanillaMutation = useMutation({
    mutationFn: async (planillaId: string) => {
      const { data: planilla, error: planillaError } = await supabase.from("planillas").select("nombre, meses_correspondientes").eq("id", planillaId).single();
      if (planillaError) throw planillaError;

      const nombreParts = planilla.nombre.split(" ");
      const mes = nombreParts[0] || "Enero";
      const año = parseInt(nombreParts[1]) || new Date().getFullYear();

      const { data: relaciones, error: relacionesError } = await supabase.from("planilla_locadores").select("locador_id").eq("planilla_id", planillaId);
      if (relacionesError) throw relacionesError;

      const locadorIds = relaciones?.map((r) => r.locador_id) || [];
      if (locadorIds.length === 0) throw new Error("No hay locadores asociados a esta planilla");

      const { data: locadoresActualizados, error: locadoresError } = await supabase.from("locadores").select(`*, unidades(nombre), denominaciones(nombre)`).in("id", locadorIds);
      if (locadoresError) throw locadoresError;

      const costoTotal = locadoresActualizados?.reduce((sum, l) => {
        return sum + calcularSueldoProrrateado(Number(l.remuneracion), mes, año, l.inicio_actividades, l.fin_actividades, l.tiene_fin_actividades);
      }, 0) || 0;

      const { error: updateError } = await supabase.from("planillas").update({ total_locadores: locadorIds.length, costo_total: costoTotal }).eq("id", planillaId);
      if (updateError) throw updateError;

      for (const locador of locadoresActualizados || []) {
        const { error: snapshotError } = await supabase.from("planilla_locadores").update({
          nombres_snapshot: locador.nombres, apellidos_snapshot: locador.apellidos,
          ruc_snapshot: locador.ruc, remuneracion_snapshot: Number(locador.remuneracion),
          unidad_nombre_snapshot: locador.unidades?.nombre || 'Sin unidad',
          denominacion_nombre_snapshot: locador.denominaciones?.nombre || 'Sin denominación',
          inicio_actividades_snapshot: locador.inicio_actividades,
          fin_actividades_snapshot: locador.fin_actividades,
          tiene_fin_actividades_snapshot: locador.tiene_fin_actividades,
        }).eq("planilla_id", planillaId).eq("locador_id", locador.id);
        if (snapshotError) throw snapshotError;
      }
    },
    onSuccess: () => {
      toast.success("Planilla actualizada con información de locadores");
      queryClient.invalidateQueries({ queryKey: ["planillas"] });
      queryClient.invalidateQueries({ queryKey: ["planilla-locadores"] });
    },
    onError: (error: any) => toast.error(error.message || "Error al actualizar planilla"),
  });

  const handleTogglePlanilla = (planillaId: string) => {
    setExpandedPlanillas((prev) => ({ ...prev, [planillaId]: !prev[planillaId] }));
  };

  const handleToggleLocador = (locadorId: string) => {
    setSelectedLocadores((prev) => ({ ...prev, [locadorId]: !prev[locadorId] }));
  };

  const handleSelectAll = () => {
    const allSelected: Record<string, boolean> = {};
    locadoresActivos?.forEach((locador) => { allSelected[locador.id] = true; });
    setSelectedLocadores(allSelected);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
  };

  const getLocadoresPorPlanilla = (planillaId: string) => {
    return (
      planillaLocadores
        ?.filter((pl) => pl.planilla_id === planillaId)
        .map((pl) => ({
          id: pl.locador_id, nombres: pl.nombres_snapshot, apellidos: pl.apellidos_snapshot,
          ruc: pl.ruc_snapshot, remuneracion: pl.remuneracion_snapshot,
          unidad_nombre: pl.unidad_nombre_snapshot, denominacion_nombre: pl.denominacion_nombre_snapshot,
          inicio_actividades: pl.inicio_actividades_snapshot, fin_actividades: pl.fin_actividades_snapshot,
          tiene_fin_actividades: pl.tiene_fin_actividades_snapshot,
        }))
        .sort((a: any, b: any) => (a?.apellidos || "").localeCompare(b?.apellidos || "")) || []
    );
  };

  const handleEditarPlanilla = (planilla: any) => {
    const nombreParts = planilla.nombre.split(" ");
    const mes = nombreParts[0] || "Enero";
    const año = parseInt(nombreParts[1]) || new Date().getFullYear();
    setPlanillaEditando({ ...planilla, mes, año });
    const locadoresIds = getLocadoresPorPlanilla(planilla.id).reduce((acc: any, loc: any) => { acc[loc.id] = true; return acc; }, {});
    setSelectedLocadores(locadoresIds);
    setOpenEditar(true);
  };

  const descargarPlanillaExcel = (planilla: any) => {
    const locadores = getLocadoresPorPlanilla(planilla.id);
    const datos = locadores.map((locador: any, index: number) => ({
      "N°": index + 1,
      "Apellidos y Nombres": `${locador.apellidos}, ${locador.nombres}`,
      "RUC": locador.ruc,
      "Unidad": locador.unidad_nombre || "Sin unidad",
      "Denominación de Servicio": locador.denominacion_nombre || "Sin denominación",
      "S/ por entregable": `S/ ${Number(locador.remuneracion).toFixed(2)}`,
    }));

    const total = locadores.reduce((sum: number, loc: any) => sum + Number(loc.remuneracion), 0);
    datos.push({ "N°": "", "Apellidos y Nombres": "", "RUC": "", "Unidad": "", "Denominación de Servicio": "TOTAL", "S/ por entregable": `S/ ${total.toFixed(2)}` } as any);

    const wb = XLSX.utils.book_new();
    const ws: any = {};
    const mesesFormatted = formatearMeses(planilla.meses_correspondientes);
    const titulo = `Planilla de ${mesesFormatted} de la Oficina de Seguros y Convenios`;
    XLSX.utils.sheet_add_aoa(ws, [[titulo]], { origin: "A1" });
    XLSX.utils.sheet_add_json(ws, datos, { origin: "A3" });
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 18 }];
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    XLSX.utils.book_append_sheet(wb, ws, "Planilla");
    XLSX.writeFile(wb, `${planilla.nombre}.xlsx`);
    toast.success("Planilla descargada exitosamente");
  };

  const totalSeleccionados = Object.values(selectedLocadores).filter(Boolean).length;
  const costoTotalSeleccionados = locadoresActivos?.filter((l) => selectedLocadores[l.id]).reduce((sum, l) => sum + Number(l.remuneracion), 0) || 0;

  const locadoresPorUnidad = locadoresActivos?.reduce((acc, locador) => {
    const unidad = locador.unidades?.nombre || "Sin Unidad";
    if (!acc[unidad]) acc[unidad] = [];
    acc[unidad].push(locador);
    return acc;
  }, {} as Record<string, any[]>) || {};

  // Shared dialog form for creating/editing planilla
  const renderPlanillaForm = (isEdit: boolean) => {
    const data = isEdit ? planillaEditando : nuevaPlanilla;
    const setData = isEdit
      ? (updates: any) => setPlanillaEditando({ ...planillaEditando, ...updates })
      : (updates: any) => setNuevaPlanilla({ ...nuevaPlanilla, ...updates });

    return (
      <div className="space-y-6">
        {/* Form fields */}
        <div className="rounded-2xl border border-border/40 overflow-hidden">
          <div className="bg-muted/30 px-5 py-3 border-b border-border/30">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Datos de la Planilla
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mes</Label>
                <Select value={data?.mes || "Enero"} onValueChange={(v) => setData({ mes: v })}>
                  <SelectTrigger className="rounded-xl bg-muted/40 border-border/50">
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((mes) => (
                      <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Año</Label>
                <Input type="number" min="2000" max="2100" value={data?.año || new Date().getFullYear()}
                  onChange={(e) => setData({ año: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="rounded-xl bg-muted/40 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">N° Entregables</Label>
                <Input type="number" min="1" value={data?.numero_entregables || 1}
                  onChange={(e) => setData({ numero_entregables: parseInt(e.target.value) || 1 })}
                  className="rounded-xl bg-muted/40 border-border/50"
                />
              </div>
            </div>
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-sm text-muted-foreground">
                Nombre: <span className="font-semibold text-foreground">{data?.mes || "Enero"} {data?.año || new Date().getFullYear()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Locadores selection */}
        <div className="rounded-2xl border border-border/40 overflow-hidden">
          <div className="bg-muted/30 px-5 py-3 border-b border-border/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Locadores Activos
            </h3>
            <Button variant="outline" size="sm" onClick={handleSelectAll} className="rounded-xl text-xs h-8">
              Seleccionar Todos
            </Button>
          </div>
          <div className="p-5 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Seleccionados", value: totalSeleccionados, icon: Users },
                { label: "Costo Total", value: formatCurrency(costoTotalSeleccionados), icon: DollarSign },
                { label: "Disponibles", value: locadoresActivos?.length || 0, icon: FileText },
              ].map((stat) => (
                <div key={stat.label} className="p-3 bg-muted/30 rounded-xl border border-border/30 text-center">
                  <stat.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Locadores by unit */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-thin pr-1">
              {Object.entries(locadoresPorUnidad).map(([unidad, locadores]) => (
                <div key={unidad} className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{unidad}</h4>
                  <div className="space-y-1.5">
                    {locadores.map((locador: any) => (
                      <div key={locador.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 transition-all duration-200 group">
                        <div className="flex items-center gap-3 flex-1">
                          <Switch checked={selectedLocadores[locador.id] || false} onCheckedChange={() => handleToggleLocador(locador.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium uppercase text-sm truncate">{locador.apellidos}, {locador.nombres}</p>
                            <p className="text-xs text-muted-foreground truncate">{locador.denominaciones?.nombre || "Sin denominación"}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="rounded-lg text-xs shrink-0">{formatCurrency(Number(locador.remuneracion))}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planillas</h1>
            <p className="text-muted-foreground">Gestión de planillas de locadores</p>
          </div>
        </div>

        {/* Nueva Planilla Dialog */}
        <Dialog open={openNueva} onOpenChange={setOpenNueva}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <Plus className="h-4 w-4" />
              Nueva Planilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                Crear Nueva Planilla
              </DialogTitle>
            </DialogHeader>
            {renderPlanillaForm(false)}
            <Button onClick={() => crearPlanillaMutation.mutate()} disabled={crearPlanillaMutation.isPending}
              className="w-full rounded-xl shadow-sm hover:shadow-md transition-all duration-200 h-11">
              {crearPlanillaMutation.isPending ? "Creando..." : "Crear Planilla"}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Editar Planilla Dialog */}
        <Dialog open={openEditar} onOpenChange={setOpenEditar}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Edit className="h-4 w-4 text-primary" />
                </div>
                Editar Planilla
              </DialogTitle>
            </DialogHeader>
            {renderPlanillaForm(true)}
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => { setOpenEditar(false); setPlanillaEditando(null); setSelectedLocadores({}); }}>
                Cancelar
              </Button>
              <Button onClick={() => editarPlanillaMutation.mutate()} disabled={editarPlanillaMutation.isPending}
                className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                {editarPlanillaMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Planillas list */}
      <div className="space-y-4">
        {planillas && planillas.length > 0 ? (
          planillas.map((planilla) => {
            const locadores = getLocadoresPorPlanilla(planilla.id);
            const isExpanded = expandedPlanillas[planilla.id];

            return (
              <Card key={planilla.id} className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleTogglePlanilla(planilla.id)} className="flex items-center gap-3 flex-1 text-left group/toggle">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-colors duration-200 group-hover/toggle:bg-primary/20">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{planilla.nombre}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="rounded-lg text-xs">
                            <Users className="h-3 w-3 mr-1" />{planilla.total_locadores} locadores
                          </Badge>
                          <Badge variant="outline" className="rounded-lg text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />{formatCurrency(Number(planilla.costo_total))}
                          </Badge>
                          <Badge variant="outline" className="rounded-lg text-xs">
                            {planilla.numero_entregables} entregable(s)
                          </Badge>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                      <Button variant="outline" size="sm" className="rounded-xl text-xs h-9 gap-1.5" onClick={() => descargarPlanillaExcel(planilla)}>
                        <FileDown className="h-3.5 w-3.5" /> Excel
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                        onClick={() => actualizarPlanillaMutation.mutate(planilla.id)} disabled={actualizarPlanillaMutation.isPending} title="Actualizar">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                        onClick={() => handleEditarPlanilla(planilla)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                        onClick={() => { if (confirm("¿Está seguro de eliminar esta planilla?")) eliminarPlanillaMutation.mutate(planilla.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 animate-fade-in">
                    <div className="space-y-2 border-t border-border/30 pt-4">
                      {locadores.map((locador: any) => {
                        const nombreParts = planilla.nombre.split(" ");
                        const mes = nombreParts[0] || "Enero";
                        const año = parseInt(nombreParts[1]) || new Date().getFullYear();
                        const sueldoBase = Number(locador.remuneracion);
                        const sueldoProrrateado = calcularSueldoProrrateado(sueldoBase, mes, año, locador.inicio_actividades, locador.fin_actividades, locador.tiene_fin_actividades);
                        const tieneAjuste = Math.abs(sueldoProrrateado - sueldoBase) > 0.01;

                        return (
                          <div key={locador.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 transition-all duration-200 group/loc">
                            <div className="flex-1 min-w-0">
                              <button onClick={() => navigate(`/locadores/${locador.id}`)} className="text-left hover:text-primary transition-colors duration-200">
                                <p className={`font-semibold uppercase text-sm ${tieneAjuste ? 'text-destructive' : ''}`}>
                                  {locador.apellidos}, {locador.nombres}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {locador.unidad_nombre || "Sin unidad"} • {formatCurrency(sueldoBase)}
                                </p>
                                {tieneAjuste && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Ajustado por días laborados • {formatCurrency(sueldoProrrateado)}
                                  </p>
                                )}
                              </button>
                            </div>
                            <div className="opacity-50 group-hover/loc:opacity-100 transition-opacity duration-200">
                              <DescargaExpediente locadorId={locador.id} locadorNombre={locador.nombres} locadorApellidos={locador.apellidos} requiereHabilidad={false} requiereConstancia={false} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-border/50">
            <CardContent className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">No hay planillas creadas</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Crea tu primera planilla para comenzar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Planillas;
