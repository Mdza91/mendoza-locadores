import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { estaVencido, formatearFechaCorta } from "@/lib/dateUtils";

interface DocumentoCardProps {
  documento: any;
  titulo: string;
  onDelete: () => void;
  readOnly?: boolean;
  reemplazarButton?: React.ReactNode;
  cambioPendiente?: any;
}

export const DocumentoCard = ({ documento, titulo, onDelete, readOnly = false, reemplazarButton, cambioPendiente }: DocumentoCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage.from("documentos").download(documento.ruta_archivo);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = documento.nombre_archivo;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
      toast.success("Documento descargado");
    } catch (error) { toast.error("Error al descargar documento"); }
  };

  const handleView = async () => {
    try {
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(documento.ruta_archivo, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) { toast.error("Error al abrir documento"); }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error: storageError } = await supabase.storage.from("documentos").remove([documento.ruta_archivo]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("documentos").delete().eq("id", documento.id);
      if (dbError) throw dbError;
      toast.success("Documento eliminado"); onDelete();
    } catch (error) { toast.error("Error al eliminar documento"); }
    finally { setIsDeleting(false); setShowDeleteDialog(false); }
  };

  const vencido = documento.fecha_vencimiento && estaVencido(documento.fecha_vencimiento);

  return (
    <>
      <Card className="rounded-xl border border-border/50 hover:shadow-md hover:border-border transition-all duration-300 group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-medium text-foreground">{titulo}</h4>
                {cambioPendiente && (
                  <Badge variant="outline" className="bg-orange-500 text-white border-orange-500 animate-pulse shadow-lg rounded-lg text-xs">
                    Cambio Pendiente
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>{formatBytes(documento.peso_bytes)}</span>
                <span className="text-border">•</span>
                <span>{formatearFechaCorta(documento.fecha_subida)}</span>
                {documento.fecha_vencimiento && (
                  <>
                    <span className="text-border">•</span>
                    <Badge variant={vencido ? "destructive" : "default"} className={`rounded-lg text-xs ${!vencido ? "bg-success hover:bg-success/90" : ""}`}>
                      {vencido ? "Vencido" : "Vigente"}
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200" onClick={handleDownload} title="Descargar">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200" onClick={handleView} title="Ver">
                <Eye className="h-4 w-4" />
              </Button>
              {reemplazarButton}
              {!readOnly && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive hover:text-destructive transition-all duration-200" onClick={() => setShowDeleteDialog(true)} title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. El documento será eliminado permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
