import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnidadesConfig } from "@/components/config/UnidadesConfig";
import { DenominacionesConfig } from "@/components/config/DenominacionesConfig";
import { DocumentacionGeneral } from "@/components/config/DocumentacionGeneral";
import { DocumentosObligatorios } from "@/components/config/DocumentosObligatorios";
import { EliminacionDocumentaria } from "@/components/config/EliminacionDocumentaria";
import OcultamientoInactivosConfig from "@/components/config/OcultamientoInactivosConfig";
import { EliminacionDocsEmergencia } from "@/components/config/EliminacionDocsEmergencia";
import { AjustesGeneralesConfig } from "@/components/config/AjustesGeneralesConfig";
import { Settings, Building2, Briefcase, FileText, FileCheck, Trash2, UserX, AlertTriangle, Wrench } from "lucide-react";

const TAB_TRIGGER_CLASS = "w-full justify-start px-4 py-2.5 text-left gap-2.5 rounded-xl text-sm font-medium transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-muted/60";

const Configuraciones = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuraciones</h1>
        <p className="text-muted-foreground">Configuraciones globales del sistema</p>
      </div>

      <Tabs defaultValue="ajustes-generales" className="flex flex-col md:flex-row md:items-start gap-6">
        <TabsList className="flex flex-col h-auto w-full md:w-64 shrink-0 bg-card/60 backdrop-blur-sm p-2 rounded-2xl border border-border shadow-sm">
          <TabsTrigger value="ajustes-generales" className={TAB_TRIGGER_CLASS}>
            <Wrench className="h-4 w-4 shrink-0" />
            Ajustes Generales
          </TabsTrigger>
          <TabsTrigger value="unidades" className={TAB_TRIGGER_CLASS}>
            <Building2 className="h-4 w-4 shrink-0" />
            Unidades
          </TabsTrigger>
          <TabsTrigger value="denominaciones" className={TAB_TRIGGER_CLASS}>
            <Briefcase className="h-4 w-4 shrink-0" />
            Denominaciones
          </TabsTrigger>
          <TabsTrigger value="documentacion" className={TAB_TRIGGER_CLASS}>
            <FileText className="h-4 w-4 shrink-0" />
            Documentación General
          </TabsTrigger>
          <TabsTrigger value="obligatorios" className={TAB_TRIGGER_CLASS}>
            <FileCheck className="h-4 w-4 shrink-0" />
            Docs. Obligatorios
          </TabsTrigger>
          <TabsTrigger value="eliminacion-documentaria" className={TAB_TRIGGER_CLASS}>
            <Trash2 className="h-4 w-4 shrink-0" />
            Eliminación Documentaria
          </TabsTrigger>
          <TabsTrigger value="ocultamiento-inactivos" className={TAB_TRIGGER_CLASS}>
            <UserX className="h-4 w-4 shrink-0" />
            Usuarios Inactivos
          </TabsTrigger>
          <TabsTrigger value="elim-docs-emergencia" className={TAB_TRIGGER_CLASS}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Elim. Docs. Emergencia
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="ajustes-generales" className="mt-0">
            <AjustesGeneralesConfig />
          </TabsContent>

          <TabsContent value="unidades" className="mt-0">
            <UnidadesConfig />
          </TabsContent>

          <TabsContent value="denominaciones" className="mt-0">
            <DenominacionesConfig />
          </TabsContent>

          <TabsContent value="documentacion" className="mt-0">
            <DocumentacionGeneral />
          </TabsContent>

          <TabsContent value="obligatorios" className="mt-0">
            <DocumentosObligatorios />
          </TabsContent>

          <TabsContent value="eliminacion-documentaria" className="mt-0">
            <EliminacionDocumentaria />
          </TabsContent>

          <TabsContent value="ocultamiento-inactivos" className="mt-0">
            <OcultamientoInactivosConfig />
          </TabsContent>

          <TabsContent value="elim-docs-emergencia" className="mt-0">
            <EliminacionDocsEmergencia />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Configuraciones;
