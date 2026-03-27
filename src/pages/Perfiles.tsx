import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeccionesVisiblesLocadores } from "@/components/config/SeccionesVisiblesLocadores";
import { LinksSolicitudConfig } from "@/components/config/LinksSolicitudConfig";
import { AvatarsConfig } from "@/components/config/AvatarsConfig";
import { DocumentosEmergenciaConfig } from "@/components/config/DocumentosEmergenciaConfig";
import { TimeoutInactividadConfig } from "@/components/config/TimeoutInactividadConfig";
import { Users, Link2, ImageIcon, FileWarning, Timer, UserCog, FileDown } from "lucide-react";
import { lazy, Suspense } from "react";
import { PlantillasUsuariosConfig } from "@/components/config/PlantillasUsuariosConfig";

const Usuarios = lazy(() => import("@/pages/Usuarios"));

const TAB_TRIGGER_CLASS = "w-full justify-start px-4 py-2.5 text-left gap-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-muted/60";

const Perfiles = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Perfiles</h1>
        <p className="text-muted-foreground">Configuración del perfil de los locadores</p>
      </div>

      <Tabs defaultValue="visibilidad-locadores" className="flex flex-col md:flex-row md:items-start gap-6">
        <TabsList className="flex flex-col h-auto w-full md:w-64 shrink-0 bg-card/60 backdrop-blur-sm p-2 rounded-2xl border border-border shadow-sm">
          <TabsTrigger value="visibilidad-locadores" className={TAB_TRIGGER_CLASS}>
            <Users className="h-4 w-4 shrink-0" />
            Perfil Locadores
          </TabsTrigger>
          <TabsTrigger value="usuarios" className={TAB_TRIGGER_CLASS}>
            <UserCog className="h-4 w-4 shrink-0" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="links-solicitud" className={TAB_TRIGGER_CLASS}>
            <Link2 className="h-4 w-4 shrink-0" />
            Links de Solicitud
          </TabsTrigger>
          <TabsTrigger value="avatars" className={TAB_TRIGGER_CLASS}>
            <ImageIcon className="h-4 w-4 shrink-0" />
            Avatares
          </TabsTrigger>
          <TabsTrigger value="documentos-emergencia" className={TAB_TRIGGER_CLASS}>
            <FileWarning className="h-4 w-4 shrink-0" />
            Docs. Emergencia
          </TabsTrigger>
          <TabsTrigger value="timeout-inactividad" className={TAB_TRIGGER_CLASS}>
            <Timer className="h-4 w-4 shrink-0" />
            Inactividad
          </TabsTrigger>
          <TabsTrigger value="plantillas-usuarios" className={TAB_TRIGGER_CLASS}>
            <FileDown className="h-4 w-4 shrink-0" />
            Plantillas Usuarios
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="visibilidad-locadores" className="mt-0">
            <SeccionesVisiblesLocadores />
          </TabsContent>

          <TabsContent value="usuarios" className="mt-0">
            <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
              <Usuarios />
            </Suspense>
          </TabsContent>

          <TabsContent value="links-solicitud" className="mt-0">
            <LinksSolicitudConfig />
          </TabsContent>

          <TabsContent value="avatars" className="mt-0">
            <AvatarsConfig />
          </TabsContent>

          <TabsContent value="documentos-emergencia" className="mt-0">
            <DocumentosEmergenciaConfig />
          </TabsContent>

          <TabsContent value="timeout-inactividad" className="mt-0">
            <TimeoutInactividadConfig />
          </TabsContent>

          <TabsContent value="plantillas-usuarios" className="mt-0">
            <PlantillasUsuariosConfig />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Perfiles;
