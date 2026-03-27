import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Download, GripVertical, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, FileCheck, FileWarning, Package } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import {
  DOCUMENTOS_PRIMERA_ETAPA,
  DOCUMENTOS_SEGUNDA_ETAPA,
  DOCUMENTOS_GENERALES,
} from "@/lib/documentTypes";

// Combinar todos los tipos de documentos disponibles
const TODOS_LOS_DOCUMENTOS: Record<string, string> = {
  ...DOCUMENTOS_PRIMERA_ETAPA,
  ...DOCUMENTOS_SEGUNDA_ETAPA,
  ...DOCUMENTOS_GENERALES,
};

// Eliminar duplicados (anexo_03 y anexo_04 aparecen en varios)
const DOCUMENTOS_UNICOS_BASE = Object.entries(TODOS_LOS_DOCUMENTOS).reduce((acc, [key, value]) => {
  if (!acc[key]) {
    acc[key] = value;
  }
  return acc;
}, {} as Record<string, string>);

type CotejoResult = {
  locadorId: string;
  nombres: string;
  apellidos: string;
  documentosPresentes: string[];
  documentosFaltantes: string[];
  isComplete: boolean;
};

const Descargas = () => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [orderedDocs, setOrderedDocs] = useState<string[]>([]);
  const [isOrdered, setIsOrdered] = useState(false);
  const [cotejoResults, setCotejoResults] = useState<CotejoResult[] | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isCotejando, setIsCotejando] = useState(false);

  // Obtener locadores activos
  const { data: locadoresActivos } = useQuery({
    queryKey: ["locadores-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locadores")
        .select("id, nombres, apellidos, denominacion_id")
        .eq("activo", true);
      if (error) throw error;
      return data;
    },
  });

  // Obtener configuración de documentos de emergencia
  const { data: configDocsEmergencia } = useQuery({
    queryKey: ["config-documentos-emergencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_documentos_emergencia")
        .select("*")
        .order("documento_key");
      if (error) throw error;
      return data;
    },
  });

  // Crear lista de documentos incluyendo los de emergencia habilitados
  const DOCUMENTOS_UNICOS = useMemo(() => {
    const docs = { ...DOCUMENTOS_UNICOS_BASE };
    
    // Agregar documentos de emergencia habilitados
    configDocsEmergencia?.filter(doc => doc.habilitado).forEach(doc => {
      docs[doc.documento_key] = doc.nombre_display;
    });
    
    return docs;
  }, [configDocsEmergencia]);

  // Obtener todos los documentos de locadores activos
  const { data: documentosLocadores } = useQuery({
    queryKey: ["documentos-locadores-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("locador_id, tipo_original, tipo_pago, ruta_archivo, nombre_archivo");
      if (error) throw error;
      return data;
    },
    enabled: cotejoResults !== null || isCotejando,
  });

  // Obtener documentos generales
  const { data: documentosGenerales } = useQuery({
    queryKey: ["documentos-generales-descargas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_generales")
        .select("tipo, ruta_archivo, nombre_archivo");
      if (error) throw error;
      return data;
    },
    enabled: cotejoResults !== null || isCotejando,
  });

  // Obtener todos los documentos de emergencia
  const { data: documentosEmergencia } = useQuery({
    queryKey: ["documentos-emergencia-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_emergencia")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: cotejoResults !== null || isCotejando,
  });

  // Config global for distribution type
  const { data: configGlobalDescargas } = useQuery({
    queryKey: ["config-global-descargas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_global")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Denomination-specific docs
  const { data: docsPorDenominacionDescargas } = useQuery({
    queryKey: ["docs-por-denominacion-descargas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_generales_por_denominacion")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: cotejoResults !== null || isCotejando,
  });

  const distribucionActiva = (configGlobalDescargas as any)?.distribucion_activa || "clasica";

  const handleToggleDoc = (docKey: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docKey) ? prev.filter((d) => d !== docKey) : [...prev, docKey]
    );
    // Reset orden si cambia la selección
    setIsOrdered(false);
    setCotejoResults(null);
  };

  const handleOrdenar = () => {
    if (selectedDocs.length === 0) {
      toast.error("Selecciona al menos un documento");
      return;
    }
    setOrderedDocs([...selectedDocs]);
    setIsOrdered(true);
    setCotejoResults(null);
    toast.success("Documentos ordenados correctamente");
  };

  const moveDoc = (index: number, direction: "up" | "down") => {
    const newOrder = [...orderedDocs];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setOrderedDocs(newOrder);
  };

  const handleCotejar = async () => {
    if (!isOrdered || orderedDocs.length === 0) {
      toast.error("Primero ordena los documentos seleccionados");
      return;
    }

    if (!locadoresActivos || locadoresActivos.length === 0) {
      toast.error("No hay locadores activos en el sistema");
      return;
    }

    setIsCotejando(true);

    try {
      // Esperar a que se carguen los documentos si aún no están
      const { data: docs, error: docsError } = await supabase
        .from("documentos")
        .select("locador_id, tipo_original, tipo_pago, ruta_archivo");
      
      if (docsError) throw docsError;

      // Cargar documentos de emergencia
      const { data: docsEmergencia } = await supabase
        .from("documentos_emergencia")
        .select("locador_id, documento_key, ruta_archivo");

      // Load denomination-specific docs if needed
      let denomDocs: any[] = [];
      if (distribucionActiva === "actualizada") {
        const { data: dd } = await supabase
          .from("documentos_generales_por_denominacion")
          .select("denominacion_id, tipo, ruta_archivo");
        denomDocs = dd || [];
      }

      const results: CotejoResult[] = locadoresActivos.map((locador) => {
        const docsDelLocador = docs?.filter((d) => d.locador_id === locador.id) || [];
        const docsEmergenciaLocador = docsEmergencia?.filter((d) => d.locador_id === locador.id) || [];
        
        // Get effective general docs for this locador's denomination
        const effectiveGenDocs = distribucionActiva === "actualizada" 
          ? denomDocs.filter((d: any) => d.denominacion_id === locador.denominacion_id)
          : (documentosGenerales || []);

        const documentosPresentes: string[] = [];
        const documentosFaltantes: string[] = [];

        orderedDocs.forEach((docKey) => {
          // Verificar si es documento de emergencia
          const esDocumentoEmergencia = docKey.startsWith("documento_");
          
          if (esDocumentoEmergencia) {
            const found = docsEmergenciaLocador.some(d => d.documento_key === docKey);
            if (found) {
              documentosPresentes.push(docKey);
            } else {
              documentosFaltantes.push(docKey);
            }
            return;
          }
          
          // Buscar en tipo_original o tipo_pago
          const found = docsDelLocador.some(
            (d) => d.tipo_original === docKey || d.tipo_pago === docKey
          );
          
          // Si es un documento general, verificar en la fuente correcta
          const esDocumentoGeneral = ["requerimiento", "informe_logistica", "memo_oea", "memo_oepe", "anexo_03", "anexo_04"].includes(docKey);
          
          if (found) {
            documentosPresentes.push(docKey);
          } else if (esDocumentoGeneral && effectiveGenDocs.some((d: any) => d.tipo === docKey)) {
            documentosPresentes.push(docKey);
          } else {
            documentosFaltantes.push(docKey);
          }
        });

        return {
          locadorId: locador.id,
          nombres: locador.nombres,
          apellidos: locador.apellidos,
          documentosPresentes,
          documentosFaltantes,
          isComplete: documentosFaltantes.length === 0,
        };
      });

      // Ordenar alfabéticamente por apellidos y nombres
      results.sort((a, b) => {
        const nombreA = `${a.apellidos} ${a.nombres}`.toLowerCase();
        const nombreB = `${b.apellidos} ${b.nombres}`.toLowerCase();
        return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
      });

      setCotejoResults(results);
      toast.success("Cotejo completado");
    } catch (error) {
      console.error("Error en cotejo:", error);
      toast.error("Error al cotejar documentos");
    } finally {
      setIsCotejando(false);
    }
  };

  const handleDescargarExpediente = async (result: CotejoResult) => {
    if (result.documentosFaltantes.length > 0) {
      const continuar = window.confirm(
        `Este locador tiene ${result.documentosFaltantes.length} documento(s) faltante(s). ¿Desea continuar con la descarga de los documentos disponibles?`
      );
      if (!continuar) return;
    }

    setIsDownloading(result.locadorId);

    try {
      const mergedPdf = await PDFDocument.create();
      let docsAdded = 0;

      // Get this locador's denominacion_id for distribution-aware lookups
      const locador = locadoresActivos?.find(l => l.id === result.locadorId);
      const locadorDenomId = locador?.denominacion_id;

      for (const docKey of orderedDocs) {
        let rutaArchivo: string | null = null;

        // Si es documento de emergencia
        if (docKey.startsWith("documento_")) {
          const { data: docEmergencia } = await supabase
            .from("documentos_emergencia")
            .select("ruta_archivo")
            .eq("locador_id", result.locadorId)
            .eq("documento_key", docKey)
            .maybeSingle();
          
          rutaArchivo = docEmergencia?.ruta_archivo || null;
        }
        // Si es documento general (affected by distribution)
        else if (["requerimiento", "informe_logistica", "memo_oea", "memo_oepe", "anexo_03", "anexo_04"].includes(docKey)) {
          if (distribucionActiva === "actualizada" && locadorDenomId) {
            // Use denomination-specific docs
            const { data: docDenom } = await supabase
              .from("documentos_generales_por_denominacion")
              .select("ruta_archivo")
              .eq("tipo", docKey)
              .eq("denominacion_id", locadorDenomId)
              .maybeSingle();
            rutaArchivo = docDenom?.ruta_archivo || null;
          } else {
            // Classic distribution: global docs
            const { data: docGeneral } = await supabase
              .from("documentos_generales")
              .select("ruta_archivo")
              .eq("tipo", docKey as any)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            rutaArchivo = docGeneral?.ruta_archivo || null;
          }
        } else {
          // Buscar en tipo_original
          const { data: docOriginal } = await supabase
            .from("documentos")
            .select("ruta_archivo")
            .eq("locador_id", result.locadorId)
            .eq("tipo_original", docKey as any)
            .maybeSingle();
          
          if (docOriginal?.ruta_archivo) {
            rutaArchivo = docOriginal.ruta_archivo;
          } else {
            // Buscar en tipo_pago
            const { data: docPago } = await supabase
              .from("documentos")
              .select("ruta_archivo")
              .eq("locador_id", result.locadorId)
              .eq("tipo_pago", docKey as any)
              .maybeSingle();
            
            rutaArchivo = docPago?.ruta_archivo || null;
          }
        }

        if (rutaArchivo) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from("documentos")
              .download(rutaArchivo);

            if (downloadError || !fileData) {
              console.warn(`No se pudo descargar ${docKey}:`, downloadError);
              continue;
            }

            const pdfBytes = await fileData.arrayBuffer();
            const pdf = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach((page) => mergedPdf.addPage(page));
            docsAdded++;
          } catch (err) {
            console.warn(`Error procesando ${docKey}:`, err);
          }
        }
      }

      if (docsAdded === 0) {
        toast.error("No se encontraron documentos para descargar");
        return;
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const sanitizarTexto = (texto: string) =>
        texto
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .toLowerCase();

      const nombreArchivo = `expediente_${sanitizarTexto(result.apellidos)}_${sanitizarTexto(result.nombres)}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Expediente descargado: ${docsAdded} documento(s)`);
    } catch (error) {
      console.error("Error al descargar expediente:", error);
      toast.error("Error al generar el expediente");
    } finally {
      setIsDownloading(null);
    }
  };

  const documentosList = Object.entries(DOCUMENTOS_UNICOS);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Descargas</h1>
          <p className="text-muted-foreground">Selecciona documentos, ordénalos y descarga expedientes por locador</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de selección de documentos */}
        <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="h-5 w-5 text-primary" />
              Documentos del Sistema
            </CardTitle>
            <CardDescription>
              Selecciona los documentos que deseas incluir en el expediente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {documentosList.map(([key, nombre]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 group"
                >
                  <span className="text-sm font-medium group-hover:text-primary transition-colors duration-200">{nombre}</span>
                  <Switch
                    checked={selectedDocs.includes(key)}
                    onCheckedChange={() => handleToggleDoc(key)}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <span className="text-sm text-muted-foreground">
                <Badge variant="secondary" className="rounded-lg">{selectedDocs.length}</Badge>
                {" "}documento(s) seleccionado(s)
              </span>
              <Button onClick={handleOrdenar} disabled={selectedDocs.length === 0} className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                Ordenar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Panel de ordenamiento */}
        <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GripVertical className="h-5 w-5 text-primary" />
              Orden de Documentos
            </CardTitle>
            <CardDescription>
              Define el orden de los documentos en el expediente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {!isOrdered ? (
              <Alert className="rounded-xl border-border/40 bg-muted/20">
                <AlertDescription className="text-muted-foreground">
                  Selecciona documentos y presiona "Ordenar" para definir el orden de descarga
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  {orderedDocs.map((docKey, index) => (
                    <div
                      key={docKey}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-all duration-200 group"
                    >
                      <Badge variant="outline" className="w-8 justify-center rounded-lg text-primary font-bold">
                        {index + 1}
                      </Badge>
                      <span className="flex-1 text-sm font-medium">
                        {DOCUMENTOS_UNICOS[docKey]}
                      </span>
                      <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity duration-200">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => moveDoc(index, "up")} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => moveDoc(index, "down")} disabled={index === orderedDocs.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleCotejar}
                  disabled={isCotejando}
                  className="w-full rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {isCotejando ? "Cotejando..." : "Cotejar"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resultados del cotejo */}
      {cotejoResults && (
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden animate-fade-in">
          <CardHeader className="bg-muted/30 border-b border-border/30">
            <CardTitle className="text-lg">Resultados del Cotejo</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="rounded-lg mr-1">{cotejoResults.filter((r) => r.isComplete).length}</Badge>
              de <Badge variant="outline" className="rounded-lg mx-1">{cotejoResults.length}</Badge> locadores tienen todos los documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
              {cotejoResults.map((result) => (
                <div
                  key={result.locadorId}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                    result.isComplete 
                      ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-900/50" 
                      : "bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-900/50"
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {result.isComplete ? (
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {result.apellidos}, {result.nombres}
                    </p>
                    {result.documentosFaltantes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1.5">Documentos faltantes:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.documentosFaltantes.map((docKey) => (
                            <Badge key={docKey} variant="destructive" className="text-xs rounded-lg">
                              {DOCUMENTOS_UNICOS[docKey] || docKey}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    variant={result.isComplete ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
                    onClick={() => handleDescargarExpediente(result)}
                    disabled={isDownloading === result.locadorId || result.documentosPresentes.length === 0}
                  >
                    {isDownloading === result.locadorId ? (
                      "Descargando..."
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Descargas;
