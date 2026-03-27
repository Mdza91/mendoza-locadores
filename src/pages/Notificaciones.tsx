import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, Check, X, FileText, Mail, AlertTriangle, Settings, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatearFechaCorta, estaVencido, diasHastaVencimiento } from "@/lib/dateUtils";
import { DOCUMENTOS_PRIMERA_ETAPA } from "@/lib/documentTypes";
import { toast } from "sonner";
import { NotificacionesConfig } from "@/components/config/NotificacionesConfig";
import { NotificarAdmin } from "@/components/notificaciones/NotificarAdmin";
import { useEffect } from "react";

const Notificaciones = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Suscripciones Realtime para actualizaciones en tiempo real entre dispositivos
  useEffect(() => {
    const channel = supabase
      .channel("notificaciones-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cambios_pendientes_datos" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-datos"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cambios_pendientes_documentos" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-documentos"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cambios_pendientes_emergencia" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-emergencia"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documentos_emergencia" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["documentos-emergencia-aprobados"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documentos" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["documentos-vencidos"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: configuracion } = useQuery({
    queryKey: ["config-notificaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_notificaciones")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: documentosVencidos } = useQuery({
    queryKey: ["documentos-vencidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select(`
          *,
          locadores!inner(
            id,
            apellidos,
            nombres,
            activo,
            unidades(nombre)
          )
        `)
        .not("fecha_vencimiento", "is", null)
        .eq("locadores.activo", true);

      if (error) throw error;
      return data;
    },
  });

  const getConfiguracion = (tipo: string) => {
    return configuracion?.find((c) => c.tipo === tipo);
  };

  const filtrarDocumentos = () => {
    if (!documentosVencidos) return { vencidos: [], porVencer: [] };

    const configHabilidad = getConfiguracion("habilidad_vigente");
    const configConsultaServir = getConfiguracion("consulta_servir");
    const configSancionTce = getConfiguracion("sancion_tce");
    const configConstanciaEstudios = getConfiguracion("constancia_estudios");

    const vencidos: any[] = [];
    const porVencer: any[] = [];

    documentosVencidos.forEach((doc) => {
      if (!doc.fecha_vencimiento) return;

      let config = null;
      if (doc.tipo_original === "habilidad_vigente") config = configHabilidad;
      if (doc.tipo_original === "consulta_servir") config = configConsultaServir;
      if (doc.tipo_original === "sancion_tce") config = configSancionTce;
      if (doc.tipo_original === "constancia_estudios") config = configConstanciaEstudios;

      if (!config || !config.activa) return;

      const vencido = estaVencido(doc.fecha_vencimiento);
      const dias = diasHastaVencimiento(doc.fecha_vencimiento);

      if (vencido) {
        vencidos.push(doc);
      } else if (dias <= config.dias_anticipacion) {
        porVencer.push({ ...doc, diasRestantes: dias });
      }
    });

    return { vencidos, porVencer };
  };

  const { vencidos, porVencer } = filtrarDocumentos();

  const getNombreDocumento = (tipoKey: string) => {
    return (
      DOCUMENTOS_PRIMERA_ETAPA[tipoKey as keyof typeof DOCUMENTOS_PRIMERA_ETAPA] ||
      tipoKey
    );
  };

  const { data: cambiosDatos } = useQuery({
    queryKey: ["cambios-pendientes-datos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cambios_pendientes_datos")
        .select(`
          *,
          locadores!inner(
            id,
            apellidos,
            nombres,
            activo,
            unidades(nombre)
          )
        `)
        .eq("estado", "pendiente")
        .eq("locadores.activo", true)
        .order("fecha_solicitud", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: cambiosDocumentos } = useQuery({
    queryKey: ["cambios-pendientes-documentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cambios_pendientes_documentos")
        .select(`
          *,
          locadores!inner(
            id,
            apellidos,
            nombres,
            activo,
            unidades(nombre)
          ),
          documentos(
            nombre_archivo,
            ruta_archivo
          )
        `)
        .eq("estado", "pendiente")
        .eq("locadores.activo", true)
        .order("fecha_solicitud", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: cambiosEmergencia } = useQuery({
    queryKey: ["cambios-pendientes-emergencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cambios_pendientes_emergencia")
        .select(`
          *,
          locadores!inner(
            id,
            apellidos,
            nombres,
            activo,
            unidades(nombre)
          ),
          documentos_emergencia(
            ruta_archivo
          )
        `)
        .eq("estado", "pendiente")
        .eq("locadores.activo", true)
        .order("fecha_solicitud", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: documentosEmergenciaAprobados } = useQuery({
    queryKey: ["documentos-emergencia-aprobados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_emergencia")
        .select(`
          *,
          locadores!inner(
            id,
            apellidos,
            nombres,
            activo,
            unidades(nombre)
          )
        `)
        .eq("locadores.activo", true)
        .order("fecha_subida", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleAprobarCambioDato = async (cambio: any) => {
    try {
      const { error: updateError } = await supabase
        .from("locadores")
        .update({ [cambio.campo]: cambio.valor_propuesto })
        .eq("id", cambio.locador_id);

      if (updateError) throw updateError;

      const { error: statusError } = await supabase
        .from("cambios_pendientes_datos")
        .update({
          estado: "aprobado",
          fecha_resolucion: new Date().toISOString(),
          resuelto_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", cambio.id);

      if (statusError) throw statusError;

      toast.success("Cambio aprobado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-datos"] });
    } catch (error) {
      console.error("Error al aprobar cambio:", error);
      toast.error("Error al aprobar el cambio");
    }
  };

  const handleRechazarCambioDato = async (cambio: any) => {
    try {
      const { error } = await supabase
        .from("cambios_pendientes_datos")
        .update({
          estado: "rechazado",
          fecha_resolucion: new Date().toISOString(),
          resuelto_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", cambio.id);

      if (error) throw error;

      toast.success("Cambio rechazado");
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-datos"] });
    } catch (error) {
      console.error("Error al rechazar cambio:", error);
      toast.error("Error al rechazar el cambio");
    }
  };

  const handleAprobarCambioDocumento = async (cambio: any) => {
    try {
      const isNewDocument = !cambio.documento_id;

      if (isNewDocument) {
        const insertData: any = {
          locador_id: cambio.locador_id,
          nombre_archivo: cambio.nombre_archivo_nuevo,
          ruta_archivo: cambio.ruta_archivo_nuevo,
          peso_bytes: cambio.peso_bytes_nuevo,
          tipo_original: cambio.tipo_documento,
          etapa: "original",
          fecha_subida: new Date().toISOString(),
        };

        if (cambio.fecha_vencimiento_nueva) {
          insertData.fecha_vencimiento = cambio.fecha_vencimiento_nueva;
        }

        const { error: insertError } = await supabase
          .from("documentos")
          .insert(insertData);

        if (insertError) throw insertError;
      } else {
        if (cambio.documentos?.ruta_archivo) {
          await supabase.storage
            .from("documentos")
            .remove([cambio.documentos.ruta_archivo]);
        }

        const updateData: any = {
          nombre_archivo: cambio.nombre_archivo_nuevo,
          ruta_archivo: cambio.ruta_archivo_nuevo,
          peso_bytes: cambio.peso_bytes_nuevo,
          fecha_subida: new Date().toISOString(),
        };

        if (cambio.fecha_vencimiento_nueva) {
          updateData.fecha_vencimiento = cambio.fecha_vencimiento_nueva;
        }

        const { error: updateError } = await supabase
          .from("documentos")
          .update(updateData)
          .eq("id", cambio.documento_id);

        if (updateError) throw updateError;
      }

      const { error: statusError } = await supabase
        .from("cambios_pendientes_documentos")
        .update({
          estado: "aprobado",
          fecha_resolucion: new Date().toISOString(),
          resuelto_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", cambio.id);

      if (statusError) throw statusError;

      toast.success(isNewDocument ? "Documento creado exitosamente" : "Documento aprobado y actualizado");
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-documentos"] });
    } catch (error) {
      console.error("Error al aprobar documento:", error);
      toast.error("Error al aprobar el documento");
    }
  };

  const handleRechazarCambioDocumento = async (cambio: any) => {
    try {
      const { error: deleteError } = await supabase.storage
        .from("documentos")
        .remove([cambio.ruta_archivo_nuevo]);

      if (deleteError) throw deleteError;

      const { error: statusError } = await supabase
        .from("cambios_pendientes_documentos")
        .update({
          estado: "rechazado",
          fecha_resolucion: new Date().toISOString(),
          resuelto_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", cambio.id);

      if (statusError) throw statusError;

      toast.success("Cambio de documento rechazado");
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-documentos"] });
    } catch (error) {
      console.error("Error al rechazar documento:", error);
      toast.error("Error al rechazar el cambio");
    }
  };

  const TAB_TRIGGER_CLASS = "w-full justify-start px-4 py-2.5 text-left gap-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-muted/60";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notificaciones</h1>
        <p className="text-muted-foreground">
          Centro de notificaciones y alertas
        </p>
      </div>

      <Tabs defaultValue="alertas" className="flex flex-col md:flex-row md:items-start gap-6">
        <TabsList className="flex flex-col h-auto w-full md:w-64 shrink-0 bg-card/60 backdrop-blur-sm p-2 rounded-2xl border border-border shadow-sm">
          <TabsTrigger value="alertas" className={TAB_TRIGGER_CLASS}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="notificar" className={TAB_TRIGGER_CLASS}>
            <Send className="h-4 w-4 shrink-0" />
            Notificar
          </TabsTrigger>
          <TabsTrigger value="ajustes" className={TAB_TRIGGER_CLASS}>
            <Settings className="h-4 w-4 shrink-0" />
            Ajustes
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="alertas" className="mt-0">
            <Tabs defaultValue="sistema" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="sistema">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Sistema
                </TabsTrigger>
                <TabsTrigger value="usuarios">
                  <Eye className="h-4 w-4 mr-2" />
                  Usuarios
                  {(cambiosDatos?.length || 0) + (cambiosDocumentos?.length || 0) > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {(cambiosDatos?.length || 0) + (cambiosDocumentos?.length || 0)}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="emergencia">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergencia
                  {(cambiosEmergencia?.length || 0) > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {cambiosEmergencia?.length || 0}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sistema" className="space-y-6">
                {vencidos.length === 0 && porVencer.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay notificaciones pendientes. Todos los documentos están al día.
                    </AlertDescription>
                  </Alert>
                )}

                {vencidos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="destructive">{vencidos.length}</Badge>
                        Documentos Vencidos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {vencidos.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border border-destructive rounded-lg bg-destructive/5"
                          >
                            <div className="flex-1">
                              <p className="font-semibold uppercase">
                                {doc.locadores.apellidos}, {doc.locadores.nombres}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {doc.locadores.unidades?.nombre}
                              </p>
                              <p className="text-sm mt-1">
                                <span className="font-medium">
                                  {getNombreDocumento(doc.tipo_original)}
                                </span>{" "}
                                • Vencido el {formatearFechaCorta(doc.fecha_vencimiento)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="destructive">Vencido</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/locadores/${doc.locadores.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Perfil
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {porVencer.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary">{porVencer.length}</Badge>
                        Documentos Por Vencer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {porVencer.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border border-yellow-500 rounded-lg bg-yellow-500/5"
                          >
                            <div className="flex-1">
                              <p className="font-semibold uppercase">
                                {doc.locadores.apellidos}, {doc.locadores.nombres}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {doc.locadores.unidades?.nombre}
                              </p>
                              <p className="text-sm mt-1">
                                <span className="font-medium">
                                  {getNombreDocumento(doc.tipo_original)}
                                </span>{" "}
                                • Vence el {formatearFechaCorta(doc.fecha_vencimiento)}
                              </p>
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                {doc.diasRestantes} día{doc.diasRestantes !== 1 ? "s" : ""}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/locadores/${doc.locadores.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Perfil
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="usuarios" className="space-y-6">
                {(cambiosDatos?.length === 0 && cambiosDocumentos?.length === 0) && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay cambios pendientes de aprobación.
                    </AlertDescription>
                  </Alert>
                )}

                {cambiosDatos && cambiosDatos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary">{cambiosDatos.length}</Badge>
                        Cambios de Información Personal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {cambiosDatos.map((cambio: any) => (
                          <div
                            key={cambio.id}
                            className="p-4 border rounded-lg bg-card space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold uppercase">
                                  {cambio.locadores.apellidos}, {cambio.locadores.nombres}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {cambio.locadores.unidades?.nombre}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Solicitado el {formatearFechaCorta(cambio.fecha_solicitud)}
                                </p>
                              </div>
                              <Badge variant="outline">
                                <Mail className="h-3 w-3 mr-1" />
                                {cambio.campo === "correo" ? "Correo" : cambio.campo}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Valor Actual
                                </p>
                                <p className="font-medium">{cambio.valor_actual}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Valor Propuesto
                                </p>
                                <p className="font-medium text-primary">{cambio.valor_propuesto}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRechazarCambioDato(cambio)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAprobarCambioDato(cambio)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {cambiosDocumentos && cambiosDocumentos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary">{cambiosDocumentos.length}</Badge>
                        Cambios de Documentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {cambiosDocumentos.map((cambio: any) => (
                          <div
                            key={cambio.id}
                            className="p-4 border rounded-lg bg-card space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold uppercase">
                                  {cambio.locadores.apellidos}, {cambio.locadores.nombres}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {cambio.locadores.unidades?.nombre}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Solicitado el {formatearFechaCorta(cambio.fecha_solicitud)}
                                </p>
                              </div>
                              <Badge variant="outline">
                                <FileText className="h-3 w-3 mr-1" />
                                {getNombreDocumento(cambio.tipo_documento)}
                              </Badge>
                            </div>

                            <div className={`grid ${cambio.documentos ? 'grid-cols-2' : 'grid-cols-1'} gap-4 p-3 bg-muted/50 rounded`}>
                              {cambio.documentos ? (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Documento Actual
                                  </p>
                                  <p className="font-medium text-sm mb-2">
                                    {cambio.documentos.nombre_archivo}
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const { data } = await supabase.storage
                                        .from("documentos")
                                        .createSignedUrl(cambio.documentos.ruta_archivo, 60);
                                      if (data) window.open(data.signedUrl, "_blank");
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-2" />
                                    Ver Actual
                                  </Button>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Estado
                                  </p>
                                  <Badge variant="secondary">Documento Nuevo</Badge>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  {cambio.documentos ? 'Documento Propuesto' : 'Documento a Crear'}
                                </p>
                                <p className="font-medium text-sm mb-2 text-primary">
                                  {cambio.nombre_archivo_nuevo}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from("documentos")
                                      .createSignedUrl(cambio.ruta_archivo_nuevo, 60);
                                    if (data) window.open(data.signedUrl, "_blank");
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-2" />
                                  Ver Documento
                                </Button>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRechazarCambioDocumento(cambio)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAprobarCambioDocumento(cambio)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="emergencia" className="space-y-6">
                {(!cambiosEmergencia || cambiosEmergencia.length === 0) && (!documentosEmergenciaAprobados || documentosEmergenciaAprobados.length === 0) && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No hay documentos de emergencia pendientes ni aprobados.
                    </AlertDescription>
                  </Alert>
                )}

                {cambiosEmergencia && cambiosEmergencia.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="destructive">{cambiosEmergencia.length}</Badge>
                        Pendientes de Aprobación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {cambiosEmergencia.map((cambio: any) => (
                          <div
                            key={cambio.id}
                            className="p-4 border border-orange-500 rounded-lg bg-orange-500/5 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold uppercase">
                                  {cambio.locadores?.apellidos}, {cambio.locadores?.nombres}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {cambio.locadores?.unidades?.nombre}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Solicitado el {formatearFechaCorta(cambio.fecha_solicitud)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="border-orange-500 text-orange-700">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {cambio.nombre_documento}
                                </Badge>
                                {cambio.es_reemplazo && (
                                  <Badge variant="secondary">Reemplazo</Badge>
                                )}
                              </div>
                            </div>

                            <div className="p-3 bg-muted/50 rounded space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Archivo a Aprobar
                              </p>
                              <p className="font-medium text-sm text-primary">
                                {cambio.nombre_archivo_nuevo}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const { data } = await supabase.storage
                                    .from("documentos")
                                    .createSignedUrl(cambio.ruta_archivo_nuevo, 60);
                                  if (data) window.open(data.signedUrl, "_blank");
                                }}
                              >
                                <Eye className="h-3 w-3 mr-2" />
                                Ver Documento
                              </Button>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await supabase.storage
                                      .from("documentos")
                                      .remove([cambio.ruta_archivo_nuevo]);

                                    const { error } = await supabase
                                      .from("cambios_pendientes_emergencia")
                                      .update({
                                        estado: "rechazado",
                                        fecha_resolucion: new Date().toISOString(),
                                        resuelto_por: (await supabase.auth.getUser()).data.user?.id,
                                      })
                                      .eq("id", cambio.id);

                                    if (error) throw error;

                                    toast.success("Documento rechazado");
                                    queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-emergencia"] });
                                  } catch (error) {
                                    console.error("Error al rechazar:", error);
                                    toast.error("Error al rechazar el documento");
                                  }
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    if (cambio.es_reemplazo && cambio.documento_emergencia_id) {
                                      if (cambio.documentos_emergencia?.ruta_archivo) {
                                        await supabase.storage
                                          .from("documentos")
                                          .remove([cambio.documentos_emergencia.ruta_archivo]);
                                      }

                                      const { error: updateError } = await supabase
                                        .from("documentos_emergencia")
                                        .update({
                                          nombre_archivo: cambio.nombre_archivo_nuevo,
                                          ruta_archivo: cambio.ruta_archivo_nuevo,
                                          peso_bytes: cambio.peso_bytes_nuevo,
                                          fecha_subida: new Date().toISOString(),
                                        })
                                        .eq("id", cambio.documento_emergencia_id);

                                      if (updateError) throw updateError;
                                    } else {
                                      const { error: insertError } = await supabase
                                        .from("documentos_emergencia")
                                        .insert({
                                          locador_id: cambio.locador_id,
                                          documento_key: cambio.documento_key,
                                          nombre_archivo: cambio.nombre_archivo_nuevo,
                                          ruta_archivo: cambio.ruta_archivo_nuevo,
                                          peso_bytes: cambio.peso_bytes_nuevo,
                                        });

                                      if (insertError) throw insertError;
                                    }

                                    const { error: statusError } = await supabase
                                      .from("cambios_pendientes_emergencia")
                                      .update({
                                        estado: "aprobado",
                                        fecha_resolucion: new Date().toISOString(),
                                        resuelto_por: (await supabase.auth.getUser()).data.user?.id,
                                      })
                                      .eq("id", cambio.id);

                                    if (statusError) throw statusError;

                                    toast.success("Documento aprobado exitosamente");
                                    queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-emergencia"] });
                                    queryClient.invalidateQueries({ queryKey: ["documentos-emergencia-aprobados"] });
                                  } catch (error) {
                                    console.error("Error al aprobar:", error);
                                    toast.error("Error al aprobar el documento");
                                  }
                                }}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {documentosEmergenciaAprobados && documentosEmergenciaAprobados.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary">{documentosEmergenciaAprobados.length}</Badge>
                        Documentos de Emergencia Aprobados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {documentosEmergenciaAprobados.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="p-4 border rounded-lg bg-card space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold uppercase">
                                  {doc.locadores?.apellidos}, {doc.locadores?.nombres}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {doc.locadores?.unidades?.nombre}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Subido el {formatearFechaCorta(doc.fecha_subida)}
                                </p>
                              </div>
                              <Badge variant="outline">
                                <FileText className="h-3 w-3 mr-1" />
                                {doc.documento_key === "documento_01" ? "Documento 01" : "Documento 02"}
                              </Badge>
                            </div>

                            <div className="p-3 bg-muted/50 rounded space-y-2">
                              <p className="font-medium text-sm">
                                {doc.nombre_archivo}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const { data } = await supabase.storage
                                    .from("documentos")
                                    .createSignedUrl(doc.ruta_archivo, 60);
                                  if (data) window.open(data.signedUrl, "_blank");
                                }}
                              >
                                <Eye className="h-3 w-3 mr-2" />
                                Ver Documento
                              </Button>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm("¿Estás seguro de eliminar este documento de emergencia?")) return;
                                  
                                  try {
                                    await supabase.storage
                                      .from("documentos")
                                      .remove([doc.ruta_archivo]);

                                    const { error } = await supabase
                                      .from("documentos_emergencia")
                                      .delete()
                                      .eq("id", doc.id);

                                    if (error) throw error;

                                    toast.success("Documento eliminado exitosamente");
                                    queryClient.invalidateQueries({ queryKey: ["documentos-emergencia-aprobados"] });
                                  } catch (error) {
                                    console.error("Error al eliminar:", error);
                                    toast.error("Error al eliminar el documento");
                                  }
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="notificar" className="mt-0">
            <NotificarAdmin />
          </TabsContent>

          <TabsContent value="ajustes" className="mt-0">
            <NotificacionesConfig />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Notificaciones;
