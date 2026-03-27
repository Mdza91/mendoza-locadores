import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { downloadFromR2 } from "@/lib/r2Storage";

interface DocumentoEmergenciaCardProps {
  documento: {
    id: string;
    nombre_archivo: string;
    ruta_archivo: string;
    peso_bytes: number;
    fecha_subida: string;
  };
  nombreDisplay: string;
}

export const DocumentoEmergenciaCard = ({
  documento,
  nombreDisplay,
}: DocumentoEmergenciaCardProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await downloadFromR2(documento.ruta_archivo);
      if (error || !data) throw error || new Error("Download failed");

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = documento.nombre_archivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Documento descargado");
    } catch (error) {
      console.error("Error al descargar:", error);
      toast.error("Error al descargar el documento");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="border border-green-200 bg-green-50/50 rounded-lg p-4 dark:bg-green-950/20 dark:border-green-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/50">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-sm">{nombreDisplay}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-400 dark:border-green-700">
                Subido
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(documento.fecha_subida), "dd/MM/yyyy", { locale: es })}
              </span>
              <span className="text-xs text-muted-foreground">
                • {formatBytes(documento.peso_bytes)}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          disabled={isDownloading}
          className="h-8 w-8"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
