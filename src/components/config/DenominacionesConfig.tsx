import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { denominacionSchema } from "@/lib/validationSchemas";

export const DenominacionesConfig = () => {
  const queryClient = useQueryClient();
  const [nuevaDenominacion, setNuevaDenominacion] = useState("");
  const [requiereHabilidad, setRequiereHabilidad] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [datosEditados, setDatosEditados] = useState({ nombre: "", requiere_habilidad: false });
  const [denominacionAEliminar, setDenominacionAEliminar] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: denominaciones, isLoading } = useQuery({
    queryKey: ["denominaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("denominaciones")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const crearMutation = useMutation({
    mutationFn: async (datos: { nombre: string; requiere_habilidad: boolean }) => {
      const { error } = await supabase.from("denominaciones").insert(datos);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denominaciones"] });
      toast.success("Denominación creada exitosamente");
      setNuevaDenominacion("");
      setRequiereHabilidad(false);
    },
    onError: () => {
      toast.error("Error al crear denominación");
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: async ({
      id,
      nombre,
      requiere_habilidad,
    }: {
      id: string;
      nombre: string;
      requiere_habilidad: boolean;
    }) => {
      const { error } = await supabase
        .from("denominaciones")
        .update({ nombre, requiere_habilidad })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denominaciones"] });
      toast.success("Denominación actualizada exitosamente");
      setEditando(null);
    },
    onError: () => {
      toast.error("Error al actualizar denominación");
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("denominaciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denominaciones"] });
      toast.success("Denominación eliminada exitosamente");
      setDenominacionAEliminar(null);
    },
    onError: () => {
      toast.error("Error al eliminar denominación. Puede estar en uso.");
    },
  });

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      const validatedData = denominacionSchema.parse({
        nombre: nuevaDenominacion,
        requiere_habilidad: requiereHabilidad,
      });
      crearMutation.mutate({
        nombre: validatedData.nombre,
        requiere_habilidad: validatedData.requiere_habilidad,
      });
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

  const handleEditar = (denominacion: any) => {
    setEditando(denominacion.id);
    setDatosEditados({
      nombre: denominacion.nombre,
      requiere_habilidad: denominacion.requiere_habilidad,
    });
  };

  const handleGuardarEdicion = () => {
    if (editando) {
      setFieldErrors({});
      try {
        const validatedData = denominacionSchema.parse({
          nombre: datosEditados.nombre,
          requiere_habilidad: datosEditados.requiere_habilidad,
        });
        actualizarMutation.mutate({
          id: editando,
          nombre: validatedData.nombre,
          requiere_habilidad: validatedData.requiere_habilidad,
        });
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
    setDatosEditados({ nombre: "", requiere_habilidad: false });
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Denominaciones de Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCrear} className="space-y-3">
            <div className="space-y-2">
              <Input
                placeholder="Nueva denominación de servicio"
                value={nuevaDenominacion}
                onChange={(e) => {
                  setNuevaDenominacion(e.target.value);
                  setFieldErrors({ ...fieldErrors, nombre: "" });
                }}
                className={fieldErrors.nombre ? "border-destructive" : ""}
              />
              {fieldErrors.nombre && (
                <p className="text-sm text-destructive">{fieldErrors.nombre}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="requiere-habilidad"
                checked={requiereHabilidad}
                onCheckedChange={setRequiereHabilidad}
              />
              <Label htmlFor="requiere-habilidad">
                Requiere Habilidad Vigente
              </Label>
            </div>
            <Button type="submit" disabled={crearMutation.isPending} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </form>

          <div className="space-y-2">
            {denominaciones?.map((denominacion) => (
              <div
                key={denominacion.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {editando === denominacion.id ? (
                  <>
                    <div className="flex-1 mr-2 space-y-2">
                      <div className="space-y-1">
                        <Input
                          value={datosEditados.nombre}
                          onChange={(e) => {
                            setDatosEditados({ ...datosEditados, nombre: e.target.value });
                            setFieldErrors({ ...fieldErrors, nombre: "" });
                          }}
                          className={fieldErrors.nombre ? "border-destructive" : ""}
                        />
                        {fieldErrors.nombre && (
                          <p className="text-sm text-destructive">{fieldErrors.nombre}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={datosEditados.requiere_habilidad}
                          onCheckedChange={(checked) =>
                            setDatosEditados({
                              ...datosEditados,
                              requiere_habilidad: checked,
                            })
                          }
                        />
                        <Label>Requiere Habilidad Vigente</Label>
                      </div>
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
                    <div className="flex-1">
                      <div className="font-medium">{denominacion.nombre}</div>
                      {denominacion.requiere_habilidad && (
                        <div className="text-xs text-muted-foreground">
                          Requiere Habilidad Vigente
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditar(denominacion)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDenominacionAEliminar(denominacion)}
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
        open={!!denominacionAEliminar}
        onOpenChange={() => setDenominacionAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar denominación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si hay locadores asignados a esta
              denominación, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarMutation.mutate(denominacionAEliminar.id)}
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
