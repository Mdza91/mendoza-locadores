import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadFromR2, getR2ViewUrl } from "@/lib/r2Storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, Mail, Phone, Building2, User, FileText, Edit2, X, Check, 
  Download, Eye, FolderOpen, AlertCircle, ExternalLink, ClipboardList,
  Briefcase, Loader2, CheckCircle2, Clock, Upload, AlertTriangle, Bell,
  Megaphone, FileDown
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { estaVencido, diasHastaVencimiento } from "@/lib/dateUtils";
import { toast } from "sonner";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocumentoCard } from "@/components/documento/DocumentoCard";
import { ReemplazarDocumento } from "@/components/documento/ReemplazarDocumento";
import { DOCUMENTOS_PRIMERA_ETAPA, ORDEN_EXPEDIENTE_ORIGINAL } from "@/lib/documentTypes";
import { DescargaExpedienteLocador } from "@/components/expediente/DescargaExpedienteLocador";
import { SubidaDocumentoLocador } from "@/components/documento/SubidaDocumentoLocador";
import { SubidaDocumentoEmergencia } from "@/components/documento/SubidaDocumentoEmergencia";
import { DocumentoEmergenciaCard } from "@/components/documento/DocumentoEmergenciaCard";
import { AvatarSelector } from "@/components/profile/AvatarSelector";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { cn } from "@/lib/utils";

// Documentos que pertenecen a la sección "CV Documentado"
const CV_DOCUMENTADO_TYPES = ['cv_documentado', 'dni_vigente', 'sustento_cv', 'constancia_estudios_sin_fedatear'] as const;

const PlantillasDescargaLocador = () => {
  const [open, setOpen] = useState(false);
  const { data: plantillas } = useQuery({
    queryKey: ["plantillas-usuarios-locador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plantillas_usuarios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!plantillas?.length) return null;

  const handleDownload = async (p: any) => {
    const { data, error } = await downloadFromR2(p.ruta_archivo);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = p.nombre_archivo;
      a.click();
    } else {
      toast.error("Error al descargar");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="rounded-xl gap-2 shadow-md hover:shadow-lg transition-all duration-300 min-w-[220px]">
            <FileDown className="h-4 w-4" />
            Descargar Plantilla
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] p-0 rounded-2xl border-border/50 shadow-xl flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <FileDown className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-bold">Plantillas</DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="grid gap-3">
              {plantillas.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{p.nombre}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 gap-1.5 text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => handleDownload(p)}
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const MiPerfil = () => {
  const queryClient = useQueryClient();
  useInactivityLogout(true);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAdminNotif, setSelectedAdminNotif] = useState<any>(null);
  const [showFedateada, setShowFedateada] = useState(false);

  const { data: locador, isLoading: loadingLocador, error: locadorError } = useQuery({
    queryKey: ["mi-perfil"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("locadores")
        .select(`
          *,
          unidades (*),
          denominaciones (*),
          documentos (*),
          config_avatars (*)
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No se encontró perfil de locador");
      
      return data;
    },
  });

  // Query para funciones del locador
  const { data: funciones } = useQuery({
    queryKey: ["mis-funciones", locador?.id],
    queryFn: async () => {
      if (!locador?.id) return [];
      
      const { data, error } = await supabase
        .from("locador_funciones")
        .select("*")
        .eq("locador_id", locador.id)
        .order("numero_orden", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!locador?.id,
  });

  const { data: cambiosPendientesDatos } = useQuery({
    queryKey: ["cambios-pendientes-datos", locador?.id],
    queryFn: async () => {
      if (!locador?.id) return [];
      
      const { data, error } = await supabase
        .from("cambios_pendientes_datos")
        .select("*")
        .eq("locador_id", locador.id)
        .eq("estado", "pendiente")
        .order("fecha_solicitud", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!locador?.id,
  });

  const { data: cambiosPendientesDocumentos } = useQuery({
    queryKey: ["cambios-pendientes-documentos", locador?.id],
    queryFn: async () => {
      if (!locador?.id) return [];
      
      const { data, error } = await supabase
        .from("cambios_pendientes_documentos")
        .select("*")
        .eq("locador_id", locador.id)
        .eq("estado", "pendiente")
        .order("fecha_solicitud", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!locador?.id,
  });

  // Query para notificaciones del administrador
  const { data: adminNotificaciones } = useQuery({
    queryKey: ["notificaciones-admin-activas", locador?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificaciones_admin")
        .select("*")
        .eq("activa", true)
        .lte("fecha_inicio", new Date().toISOString())
        .order("fecha_inicio", { ascending: false });

      if (error) throw error;
      const now = new Date().getTime();
      const locadorId = locador?.id;
      return (data || []).filter((n: any) => {
        const fin = new Date(n.fecha_inicio).getTime() + n.duracion_horas * 60 * 60 * 1000;
        if (now >= fin) return false;
        // Filter by destinatario
        if (n.dirigida_a === "todos") return true;
        if (locadorId) {
          const ids = n.dirigida_a.split(",");
          return ids.includes(locadorId);
        }
        return false;
      });
    },
    enabled: !!locador?.id,
    refetchInterval: 60000,
  });

  // Realtime subscription for admin notifications
  useEffect(() => {
    const channel = supabase
      .channel("admin-notificaciones-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificaciones_admin" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notificaciones-admin-activas"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: configSecciones } = useQuery({
    queryKey: ["config-secciones-visibles-locadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_secciones_visibles_locadores")
        .select("*")
        .order("orden");

      if (error) throw error;
      return data;
    },
  });

  // Query para obtener configuración de items visibles
  const { data: configItems } = useQuery({
    queryKey: ["config-items-seccion-locadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_items_seccion_locadores")
        .select("*")
        .order("orden");

      if (error) throw error;
      return data;
    },
  });

  // Query para configuración de documentos de emergencia
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

  // Query para documentos de emergencia del locador
  const { data: documentosEmergencia } = useQuery({
    queryKey: ["documentos-emergencia", locador?.id],
    queryFn: async () => {
      if (!locador?.id) return [];
      
      const { data, error } = await supabase
        .from("documentos_emergencia")
        .select("*")
        .eq("locador_id", locador.id);

      if (error) throw error;
      return data;
    },
    enabled: !!locador?.id,
  });

  // Query para cambios pendientes de documentos de emergencia
  const { data: cambiosPendientesEmergencia } = useQuery({
    queryKey: ["cambios-pendientes-emergencia", locador?.id],
    queryFn: async () => {
      if (!locador?.id) return [];
      
      const { data, error } = await supabase
        .from("cambios_pendientes_emergencia")
        .select("*")
        .eq("locador_id", locador.id)
        .eq("estado", "pendiente")
        .order("fecha_solicitud", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!locador?.id,
  });

  // Query para links de solicitud de documentos
  const { data: linksSolicitud } = useQuery({
    queryKey: ["config-links-solicitud"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_links_solicitud_documentos")
        .select("*")
        .eq("habilitado", true);

      if (error) throw error;
      return data;
    },
  });

  // Helper para obtener el link de solicitud de un documento
  const getLinkSolicitud = (tipoDocumento: string) => {
    return linksSolicitud?.find(l => l.tipo_documento === tipoDocumento)?.url_solicitud;
  };

  // Helpers para verificar visibilidad
  const isSeccionVisible = (seccionKey: string) => {
    const seccion = configSecciones?.find(s => s.seccion === seccionKey);
    return seccion?.visible ?? true;
  };

  const isItemVisible = (seccionKey: string, itemKey: string) => {
    const seccion = configSecciones?.find(s => s.seccion === seccionKey);
    if (!seccion?.visible) return false;
    
    const item = configItems?.find(i => i.seccion_id === seccion.id && i.item_key === itemKey);
    return item?.visible ?? true;
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada exitosamente");
    window.location.href = "/locador-auth";
  };

  const handleEmailChange = async () => {
    if (!newEmail || !locador) return;

    const { error } = await supabase
      .from("cambios_pendientes_datos")
      .insert({
        locador_id: locador.id,
        campo: "correo",
        valor_actual: locador.correo,
        valor_propuesto: newEmail,
        estado: "pendiente"
      });

    if (error) {
      toast.error("Error al solicitar cambio de correo");
      return;
    }

    toast.success("Solicitud de cambio de correo enviada. Pendiente de aprobación.");
    setEditingEmail(false);
    setNewEmail("");
    queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
    queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-datos", locador.id] });
  };

  // Loading State
  if (loadingLocador) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-foreground">Cargando tu perfil</p>
            <p className="text-sm text-muted-foreground">Un momento por favor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (locadorError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full animate-scale-in shadow-xl border-destructive/20">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Error al cargar</h2>
            <p className="text-muted-foreground text-sm mb-6">{locadorError.message}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!locador) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No se encontró el perfil</p>
      </div>
    );
  }

  // Obtener sección de mis_documentos para verificar items visibles
  const seccionMisDocumentos = configSecciones?.find(s => s.seccion === 'mis_documentos');
  
  // Obtener tipos de documentos permitidos según configuración
  const allowedDocTypes = configItems
    ?.filter(item => {
      if (item.seccion_id !== seccionMisDocumentos?.id) return false;
      if (!item.visible) return false;
      
      if (item.item_key === "constancia_estudios" || item.item_key === "constancia_estudios_sin_fedatear") {
        return locador.requiere_constancia;
      }
      if (item.item_key === "habilidad_vigente") {
        return locador.denominaciones?.requiere_habilidad;
      }
      return true;
    })
    .map(item => item.item_key) || [];

  // Filtrar documentos excluyendo los de CV Documentado para la sección Mis Documentos
  const visibleDocuments = (locador.documentos?.filter((doc: any) => {
    const tipoDoc = doc.tipo_original || doc.tipo_pago;
    
    if (CV_DOCUMENTADO_TYPES.includes(tipoDoc)) {
      return false;
    }
    
    if (tipoDoc) {
      if (tipoDoc === 'constancia_estudios') {
        return false;
      }
      return allowedDocTypes.includes(tipoDoc);
    }
    
    return false;
  }) || []);

  // Lista de tipos de documentos requeridos para "Mis Documentos"
  const misDocumentosTypes = allowedDocTypes.filter(tipo => {
    if (CV_DOCUMENTADO_TYPES.includes(tipo as any)) {
      return false;
    }
    if (tipo === 'constancia_estudios') {
      return false;
    }
    return true;
  });

  // Crear lista completa de Mis Documentos
  const misDocumentosList = misDocumentosTypes.map(tipo => {
    const docSubido = visibleDocuments.find((doc: any) => 
      (doc.tipo_original || doc.tipo_pago) === tipo
    );
    const cambioPendiente = cambiosPendientesDocumentos?.find((c: any) => c.tipo_documento === tipo);
    
    // Check if document is expired
    const isExpired = docSubido?.fecha_vencimiento && new Date(docSubido.fecha_vencimiento) < new Date();
    
    return {
      tipo,
      nombre: DOCUMENTOS_PRIMERA_ETAPA[tipo as keyof typeof DOCUMENTOS_PRIMERA_ETAPA] || tipo.replace(/_/g, ' ').toUpperCase(),
      documento: docSubido,
      cambioPendiente,
      isExpired,
    };
  }).sort((a, b) => {
    const indexA = ORDEN_EXPEDIENTE_ORIGINAL.indexOf(a.tipo);
    const indexB = ORDEN_EXPEDIENTE_ORIGINAL.indexOf(b.tipo);
    
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });

  // Documentos de la sección CV Documentado
  const cvDocumentadoTypes = CV_DOCUMENTADO_TYPES.filter(tipo => {
    if (tipo === 'constancia_estudios_sin_fedatear') {
      return locador.requiere_constancia;
    }
    return true;
  });

  // Obtener documentos subidos de tipo CV Documentado
  const cvDocumentosSubidos = locador.documentos?.filter((doc: any) => {
    const tipoDoc = doc.tipo_original || doc.tipo_pago;
    return cvDocumentadoTypes.includes(tipoDoc);
  }) || [];

  // Crear lista completa de CV Documentado
  const cvDocumentadoList = cvDocumentadoTypes.map(tipo => {
    const docSubido = cvDocumentosSubidos.find((doc: any) => 
      (doc.tipo_original || doc.tipo_pago) === tipo
    );
    const cambioPendiente = cambiosPendientesDocumentos?.find((c: any) => c.tipo_documento === tipo);
    const isExpired = docSubido?.fecha_vencimiento && new Date(docSubido.fecha_vencimiento) < new Date();
    
    return {
      tipo,
      nombre: DOCUMENTOS_PRIMERA_ETAPA[tipo as keyof typeof DOCUMENTOS_PRIMERA_ETAPA] || tipo.replace(/_/g, ' ').toUpperCase(),
      documento: docSubido,
      cambioPendiente,
      isExpired,
    };
  });

  // Determinar pestañas visibles
  const showInfoPersonal = isSeccionVisible('informacion_personal');
  const showInfoLaboral = isSeccionVisible('informacion_laboral');
  const showDescargas = isSeccionVisible('descargas');
  const showCvDocumentado = isSeccionVisible('cv_documentado');
  const showMisDocumentos = isSeccionVisible('mis_documentos') && misDocumentosList.length > 0;
  const showMisEntregas = isSeccionVisible('mis_entregas') && configDocsEmergencia?.some(doc => doc.habilitado);
  const showMisFunciones = funciones && funciones.length > 0;

  // Encontrar la primera pestaña visible
  const getDefaultTab = () => {
    if (showInfoPersonal || showInfoLaboral) return "informacion";
    if (showDescargas) return "descargas";
    if (showCvDocumentado) return "cv_documentado";
    if (showMisDocumentos) return "mis_documentos";
    if (showMisEntregas) return "mis_entregas";
    if (showMisFunciones) return "mis_funciones";
    return "informacion";
  };

  const currentTab = activeTab || getDefaultTab();

  const hasPendingChanges = (cambiosPendientesDatos && cambiosPendientesDatos.length > 0) || 
    (cambiosPendientesDocumentos && cambiosPendientesDocumentos.length > 0);

  const getInitials = () => {
    const first = locador.nombres?.charAt(0) || '';
    const last = locador.apellidos?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  // ============ Notifications for expired/expiring docs ============
  const docNotifications = (() => {
    const notifs: { tipo: string; nombre: string; status: 'vencido' | 'no_subido' | 'por_vencer'; dias?: number; tab: string }[] = [];
    
    // Check misDocumentosList
    misDocumentosList.forEach(item => {
      if (!item.documento) {
        notifs.push({ tipo: item.tipo, nombre: item.nombre, status: 'no_subido', tab: 'mis_documentos' });
      } else if (item.isExpired) {
        notifs.push({ tipo: item.tipo, nombre: item.nombre, status: 'vencido', tab: 'mis_documentos' });
      } else if (item.documento.fecha_vencimiento) {
        const dias = diasHastaVencimiento(item.documento.fecha_vencimiento);
        if (dias <= 30 && dias > 0) {
          notifs.push({ tipo: item.tipo, nombre: item.nombre, status: 'por_vencer', dias, tab: 'mis_documentos' });
        }
      }
    });

    // Check cvDocumentadoList
    cvDocumentadoList.forEach(item => {
      if (!item.documento) {
        notifs.push({ tipo: item.tipo, nombre: item.nombre, status: 'no_subido', tab: 'cv_documentado' });
      } else if (item.isExpired) {
        notifs.push({ tipo: item.tipo, nombre: item.nombre, status: 'vencido', tab: 'cv_documentado' });
      } else if (item.documento.fecha_vencimiento) {
        const dias = diasHastaVencimiento(item.documento.fecha_vencimiento);
        if (dias <= 30 && dias > 0) {
          notifs.push({ tipo: item.tipo, nombre: item.nombre, status: 'por_vencer', dias, tab: 'cv_documentado' });
        }
      }
    });

    return notifs;
  })();

  const adminNotifCount = adminNotificaciones?.length || 0;
  const notifCount = docNotifications.length + adminNotifCount;

  // Tab configuration
  const tabs = [
    { id: "informacion", label: "Información", icon: User, show: showInfoPersonal || showInfoLaboral },
    { id: "descargas", label: "Descargas", icon: Download, show: showDescargas },
    { id: "cv_documentado", label: "CV", icon: FolderOpen, show: showCvDocumentado },
    { id: "mis_documentos", label: "Documentos", icon: FileText, show: showMisDocumentos },
    { id: "mis_entregas", label: "Entregas", icon: Upload, show: showMisEntregas },
    { id: "mis_funciones", label: "Funciones", icon: ClipboardList, show: showMisFunciones },
  ].filter(tab => tab.show);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Modern Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* User Identity */}
            <div className="flex items-center gap-4 min-w-0">
              <AvatarSelector
                locadorId={locador.id}
                currentAvatarId={locador.avatar_id}
                currentAvatarUrl={(locador as any).config_avatars?.ruta_archivo}
                locadorInitials={getInitials()}
                size="md"
                editable={true}
              />
              <div className="min-w-0">
                <h1 className="font-bold text-lg sm:text-xl truncate text-foreground">
                  {locador.nombres} {locador.apellidos}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{locador.unidades?.nombre || 'Sin unidad'}</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Badge 
                className={cn(
                  "hidden sm:flex px-3 py-1 text-xs font-medium",
                  locador.activo 
                    ? "bg-success/10 text-success border-success/20" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}
                variant="outline"
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mr-2",
                  locador.activo ? "bg-success" : "bg-destructive"
                )} />
                {locador.activo ? 'Activo' : 'Inactivo'}
              </Badge>
              
              {/* Notifications Bell */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4" />
                    {notifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse-soft shadow-md">
                        {notifCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <p className="font-semibold text-sm">Notificaciones</p>
                    <p className="text-xs text-muted-foreground">
                      {notifCount > 0 ? `${notifCount} alerta${notifCount > 1 ? 's' : ''}` : 'Sin alertas'}
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifCount === 0 ? (
                      <div className="p-6 text-center">
                        <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Todo en orden</p>
                      </div>
                    ) : (
                      <>
                        {/* Admin notifications */}
                        {adminNotificaciones?.map((an: any) => (
                          <button
                            key={`admin-${an.id}`}
                            onClick={() => setSelectedAdminNotif(an)}
                            className="w-full flex items-start gap-3 px-4 py-3 border-b last:border-b-0 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                          >
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-primary/10">
                              <Megaphone className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{an.nombre}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{an.contenido}</p>
                              <p className="text-xs text-primary font-medium mt-1">Leer más</p>
                            </div>
                          </button>
                        ))}
                        {/* Document notifications */}
                        {docNotifications.map((n, i) => (
                          <button
                            key={`${n.tipo}-${i}`}
                            onClick={() => setActiveTab(n.tab)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                          >
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                              n.status === 'vencido' ? "bg-destructive/10" : n.status === 'no_subido' ? "bg-destructive/10" : "bg-warning/10"
                            )}>
                              {n.status === 'por_vencer' ? (
                                <Clock className="h-4 w-4 text-warning" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{n.nombre}</p>
                              <p className={cn(
                                "text-xs font-medium",
                                n.status === 'vencido' ? "text-destructive" : n.status === 'no_subido' ? "text-destructive" : "text-warning"
                              )}>
                                {n.status === 'vencido' && 'Documento vencido'}
                                {n.status === 'no_subido' && 'No subido'}
                                {n.status === 'por_vencer' && `Vence en ${n.dias} día${n.dias !== 1 ? 's' : ''}`}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Dialog for full admin notification */}
              <Dialog open={!!selectedAdminNotif} onOpenChange={(open) => !open && setSelectedAdminNotif(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      {selectedAdminNotif?.nombre}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {selectedAdminNotif?.contenido}
                  </div>
                </DialogContent>
              </Dialog>


              
              <Button 
                onClick={handleLogout} 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Pending Changes Alert */}
        {hasPendingChanges && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20 animate-fade-in">
            <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Cambios pendientes de aprobación</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {cambiosPendientesDatos?.map((cambio: any) => (
                  <Badge key={cambio.id} variant="secondary" className="text-xs bg-warning/20 text-warning border-0">
                    {cambio.campo}
                  </Badge>
                ))}
                {cambiosPendientesDocumentos?.map((cambio: any) => (
                  <Badge key={cambio.id} variant="secondary" className="text-xs bg-warning/20 text-warning border-0">
                    {cambio.tipo_documento.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={currentTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="h-auto p-1.5 bg-card border rounded-2xl w-full flex gap-1 overflow-x-auto scrollbar-thin shadow-sm">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id}
                value={tab.id} 
                className={cn(
                  "flex-1 min-w-0 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md",
                  "hover:bg-muted/80"
                )}
              >
                <tab.icon className="h-4 w-4 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline truncate">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab: Información */}
          <TabsContent value="informacion" className="mt-0 space-y-6 animate-fade-in">
            {showInfoPersonal && (
              <Section title="Información Personal" icon={User}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {isItemVisible('informacion_personal', 'nombres') && (
                    <InfoField label="Nombres" value={locador.nombres} />
                  )}
                  {isItemVisible('informacion_personal', 'apellidos') && (
                    <InfoField label="Apellidos" value={locador.apellidos} />
                  )}
                  {isItemVisible('informacion_personal', 'numero_documento') && (
                    <InfoField label={locador.tipo_documento || "Documento"} value={locador.numero_documento} />
                  )}
                  {isItemVisible('informacion_personal', 'ruc') && (
                    <InfoField label="RUC" value={locador.ruc} />
                  )}
                  {isItemVisible('informacion_personal', 'celular') && (
                    <InfoField label="Celular" value={locador.celular} icon={Phone} />
                  )}
                  {isItemVisible('informacion_personal', 'correo') && (
                    <div className="p-4 rounded-xl bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo</p>
                        {!editingEmail && (
                          <Button 
                            onClick={() => { setEditingEmail(true); setNewEmail(locador.correo || ""); }} 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 px-2 text-xs text-primary hover:bg-primary/10 -mr-2 -mt-1"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        )}
                      </div>
                      {editingEmail ? (
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="nuevo@correo.com"
                            className="h-9 rounded-xl text-sm"
                          />
                          <Button onClick={handleEmailChange} size="sm" className="h-9 px-3 rounded-xl">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => { setEditingEmail(false); setNewEmail(""); }} size="sm" variant="outline" className="h-9 px-3 rounded-xl">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium truncate">{locador.correo || "—"}</p>
                          {cambiosPendientesDatos?.find((c: any) => c.campo === "correo") && (
                            <Badge variant="secondary" className="text-xs bg-warning/20 text-warning ml-auto">Pendiente</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {showInfoLaboral && (
              <Section title="Información Laboral" icon={Briefcase}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {isItemVisible('informacion_laboral', 'unidad') && (
                    <InfoField label="Unidad" value={locador.unidades?.nombre} highlight />
                  )}
                  {isItemVisible('informacion_laboral', 'denominacion') && (
                    <InfoField label="Denominación" value={locador.denominaciones?.nombre} />
                  )}
                </div>
              </Section>
            )}
          </TabsContent>

          {/* Tab: Descargas */}
          <TabsContent value="descargas" className="mt-0 animate-fade-in">
            <Section title="Expedientes Disponibles" icon={Download}>
              <DescargaExpedienteLocador
                locadorId={locador.id}
                locadorNombre={locador.nombres}
                locadorApellidos={locador.apellidos}
                requiereHabilidad={locador.denominaciones?.requiere_habilidad || false}
                requiereConstancia={locador.requiere_constancia || false}
                visibleItems={{
                  expediente_original: isItemVisible('descargas', 'expediente_original'),
                  expediente_pago: isItemVisible('descargas', 'expediente_pago'),
                  expediente_administrativo: isItemVisible('descargas', 'expediente_administrativo'),
                }}
              />
            </Section>
            <div className="mt-6">
              <Section title="Plantillas Disponibles" icon={FileDown}>
                <PlantillasDescargaLocador />
              </Section>
            </div>
          </TabsContent>

          {/* Tab: CV Documentado */}
          <TabsContent value="cv_documentado" className="mt-0 animate-fade-in">
            <Section 
              title="CV Documentado" 
              icon={FolderOpen}
              badge={`${cvDocumentosSubidos.length}/${cvDocumentadoTypes.length}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {cvDocumentadoList.map((item, index) => {
                  if (!isItemVisible('cv_documentado', item.tipo)) return null;

                  // Subtitles for CV cards
                  const cvSubtitles: Record<string, string> = {
                    cv_documentado: "CV Descriptivo",
                    dni_vigente: "Vigente para la fecha de pago",
                    sustento_cv: "Constancias y Certificados",
                  };
                  
                  // Special handling for constancia_estudios_sin_fedatear with fedateada toggle
                  if (item.tipo === 'constancia_estudios_sin_fedatear' && locador.requiere_constancia) {
                    // Get fedateada document data
                    const fedateadaDoc = locador.documentos?.find((doc: any) => 
                      (doc.tipo_original || doc.tipo_pago) === 'constancia_estudios'
                    );
                    const fedateadaCambioPendiente = cambiosPendientesDocumentos?.find(
                      (c: any) => c.tipo_documento === 'constancia_estudios'
                    );
                    const fedateadaIsExpired = fedateadaDoc?.fecha_vencimiento && new Date(fedateadaDoc.fecha_vencimiento) < new Date();

                    const fedateadaItem = {
                      tipo: 'constancia_estudios',
                      nombre: DOCUMENTOS_PRIMERA_ETAPA['constancia_estudios'],
                      documento: fedateadaDoc,
                      cambioPendiente: fedateadaCambioPendiente,
                      isExpired: fedateadaIsExpired,
                    };

                    const currentItem = showFedateada ? fedateadaItem : item;

                    return (
                      <div key="constancia-toggle-wrapper" className="flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md">
                        {/* Card content - rendered inline without its own border/rounding */}
                        <div className="flex-1">
                          <DocumentCardWrapper
                            item={currentItem}
                            locadorId={locador.id}
                            noBottomRound
                            noBorder
                            index={index}
                          />
                        </div>
                        {/* Integrated tab ears - part of the same card container */}
                        <div className="flex border-t border-border/50">
                          <button
                            onClick={() => setShowFedateada(false)}
                            className={cn(
                              "flex-1 px-4 py-2.5 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5",
                              !showFedateada 
                                ? "bg-primary/5 text-primary" 
                                : "text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            <FileText className="h-3 w-3" />
                            Constancia
                          </button>
                          <div className="w-px bg-border/50" />
                          <button
                            onClick={() => setShowFedateada(true)}
                            className={cn(
                              "flex-1 px-4 py-2.5 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5",
                              showFedateada 
                                ? "bg-primary/5 text-primary" 
                                : "text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Fedateada
                            {/* Info popover */}
                            <Popover>
                              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <span className={cn(
                                  "inline-flex items-center justify-center h-4 w-4 rounded-full cursor-pointer transition-colors",
                                  fedateadaDoc
                                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                                    : "bg-destructive/15 text-destructive hover:bg-destructive/25"
                                )}>
                                  <AlertCircle className="h-2.5 w-2.5" />
                                </span>
                              </PopoverTrigger>
                              <PopoverContent side="top" className="w-64 p-3 rounded-xl text-xs leading-relaxed">
                                <p className="text-foreground">
                                  <span className="font-semibold">¿Ya fedateaste tu constancia?</span>{" "}
                                  Súbela aquí para tenerla en tu expediente y no tener que fedatearla nuevamente.
                                </p>
                              </PopoverContent>
                            </Popover>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <DocumentCardWrapper
                      key={item.tipo}
                      item={item}
                      locadorId={locador.id}
                      subtitle={cvSubtitles[item.tipo] || null}
                      index={index}
                    />
                  );
                })}
              </div>
            </Section>
          </TabsContent>

          {/* Tab: Mis Documentos */}
          <TabsContent value="mis_documentos" className="mt-0 animate-fade-in">
            <Section 
              title="Mis Documentos" 
              icon={FileText}
              badge={`${visibleDocuments.length}/${misDocumentosList.length}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {misDocumentosList.map((item, index) => {
                  const linkSolicitud = getLinkSolicitud(item.tipo);
                  return (
                    <DocumentCardWrapper
                      key={item.tipo}
                      item={item}
                      locadorId={locador.id}
                      linkSolicitud={linkSolicitud}
                      index={index}
                    />
                  );
                })}
              </div>
            </Section>
          </TabsContent>

          {/* Tab: Mis Entregas */}
          <TabsContent value="mis_entregas" className="mt-0 animate-fade-in">
            <Section title="Mis Entregas" icon={Upload}>
              <div className="grid gap-4 sm:grid-cols-2">
                {configDocsEmergencia?.filter(doc => doc.habilitado).map((configDoc, index) => {
                  const docSubido = documentosEmergencia?.find(
                    d => d.documento_key === configDoc.documento_key
                  );
                  const cambioPendiente = cambiosPendientesEmergencia?.find(
                    c => c.documento_key === configDoc.documento_key
                  );
                  const subtitulo = (configDoc as any).subtitulo || "";
                  const textoAyuda = (configDoc as any).texto_ayuda || "";

                  return (
                    <EmergencyDocCardWrapper
                      key={configDoc.documento_key}
                      configDoc={configDoc}
                      docSubido={docSubido}
                      cambioPendiente={cambioPendiente}
                      subtitulo={subtitulo}
                      textoAyuda={textoAyuda}
                      locadorId={locador.id}
                    />
                  );
                })}
              </div>
            </Section>
          </TabsContent>

          {/* Tab: Mis Funciones */}
          <TabsContent value="mis_funciones" className="mt-0 animate-fade-in">
            <Section title="Mis Funciones" icon={ClipboardList} badge={`${funciones?.length || 0}`}>
              {funciones && funciones.length > 0 ? (
                <div className="space-y-3">
                  {funciones.map((funcion, index) => (
                    <div 
                      key={funcion.id} 
                      className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-primary/10"
                    >
                      <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
                        {funcion.numero_orden}
                      </div>
                      <p className="text-sm leading-relaxed pt-1.5">{funcion.descripcion}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={ClipboardList} 
                  title="Sin funciones asignadas" 
                  description="Tu administrador te asignará funciones pronto"
                />
              )}
            </Section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ============ Sub-components ============

const Section = ({ 
  title, 
  icon: Icon, 
  children, 
  badge,
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  badge?: string;
}) => (
  <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden">
    <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold text-base">{title}</h2>
        </div>
        {badge && (
          <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
            {badge}
          </Badge>
        )}
      </div>
    </div>
    <CardContent className="p-5">
      {children}
    </CardContent>
  </Card>
);

const InfoField = ({ 
  label, 
  value, 
  icon: Icon,
  highlight = false 
}: { 
  label: string; 
  value?: string | null;
  icon?: React.ElementType;
  highlight?: boolean;
}) => (
  <div className={cn(
    "p-4 rounded-xl transition-colors",
    highlight ? "bg-primary/5 border border-primary/15" : "bg-muted/40"
  )}>
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <p className={cn(
        "text-sm font-medium truncate",
        highlight && "text-primary"
      )}>{value || "—"}</p>
    </div>
  </div>
);

const DOCS_ACTUALIZAR_ANTES_PAGO = ['sancion_tce', 'consulta_servir'];

const DocumentCardWrapper = ({ 
  item, 
  locadorId, 
  linkSolicitud, 
  subtitle,
  noBottomRound,
  noBorder,
  index 
}: { 
  item: any; 
  locadorId: string; 
  linkSolicitud?: string | null;
  subtitle?: string | null;
  noBottomRound?: boolean;
  noBorder?: boolean;
  index: number;
}) => {
  const showHintPago = DOCS_ACTUALIZAR_ANTES_PAGO.includes(item.tipo);
  const showFooter = linkSolicitud || showHintPago || subtitle;
  if (item.documento) {
    return (
      <div className={cn(
        "relative overflow-hidden transition-all duration-200",
        !noBorder && "border hover:shadow-md",
        noBorder ? "rounded-none" : noBottomRound ? "rounded-t-2xl rounded-b-none" : "rounded-2xl",
        item.isExpired ? "status-expired border-2" : !noBorder && "bg-card"
      )}>
        {item.isExpired && (
          <div className="absolute top-0 left-0 right-0 px-3 py-1.5 bg-[hsl(var(--status-expired))] text-white text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Documento Vencido
          </div>
        )}
        <div className={item.isExpired ? "pt-7" : ""}>
          <DocumentoCard
            documento={item.documento}
            titulo={item.nombre}
            onDelete={() => {}}
            readOnly={true}
            cambioPendiente={item.cambioPendiente}
            reemplazarButton={
              <ReemplazarDocumento
                documentoId={item.documento.id}
                locadorId={locadorId}
                tipoDocumento={item.tipo}
                nombreDocumento={item.documento.nombre_archivo}
              />
            }
          />
        </div>
        {showFooter && (
          <div className="px-4 pb-3 pt-2 flex items-center justify-between flex-wrap">
            {linkSolicitud ? (
              <a
                href={linkSolicitud}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Solicita Aquí
              </a>
            ) : subtitle ? (
              <span className="text-xs font-medium text-primary italic">{subtitle}</span>
            ) : <span />}
            {showHintPago && (
              <span className="text-xs font-semibold text-primary/80 italic">
                Actualizar antes de cada pago
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <EmptyDocCard
      title={item.nombre}
      subtitle={showHintPago ? "Actualizar antes de cada pago" : subtitle || undefined}
      pending={!!item.cambioPendiente}
      linkSolicitud={linkSolicitud}
      noBottomRound={noBottomRound}
      noBorder={noBorder}
      action={
        !item.cambioPendiente && (
          <SubidaDocumentoLocador
            locadorId={locadorId}
            tipoDocumento={item.tipo}
            nombreDocumento={item.nombre}
          />
        )
      }
    />
  );
};

const EmptyDocCard = ({ 
  title, 
  subtitle,
  pending, 
  linkSolicitud,
  noBottomRound,
  noBorder,
  action 
}: { 
  title: string; 
  subtitle?: string;
  pending: boolean;
  linkSolicitud?: string | null;
  noBottomRound?: boolean;
  noBorder?: boolean;
  action?: React.ReactNode;
}) => (
  <div className={cn(
    "p-4 transition-all duration-200",
    !noBorder && "border-2 border-dashed",
    noBorder ? "rounded-none" : noBottomRound ? "rounded-t-2xl rounded-b-none" : "rounded-2xl",
    pending 
      ? !noBorder && "border-warning/40 bg-warning/5" 
      : !noBorder && "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
  )}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
          pending ? "bg-warning/10" : "bg-destructive/10"
        )}>
          {pending ? (
            <Clock className="h-5 w-5 text-warning" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          {pending ? (
            <Badge variant="secondary" className="mt-1.5 text-xs bg-warning/20 text-warning border-0">
              Pendiente de aprobación
            </Badge>
          ) : (
            <p className="text-xs text-destructive font-medium mt-1">No subido</p>
          )}
          {(linkSolicitud || subtitle) && (
            <div className="flex items-center justify-between flex-wrap mt-1.5">
              {linkSolicitud ? (
                <a
                  href={linkSolicitud}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Solicita Aquí
                </a>
              ) : <span />}
              {subtitle && (
                <span className="text-xs font-semibold text-primary italic">{subtitle}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {action}
    </div>
  </div>
);

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) => (
  <div className="text-center py-12">
    <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
      <Icon className="h-8 w-8 text-muted-foreground/50" />
    </div>
    <p className="font-semibold text-sm mb-1">{title}</p>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);

// Parse simple markdown: **bold** and *italic*
const parseFormattedText = (text: string) => {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  
  while (remaining.length > 0) {
    // Match **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Match *italic* (not **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    
    let firstMatch: { index: number; length: number; content: string; type: 'bold' | 'italic' } | null = null;
    
    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = { index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[1], type: 'bold' };
    }
    if (italicMatch && italicMatch.index !== undefined) {
      if (!firstMatch || italicMatch.index < firstMatch.index) {
        firstMatch = { index: italicMatch.index, length: italicMatch[0].length, content: italicMatch[1], type: 'italic' };
      }
    }
    
    if (!firstMatch) {
      parts.push(remaining);
      break;
    }
    
    if (firstMatch.index > 0) {
      parts.push(remaining.substring(0, firstMatch.index));
    }
    
    if (firstMatch.type === 'bold') {
      parts.push(<strong key={key++}>{firstMatch.content}</strong>);
    } else {
      parts.push(<em key={key++}>{firstMatch.content}</em>);
    }
    
    remaining = remaining.substring(firstMatch.index + firstMatch.length);
  }
  
  return <>{parts}</>;
};

const EmergencyDocCardWrapper = ({
  configDoc,
  docSubido,
  cambioPendiente,
  subtitulo,
  textoAyuda,
  locadorId,
}: {
  configDoc: any;
  docSubido: any;
  cambioPendiente: any;
  subtitulo: string;
  textoAyuda: string;
  locadorId: string;
}) => {
  const hasDoc = !!docSubido;
  const isPending = !!cambioPendiente;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage.from("documentos").download(docSubido.ruta_archivo);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = docSubido.nombre_archivo;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
      toast.success("Documento descargado");
    } catch (error) { toast.error("Error al descargar documento"); }
  };

  const handleView = async () => {
    try {
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(docSubido.ruta_archivo, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) { toast.error("Error al abrir documento"); }
  };

  const InfoPopover = () => textoAyuda ? (
    <Popover>
      <PopoverTrigger asChild>
        <span className={cn(
          "inline-flex items-center justify-center h-4 w-4 rounded-full cursor-pointer transition-colors shrink-0",
          hasDoc
            ? "bg-primary/15 text-primary hover:bg-primary/25"
            : "bg-destructive/15 text-destructive hover:bg-destructive/25"
        )}>
          <AlertCircle className="h-2.5 w-2.5" />
        </span>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 p-3 rounded-xl text-xs leading-relaxed">
        <p className="text-foreground">{parseFormattedText(textoAyuda)}</p>
      </PopoverContent>
    </Popover>
  ) : null;

  if (hasDoc) {
    return (
      <div>
        <div className="relative overflow-hidden border border-border/50 rounded-2xl bg-card hover:shadow-md hover:border-border transition-all duration-200 group">
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-medium text-foreground">{configDoc.nombre_display}</h4>
                  {isPending && (
                    <Badge variant="outline" className="bg-orange-500 text-white border-orange-500 animate-pulse shadow-lg rounded-lg text-xs">
                      Cambio Pendiente
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{formatBytes(docSubido.peso_bytes)}</span>
                  <span className="text-border">•</span>
                  <span>{new Date(docSubido.fecha_subida).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200" onClick={handleDownload} title="Descargar">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200" onClick={handleView} title="Ver">
                  <Eye className="h-4 w-4" />
                </Button>
                {!isPending && (
                  <SubidaDocumentoEmergencia
                    locadorId={locadorId}
                    documentoKey={configDoc.documento_key}
                    nombreDocumento={configDoc.nombre_display}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        {(subtitulo || textoAyuda) && (
          <div className="mt-1 px-4 pb-3 pt-2 flex items-center gap-2 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors">
            {subtitulo && (
              <span className="text-xs font-medium text-primary italic">{subtitulo}</span>
            )}
            <InfoPopover />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "border-2 border-dashed rounded-2xl transition-all duration-200 overflow-hidden",
      isPending 
        ? "border-warning/40 bg-warning/5" 
        : "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
    )}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              isPending ? "bg-warning/10" : "bg-destructive/10"
            )}>
              {isPending ? (
                <Clock className="h-5 w-5 text-warning" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{configDoc.nombre_display}</p>
              {isPending ? (
                <Badge variant="secondary" className="mt-1.5 text-xs bg-warning/20 text-warning border-0">
                  Pendiente de aprobación
                </Badge>
              ) : (
                <p className="text-xs text-destructive font-medium mt-1">No subido</p>
              )}
            </div>
          </div>
          {!isPending && (
            <SubidaDocumentoEmergencia
              locadorId={locadorId}
              documentoKey={configDoc.documento_key}
              nombreDocumento={configDoc.nombre_display}
            />
          )}
        </div>
      </div>
      {(subtitulo || textoAyuda) && (
        <div className="px-4 pb-3 pt-2 flex items-center gap-2 border-t border-dashed border-inherit hover:bg-muted/30 transition-colors">
          {subtitulo && (
            <span className="text-xs font-medium text-primary italic">{subtitulo}</span>
          )}
          <InfoPopover />
        </div>
      )}
    </div>
  );
};

export default MiPerfil;
