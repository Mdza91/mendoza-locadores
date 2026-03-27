import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Copy, Pencil, Trash2, GripVertical, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Funcion {
  id: string;
  locador_id: string;
  numero_orden: number;
  descripcion: string;
  created_at: string;
  updated_at: string;
}

interface FuncionesLocadorProps {
  locadorId: string;
}

export const FuncionesLocador = ({ locadorId }: FuncionesLocadorProps) => {
  const queryClient = useQueryClient();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFuncion, setNewFuncion] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [searchLocador, setSearchLocador] = useState("");

  // Fetch functions for current locador
  const { data: funciones, isLoading } = useQuery({
    queryKey: ["locador-funciones", locadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locador_funciones")
        .select("*")
        .eq("locador_id", locadorId)
        .order("numero_orden");

      if (error) throw error;
      return data as Funcion[];
    },
  });

  // Fetch locadores with functions for cloning
  const { data: locadoresConFunciones } = useQuery({
    queryKey: ["locadores-con-funciones"],
    queryFn: async () => {
      // First get all locador_ids that have functions
      const { data: funcionesData, error: funcionesError } = await supabase
        .from("locador_funciones")
        .select("locador_id")
        .neq("locador_id", locadorId);

      if (funcionesError) throw funcionesError;

      const uniqueLocadorIds = [...new Set(funcionesData.map((f) => f.locador_id))];

      if (uniqueLocadorIds.length === 0) return [];

      // Then fetch locador details
      const { data: locadoresData, error: locadoresError } = await supabase
        .from("locadores")
        .select("id, nombres, apellidos, denominaciones(nombre)")
        .in("id", uniqueLocadorIds)
        .order("apellidos");

      if (locadoresError) throw locadoresError;

      return locadoresData;
    },
    enabled: isCloneDialogOpen,
  });

  const handleAddFuncion = async () => {
    if (!newFuncion.trim()) {
      toast.error("Ingresa una descripción para la función");
      return;
    }

    const nextOrder = (funciones?.length || 0) + 1;

    try {
      const { error } = await supabase.from("locador_funciones").insert({
        locador_id: locadorId,
        numero_orden: nextOrder,
        descripcion: newFuncion.trim(),
      });

      if (error) throw error;

      toast.success("Función añadida correctamente");
      setNewFuncion("");
      setIsAddingNew(false);
      queryClient.invalidateQueries({ queryKey: ["locador-funciones", locadorId] });
    } catch (error) {
      console.error("Error adding function:", error);
      toast.error("Error al añadir la función");
    }
  };

  const handleUpdateFuncion = async (id: string) => {
    if (!editingText.trim()) {
      toast.error("La descripción no puede estar vacía");
      return;
    }

    try {
      const { error } = await supabase
        .from("locador_funciones")
        .update({ descripcion: editingText.trim() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Función actualizada");
      setEditingId(null);
      setEditingText("");
      queryClient.invalidateQueries({ queryKey: ["locador-funciones", locadorId] });
    } catch (error) {
      console.error("Error updating function:", error);
      toast.error("Error al actualizar la función");
    }
  };

  const handleDeleteFuncion = async (id: string, orden: number) => {
    try {
      // Delete the function
      const { error: deleteError } = await supabase
        .from("locador_funciones")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Reorder remaining functions
      const remainingFunctions = funciones?.filter((f) => f.id !== id) || [];
      for (let i = 0; i < remainingFunctions.length; i++) {
        if (remainingFunctions[i].numero_orden !== i + 1) {
          await supabase
            .from("locador_funciones")
            .update({ numero_orden: i + 1 })
            .eq("id", remainingFunctions[i].id);
        }
      }

      toast.success("Función eliminada");
      queryClient.invalidateQueries({ queryKey: ["locador-funciones", locadorId] });
    } catch (error) {
      console.error("Error deleting function:", error);
      toast.error("Error al eliminar la función");
    }
  };

  const handleCloneFunciones = async (sourceLocadorId: string) => {
    try {
      // Get functions from source locador
      const { data: sourceFunciones, error: fetchError } = await supabase
        .from("locador_funciones")
        .select("*")
        .eq("locador_id", sourceLocadorId)
        .order("numero_orden");

      if (fetchError) throw fetchError;

      if (!sourceFunciones || sourceFunciones.length === 0) {
        toast.error("El locador seleccionado no tiene funciones");
        return;
      }

      // Delete existing functions for current locador
      const { error: deleteError } = await supabase
        .from("locador_funciones")
        .delete()
        .eq("locador_id", locadorId);

      if (deleteError) throw deleteError;

      // Clone functions
      const newFunciones = sourceFunciones.map((f) => ({
        locador_id: locadorId,
        numero_orden: f.numero_orden,
        descripcion: f.descripcion,
      }));

      const { error: insertError } = await supabase
        .from("locador_funciones")
        .insert(newFunciones);

      if (insertError) throw insertError;

      toast.success(`${sourceFunciones.length} funciones clonadas correctamente`);
      setIsCloneDialogOpen(false);
      setSearchLocador("");
      queryClient.invalidateQueries({ queryKey: ["locador-funciones", locadorId] });
    } catch (error) {
      console.error("Error cloning functions:", error);
      toast.error("Error al clonar las funciones");
    }
  };

  const filteredLocadores = locadoresConFunciones?.filter((loc) => {
    const fullName = `${loc.apellidos} ${loc.nombres}`.toLowerCase();
    return fullName.includes(searchLocador.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Cargando funciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setIsAddingNew(true)}
          className="gap-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          disabled={isAddingNew}
        >
          <Plus className="h-4 w-4" />
          Nueva Función
        </Button>

        <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl hover:bg-muted/60 transition-all duration-200">
              <Copy className="h-4 w-4" />
              Clonar Funciones
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] w-[calc(100vw-2rem)] rounded-2xl border-border/50 shadow-xl overflow-hidden">
            <DialogHeader className="pb-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Copy className="h-4 w-4 text-primary shrink-0" />
                Clonar Funciones
              </DialogTitle>
              <DialogDescription className="text-sm">
                Selecciona un locador para copiar sus funciones.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 overflow-hidden">
              <Input
                placeholder="Buscar locador..."
                value={searchLocador}
                onChange={(e) => setSearchLocador(e.target.value)}
                className="rounded-xl bg-muted/30 border-border/40 focus:bg-background transition-colors duration-200"
              />
              <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
                {filteredLocadores && filteredLocadores.length > 0 ? (
                  filteredLocadores.map((loc) => (
                    <button
                      key={loc.id}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 transition-colors duration-200 text-left overflow-hidden"
                      onClick={() => handleCloneFunciones(loc.id)}
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-tight truncate">
                          {loc.apellidos}, {loc.nombres}
                        </p>
                        <p className="text-xs text-muted-foreground leading-tight truncate">
                          {loc.denominaciones?.nombre}
                        </p>
                      </div>
                    </button>
                  ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Copy className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {searchLocador
                          ? "No se encontraron locadores"
                          : "No hay locadores con funciones"}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add new function input */}
      {isAddingNew && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                {(funciones?.length || 0) + 1}
              </div>
              <Input
                placeholder="Descripción de la función..."
                value={newFuncion}
                onChange={(e) => setNewFuncion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddFuncion()}
                autoFocus
                className="flex-1"
              />
              <Button onClick={handleAddFuncion}>Guardar</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewFuncion("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Functions list */}
      <div className="space-y-2">
        {funciones && funciones.length > 0 ? (
          funciones.map((funcion) => (
            <Card
              key={funcion.id}
              className={cn(
                "transition-all",
                editingId === funcion.id && "border-primary/50 bg-primary/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    {funcion.numero_orden}
                  </div>
                  
                  {editingId === funcion.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleUpdateFuncion(funcion.id)
                        }
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateFuncion(funcion.id)}
                      >
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditingText("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 text-foreground pt-2">
                        {funcion.descripcion}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(funcion.id);
                            setEditingText(funcion.descripcion);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar función?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. La función será eliminada permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteFuncion(funcion.id, funcion.numero_orden)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No hay funciones registradas</p>
                  <p className="text-sm text-muted-foreground">
                    Añade funciones usando el botón "Nueva Función" o clona de otro locador
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
