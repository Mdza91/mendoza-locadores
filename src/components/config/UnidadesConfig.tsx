import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { configNombreSchema } from "@/lib/validationSchemas";

export const UnidadesConfig = () => {
  const queryClient = useQueryClient();
  const [nuevaUnidad, setNuevaUnidad] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [unidadAEliminar, setUnidadAEliminar] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: unidades, isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const crearMutation = useMutation({
    mutationFn: async (nombre: string) => {
      const { error } = await supabase.from("unidades").insert({ nombre });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      toast.success("Unidad creada exitosamente");
      setNuevaUnidad("");
    },
    onError: () => {
      toast.error("Error al crear unidad");
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { error } = await supabase
        .from("unidades")
        .update({ nombre })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      toast.success("Unidad actualizada exitosamente");
      setEditando(null);
    },
    onError: () => {
      toast.error("Error al actualizar unidad");
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      toast.success("Unidad eliminada exitosamente");
      setUnidadAEliminar(null);
    },
    onError: () => {
      toast.error("Error al eliminar unidad. Puede estar en uso.");
    },
  });

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      const validatedData = configNombreSchema.parse({ nombre: nuevaUnidad });
      crearMutation.mutate(validatedData.nombre);
    } catch (error: any) {
      if (error.errors && error.errors.length > 0) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          const field = err.path[0];
          errors[field] = err.message;
        });
        setFieldErrors(errors);
        toast.error(error.errors[0].message);
      } else {
        toast.error("Error de validación");
      }
    }
  };

  const handleEditar = (unidad: any) => {
    setEditando(unidad.id);
    setNombreEditado(unidad.nombre);
  };

  const handleGuardarEdicion = () => {
    if (editando) {
      setFieldErrors({});
      try {
        const validatedData = configNombreSchema.parse({ nombre: nombreEditado });
        actualizarMutation.mutate({ id: editando, nombre: validatedData.nombre });
      } catch (error: any) {
        if (error.errors && error.errors.length > 0) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err: any) => {
            const field = err.path[0];
            errors[field] = err.message;
          });
          setFieldErrors(errors);
          toast.error(error.errors[0].message);
        } else {
          toast.error("Error de validación");
        }
      }
    }
  };

  const handleCancelarEdicion = () => {
    setEditando(null);
    setNombreEditado("");
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Unidades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCrear} className="space-y-2">
            <Input
              placeholder="Nueva unidad"
              value={nuevaUnidad}
              onChange={(e) => {
                setNuevaUnidad(e.target.value);
                setFieldErrors({ ...fieldErrors, nombre: "" });
              }}
              className={fieldErrors.nombre ? "border-destructive" : ""}
            />
            {fieldErrors.nombre && (
              <p className="text-sm text-destructive">{fieldErrors.nombre}</p>
            )}
            <Button type="submit" disabled={crearMutation.isPending} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </form>

          <div className="space-y-2">
            {unidades?.map((unidad) => (
              <div
                key={unidad.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {editando === unidad.id ? (
                  <>
                    <div className="flex-1 mr-2 space-y-1">
                      <Input
                        value={nombreEditado}
                        onChange={(e) => {
                          setNombreEditado(e.target.value);
                          setFieldErrors({ ...fieldErrors, nombre: "" });
                        }}
                        className={fieldErrors.nombre ? "border-destructive" : ""}
                      />
                      {fieldErrors.nombre && (
                        <p className="text-sm text-destructive">{fieldErrors.nombre}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleGuardarEdicion}
                        disabled={actualizarMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelarEdicion}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{unidad.nombre}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditar(unidad)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setUnidadAEliminar(unidad)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!unidadAEliminar}
        onOpenChange={() => setUnidadAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar unidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si hay locadores asignados a esta unidad,
              no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarMutation.mutate(unidadAEliminar.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
