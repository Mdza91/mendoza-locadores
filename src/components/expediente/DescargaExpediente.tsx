import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadFromR2 } from "@/lib/r2Storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DOCUMENTOS_PRIMERA_ETAPA,
  DOCUMENTOS_SEGUNDA_ETAPA,
  DOCUMENTOS_GENERALES,
  ORDEN_EXPEDIENTE_ORIGINAL,
  ORDEN_EXPEDIENTE_PAGO,
} from "@/lib/documentTypes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PDFDocument } from "pdf-lib";


interface DescargaExpedienteProps {
  locadorId: string;
  locadorNombre: string;
  locadorApellidos: string;
  requiereHabilidad: boolean;
  requiereConstancia: boolean;
}

export const DescargaExpediente = ({
  locadorId,
  locadorNombre,
  locadorApellidos,
  requiereHabilidad,
  requiereConstancia,
}: DescargaExpedienteProps) => {
  const [open, setOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: documentos } = useQuery({
    queryKey: ["documentos-locador", locadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("locador_id", locadorId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: documentosGenerales } = useQuery({
    queryKey: ["documentos-generales-descarga"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_generales")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: configGlobal } = useQuery({
    queryKey: ["config-global-descarga"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_global")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Query locador's denominacion_id
  const { data: locadorInfo } = useQuery({
    queryKey: ["locador-info-descarga", locadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locadores")
        .select("denominacion_id")
        .eq("id", locadorId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Query denomination-specific docs
  const { data: docsPorDenominacion } = useQuery({
    queryKey: ["docs-por-denominacion-descarga"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_generales_por_denominacion")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Derive effective general docs based on active distribution
  const distribucionActiva = (configGlobal as any)?.distribucion_activa || "clasica";
  const effectiveGeneralDocs = (() => {
    if (distribucionActiva === "actualizada" && locadorInfo?.denominacion_id) {
      return (docsPorDenominacion || [])
        .filter((d: any) => d.denominacion_id === locadorInfo.denominacion_id);
    }
    return documentosGenerales || [];
  })();

  // Documentos específicos para la pestaña "Entregables"
  const DOCUMENTOS_ENTREGABLES = [
    'suspension_cuarta',
    'rnp',
    'consulta_servir',
    'sancion_tce',
    'cotizacion',
    'declaracion_jurada',
  ];


  // Verificar si existe Constancia de Estudios Fedateada
  const tieneConstanciaFedateada = () => {
    return (documentos || []).some(
      (d: any) => d.tipo_original === "constancia_estudios" && d.etapa === "original"
    );
  };

  const getDocumentosDisponibles = (tipo: "original" | "pago" | "entregables") => {
    const docsLocador = documentos || [];
    const docsGenerales = effectiveGeneralDocs;
    const documentosAdministrativosActivo = configGlobal?.documentos_administrativos_activo || false;
    
    if (tipo === "entregables") {
      return DOCUMENTOS_ENTREGABLES.filter((key) => {
        return docsLocador.some(
          (d) => d.tipo_original === key && d.etapa === "original"
        );
      });
    }
    
    if (tipo === "original") {
      return ORDEN_EXPEDIENTE_ORIGINAL.filter((key) => {
        if (key === "habilidad_vigente" && !requiereHabilidad) return false;
        
        // Lógica especial para constancias de estudios
        if (key === "constancia_estudios" || key === "constancia_estudios_sin_fedatear") {
          if (!requiereConstancia) return false;
          
          // Solo mostrar constancia_estudios (representa ambas)
          if (key === "constancia_estudios_sin_fedatear") return false;
          
          // Verificar si existe fedateada O sin fedatear
          return docsLocador.some(
            (d) => (d.tipo_original === "constancia_estudios" || d.tipo_original === "constancia_estudios_sin_fedatear") && d.etapa === "original"
          );
        }
        
        return docsLocador.some(
          (d) => d.tipo_original === key && d.etapa === "original"
        );
      });
    } else {
      return ORDEN_EXPEDIENTE_PAGO.filter((key) => {
        if (key === "habilidad_vigente" && !requiereHabilidad) return false;
        
        // Lógica especial para constancias de estudios
        if (key === "constancia_estudios" || key === "constancia_estudios_sin_fedatear") {
          if (!requiereConstancia) return false;
          
          // Solo mostrar constancia_estudios (representa ambas)
          if (key === "constancia_estudios_sin_fedatear") return false;
          
          // Verificar si existe fedateada O sin fedatear
          return docsLocador.some(
            (d) => (d.tipo_original === "constancia_estudios" || d.tipo_original === "constancia_estudios_sin_fedatear") && d.etapa === "original"
          );
        }
        
        // Para anexo_03 y anexo_04, verificar primero documentos generales si documentos administrativos está activo
        if ((key === "anexo_03" || key === "anexo_04") && documentosAdministrativosActivo) {
          return docsGenerales.some((d) => d.tipo === key);
        }
        
        // Documentos del locador (primera y segunda etapa)
        if (
          Object.keys(DOCUMENTOS_PRIMERA_ETAPA).includes(key) ||
          Object.keys(DOCUMENTOS_SEGUNDA_ETAPA).includes(key)
        ) {
          const tieneDocLocador = docsLocador.some(
            (d) =>
              (d.tipo_original === key || d.tipo_pago === key) &&
              (d.etapa === "original" || d.etapa === "pago")
          );
          
          // Si es anexo_03 o anexo_04 y no tiene doc del locador, verificar generales
          if (!tieneDocLocador && (key === "anexo_03" || key === "anexo_04")) {
            return docsGenerales.some((d) => d.tipo === key);
          }
          
          return tieneDocLocador;
        }
        
        // Documentos generales
        if (Object.keys(DOCUMENTOS_GENERALES).includes(key)) {
          return docsGenerales.some((d) => d.tipo === key);
        }
        
        return false;
      });
    }
  };

  const getDocumentosFaltantes = (tipo: "original" | "pago" | "entregables") => {
    const docsLocador = documentos || [];
    const docsGenerales = effectiveGeneralDocs;
    const documentosAdministrativosActivo = configGlobal?.documentos_administrativos_activo || false;
    
    if (tipo === "entregables") {
      return DOCUMENTOS_ENTREGABLES.filter((key) => {
        return !docsLocador.some(
          (d) => d.tipo_original === key && d.etapa === "original"
        );
      });
    }
    
    const todosRequeridos =
      tipo === "original" ? ORDEN_EXPEDIENTE_ORIGINAL : ORDEN_EXPEDIENTE_PAGO;
    
    return todosRequeridos.filter((key) => {
      if (key === "habilidad_vigente" && !requiereHabilidad) return false;
      
      // Lógica especial para constancias de estudios
      if (key === "constancia_estudios" || key === "constancia_estudios_sin_fedatear") {
        if (!requiereConstancia) return false;
        
        // Solo mostrar constancia_estudios (representa ambas)
        if (key === "constancia_estudios_sin_fedatear") return false;
        
        // Falta si NO existe ni fedateada NI sin fedatear
        return !docsLocador.some(
          (d) => (d.tipo_original === "constancia_estudios" || d.tipo_original === "constancia_estudios_sin_fedatear") && d.etapa === "original"
        );
      }
      
      // Verificar si existe el documento
      const tieneDocLocador = docsLocador.some(
        (d) => d.tipo_original === key && d.etapa === "original"
      );
      if (tieneDocLocador) return false;
      
      // Para anexo_03 y anexo_04, si documentos administrativos está activo, verificar solo generales
      if ((key === "anexo_03" || key === "anexo_04") && documentosAdministrativosActivo) {
        return !docsGenerales.some((d) => d.tipo === key);
      }
      
      if (
        Object.keys(DOCUMENTOS_PRIMERA_ETAPA).includes(key) ||
        Object.keys(DOCUMENTOS_SEGUNDA_ETAPA).includes(key)
      ) {
        const tieneDocLocador = docsLocador.some(
          (d) =>
            (d.tipo_original === key || d.tipo_pago === key) &&
            (d.etapa === "original" || d.etapa === "pago")
        );
        
        // Si es anexo_03 o anexo_04 y no tiene doc del locador, verificar generales
        if (!tieneDocLocador && (key === "anexo_03" || key === "anexo_04")) {
          return !docsGenerales.some((d) => d.tipo === key);
        }
        
        return !tieneDocLocador;
      }
      
      if (Object.keys(DOCUMENTOS_GENERALES).includes(key)) {
        return !docsGenerales.some((d) => d.tipo === key);
      }
      
      return false;
    });
  };

  const getNombreDocumento = (key: string) => {
    if (Object.keys(DOCUMENTOS_PRIMERA_ETAPA).includes(key)) {
      return DOCUMENTOS_PRIMERA_ETAPA[key as keyof typeof DOCUMENTOS_PRIMERA_ETAPA];
    }
    if (Object.keys(DOCUMENTOS_SEGUNDA_ETAPA).includes(key)) {
      return DOCUMENTOS_SEGUNDA_ETAPA[key as keyof typeof DOCUMENTOS_SEGUNDA_ETAPA];
    }
    if (Object.keys(DOCUMENTOS_GENERALES).includes(key)) {
      return DOCUMENTOS_GENERALES[key as keyof typeof DOCUMENTOS_GENERALES];
    }
    return key;
  };

  const handleToggleDoc = (key: string) => {
    setSelectedDocs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (tipo: "original" | "pago" | "entregables") => {
    const disponibles = getDocumentosDisponibles(tipo);
    const newSelected: Record<string, boolean> = {};
    disponibles.forEach((key) => {
      newSelected[key] = true;
    });
    setSelectedDocs(newSelected);
  };

  const handleSelectOlOeaOepe = () => {
    const documentosOlOeaOepe = [
      'memo_oepe',
      'ccp_oepe',
      'memo_oea',
      'informe_logistica',
      'ccp_logistica'
    ];
    
    const disponibles = getDocumentosDisponibles('pago');
    const newSelected: Record<string, boolean> = {};
    documentosOlOeaOepe.forEach((key) => {
      if (disponibles.includes(key)) {
        newSelected[key] = true;
      }
    });
    setSelectedDocs(newSelected);
  };

  const handleDescargar = async (tipo: "original" | "pago" | "entregables") => {
    setIsDownloading(true);
    
    try {
      const docsSeleccionados = Object.entries(selectedDocs)
        .filter(([_, selected]) => selected)
        .map(([key]) => key);
      
      if (docsSeleccionados.length === 0) {
        toast.error("Seleccione al menos un documento");
        return;
      }

      // Recopilar todos los archivos en el orden correcto
      const archivosBytes: ArrayBuffer[] = [];
      const orden =
        tipo === "original" ? ORDEN_EXPEDIENTE_ORIGINAL : 
        tipo === "entregables" ? DOCUMENTOS_ENTREGABLES :
        ORDEN_EXPEDIENTE_PAGO;
      
      for (const key of orden) {
        if (!docsSeleccionados.includes(key)) continue;
        
        let rutaArchivo = "";
        const documentosAdministrativosActivo = configGlobal?.documentos_administrativos_activo || false;
        
        // Para anexo_03 y anexo_04, si los documentos administrativos están activos,
        // usar los generales (reemplazando o complementando los del locador)
        if ((key === "anexo_03" || key === "anexo_04") && documentosAdministrativosActivo) {
          const docGeneral = effectiveGeneralDocs?.find((d: any) => d.tipo === key);
          if (docGeneral) {
            rutaArchivo = docGeneral.ruta_archivo;
          }
        } else if (key === "constancia_estudios") {
          // Para constancia_estudios fedateada: usar fedateada si existe, sino usar sin fedatear
          const docFedateada = documentos?.find(
            (d) => d.tipo_original === "constancia_estudios" && d.etapa === "original"
          );
          if (docFedateada) {
            rutaArchivo = docFedateada.ruta_archivo;
          } else {
            // Buscar constancia sin fedatear
            const docSinFedatear = documentos?.find(
              (d: any) => d.tipo_original === "constancia_estudios_sin_fedatear" && d.etapa === "original"
            );
            if (docSinFedatear) {
              rutaArchivo = docSinFedatear.ruta_archivo;
            }
          }
        } else {
          // Buscar en documentos del locador
          const docLocador = documentos?.find(
            (d) => (d.tipo_original === key || d.tipo_pago === key)
          );
          if (docLocador) {
            rutaArchivo = docLocador.ruta_archivo;
          } else {
            // Buscar en documentos generales
            const docGeneral = effectiveGeneralDocs?.find((d: any) => d.tipo === key);
            if (docGeneral) {
              rutaArchivo = docGeneral.ruta_archivo;
            }
          }
        }
        
        if (rutaArchivo) {
          const { data, error } = await downloadFromR2(rutaArchivo);
          
          if (!error && data) {
            const arrayBuffer = await data.arrayBuffer();
            archivosBytes.push(arrayBuffer);
          }
        }
      }

      if (archivosBytes.length === 0) {
        toast.error("No se pudieron cargar los documentos");
        return;
      }

      // Unir todos los PDFs usando pdf-lib
      const pdfFinal = await PDFDocument.create();
      
      for (const pdfBytes of archivosBytes) {
        try {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const copiedPages = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => {
            pdfFinal.addPage(page);
          });
        } catch (error) {
          toast.error("Error al procesar uno de los documentos");
        }
      }

      // Guardar el PDF unido
      const pdfBytesUnidos = await pdfFinal.save();
      const blob = new Blob([new Uint8Array(pdfBytesUnidos)], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const tipoExpediente = tipo === "original" ? "REQUERIMIENTO" : tipo === "entregables" ? "ENTREGABLES" : "PAGO";
      const nombreArchivo = `${locadorApellidos}_${locadorNombre}_EXPEDIENTE_${tipoExpediente}_${timestamp}.pdf`;
      
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Expediente descargado exitosamente");
      setOpen(false);
    } catch (error) {
      toast.error("Error al descargar expediente");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderDocumentos = (tipo: "original" | "pago" | "entregables") => {
    const disponibles = getDocumentosDisponibles(tipo);
    const faltantes = getDocumentosFaltantes(tipo);

    return (
      <div className="space-y-4 animate-fade-in">
        {faltantes.length > 0 && (
          <Alert className="rounded-xl border-warning/30 bg-warning/5">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              Faltan {faltantes.length} documento{faltantes.length > 1 ? "s" : ""}:{" "}
              <span className="font-medium">{faltantes.map(getNombreDocumento).join(", ")}</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(tipo)}
              className="rounded-lg text-xs"
            >
              Seleccionar Todos
            </Button>
            {tipo === "pago" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectOlOeaOepe}
                className="rounded-lg text-xs"
              >
                OL-OEA-OEPE
              </Button>
            )}
          </div>
          
          <div className="space-y-1.5">
            {disponibles.map((key) => (
              <div key={key} className="flex items-center space-x-3 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors duration-200">
                <Switch
                  id={`doc-${key}`}
                  checked={selectedDocs[key] || false}
                  onCheckedChange={() => handleToggleDoc(key)}
                />
                <Label htmlFor={`doc-${key}`} className="flex-1 cursor-pointer text-sm font-medium">
                  {getNombreDocumento(key)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => handleDescargar(tipo)}
          disabled={isDownloading}
          className="w-full rounded-xl h-11 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {isDownloading ? "Descargando..." : "Descargar Expediente"}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 shadow-md hover:shadow-lg transition-all duration-300">
          <FileDown className="h-4 w-4" />
          Descargar Expediente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 rounded-2xl border-border/50 shadow-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileDown className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Descargar Expediente</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          <Tabs defaultValue="original" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/40 rounded-xl border border-border/30">
              <TabsTrigger value="original" className="rounded-lg py-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Primera Etapa</TabsTrigger>
              <TabsTrigger value="pago" className="rounded-lg py-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Segunda Etapa</TabsTrigger>
              <TabsTrigger value="entregables" className="rounded-lg py-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Entregables</TabsTrigger>
            </TabsList>
            <TabsContent value="original" className="mt-3">{renderDocumentos("original")}</TabsContent>
            <TabsContent value="pago" className="mt-3">{renderDocumentos("pago")}</TabsContent>
            <TabsContent value="entregables" className="mt-3">{renderDocumentos("entregables")}</TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
