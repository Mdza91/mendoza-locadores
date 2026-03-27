import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToR2 } from "@/lib/r2Storage";
import { DOCUMENTOS_PRIMERA_ETAPA, DOCUMENTOS_SEGUNDA_ETAPA } from "@/lib/documentTypes";
import { documentoUploadSchema, documentoUploadConVencimientoSchema } from "@/lib/validationSchemas";

interface SubidaDocumentoProps {
  locadorId: string;
  etapa: "original" | "pago";
  documentosSubidos: string[];
  onSuccess: () => void;
  requiereHabilidad: boolean;
}

export const SubidaDocumento = ({ locadorId, etapa, documentosSubidos, onSuccess, requiereHabilidad }: SubidaDocumentoProps) => {
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: locadorData } = useQuery({
    queryKey: ["locador-constancia", locadorId],
    queryFn: async () => {
      const { data, error } = await supabase.from("locadores").select("requiere_constancia").eq("id", locadorId).single();
      if (error) throw error;
      return data;
    },
  });

  const requiereConstancia = locadorData?.requiere_constancia ?? false;

  const handleConstanciaChange = async (checked: boolean) => {
    try {
      const { error } = await supabase.from("locadores").update({ requiere_constancia: checked }).eq("id", locadorId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["locador-constancia", locadorId] });
      toast.success(checked ? "Constancia activada" : "Constancia desactivada");
    } catch (error) { toast.error("Error al actualizar configuración"); }
  };

  const documentosDisponibles = etapa === "original"
    ? Object.entries(DOCUMENTOS_PRIMERA_ETAPA).filter(([key]) => {
        if (!requiereHabilidad && key === "habilidad_vigente") return false;
        if (!requiereConstancia && key === "constancia_estudios") return false;
        if (!requiereConstancia && key === "constancia_estudios_sin_fedatear") return false;
        return true;
      })
    : Object.entries(DOCUMENTOS_SEGUNDA_ETAPA);

  const requiereVencimiento = tipoDocumento === "habilidad_vigente";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") { toast.error("Solo se permiten archivos PDF"); e.target.value = ""; return; }
      setArchivo(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      const schema = requiereVencimiento ? documentoUploadConVencimientoSchema : documentoUploadSchema;
      schema.parse({ tipoDocumento, archivo, fechaVencimiento });
    } catch (error: any) {
      if (error.errors?.length > 0) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => { errors[err.path[0]] = err.message; });
        setFieldErrors(errors); toast.error(error.errors[0].message);
      } else toast.error("Error de validación");
      return;
    }

    setIsUploading(true);
    try {
      const { data: locador } = await supabase.from("locadores").select("apellidos").eq("id", locadorId).single();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const nombreDocumento = etapa === "original" ? DOCUMENTOS_PRIMERA_ETAPA[tipoDocumento as keyof typeof DOCUMENTOS_PRIMERA_ETAPA] : DOCUMENTOS_SEGUNDA_ETAPA[tipoDocumento as keyof typeof DOCUMENTOS_SEGUNDA_ETAPA];
      const sanitizarNombre = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
      const nombreArchivo = `${sanitizarNombre(nombreDocumento)}_${sanitizarNombre(locador?.apellidos || "")}_${timestamp}.pdf`;
      const rutaArchivo = `${locadorId}/${nombreArchivo}`;

      const { error: uploadError } = await uploadToR2(archivo!, rutaArchivo);
      if (uploadError) throw uploadError;

      const documentoData: any = {
        locador_id: locadorId, nombre_archivo: nombreArchivo, ruta_archivo: rutaArchivo,
        peso_bytes: archivo!.size, fecha_vencimiento: fechaVencimiento || null, etapa,
      };
      if (etapa === "original") documentoData.tipo_original = tipoDocumento;
      else documentoData.tipo_pago = tipoDocumento;

      const { error: dbError } = await supabase.from("documentos").insert(documentoData);
      if (dbError) throw dbError;

      toast.success("Documento subido exitosamente");
      setTipoDocumento(""); setArchivo(null); setFechaVencimiento("");
      const fileInput = document.getElementById("archivo") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      onSuccess();
    } catch (error) { toast.error("Error al subir documento"); }
    finally { setIsUploading(false); }
  };

  return (
    <Card className="rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {etapa === "original" ? "Subir Documento - Primera Etapa" : "Subir Documento - Segunda Etapa"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {etapa === "original" && (
            <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="constancia-switch" className="text-sm font-medium">
                    {requiereConstancia ? "Requiere Constancia de Estudios Fedateada" : "No Requiere Constancia de Estudios Fedateada"}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Activar para habilitar la subida de documentos de constancia</p>
                </div>
                <Switch id="constancia-switch" checked={requiereConstancia} onCheckedChange={handleConstanciaChange} />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label className={fieldErrors.tipoDocumento ? "text-destructive" : ""}>Tipo de Documento</Label>
            <Select value={tipoDocumento} onValueChange={(v) => { setTipoDocumento(v); setFieldErrors({ ...fieldErrors, tipoDocumento: "" }); }}>
              <SelectTrigger className={`rounded-xl bg-background ${fieldErrors.tipoDocumento ? "border-destructive" : "border-border/50"}`}><SelectValue placeholder="Seleccione un documento" /></SelectTrigger>
              <SelectContent>
                {documentosDisponibles.map(([key, label]) => (
                  <SelectItem key={key} value={key} disabled={documentosSubidos.includes(key)}>{label} {documentosSubidos.includes(key) && "(Ya subido)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.tipoDocumento && <p className="text-sm text-destructive">{fieldErrors.tipoDocumento}</p>}
          </div>

          {requiereVencimiento && (
            <div className="space-y-2">
              <Label className={fieldErrors.fechaVencimiento ? "text-destructive" : ""}>Fecha de Vencimiento</Label>
              <Input type="date" value={fechaVencimiento} onChange={(e) => { setFechaVencimiento(e.target.value); setFieldErrors({ ...fieldErrors, fechaVencimiento: "" }); }}
                className={`rounded-xl bg-background ${fieldErrors.fechaVencimiento ? "border-destructive" : "border-border/50"}`} required />
              {fieldErrors.fechaVencimiento && <p className="text-sm text-destructive">{fieldErrors.fechaVencimiento}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label className={fieldErrors.archivo ? "text-destructive" : ""}>Archivo PDF</Label>
            <Input id="archivo" type="file" accept="application/pdf"
              onChange={(e) => { handleFileChange(e); setFieldErrors({ ...fieldErrors, archivo: "" }); }}
              className={`rounded-xl bg-background ${fieldErrors.archivo ? "border-destructive" : "border-border/50"}`} required />
            {fieldErrors.archivo && <p className="text-sm text-destructive">{fieldErrors.archivo}</p>}
          </div>

          <Button type="submit" disabled={isUploading || !archivo || !tipoDocumento} className="w-full rounded-xl shadow-md hover:shadow-lg transition-all duration-300 gap-2">
            <Upload className="h-4 w-4" />
            {isUploading ? "Subiendo..." : "Subir Documento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
