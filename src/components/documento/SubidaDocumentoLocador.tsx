import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToR2 } from "@/lib/r2Storage";
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
import { DOCUMENTOS_PRIMERA_ETAPA } from "@/lib/documentTypes";

interface SubidaDocumentoLocadorProps {
  locadorId: string;
  tipoDocumento: string;
  nombreDocumento: string;
}

export const SubidaDocumentoLocador = ({
  locadorId,
  tipoDocumento,
  nombreDocumento,
}: SubidaDocumentoLocadorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
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
          .replace(/[\u0300-\u036f]/g, "") // remover tildes/diacríticos (ñ -> n)
          .replace(/[^a-zA-Z0-9_-]/g, "_") // solo caracteres seguros para Storage
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "")
          .toLowerCase();

      const nombreSanitizado = sanitizarSegmento(
        `${locadorData.apellidos}_${locadorData.nombres}`
      );
      const timestamp = Date.now();
      const filePath = `pending/${locadorId}/${tipoDocumento}_${nombreSanitizado}_${timestamp}.pdf`;

      // Subir archivo a storage
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(filePath, archivo, { contentType: "application/pdf", upsert: false });

      if (uploadError) throw uploadError;

      // Crear solicitud pendiente de documento (documento_id null porque es nuevo)
      const { error: insertError } = await supabase
        .from("cambios_pendientes_documentos")
        .insert({
          locador_id: locadorId,
          documento_id: null,
          tipo_documento: tipoDocumento,
          nombre_archivo_nuevo: archivo.name,
          ruta_archivo_nuevo: filePath,
          peso_bytes_nuevo: archivo.size,
          estado: "pendiente",
        });

      if (insertError) throw insertError;

      toast.success("Documento enviado para aprobación");
      setIsOpen(false);
      setArchivo(null);
      queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-documentos"] });
    } catch (error: any) {
      console.error("Error al subir documento:", error);
      const msg =
        error?.message ||
        error?.error_description ||
        (typeof error === "string" ? error : null);
      toast.error(msg ? `Error al subir el documento: ${msg}` : "Error al subir el documento");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Subir
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{archivo.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setArchivo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!archivo || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Enviar para aprobación"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            El documento será revisado por un administrador antes de ser aprobado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
