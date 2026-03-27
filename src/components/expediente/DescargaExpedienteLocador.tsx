import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  DOCUMENTOS_PRIMERA_ETAPA,
  DOCUMENTOS_GENERALES,
} from "@/lib/documentTypes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PDFDocument } from "pdf-lib";

interface DescargaExpedienteLocadorProps {
  locadorId: string;
  locadorNombre: string;
  locadorApellidos: string;
  requiereHabilidad: boolean;
  requiereConstancia: boolean;
  visibleItems?: {
    expediente_original: boolean;
    expediente_pago: boolean;
    expediente_administrativo: boolean;
  };
}

// Documentos para la sección "Expediente" (Segunda Etapa del RNP al CCI)
const DOCUMENTOS_EXPEDIENTE = [
  'rnp',
  'consulta_ruc',
  'consulta_servir',
  'sancion_tce',
  'cotizacion',
  'declaracion_jurada',
  'tdr',
  'requerimiento',
  'cv_documentado',
  'dni_vigente',
  'sustento_cv',
  'constancia_estudios_sin_fedatear',
  'constancia_estudios',
  'habilidad_vigente',
  'cci',
];

// Documentos para la sección "Documentos Administrativos"
const DOCUMENTOS_ADMINISTRATIVOS = [
  'memo_oepe',
  'ccp_oepe',
  'memo_oea',
  'informe_logistica',
  'ccp_logistica',
  'anexo_04',
  'anexo_03',
];

// Documentos para la sección "Entregables" (sin suspensión de cuarta)
const DOCUMENTOS_ENTREGABLES_LOCADOR = [
  'rnp',
  'consulta_servir',
  'sancion_tce',
  'cotizacion',
  'declaracion_jurada',
];

// Documento adicional para entregables cuando requiere habilidad
const DOCUMENTOS_ENTREGABLES_HABILIDAD = [
  ...DOCUMENTOS_ENTREGABLES_LOCADOR,
  'habilidad_vigente',
];

export const DescargaExpedienteLocador = ({
  locadorId,
  locadorNombre,
  locadorApellidos,
  requiereHabilidad,
  requiereConstancia,
  visibleItems = {
    expediente_original: true,
    expediente_pago: true,
    expediente_administrativo: true,
  },
}: DescargaExpedienteLocadorProps) => {
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
    queryKey: ["config-global-descarga-locador"],
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

  // Verificar si existe Constancia de Estudios Fedateada
  const tieneConstanciaFedateada = () => {
    return (documentos || []).some(
      (d: any) => d.tipo_original === "constancia_estudios" && d.etapa === "original"
    );
  };

  const getDocumentosDisponibles = (tipo: "expediente" | "administrativos" | "entregables") => {
    const docsLocador = documentos || [];
    const docsGenerales = effectiveGeneralDocs;
    
    if (tipo === "expediente") {
      return DOCUMENTOS_EXPEDIENTE.filter((key) => {
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
        
        // Check in locador documents (original or pago stage)
        const tieneDocLocador = docsLocador.some(
          (d) => (d.tipo_original === key || d.tipo_pago === key)
        );
        if (tieneDocLocador) return true;
        
        // Check in general documents (for requerimiento)
        return docsGenerales.some((d) => d.tipo === key);
      });
    }
    
    if (tipo === "administrativos") {
      return DOCUMENTOS_ADMINISTRATIVOS.filter((key) => {
        // CCP están solo en documentos del locador (tipo_pago)
        const soloEnLocador = ['ccp_oepe', 'ccp_logistica'];
        if (soloEnLocador.includes(key)) {
          return docsLocador.some((d) => d.tipo_pago === key);
        }
        // Anexos pueden estar en ambos lugares
        const enAmbos = ['anexo_03', 'anexo_04'];
        if (enAmbos.includes(key)) {
          return docsLocador.some((d) => d.tipo_pago === key) || docsGenerales.some((d) => d.tipo === key);
        }
        // Memos e Informe están en documentos generales
        return docsGenerales.some((d) => d.tipo === key);
      });
    }
    
    // Entregables
    const listaEntregables = requiereHabilidad ? DOCUMENTOS_ENTREGABLES_HABILIDAD : DOCUMENTOS_ENTREGABLES_LOCADOR;
    return listaEntregables.filter((key) => {
      return docsLocador.some(
        (d) => d.tipo_original === key && d.etapa === "original"
      );
    });
  };

  const getDocumentosFaltantes = (tipo: "expediente" | "administrativos" | "entregables") => {
    const docsLocador = documentos || [];
    const docsGenerales = effectiveGeneralDocs;
    
    if (tipo === "expediente") {
      return DOCUMENTOS_EXPEDIENTE.filter((key) => {
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
        
        // Check in locador documents
        const tieneDocLocador = docsLocador.some(
          (d) => (d.tipo_original === key || d.tipo_pago === key)
        );
        if (tieneDocLocador) return false;
        
        // Check in general documents (for requerimiento)
        return !docsGenerales.some((d) => d.tipo === key);
      });
    }
    
    if (tipo === "administrativos") {
      return DOCUMENTOS_ADMINISTRATIVOS.filter((key) => {
        // CCP están solo en documentos del locador (tipo_pago)
        const soloEnLocador = ['ccp_oepe', 'ccp_logistica'];
        if (soloEnLocador.includes(key)) {
          return !docsLocador.some((d) => d.tipo_pago === key);
        }
        // Anexos pueden estar en ambos lugares
        const enAmbos = ['anexo_03', 'anexo_04'];
        if (enAmbos.includes(key)) {
          return !docsLocador.some((d) => d.tipo_pago === key) && !docsGenerales.some((d) => d.tipo === key);
        }
        // Memos e Informe están en documentos generales
        return !docsGenerales.some((d) => d.tipo === key);
      });
    }
    
    const listaEntregables = requiereHabilidad ? DOCUMENTOS_ENTREGABLES_HABILIDAD : DOCUMENTOS_ENTREGABLES_LOCADOR;
    return listaEntregables.filter((key) => {
      return !docsLocador.some(
        (d) => d.tipo_original === key && d.etapa === "original"
      );
    });
  };

  const getNombreDocumento = (key: string) => {
    const nombres: Record<string, string> = {
      ...DOCUMENTOS_PRIMERA_ETAPA,
      ...DOCUMENTOS_GENERALES,
      memo_oepe: "Memo – OEPE",
      ccp_oepe: "CCP – OEPE",
      memo_oea: "Memo – OEA",
      informe_logistica: "Informe – Logística",
      ccp_logistica: "CCP – Logística",
      anexo_03: "Anexo 03",
      anexo_04: "Anexo 04",
    };
    return nombres[key] || key;
  };

  const handleToggleDoc = (key: string) => {
    setSelectedDocs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (tipo: "expediente" | "administrativos" | "entregables") => {
    const disponibles = getDocumentosDisponibles(tipo);
    const newSelected: Record<string, boolean> = {};
    disponibles.forEach((key) => {
      newSelected[key] = true;
    });
    setSelectedDocs(newSelected);
  };

  const handleDescargar = async (tipo: "expediente" | "administrativos" | "entregables") => {
    setIsDownloading(true);
    
    try {
      const docsSeleccionados = Object.entries(selectedDocs)
        .filter(([_, selected]) => selected)
        .map(([key]) => key);
      
      if (docsSeleccionados.length === 0) {
        toast.error("Seleccione al menos un documento");
        return;
      }

      const archivosBytes: ArrayBuffer[] = [];
      const orden = tipo === "expediente" 
        ? DOCUMENTOS_EXPEDIENTE 
        : tipo === "administrativos" 
          ? DOCUMENTOS_ADMINISTRATIVOS 
          : requiereHabilidad ? DOCUMENTOS_ENTREGABLES_HABILIDAD : DOCUMENTOS_ENTREGABLES_LOCADOR;
      
      for (const key of orden) {
        if (!docsSeleccionados.includes(key)) continue;
        
        let rutaArchivo = "";
        
        if (tipo === "administrativos") {
          // CCP están solo en documentos del locador (tipo_pago)
          const soloEnLocador = ['ccp_oepe', 'ccp_logistica'];
          // Anexos pueden estar en ambos lugares (prioridad locador)
          const enAmbos = ['anexo_03', 'anexo_04'];
          
          if (soloEnLocador.includes(key)) {
            const docLocador = documentos?.find((d) => d.tipo_pago === key);
            if (docLocador) {
              rutaArchivo = docLocador.ruta_archivo;
            }
          } else if (enAmbos.includes(key)) {
            // Primero buscar en locador, si no existe buscar en generales
            const docLocador = documentos?.find((d) => d.tipo_pago === key);
            if (docLocador) {
              rutaArchivo = docLocador.ruta_archivo;
            } else {
              const docGeneral = effectiveGeneralDocs?.find((d: any) => d.tipo === key);
              if (docGeneral) {
                rutaArchivo = docGeneral.ruta_archivo;
              }
            }
          } else {
            // Memos e Informe están en documentos generales
            const docGeneral = effectiveGeneralDocs?.find((d: any) => d.tipo === key);
            if (docGeneral) {
              rutaArchivo = docGeneral.ruta_archivo;
            }
          }
        } else if (tipo === "expediente") {
          // Para expediente, manejar constancia_estudios de forma especial
          if (key === "constancia_estudios") {
            // Usar fedateada si existe, sino usar sin fedatear
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
            // Para otros documentos, buscar primero en locador, luego en generales (para requerimiento)
            const docLocador = documentos?.find(
              (d) => d.tipo_original === key || d.tipo_pago === key
            );
            if (docLocador) {
              rutaArchivo = docLocador.ruta_archivo;
            } else {
              const docGeneral = effectiveGeneralDocs?.find((d: any) => d.tipo === key);
              if (docGeneral) {
                rutaArchivo = docGeneral.ruta_archivo;
              }
            }
          }
        } else {
          // Entregables: buscar en documentos del locador
          const docLocador = documentos?.find(
            (d) => d.tipo_original === key
          );
          if (docLocador) {
            rutaArchivo = docLocador.ruta_archivo;
          }
        }
        
        if (rutaArchivo) {
          const { data, error } = await supabase.storage
            .from("documentos")
            .download(rutaArchivo);
          
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

      const pdfBytesUnidos = await pdfFinal.save();
      const blob = new Blob([new Uint8Array(pdfBytesUnidos)], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const tipoExpediente = tipo === "expediente" 
        ? "EXPEDIENTE" 
        : tipo === "administrativos" 
          ? "DOCUMENTOS_ADMINISTRATIVOS" 
          : "ENTREGABLES";
      const nombreArchivo = `${locadorApellidos}_${locadorNombre}_${tipoExpediente}_${timestamp}.pdf`;
      
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

  const renderDocumentos = (tipo: "expediente" | "administrativos" | "entregables") => {
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

          {disponibles.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No hay documentos disponibles en esta sección</p>
            </div>
          )}
        </div>

        <Button
          onClick={() => handleDescargar(tipo)}
          disabled={isDownloading || disponibles.length === 0}
          className="w-full rounded-xl h-11 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {isDownloading ? "Descargando..." : "Descargar"}
        </Button>
      </div>
    );
  };

  // Determinar las tabs visibles
  const visibleTabs = [
    visibleItems.expediente_original && { key: 'expediente', label: 'Primer o Único Entregable' },
    visibleItems.expediente_administrativo && { key: 'administrativos', label: 'Complemento de Primer o Único Entregable' },
    visibleItems.expediente_pago && { key: 'entregables', label: 'Segundo Entregable a Más' },
  ].filter(Boolean) as { key: string; label: string }[];

  // Si no hay tabs visibles, no mostrar nada
  if (visibleTabs.length === 0) {
    return null;
  }

  const defaultTab = visibleTabs[0]?.key || 'expediente';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 shadow-md hover:shadow-lg transition-all duration-300 min-w-[220px]">
          <FileDown className="h-4 w-4" />
          Descargar Expediente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 rounded-2xl border-border/50 shadow-xl flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/20 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileDown className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold">Descargar Expediente</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="flex flex-col sm:flex-row h-auto w-full gap-1 p-1.5 bg-muted/40 rounded-xl border border-border/30">
              {visibleTabs.map((tab) => (
                <TabsTrigger 
                  key={tab.key} 
                  value={tab.key}
                  className="flex-1 text-xs sm:text-sm py-2.5 px-2 whitespace-normal text-center leading-tight min-h-[2.5rem] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {visibleItems.expediente_original && (
              <TabsContent value="expediente" className="mt-4">{renderDocumentos("expediente")}</TabsContent>
            )}
            {visibleItems.expediente_administrativo && (
              <TabsContent value="administrativos" className="mt-4">{renderDocumentos("administrativos")}</TabsContent>
            )}
            {visibleItems.expediente_pago && (
              <TabsContent value="entregables" className="mt-4">{renderDocumentos("entregables")}</TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
