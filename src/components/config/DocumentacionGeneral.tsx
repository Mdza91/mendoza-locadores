import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadToR2, deleteFromR2, downloadFromR2, getR2ViewUrl } from "@/lib/r2Storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Upload, Download, Eye, Trash2, ChevronDown, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENTOS_GENERALES, DocumentoTipoGeneral } from "@/lib/documentTypes";
import { formatearFechaCorta } from "@/lib/dateUtils";
import { documentoUploadSchema } from "@/lib/validationSchemas";
import { Badge } from "@/components/ui/badge";

const TIPOS_DOCUMENTOS_GENERALES = Object.entries(DOCUMENTOS_GENERALES);

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// ─── Sub-component: Upload & list for a single denomination group ───
const GrupoDenominacion = ({
  denominacionId,
  denominacionNombre,
  documentos,
  onRefetch,
}: {
  denominacionId: string;
  denominacionNombre: string;
  documentos: any[];
  onRefetch: () => void;
}) => {
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const documentosSubidos = documentos.map((d) => d.tipo);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || !tipoDocumento) {
      toast.error("Seleccione tipo y archivo");
      return;
    }
    setIsUploading(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const nombreDocumento = DOCUMENTOS_GENERALES[tipoDocumento as DocumentoTipoGeneral];
      const nombreSanitizado = nombreDocumento
        .replace(/[–—]/g, "-")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_");
      const nombreArchivo = `${nombreSanitizado}_${denominacionId.slice(0, 8)}_${timestamp}.pdf`;
      const rutaArchivo = `general/por_denominacion/${denominacionId}/${nombreArchivo}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(rutaArchivo, archivo);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("documentos_generales_por_denominacion")
        .insert({
          denominacion_id: denominacionId,
          tipo: tipoDocumento,
          nombre_archivo: nombreArchivo,
          ruta_archivo: rutaArchivo,
          peso_bytes: archivo.size,
          numero_entregables: 1,
          meses_correspondientes: ["Enero"],
        });
      if (dbError) throw dbError;

      toast.success("Documento subido exitosamente");
      setTipoDocumento("");
      setArchivo(null);
      // Reset file input
      const fileInput = document.querySelector(`#file-input-${denominacionId}`) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      onRefetch();
    } catch (error: any) {
      console.error("Error al subir documento:", error);
      toast.error(`Error: ${error.message || "Error desconocido"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: any) => {
    try {
      await supabase.storage.from("documentos").remove([doc.ruta_archivo]);
      await supabase.from("documentos_generales_por_denominacion").delete().eq("id", doc.id);
      toast.success("Documento eliminado");
      onRefetch();
    } catch {
      toast.error("Error al eliminar documento");
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from("documentos").download(doc.ruta_archivo);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombre_archivo;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error("Error al descargar documento");
    }
  };

  const handleView = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.ruta_archivo, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Error al abrir documento");
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-all duration-200">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-left">{denominacionNombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs rounded-lg">
            {documentos.length}/{TIPOS_DOCUMENTOS_GENERALES.length}
          </Badge>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 ml-2 pl-4 border-l-2 border-border/30 space-y-3">
        {/* Upload form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Seleccione documento" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DOCUMENTOS_GENERALES.map(([key, label]) => (
                  <SelectItem key={key} value={key} disabled={documentosSubidos.includes(key)}>
                    {label} {documentosSubidos.includes(key) && "(Ya subido)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Archivo PDF</Label>
            <Input id={`file-input-${denominacionId}`} type="file" accept="application/pdf" onChange={handleFileChange} className="h-9 text-xs" />
          </div>
          <Button type="submit" size="sm" disabled={isUploading} className="h-9">
            <Upload className="h-3.5 w-3.5 mr-1" />
            {isUploading ? "Subiendo..." : "Subir"}
          </Button>
        </form>

        {/* Documents list */}
        {documentos.length > 0 ? (
          <div className="space-y-1.5">
            {documentos.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    {DOCUMENTOS_GENERALES[doc.tipo as keyof typeof DOCUMENTOS_GENERALES] || doc.tipo}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(doc.peso_bytes)}</span>
                    <span>•</span>
                    <span>{formatearFechaCorta(doc.fecha_subida)}</span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleView(doc)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">Sin documentos cargados</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ─── Main Component ───
export const DocumentacionGeneral = () => {
  const queryClient = useQueryClient();
  const [tipoDocumento, setTipoDocumento] = useState<string>("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [clasicaOpen, setClasicaOpen] = useState(true);
  const [actualizadaOpen, setActualizadaOpen] = useState(true);

  // ─── Queries ───
  const { data: documentos, refetch } = useQuery({
    queryKey: ["documentos-generales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentos_generales").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: configGlobal } = useQuery({
    queryKey: ["config-global"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_global").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  const { data: denominaciones } = useQuery({
    queryKey: ["denominaciones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("denominaciones").select("*").order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const { data: docsPorDenominacion, refetch: refetchDocsDenom } = useQuery({
    queryKey: ["documentos-generales-por-denominacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_generales_por_denominacion")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const distribucionActiva = (configGlobal as any)?.distribucion_activa || "clasica";
  const documentosAdministrativosActivo = configGlobal?.documentos_administrativos_activo || false;

  // ─── Mutations ───
  const cambiarDistribucionMutation = useMutation({
    mutationFn: async (tipo: "clasica" | "actualizada") => {
      const { error } = await supabase
        .from("config_global")
        .update({ distribucion_activa: tipo } as any)
        .eq("id", configGlobal?.id);
      if (error) throw error;
    },
    onSuccess: (_, tipo) => {
      queryClient.invalidateQueries({ queryKey: ["config-global"] });
      toast.success(`Distribución ${tipo === "clasica" ? "Clásica" : "Actualizada"} activada`);
    },
    onError: () => toast.error("Error al cambiar distribución"),
  });

  const toggleDocumentosAdministrativosMutation = useMutation({
    mutationFn: async (activo: boolean) => {
      const { error } = await supabase
        .from("config_global")
        .update({ documentos_administrativos_activo: activo })
        .eq("id", configGlobal?.id);
      if (error) throw error;

      if (!activo) {
        const anexosAEliminar = documentos?.filter(
          (d) => d.tipo === "anexo_03" || d.tipo === "anexo_04"
        );
        if (anexosAEliminar && anexosAEliminar.length > 0) {
          const rutasArchivos = anexosAEliminar.map((d) => d.ruta_archivo);
          await supabase.storage.from("documentos").remove(rutasArchivos);
          await supabase
            .from("documentos_generales")
            .delete()
            .in("id", anexosAEliminar.map((d) => d.id));
        }
      }
    },
    onSuccess: (_, activo) => {
      queryClient.invalidateQueries({ queryKey: ["config-global"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-generales"] });
      toast.success(
        activo
          ? "Documentos administrativos activados"
          : "Documentos administrativos desactivados y anexos eliminados"
      );
      refetch();
    },
    onError: () => toast.error("Error al actualizar configuración"),
  });

  // ─── Classic upload handlers ───
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) { toast.error("Debe seleccionar un archivo"); return; }
    if (!tipoDocumento) { toast.error("Debe seleccionar un tipo de documento"); return; }

    try {
      documentoUploadSchema.parse({ tipoDocumento, archivo });
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || "Error de validación");
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const nombreDocumento = DOCUMENTOS_GENERALES[tipoDocumento as DocumentoTipoGeneral];
      const nombreSanitizado = nombreDocumento
        .replace(/[–—]/g, "-")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_");
      const nombreArchivo = `${nombreSanitizado}_${timestamp}.pdf`;
      const rutaArchivo = `general/${nombreArchivo}`;

      const { error: uploadError } = await supabase.storage.from("documentos").upload(rutaArchivo, archivo);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documentos_generales").insert({
        tipo: tipoDocumento as DocumentoTipoGeneral,
        nombre_archivo: nombreArchivo,
        ruta_archivo: rutaArchivo,
        peso_bytes: archivo.size,
        numero_entregables: 1,
        meses_correspondientes: ["Enero"],
      });
      if (dbError) throw dbError;

      toast.success("Documento subido exitosamente");
      setTipoDocumento("");
      setArchivo(null);
      refetch();
    } catch (error: any) {
      toast.error(`Error al subir documento: ${error.message || "Error desconocido"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: any) => {
    try {
      await supabase.storage.from("documentos").remove([doc.ruta_archivo]);
      await supabase.from("documentos_generales").delete().eq("id", doc.id);
      toast.success("Documento eliminado");
      refetch();
    } catch {
      toast.error("Error al eliminar documento");
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from("documentos").download(doc.ruta_archivo);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombre_archivo;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error("Error al descargar documento");
    }
  };

  const handleView = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.ruta_archivo, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Error al abrir documento");
    }
  };

  const documentosSubidos = documentos?.map((d) => d.tipo) || [];

  const documentosDisponibles = Object.entries(DOCUMENTOS_GENERALES).filter(([key]) => {
    if (key === "anexo_03" || key === "anexo_04") {
      return documentosAdministrativosActivo;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* ═══════════ DISTRIBUCIÓN CLÁSICA ═══════════ */}
      <Collapsible open={clasicaOpen} onOpenChange={setClasicaOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Distribución Clásica</CardTitle>
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${clasicaOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2 pt-0">
              <div className="flex items-center space-x-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                <Switch
                  id="activar-clasica"
                  checked={distribucionActiva === "clasica"}
                  onCheckedChange={(checked) => {
                    if (checked) cambiarDistribucionMutation.mutate("clasica");
                  }}
                />
                <Label htmlFor="activar-clasica" className="cursor-pointer font-medium">
                  Activar esta Distribución
                </Label>
                {distribucionActiva === "clasica" && (
                  <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">Activa</Badge>
                )}
              </div>

              {distribucionActiva === "clasica" && (
                <div className="space-y-6 pt-4">
                  {/* Documentos Administrativos Alternativos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documentos Administrativos Alternativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="documentos-administrativos"
                          checked={documentosAdministrativosActivo}
                          onCheckedChange={(checked) =>
                            toggleDocumentosAdministrativosMutation.mutate(checked)
                          }
                        />
                        <Label htmlFor="documentos-administrativos" className="cursor-pointer">
                          Activar Anexo 03 y Anexo 04 generales para todos los locadores
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Cuando está activo, los anexos generales reemplazarán o complementarán los
                        anexos individuales de cada locador en sus expedientes de pago.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Subir Documento General */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Subir Documento General</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo de Documento</Label>
                          <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un documento" />
                            </SelectTrigger>
                            <SelectContent>
                              {documentosDisponibles.map(([key, label]) => {
                                const tipoDoc = key as DocumentoTipoGeneral;
                                return (
                                  <SelectItem key={key} value={key} disabled={documentosSubidos.includes(tipoDoc)}>
                                    {label} {documentosSubidos.includes(tipoDoc) && "(Ya subido)"}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="archivo">Archivo PDF</Label>
                          <Input id="archivo" type="file" accept="application/pdf" onChange={handleFileChange} required />
                        </div>
                        <Button type="submit" disabled={isUploading} className="w-full">
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? "Subiendo..." : "Subir Documento"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Documentos Generales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documentos Generales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {documentos && documentos.length > 0 ? (
                          documentos.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium">
                                  {doc.tipo && DOCUMENTOS_GENERALES[doc.tipo as keyof typeof DOCUMENTOS_GENERALES]}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatBytes(doc.peso_bytes)}</span>
                                  <span>•</span>
                                  <span>{formatearFechaCorta(doc.fecha_subida)}</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => handleDownload(doc)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleView(doc)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDelete(doc)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No hay documentos generales subidos
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══════════ DISTRIBUCIÓN ACTUALIZADA ═══════════ */}
      <Collapsible open={actualizadaOpen} onOpenChange={setActualizadaOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Distribución Actualizada</CardTitle>
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${actualizadaOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center space-x-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                <Switch
                  id="activar-actualizada"
                  checked={distribucionActiva === "actualizada"}
                  onCheckedChange={(checked) => {
                    if (checked) cambiarDistribucionMutation.mutate("actualizada");
                  }}
                />
                <Label htmlFor="activar-actualizada" className="cursor-pointer font-medium">
                  Activar esta Distribución
                </Label>
                {distribucionActiva === "actualizada" && (
                  <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">Activa</Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                En esta distribución, los documentos generales se agrupan por Denominación de Servicio.
                Cada denominación tendrá su propio conjunto de documentos que se utilizarán en las descargas de expedientes
                de los locadores pertenecientes a esa denominación.
              </p>

              {distribucionActiva === "actualizada" && (
                <div className="space-y-3 pt-2">
                  {denominaciones && denominaciones.length > 0 ? (
                    denominaciones.map((denom) => (
                      <GrupoDenominacion
                        key={denom.id}
                        denominacionId={denom.id}
                        denominacionNombre={denom.nombre}
                        documentos={
                          docsPorDenominacion?.filter((d: any) => d.denominacion_id === denom.id) || []
                        }
                        onRefetch={refetchDocsDenom}
                      />
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay denominaciones de servicio configuradas
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
