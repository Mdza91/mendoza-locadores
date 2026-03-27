import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Edit, Users, Filter, X, Download, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { LocadorFormDialog } from "@/components/locador/LocadorFormDialog";

const Locadores = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocador, setSelectedLocador] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem("locadores_search") || "");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingLocadorId, setEditingLocadorId] = useState<string | undefined>();
  const [filterUnidad, setFilterUnidad] = useState<string>(() => sessionStorage.getItem("locadores_filterUnidad") || "all");
  const [filterDenominacion, setFilterDenominacion] = useState<string>(() => sessionStorage.getItem("locadores_filterDenominacion") || "all");
  const [filterEstado, setFilterEstado] = useState<string>(() => sessionStorage.getItem("locadores_filterEstado") || "all");

  const updateFilter = (key: string, value: string, setter: (v: string) => void) => {
    setter(value);
    sessionStorage.setItem(`locadores_${key}`, value);
  };

  const { data: configOcultamiento } = useQuery({
    queryKey: ["config-ocultamiento-inactivos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_ocultamiento_inactivos").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  const { data: locadores, isLoading } = useQuery({
    queryKey: ["locadores", configOcultamiento?.ocultar_inactivos],
    queryFn: async () => {
      let query = supabase.from("locadores").select(`*, unidades(nombre), denominaciones(nombre)`).order("apellidos", { ascending: true });
      if (configOcultamiento?.ocultar_inactivos) query = query.eq("activo", true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: configOcultamiento !== undefined,
  });

  // Extract unique values for filter options
  const unidadesUnicas = useMemo(() => {
    if (!locadores) return [];
    const unique = [...new Set(locadores.map((l: any) => l.unidades?.nombre).filter(Boolean))];
    return unique.sort();
  }, [locadores]);

  const denominacionesUnicas = useMemo(() => {
    if (!locadores) return [];
    const unique = [...new Set(locadores.map((l: any) => l.denominaciones?.nombre).filter(Boolean))];
    return unique.sort();
  }, [locadores]);

  const activeFiltersCount = [filterUnidad, filterDenominacion, filterEstado].filter(f => f !== "all").length + (searchTerm ? 1 : 0);

  const clearFilters = () => {
    updateFilter("filterUnidad", "all", setFilterUnidad);
    updateFilter("filterDenominacion", "all", setFilterDenominacion);
    updateFilter("filterEstado", "all", setFilterEstado);
    updateFilter("search", "", setSearchTerm);
  };

  const filteredLocadores = locadores?.filter((locador: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      locador.apellidos.toLowerCase().includes(searchLower) ||
      locador.nombres.toLowerCase().includes(searchLower) ||
      locador.numero_documento.includes(searchLower) ||
      locador.ruc.includes(searchLower);
    const matchesUnidad = filterUnidad === "all" || locador.unidades?.nombre === filterUnidad;
    const matchesDenominacion = filterDenominacion === "all" || locador.denominaciones?.nombre === filterDenominacion;
    const matchesEstado = filterEstado === "all" || (filterEstado === "activo" ? locador.activo : !locador.activo);
    return matchesSearch && matchesUnidad && matchesDenominacion && matchesEstado;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);

  const handleDownloadExcel = () => {
    if (!locadores) return;
    const activos = locadores
      .filter((l: any) => l.activo)
      .sort((a: any, b: any) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));

    const rows = activos.map((l: any, i: number) => ({
      "N°": i + 1,
      "Locador": `${l.apellidos}, ${l.nombres}`.toUpperCase(),
      "Correo": l.correo,
      "Celular": l.celular,
      "DNI": l.numero_documento,
      "RUC": l.ruc,
      "Descripción de Item": l.denominaciones?.nombre || "",
      "Monto": Number(l.remuneracion),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Locadores Activos");
    XLSX.writeFile(wb, "Locadores_Activos.xlsx");
  };

  const handleNewLocador = () => {
    setEditingLocadorId(undefined);
    setFormDialogOpen(true);
  };

  const handleEditLocador = (id: string) => {
    setEditingLocadorId(id);
    setFormDialogOpen(true);
  };

  const eliminarLocadorMutation = useMutation({
    mutationFn: async (locadorId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-locador', {
        body: { locador_id: locadorId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Locador eliminado exitosamente");
      setDeleteDialogOpen(false);
      setSelectedLocador(null);
      queryClient.invalidateQueries({ queryKey: ["locadores"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar el locador");
      setDeleteDialogOpen(false);
      setSelectedLocador(null);
    },
  });

  const handleDeleteClick = (locador: any) => {
    setSelectedLocador(locador);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar locador definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a <strong>{selectedLocador?.apellidos}, {selectedLocador?.nombres}</strong> junto con toda su documentación, funciones, registros en planillas y cuenta de acceso. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setSelectedLocador(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarLocadorMutation.mutate(selectedLocador?.id)}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
              disabled={eliminarLocadorMutation.isPending}
            >
              {eliminarLocadorMutation.isPending ? "Eliminando..." : "Eliminar Locador"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Locadores</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Gestión de trabajadores locadores</p>
        </div>
        <Button onClick={handleNewLocador} className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <Plus className="h-4 w-4" />
          Nuevo Locador
        </Button>
      </div>

      <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI, RUC..."
                value={searchTerm}
                onChange={(e) => updateFilter("search", e.target.value, setSearchTerm)}
                className="pl-10 rounded-xl bg-muted/40 border-border/50 focus:bg-background transition-colors duration-200"
              />
            </div>
            {filteredLocadores && (
              <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs">
                {filteredLocadores.length} resultado{filteredLocadores.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Smart Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
            </div>
            <Select value={filterUnidad} onValueChange={(v) => updateFilter("filterUnidad", v, setFilterUnidad)}>
              <SelectTrigger className="w-[180px] h-9 rounded-lg text-sm bg-muted/40 border-border/50">
                <SelectValue placeholder="Unidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las unidades</SelectItem>
                {unidadesUnicas.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDenominacion} onValueChange={(v) => updateFilter("filterDenominacion", v, setFilterDenominacion)}>
              <SelectTrigger className="w-[220px] h-9 rounded-lg text-sm bg-muted/40 border-border/50">
                <SelectValue placeholder="Denominación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las denominaciones</SelectItem>
                {denominacionesUnicas.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={(v) => updateFilter("filterEstado", v, setFilterEstado)}>
              <SelectTrigger className="w-[140px] h-9 rounded-lg text-sm bg-muted/40 border-border/50">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 rounded-lg text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
                Limpiar ({activeFiltersCount})
              </Button>
            )}
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-9 rounded-lg text-xs gap-1.5" disabled={!locadores}>
                <Download className="h-3.5 w-3.5" />
                Descargar Excel
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Cargando locadores...
              </div>
            </div>
          ) : filteredLocadores && filteredLocadores.length > 0 ? (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Nombre</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Información</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Unidad</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Remuneración</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Estado</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocadores.map((locador: any, index: number) => (
                    <TableRow 
                      key={locador.id} 
                      className="group hover:bg-muted/20 transition-colors duration-150"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <button
                          onClick={() => navigate(`/locadores/${locador.id}`)}
                          className="text-left group/link"
                        >
                          <div className="font-semibold uppercase group-hover/link:text-primary transition-colors duration-200">
                            {locador.apellidos}, {locador.nombres}
                          </div>
                          <div className="text-sm text-muted-foreground">{locador.celular}</div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{locador.tipo_documento}: {locador.numero_documento}</div>
                          <div className="text-muted-foreground">RUC: {locador.ruc}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg font-normal">{locador.unidades.nombre}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-primary">{formatCurrency(Number(locador.remuneracion))}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={locador.activo ? "default" : "secondary"} className={`rounded-lg ${locador.activo ? "bg-success hover:bg-success/90" : ""}`}>
                          {locador.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
                            onClick={() => navigate(`/locadores/${locador.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
                            onClick={() => handleEditLocador(locador.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                            onClick={() => handleDeleteClick(locador)}
                            disabled={eliminarLocadorMutation.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron locadores que coincidan con la búsqueda" : "No hay locadores registrados"}
              </p>
            </div>
          )}
        </div>
      </Card>

      <LocadorFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        locadorId={editingLocadorId}
      />
    </div>
    </>
  );
};

export default Locadores;
