import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, UserMinus, Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Usuarios = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocador, setSelectedLocador] = useState<any>(null);

  const { data: configOcultamiento } = useQuery({
    queryKey: ["config-ocultamiento-inactivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_ocultamiento_inactivos")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: locadores, isLoading, refetch } = useQuery({
    queryKey: ["locadores-usuarios", configOcultamiento?.ocultar_inactivos],
    queryFn: async () => {
      let query = supabase
        .from("locadores")
        .select(`id, nombres, apellidos, numero_documento, tipo_documento, user_id, activo, unidades(nombre)`)
        .order("apellidos");
      if (configOcultamiento?.ocultar_inactivos) {
        query = query.eq("activo", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: configOcultamiento !== undefined,
  });

  const crearCuentaMutation = useMutation({
    mutationFn: async (locador: any) => {
      if (!locador.numero_documento) throw new Error("Número de documento no disponible");
      const { data, error } = await supabase.functions.invoke('manage-locador-user', {
        body: { action: 'create', locador_id: locador.id, numero_documento: locador.numero_documento }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async () => { toast.success("Cuenta creada exitosamente"); await refetch(); },
    onError: (error: any) => { toast.error(error.message || "Error al crear la cuenta"); },
  });

  const eliminarCuentaMutation = useMutation({
    mutationFn: async (locadorId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-locador-user', {
        body: JSON.stringify({ action: 'delete', locador_id: locadorId })
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async () => { toast.success("Cuenta eliminada exitosamente"); setDeleteDialogOpen(false); setSelectedLocador(null); await refetch(); },
    onError: (error: any) => { toast.error(error.message || "Error al eliminar la cuenta"); setDeleteDialogOpen(false); setSelectedLocador(null); },
  });

  const handleEliminarClick = (locador: any) => { setSelectedLocador(locador); setDeleteDialogOpen(true); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta de usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el acceso de <strong>{selectedLocador?.nombres} {selectedLocador?.apellidos}</strong> al portal. 
              El locador ya no podrá iniciar sesión con su número de documento. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setSelectedLocador(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarCuentaMutation.mutate(selectedLocador?.id)}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Eliminar Cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">
            Administra las cuentas de acceso para los locadores registrados
          </p>
        </div>

        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Apellidos y Nombres</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Documento</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Estado</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Cuenta de Acceso</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locadores?.map((locador) => (
                    <TableRow key={locador.id} className="group hover:bg-muted/20 transition-colors duration-150">
                      <TableCell className="font-medium uppercase">
                        {locador.apellidos}, {locador.nombres}
                      </TableCell>
                      <TableCell className="text-sm">
                        {locador.tipo_documento}: {locador.numero_documento}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={locador.activo ? "default" : "secondary"}
                          className={`rounded-lg ${locador.activo ? "bg-success hover:bg-success/90" : ""}`}
                        >
                          {locador.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={locador.user_id ? "default" : "outline"} 
                          className={`rounded-lg ${locador.user_id ? "bg-primary/80" : ""}`}
                        >
                          {locador.user_id ? "Creada" : "Sin cuenta"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200" onClick={() => navigate(`/locadores/${locador.id}`)} title="Ver perfil">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!locador.user_id ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-success/10 hover:text-success transition-all duration-200" onClick={() => crearCuentaMutation.mutate(locador)} disabled={crearCuentaMutation.isPending} title="Crear cuenta de acceso">
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive hover:text-destructive transition-all duration-200" onClick={() => handleEliminarClick(locador)} disabled={eliminarCuentaMutation.isPending} title="Eliminar cuenta de acceso">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {locadores?.length === 0 && (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">No hay locadores registrados</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
};

export default Usuarios;
