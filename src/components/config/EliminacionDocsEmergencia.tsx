import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
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

export function EliminacionDocsEmergencia() {
  const [locadoresSeleccionados, setLocadoresSeleccionados] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: locadores, isLoading } = useQuery({
    queryKey: ["locadores-con-docs-emergencia"],
    queryFn: async () => {
      // Get locadores that have emergency documents
      const { data, error } = await supabase
        .from("documentos_emergencia")
        .select("locador_id, locadores!inner(id, nombres, apellidos, activo)");

      if (error) throw error;

      // Get unique locadores with doc count
      const locadorMap = new Map<string, { id: string; nombres: string; apellidos: string; activo: boolean; cantidad: number }>();
      for (const doc of data || []) {
        const loc = doc.locadores as any;
        if (!loc) continue;
        const existing = locadorMap.get(loc.id);
        if (existing) {
          existing.cantidad++;
        } else {
          locadorMap.set(loc.id, {
            id: loc.id,
            nombres: loc.nombres,
            apellidos: loc.apellidos,
            activo: loc.activo,
            cantidad: 1,
          });
        }
      }

      return Array.from(locadorMap.values()).sort((a, b) => a.apellidos.localeCompare(b.apellidos));
    },
  });

  const handleLocadorToggle = (locadorId: string) => {
    setLocadoresSeleccionados((prev) =>
      prev.includes(locadorId)
        ? prev.filter((id) => id !== locadorId)
        : [...prev, locadorId]
    );
  };

  const handleSelectAll = () => {
    if (locadoresSeleccionados.length === (locadores?.length || 0)) {
      setLocadoresSeleccionados([]);
    } else {
      setLocadoresSeleccionados(locadores?.map((l) => l.id) || []);
    }
  };

  const handleEliminar = async () => {
    setShowConfirm(false);
    setIsDeleting(true);

    try {
      // Get emergency docs to delete their files from storage
      const { data: docsToDelete, error: fetchError } = await supabase
        .from("documentos_emergencia")
        .select("id, ruta_archivo")
        .in("locador_id", locadoresSeleccionados);

      if (fetchError) throw fetchError;

      // Delete files from storage
      if (docsToDelete && docsToDelete.length > 0) {
        const rutas = docsToDelete.map((d) => d.ruta_archivo);
        const { error: storageError } = await supabase.storage
          .from("documentos")
          .remove(rutas);

        if (storageError) {
          console.error("Error eliminando archivos del storage:", storageError);
        }
      }

      // Delete records from database
      const { error: deleteError } = await supabase
        .from("documentos_emergencia")
        .delete()
        .in("locador_id", locadoresSeleccionados);

      if (deleteError) throw deleteError;

      toast.success(
        `Documentos de emergencia eliminados de ${locadoresSeleccionados.length} locador(es)`
      );

      setLocadoresSeleccionados([]);
      queryClient.invalidateQueries({ queryKey: ["locadores-con-docs-emergencia"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-emergencia"] });
      queryClient.invalidateQueries({ queryKey: ["locador"] });
    } catch (error) {
      console.error("Error al eliminar documentos de emergencia:", error);
      toast.error("Error al eliminar documentos de emergencia");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Eliminación de Docs. de Emergencia</CardTitle>
          <CardDescription>
            Elimina masivamente los documentos de emergencia aceptados de múltiples locadores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(!locadores || locadores.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay locadores con documentos de emergencia registrados
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Locadores con documentos de emergencia ({locadores.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="select-all-emergency"
                      checked={
                        locadoresSeleccionados.length === locadores.length &&
                        locadores.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      htmlFor="select-all-emergency"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Seleccionar Todos
                    </label>
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-4">
                  {locadores.map((locador) => (
                    <div
                      key={locador.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {locador.apellidos}, {locador.nombres}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({locador.cantidad} doc{locador.cantidad > 1 ? "s" : ""})
                        </span>
                        {!locador.activo && (
                          <span className="text-xs text-destructive font-medium">(Inactivo)</span>
                        )}
                      </div>
                      <Switch
                        checked={locadoresSeleccionados.includes(locador.id)}
                        onCheckedChange={() => handleLocadorToggle(locador.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setShowConfirm(true)}
                disabled={locadoresSeleccionados.length === 0 || isDeleting}
                variant="destructive"
                className="w-full"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  `Eliminar Docs. de Emergencia (${locadoresSeleccionados.length} locador(es))`
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar eliminación masiva
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>todos</strong> los documentos de emergencia de{" "}
              <strong>{locadoresSeleccionados.length}</strong> locador(es). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
