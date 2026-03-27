import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Send,
  CalendarClock,
  Users,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Notificacion {
  id: string;
  nombre: string;
  contenido: string;
  duracion_horas: number;
  fecha_inicio: string;
  dirigida_a: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  nombre: string;
  contenido: string;
  duracion_horas: number;
  programar: boolean;
  fecha_inicio: string;
  hora_inicio: string;
  dirigida_a: string; // "todos" or comma-separated locador IDs
  selectedLocadorIds: string[];
}

interface LocadorBasic {
  id: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  unidades: { nombre: string } | null;
}

const defaultForm = (nextNumber: number, allLocadorIds: string[]): FormData => ({
  nombre: `Notificación ${String(nextNumber).padStart(3, "0")}`,
  contenido: "",
  duracion_horas: 24,
  programar: false,
  fecha_inicio: format(new Date(), "yyyy-MM-dd"),
  hora_inicio: format(new Date(), "HH:mm"),
  dirigida_a: "todos",
  selectedLocadorIds: allLocadorIds,
});

export const NotificarAdmin = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm(1, []));
  const [searchUsuario, setSearchUsuario] = useState("");

  const { data: notificaciones, isLoading } = useQuery({
    queryKey: ["notificaciones-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificaciones_admin")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notificacion[];
    },
  });

  const { data: locadoresActivos } = useQuery({
    queryKey: ["locadores-activos-notificar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locadores")
        .select("id, nombres, apellidos, activo, unidades(nombre)")
        .eq("activo", true)
        .order("apellidos");
      if (error) throw error;
      return data as LocadorBasic[];
    },
  });

  const allLocadorIds = useMemo(
    () => (locadoresActivos || []).map((l) => l.id),
    [locadoresActivos]
  );

  const filteredLocadores = useMemo(() => {
    if (!locadoresActivos) return [];
    if (!searchUsuario.trim()) return locadoresActivos;
    const q = searchUsuario.toLowerCase();
    return locadoresActivos.filter(
      (l) =>
        l.apellidos.toLowerCase().includes(q) ||
        l.nombres.toLowerCase().includes(q) ||
        l.unidades?.nombre?.toLowerCase().includes(q)
    );
  }, [locadoresActivos, searchUsuario]);

  const getNextNumber = () => {
    if (!notificaciones || notificaciones.length === 0) return 1;
    const numbers = notificaciones
      .map((n) => {
        const match = n.nombre.match(/Notificación (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter((n) => n > 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : notificaciones.length + 1;
  };

  const computeDirigidaA = (selectedIds: string[]): string => {
    if (selectedIds.length === allLocadorIds.length && allLocadorIds.length > 0) {
      return "todos";
    }
    return selectedIds.join(",");
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const fechaInicio = data.programar
        ? new Date(`${data.fecha_inicio}T${data.hora_inicio}:00`).toISOString()
        : new Date().toISOString();

      const user = (await supabase.auth.getUser()).data.user;
      const dirigida = computeDirigidaA(data.selectedLocadorIds);

      const { error } = await supabase.from("notificaciones_admin").insert({
        nombre: data.nombre,
        contenido: data.contenido,
        duracion_horas: data.duracion_horas,
        fecha_inicio: fechaInicio,
        dirigida_a: dirigida,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificaciones-admin"] });
      toast.success("Notificación creada exitosamente");
      setDialogOpen(false);
    },
    onError: () => toast.error("Error al crear la notificación"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const fechaInicio = data.programar
        ? new Date(`${data.fecha_inicio}T${data.hora_inicio}:00`).toISOString()
        : new Date().toISOString();

      const dirigida = computeDirigidaA(data.selectedLocadorIds);

      const { error } = await supabase
        .from("notificaciones_admin")
        .update({
          nombre: data.nombre,
          contenido: data.contenido,
          duracion_horas: data.duracion_horas,
          fecha_inicio: fechaInicio,
          dirigida_a: dirigida,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificaciones-admin"] });
      toast.success("Notificación actualizada");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificaciones_admin")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificaciones-admin"] });
      toast.success("Notificación eliminada");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const toggleActivaMutation = useMutation({
    mutationFn: async ({ id, activa }: { id: string; activa: boolean }) => {
      const { error } = await supabase
        .from("notificaciones_admin")
        .update({ activa })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificaciones-admin"] });
      toast.success("Estado actualizado");
    },
    onError: () => toast.error("Error al cambiar estado"),
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm(getNextNumber(), allLocadorIds));
    setSearchUsuario("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (n: Notificacion) => {
    setEditingId(n.id);
    const fechaInicio = new Date(n.fecha_inicio);
    const selectedIds =
      n.dirigida_a === "todos"
        ? allLocadorIds
        : n.dirigida_a.split(",").filter(Boolean);
    setForm({
      nombre: n.nombre,
      contenido: n.contenido,
      duracion_horas: n.duracion_horas,
      programar: true,
      fecha_inicio: format(fechaInicio, "yyyy-MM-dd"),
      hora_inicio: format(fechaInicio, "HH:mm"),
      dirigida_a: n.dirigida_a,
      selectedLocadorIds: selectedIds,
    });
    setSearchUsuario("");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.contenido.trim()) {
      toast.error("El contenido es obligatorio");
      return;
    }
    if (form.selectedLocadorIds.length === 0) {
      toast.error("Selecciona al menos un destinatario");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleLocador = (id: string) => {
    setForm((prev) => {
      const selected = prev.selectedLocadorIds.includes(id)
        ? prev.selectedLocadorIds.filter((x) => x !== id)
        : [...prev.selectedLocadorIds, id];
      return { ...prev, selectedLocadorIds: selected };
    });
  };

  const toggleAll = () => {
    setForm((prev) => {
      const allSelected = prev.selectedLocadorIds.length === allLocadorIds.length;
      return {
        ...prev,
        selectedLocadorIds: allSelected ? [] : [...allLocadorIds],
      };
    });
  };

  const getEstado = (n: Notificacion) => {
    const ahora = new Date();
    const inicio = new Date(n.fecha_inicio);
    const fin = new Date(inicio.getTime() + n.duracion_horas * 60 * 60 * 1000);

    if (!n.activa) return { label: "Inactiva", variant: "secondary" as const };
    if (ahora < inicio) return { label: "Programada", variant: "outline" as const };
    if (ahora >= inicio && ahora < fin) return { label: "En vigencia", variant: "default" as const };
    return { label: "Expirada", variant: "secondary" as const };
  };

  const getDestinatariosLabel = (dirigida_a: string) => {
    if (dirigida_a === "todos") return "Todos los usuarios";
    const ids = dirigida_a.split(",").filter(Boolean);
    return `${ids.length} usuario${ids.length !== 1 ? "s" : ""}`;
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Notificaciones a Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Crea y gestiona notificaciones para los locadores
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Notificación
        </Button>
      </div>

      {(!notificaciones || notificaciones.length === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay notificaciones creadas. Crea una nueva para enviarla a los usuarios.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {notificaciones?.map((n) => {
          const estado = getEstado(n);
          const inicio = new Date(n.fecha_inicio);
          const fin = new Date(inicio.getTime() + n.duracion_horas * 60 * 60 * 1000);

          return (
            <Card key={n.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{n.nombre}</h3>
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {getDestinatariosLabel(n.dirigida_a)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {n.contenido}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Inicio: {format(inicio, "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Duración: {n.duracion_horas}h
                      </span>
                      <span>
                        Fin: {format(fin, "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={n.activa}
                      onCheckedChange={(checked) =>
                        toggleActivaMutation.mutate({ id: n.id, activa: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(n)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("¿Eliminar esta notificación?")) {
                          deleteMutation.mutate(n.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              {editingId ? "Editar Notificación" : "Nueva Notificación"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea
                value={form.contenido}
                onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                placeholder="Escribe el contenido de la notificación..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Duración (horas)</Label>
              <Input
                type="number"
                min="0.1"
                max="720"
                step="0.1"
                value={form.duracion_horas}
                onChange={(e) =>
                  setForm({ ...form, duracion_horas: parseFloat(e.target.value) || 24 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 0.1 horas (6 minutos). Acepta decimales.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label className="cursor-pointer">Programar fecha y hora de inicio</Label>
              <Switch
                checked={form.programar}
                onCheckedChange={(checked) =>
                  setForm({ ...form, programar: checked })
                }
              />
            </div>

            {form.programar && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Fecha de inicio</Label>
                  <Input
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) =>
                      setForm({ ...form, fecha_inicio: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) =>
                      setForm({ ...form, hora_inicio: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* Destinatarios */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Dirigida a ({form.selectedLocadorIds.length}/{allLocadorIds.length})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={toggleAll}
                >
                  {form.selectedLocadorIds.length === allLocadorIds.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario..."
                  value={searchUsuario}
                  onChange={(e) => setSearchUsuario(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <ScrollArea className="h-40 border rounded-lg">
                <div className="p-2 space-y-0.5">
                  {filteredLocadores.map((l) => (
                    <label
                      key={l.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={form.selectedLocadorIds.includes(l.id)}
                        onCheckedChange={() => toggleLocador(l.id)}
                      />
                      <span className="text-sm flex-1 truncate">
                        {l.apellidos}, {l.nombres}
                      </span>
                      {l.unidades?.nombre && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {l.unidades.nombre}
                        </span>
                      )}
                    </label>
                  ))}
                  {filteredLocadores.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No se encontraron usuarios
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {editingId ? "Actualizar" : "Crear Notificación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
