import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToR2 } from "@/lib/r2Storage";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ReemplazarDocumentoProps {
  documentoId: string;
  locadorId: string;
  tipoDocumento: string;
  nombreDocumento: string;
}

export const ReemplazarDocumento = ({
  documentoId,
  locadorId,
  tipoDocumento,
  nombreDocumento,
}: ReemplazarDocumentoProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    // Validar fecha de vencimiento si es habilidad vigente
    if (tipoDocumento === "habilidad_vigente" && !fechaVencimiento) {
      toast.error("Por favor ingresa la fecha de vencimiento");
      return;
    }

    setIsUploading(true);
    try {
      // Subir nuevo archivo al storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${locadorId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Crear registro de cambio pendiente
      const { error: insertError } = await supabase
        .from("cambios_pendientes_documentos")
        .insert({
          locador_id: locadorId,
          documento_id: documentoId,
          tipo_documento: tipoDocumento,
          nombre_archivo_nuevo: file.name,
          ruta_archivo_nuevo: filePath,
          peso_bytes_nuevo: file.size,
          fecha_vencimiento_nueva: tipoDocumento === "habilidad_vigente" ? fechaVencimiento : null,
        });

      if (insertError) throw insertError;

      // Invalidar queries para actualizar UI inmediatamente
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-documentos", locadorId] });
      queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });

      toast.success("Cambio enviado. Pendiente de aprobación por administrador");
      setIsOpen(false);
      setFile(null);
      setFechaVencimiento("");
    } catch (error) {
      console.error("Error al enviar cambio:", error);
      toast.error("Error al enviar el cambio");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Reemplazar">
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reemplazar Documento</DialogTitle>
          <DialogDescription>
            Sube un nuevo archivo para reemplazar: {nombreDocumento}. El cambio será
            revisado por un administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">Nuevo Archivo (PDF)</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>
          
          {tipoDocumento === "habilidad_vigente" && (
            <div className="space-y-2">
              <Label htmlFor="fechaVencimiento">Fecha de Vencimiento</Label>
              <Input
                id="fechaVencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                disabled={isUploading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setFile(null);
              setFechaVencimiento("");
            }}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? "Enviando..." : "Enviar Cambio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
