import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, LogOut, Mail, User, FileText, ClipboardList, BarChart3 } from "lucide-react";
import { SubidaDocumento } from "@/components/documento/SubidaDocumento";
import { DocumentoCard } from "@/components/documento/DocumentoCard";
import { DescargaExpediente } from "@/components/expediente/DescargaExpediente";
import { ReemplazarDocumento } from "@/components/documento/ReemplazarDocumento";
import { FuncionesLocador } from "@/components/locador/FuncionesLocador";
import { LocadorFormDialog } from "@/components/locador/LocadorFormDialog";
import { toast } from "sonner";
import {
  DOCUMENTOS_PRIMERA_ETAPA,
  DOCUMENTOS_SEGUNDA_ETAPA,
  ORDEN_EXPEDIENTE_ORIGINAL,
} from "@/lib/documentTypes";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/useUserRole";

const PerfilLocador = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, loading: roleLoading } = useUserRole();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!roleLoading && role === "locador") {
      toast.error("No tienes permiso para acceder a esta página");
      navigate("/mi-perfil", { replace: true });
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const { data: locador, isLoading } = useQuery({
    queryKey: ["locador", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locadores")
        .select(`*, unidades(nombre), denominaciones(nombre, requiere_habilidad)`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: documentos, refetch: refetchDocumentos } = useQuery({
    queryKey: ["documentos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentos").select("*").eq("locador_id", id).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: cambiosPendientesDocumentos } = useQuery({
    queryKey: ["cambios-pendientes-documentos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cambios_pendientes_documentos").select("*").eq("locador_id", id).eq("estado", "pendiente").order("fecha_solicitud", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cambiosPendientesDatos } = useQuery({
    queryKey: ["cambios-pendientes-datos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cambios_pendientes_datos").select("*").eq("locador_id", id).eq("estado", "pendiente").order("fecha_solicitud", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: configDocumentosVisibles } = useQuery({
    queryKey: ["config-documentos-visibles-locadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_documentos_visibles_locadores").select("*");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  if (!locador) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-muted-foreground">Locador no encontrado</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
  const formatDate = (date: string) => {
    const [year, month, day] = date.split("T")[0].split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" });
  };

  const handleLogout = async () => { await supabase.auth.signOut(); toast.success("Sesión cerrada exitosamente"); navigate("/locador-auth"); };

  const handleSaveEmail = async () => {
    if (!newEmail || newEmail === locador?.correo) { toast.error("Ingresa un correo diferente"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error("Ingresa un correo válido"); return; }
    try {
      const { error } = await supabase.from("cambios_pendientes_datos").insert({ locador_id: id, campo: "correo", valor_actual: locador.correo, valor_propuesto: newEmail });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cambios-pendientes-datos", id] });
      toast.success("Cambio enviado. Pendiente de aprobación por administrador");
      setIsEditingEmail(false); setNewEmail("");
    } catch (error) { toast.error("Error al enviar el cambio"); }
  };

  const isOwnProfile = locador?.user_id === currentUserId;

  const allowedDocuments = configDocumentosVisibles
    ?.filter(config => {
      if (config.tipo_documento === "constancia_estudios") return config.visible && locador?.requiere_constancia;
      if (config.tipo_documento === "habilidad_vigente") return config.visible && locador?.denominaciones?.requiere_habilidad;
      return config.visible;
    })
    .map(config => config.tipo_documento) || [];

  const getFilteredDocuments = () => {
    if (!documentos) return [];
    return documentos.filter(doc => {
      if (doc.tipo_original && allowedDocuments.includes(doc.tipo_original)) return true;
      if (allowedDocuments.includes("constancia_estudios") && doc.etapa === "original" && doc.tipo_original === null && doc.nombre_archivo?.startsWith("Constancia_de_Estudios")) return true;
      return false;
    });
  };

  // Vista para locadores (su propio perfil)
  if (isOwnProfile) {
    const filteredDocs = getFilteredDocuments();
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Mi Perfil</h1>
              <p className="text-muted-foreground text-lg">{locador.unidades.nombre}</p>
            </div>
            <Button variant="default" size="lg" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Cerrar Sesión</Button>
          </div>
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Información Personal</CardTitle>
                <Badge variant={locador.activo ? "default" : "secondary"} className={`text-sm px-3 py-1 ${locador.activo ? "bg-success hover:bg-success/90" : ""}`}>{locador.activo ? "Activo" : "Inactivo"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">Nombres Completos</p><p className="text-lg font-semibold text-foreground uppercase">{locador.apellidos}, {locador.nombres}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">{locador.tipo_documento}</p><p className="text-lg font-medium">{locador.numero_documento}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">RUC</p><p className="text-lg font-medium">{locador.ruc}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">Celular</p><p className="text-lg font-medium">{locador.celular}</p></div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Correo Electrónico</p>
                  {isEditingEmail ? (
                    <div className="flex gap-2 items-center">
                      <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={locador.correo} className="max-w-xs" />
                      <Button size="sm" onClick={handleSaveEmail}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => { setIsEditingEmail(false); setNewEmail(""); }}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <p className="text-lg font-medium">{locador.correo}</p>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingEmail(true); setNewEmail(locador.correo); }}><Mail className="h-4 w-4" /></Button>
                      </div>
                      {cambiosPendientesDatos?.find((c: any) => c.campo === "correo") && (
                        <Badge variant="outline" className="bg-orange-500 text-white border-orange-500 animate-pulse shadow-lg">Cambio de correo pendiente de aprobación</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">Remuneración</p><p className="text-lg font-bold text-primary">{formatCurrency(Number(locador.remuneracion))}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">Banco</p><p className="text-lg font-medium">{locador.banco}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">CCI</p><p className="text-lg font-medium">{locador.cci}</p></div>
                <div className="md:col-span-2 space-y-1"><p className="text-sm font-medium text-muted-foreground">Dirección</p><p className="text-lg font-medium">{locador.direccion}</p></div>
                <div className="md:col-span-2 space-y-1"><p className="text-sm font-medium text-muted-foreground">Denominación de Servicio</p><p className="text-lg font-medium">{locador.denominaciones.nombre}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-3"><CardTitle className="text-2xl">Mis Documentos</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredDocs.length > 0 ? filteredDocs.map((doc) => {
                  let titulo = "";
                  if (doc.tipo_original && doc.tipo_original in DOCUMENTOS_PRIMERA_ETAPA) titulo = DOCUMENTOS_PRIMERA_ETAPA[doc.tipo_original as keyof typeof DOCUMENTOS_PRIMERA_ETAPA];
                  else if (doc.nombre_archivo?.startsWith("Constancia_de_Estudios")) titulo = "Constancia de Estudios";
                  const cambioPendiente = cambiosPendientesDocumentos?.find((c: any) => c.documento_id === doc.id);
                  return (
                    <div key={doc.id} className="flex items-center gap-2">
                      <div className="flex-1"><DocumentoCard documento={doc} titulo={titulo} onDelete={() => {}} readOnly={true} cambioPendiente={cambioPendiente} /></div>
                      <ReemplazarDocumento documentoId={doc.id} locadorId={id!} tipoDocumento={doc.tipo_original || "constancia_estudios"} nombreDocumento={titulo} />
                    </div>
                  );
                }) : (
                  <div className="text-center py-12"><p className="text-muted-foreground text-lg">No hay documentos disponibles</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Vista para administradores - Rediseño moderno
  const InfoItem = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
    <div className={`p-4 rounded-xl bg-muted/40 space-y-1 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/locadores")} className="rounded-xl hover:bg-muted/60 transition-all duration-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground uppercase">{locador.apellidos}, {locador.nombres}</h1>
              <Badge variant={locador.activo ? "default" : "secondary"} className={`rounded-lg ${locador.activo ? "bg-success hover:bg-success/90" : ""}`}>
                {locador.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{locador.unidades.nombre} • {locador.denominaciones.nombre}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="rounded-xl gap-2 hover:bg-muted/60 transition-all duration-200">
            <Edit className="h-4 w-4" />Editar
          </Button>
          <DescargaExpediente locadorId={id!} locadorNombre={locador.nombres} locadorApellidos={locador.apellidos} requiereHabilidad={locador.denominaciones.requiere_habilidad} requiereConstancia={locador.requiere_constancia} />
        </div>
      </div>

      {/* Tabs modernos */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid h-auto p-1.5 bg-muted/40 backdrop-blur-sm rounded-2xl border border-border/30">
          <TabsTrigger value="info" className="gap-2 py-3 px-5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground transition-all duration-200">
            <User className="h-4 w-4" /><span className="hidden sm:inline">Información</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2 py-3 px-5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground transition-all duration-200">
            <FileText className="h-4 w-4" /><span className="hidden sm:inline">Documentación</span>
          </TabsTrigger>
          <TabsTrigger value="funciones" className="gap-2 py-3 px-5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground transition-all duration-200">
            <ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Funciones</span>
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="gap-2 py-3 px-5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground transition-all duration-200">
            <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Estadísticas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información */}
        <TabsContent value="info" className="mt-0 animate-fade-in">
          <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30">
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <InfoItem label={locador.tipo_documento} value={locador.numero_documento} />
                <InfoItem label="RUC" value={locador.ruc} />
                <InfoItem label="Celular" value={locador.celular} />
                <InfoItem label="Correo" value={locador.correo} />
                <InfoItem label="Remuneración" value={formatCurrency(Number(locador.remuneracion))} />
                <InfoItem label="Banco" value={locador.banco} />
                <InfoItem label="CCI" value={locador.cci} />
                <InfoItem label="Inicio de Actividades" value={formatDate(locador.inicio_actividades)} />
                {locador.tiene_fin_actividades && locador.fin_actividades && (
                  <InfoItem label="Fin de Actividades" value={formatDate(locador.fin_actividades)} />
                )}
                <InfoItem label="Dirección" value={locador.direccion} className="md:col-span-2 lg:col-span-3" />
                <InfoItem label="Denominación de Servicio" value={locador.denominaciones.nombre} className="md:col-span-2 lg:col-span-3" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentación */}
        <TabsContent value="documentos" className="mt-0 animate-fade-in">
          <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30">
              <CardTitle className="text-lg">Documentación</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Tabs defaultValue="original" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 rounded-xl h-auto p-1 bg-muted/40">
                  <TabsTrigger value="original" className="rounded-lg py-2.5 text-sm data-[state=active]:shadow-sm transition-all duration-200">Primera Etapa - Documentos Originales</TabsTrigger>
                  <TabsTrigger value="pago" className="rounded-lg py-2.5 text-sm data-[state=active]:shadow-sm transition-all duration-200">Segunda Etapa - Documentos para Pago</TabsTrigger>
                </TabsList>
                
                <TabsContent value="original" className="space-y-4 animate-fade-in">
                  <SubidaDocumento locadorId={id!} etapa="original" requiereHabilidad={locador.denominaciones.requiere_habilidad} documentosSubidos={documentos?.filter((d) => d.etapa === "original").map((d) => d.tipo_original).filter(Boolean) || []} onSuccess={refetchDocumentos} />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Documentos Subidos</h3>
                    {ORDEN_EXPEDIENTE_ORIGINAL.map((tipoKey) => {
                      if (tipoKey === "habilidad_vigente" && !locador.denominaciones.requiere_habilidad) return null;
                      if ((tipoKey === "constancia_estudios" || tipoKey === "constancia_estudios_sin_fedatear") && !locador.requiere_constancia) return null;
                      const doc = documentos?.find((d) => d.tipo_original === tipoKey && d.etapa === "original");
                      if (!doc) return null;
                      return <DocumentoCard key={doc.id} documento={doc} titulo={DOCUMENTOS_PRIMERA_ETAPA[tipoKey as keyof typeof DOCUMENTOS_PRIMERA_ETAPA]} onDelete={refetchDocumentos} />;
                    })}
                    {!documentos?.some((d) => d.etapa === "original") && <p className="text-center text-muted-foreground py-8">No hay documentos de primera etapa</p>}
                  </div>
                </TabsContent>
                
                <TabsContent value="pago" className="space-y-4 animate-fade-in">
                  <SubidaDocumento locadorId={id!} etapa="pago" requiereHabilidad={false} documentosSubidos={documentos?.filter((d) => d.etapa === "pago").map((d) => d.tipo_pago).filter(Boolean) || []} onSuccess={refetchDocumentos} />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Documentos Subidos</h3>
                    {Object.entries(DOCUMENTOS_SEGUNDA_ETAPA).map(([tipoKey, nombre]) => {
                      const doc = documentos?.find((d) => d.tipo_pago === tipoKey && d.etapa === "pago");
                      if (!doc) return null;
                      return <DocumentoCard key={doc.id} documento={doc} titulo={nombre} onDelete={refetchDocumentos} />;
                    })}
                    {!documentos?.some((d) => d.etapa === "pago") && <p className="text-center text-muted-foreground py-8">No hay documentos de segunda etapa</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Funciones */}
        <TabsContent value="funciones" className="mt-0 animate-fade-in">
          <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30">
              <CardTitle className="text-lg">Funciones del Locador</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <FuncionesLocador locadorId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="estadisticas" className="mt-0 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Documentos Subidos", value: documentos?.length || 0, color: "text-primary" },
              { label: "Documentos Originales", value: documentos?.filter((d) => d.etapa === "original").length || 0, color: "text-success" },
              { label: "Documentos para Pago", value: documentos?.filter((d) => d.etapa === "pago").length || 0, color: "text-warning" },
            ].map((stat, i) => (
              <Card key={i} className="rounded-2xl border border-border/50 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
                <CardContent className="pt-6 pb-6">
                  <p className="text-sm font-medium text-muted-foreground mb-2">{stat.label}</p>
                  <p className={`text-4xl font-bold ${stat.color} transition-transform duration-300 group-hover:scale-105`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <LocadorFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        locadorId={id}
      />
    </div>
  );
};

export default PerfilLocador;
