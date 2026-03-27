import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SubidaDocumentoEmergenciaProps {
  locadorId: string;
  documentoKey: string;
  nombreDocumento: string;
}

export const SubidaDocumentoEmergencia = ({
  locadorId,
  documentoKey,
  nombreDocumento,
}: SubidaDocumentoEmergenciaProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Solo se permiten archivos PDF");
        return;
      }
      setArchivo(file);
    }
  };

  const handleSubmit = async () => {
    if (!archivo) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setIsUploading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Sesión inválida al subir documento:", userError);
        toast.error("Tu sesión expiró. Vuelve a iniciar sesión.");
        await supabase.auth.signOut();
        window.location.href = "/locador-auth";
        return;
      }

      // Obtener datos del locador para el nombre del archivo
      const { data: locadorData, error: locadorError } = await supabase
        .from("locadores")
        .select("nombres, apellidos")
        .eq("id", locadorId)
        .single();

      if (locadorError) throw locadorError;

      const sanitizarSegmento = (texto: string) =>
        texto
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "")
          .toLowerCase();

      const nombreSanitizado = sanitizarSegmento(
        `${locadorData.apellidos}_${locadorData.nombres}`
      );
      const timestamp = Date.now();
      // IMPORTANTE: el primer segmento del path debe ser el locadorId para cumplir la política RLS del bucket
      const filePath = `${locadorId}/emergencia/${documentoKey}_${nombreSanitizado}_${timestamp}.pdf`;

      // Subir archivo a storage
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(filePath, archivo, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Verificar si ya existe un documento de emergencia aprobado para este locador y tipo
      const { data: existingDoc } = await supabase
        .from("documentos_emergencia")
        .select("id")
        .eq("locador_id", locadorId)
        .eq("documento_key", documentoKey)
        .maybeSingle();

      const esReemplazo = !!existingDoc;

      // Crear solicitud de cambio pendiente (requiere aprobación)
      const { error: insertError } = await supabase
        .from("cambios_pendientes_emergencia")
        .insert({
          locador_id: locadorId,
          documento_emergencia_id: existingDoc?.id || null,
          documento_key: documentoKey,
          nombre_documento: nombreDocumento,
          nombre_archivo_nuevo: archivo.name,
          ruta_archivo_nuevo: filePath,
          peso_bytes_nuevo: archivo.size,
          es_reemplazo: esReemplazo,
          estado: "pendiente",
        });

      if (insertError) throw insertError;

      toast.success("Documento enviado. Pendiente de aprobación.");
      setIsOpen(false);
      setArchivo(null);
      queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-emergencia"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-emergencia", locadorId] });
    } catch (error: any) {
      console.error("Error al subir documento:", error);
      const msg =
        error?.message ||
        error?.error_description ||
        (typeof error === "string" ? error : null);
      toast.error(
        msg ? `Error al subir el documento: ${msg}` : "Error al subir el documento"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200" title={`Subir ${nombreDocumento}`}>
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir {nombreDocumento}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Archivo PDF</label>
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {archivo && (
              <div className="flex w-full max-w-full items-center gap-2 overflow-hidden text-sm text-muted-foreground min-w-0">
                <span className="block truncate min-w-0 flex-1" title={archivo.name}>{archivo.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setArchivo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            El documento será revisado por un administrador antes de ser aprobado.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!archivo || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Enviar para Aprobación"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
