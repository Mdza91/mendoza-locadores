import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DOCUMENTOS_PRIMERA_ETAPA, DOCUMENTOS_SEGUNDA_ETAPA } from "@/lib/documentTypes";

// Combinar ambos tipos de documentos
const TODOS_DOCUMENTOS = {
  ...DOCUMENTOS_PRIMERA_ETAPA,
  ...DOCUMENTOS_SEGUNDA_ETAPA,
} as const;

type DocumentoTipo = keyof typeof TODOS_DOCUMENTOS;

export function EliminacionDocumentaria() {
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<DocumentoTipo[]>([]);
  const [locadoresSeleccionados, setLocadoresSeleccionados] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: locadores, isLoading } = useQuery({
    queryKey: ["locadores-activos-eliminacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locadores")
        .select("id, nombres, apellidos")
        .eq("activo", true)
        .order("apellidos");

      if (error) throw error;
      return data;
    },
  });

  const handleDocumentoToggle = (tipo: DocumentoTipo) => {
    setDocumentosSeleccionados((prev) =>
      prev.includes(tipo)
        ? prev.filter((t) => t !== tipo)
        : [...prev, tipo]
    );
  };

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
    if (documentosSeleccionados.length === 0) {
      toast.error("Debes seleccionar al menos un tipo de documento");
      return;
    }

    if (locadoresSeleccionados.length === 0) {
      toast.error("Debes seleccionar al menos un locador");
      return;
    }

    setIsDeleting(true);

    try {
      // Separar documentos por tipo
      const docsOriginal = documentosSeleccionados.filter(
        (doc) => doc in DOCUMENTOS_PRIMERA_ETAPA
      );
      const docsPago = documentosSeleccionados.filter(
        (doc) => doc in DOCUMENTOS_SEGUNDA_ETAPA
      );

      // Eliminar documentos de primera etapa
      if (docsOriginal.length > 0) {
        const { error: errorOriginal } = await supabase
          .from("documentos")
          .delete()
          .in("tipo_original", docsOriginal as any)
          .in("locador_id", locadoresSeleccionados);

        if (errorOriginal) throw errorOriginal;
      }

      // Eliminar documentos de segunda etapa
      if (docsPago.length > 0) {
        const { error: errorPago } = await supabase
          .from("documentos")
          .delete()
          .in("tipo_pago", docsPago as any)
          .in("locador_id", locadoresSeleccionados);

        if (errorPago) throw errorPago;
      }

      toast.success(
        `Documentos eliminados exitosamente de ${locadoresSeleccionados.length} locador(es)`
      );

      // Limpiar selecciones
      setDocumentosSeleccionados([]);
      setLocadoresSeleccionados([]);

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      queryClient.invalidateQueries({ queryKey: ["locador"] });
    } catch (error) {
      console.error("Error al eliminar documentos:", error);
      toast.error("Error al eliminar documentos");
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
    <Card>
      <CardHeader>
        <CardTitle>Eliminación Documentaria</CardTitle>
        <CardDescription>
          Elimina documentos específicos de múltiples locadores simultáneamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selección de tipos de documento */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Tipos de Documento a Eliminar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(TODOS_DOCUMENTOS).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`doc-${key}`}
                  checked={documentosSeleccionados.includes(key as DocumentoTipo)}
                  onCheckedChange={() => handleDocumentoToggle(key as DocumentoTipo)}
                />
                <label
                  htmlFor={`doc-${key}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Selección de locadores */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Locadores</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="select-all"
                checked={locadoresSeleccionados.length === (locadores?.length || 0) && (locadores?.length || 0) > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Seleccionar Todos
              </label>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-4">
            {locadores?.map((locador) => (
              <div
                key={locador.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors"
              >
                <span className="text-sm">
                  {locador.apellidos}, {locador.nombres}
                </span>
                <Switch
                  checked={locadoresSeleccionados.includes(locador.id)}
                  onCheckedChange={() => handleLocadorToggle(locador.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Botón de eliminación */}
        <Button
          onClick={handleEliminar}
          disabled={
            documentosSeleccionados.length === 0 ||
            locadoresSeleccionados.length === 0 ||
            isDeleting
          }
          variant="destructive"
          className="w-full"
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Eliminando...
            </>
          ) : (
            `Eliminar Documentos Seleccionados (${documentosSeleccionados.length} tipo(s), ${locadoresSeleccionados.length} locador(es))`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
