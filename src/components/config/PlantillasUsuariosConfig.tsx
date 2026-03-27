import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, FileText, Download, Trash2, Edit2, Eye, Loader2, FileSpreadsheet, FileType, File } from "lucide-react";

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";

const getFileIcon = (tipo: string) => {
  if (tipo.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (tipo.includes("word") || tipo.includes("doc")) return <FileType className="h-5 w-5 text-blue-500" />;
  if (tipo.includes("sheet") || tipo.includes("excel") || tipo.includes("xls")) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (tipo.includes("presentation") || tipo.includes("powerpoint") || tipo.includes("ppt")) return <FileText className="h-5 w-5 text-orange-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export const PlantillasUsuariosConfig = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: plantillas, isLoading } = useQuery({
    queryKey: ["plantillas-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plantillas_usuarios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (plantilla: any) => {
      await supabase.storage.from("documentos").remove([plantilla.ruta_archivo]);
      const { error } = await supabase.from("plantillas_usuarios").delete().eq("id", plantilla.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantillas-usuarios"] });
      toast.success("Plantilla eliminada");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const handleCreate = async () => {
    if (!nombre.trim() || !file) {
      toast.error("Ingresa un nombre y selecciona un archivo");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `plantillas/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("plantillas_usuarios").insert({
        nombre: nombre.trim(),
        nombre_archivo: file.name,
        ruta_archivo: path,
        peso_bytes: file.size,
        tipo_archivo: file.type || ext || "unknown",
        created_by: user?.id,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["plantillas-usuarios"] });
      toast.success("Plantilla creada exitosamente");
      setShowCreate(false);
      setNombre("");
      setFile(null);
    } catch (e: any) {
      toast.error(e.message || "Error al crear plantilla");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (plantilla: any) => {
    setUploading(true);
    try {
      const updates: any = {};
      if (editName.trim() && editName.trim() !== plantilla.nombre) {
        updates.nombre = editName.trim();
      }
      if (editFile) {
        // Remove old file
        await supabase.storage.from("documentos").remove([plantilla.ruta_archivo]);
        const path = `plantillas/${Date.now()}_${editFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("documentos").upload(path, editFile);
        if (uploadError) throw uploadError;
        updates.ruta_archivo = path;
        updates.nombre_archivo = editFile.name;
        updates.peso_bytes = editFile.size;
        updates.tipo_archivo = editFile.type || editFile.name.split(".").pop() || "unknown";
      }

      if (Object.keys(updates).length === 0) {
        setEditingId(null);
        return;
      }

      const { error } = await supabase.from("plantillas_usuarios").update(updates).eq("id", plantilla.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["plantillas-usuarios"] });
      toast.success("Plantilla actualizada");
      setEditingId(null);
      setEditFile(null);
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (plantilla: any) => {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(plantilla.ruta_archivo, 60);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = plantilla.nombre_archivo;
      a.click();
    } else {
      toast.error("Error al generar enlace de descarga");
    }
  };

  const handlePreview = async (plantilla: any) => {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(plantilla.ruta_archivo, 300);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
    } else {
      toast.error("No se pudo previsualizar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Plantillas para Usuarios</h2>
          <p className="text-sm text-muted-foreground">Documentos disponibles para descarga por los locadores</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Nueva Plantilla
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !plantillas?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No hay plantillas creadas aún</p>
            <p className="text-xs mt-1">Las plantillas que crees aparecerán en la sección Descargas de los locadores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {plantillas.map((p: any) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="shrink-0">{getFileIcon(p.tipo_archivo)}</div>
                <div className="flex-1 min-w-0">
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre de la plantilla"
                      />
                      <div>
                        <Label className="text-xs text-muted-foreground">Reemplazar archivo (opcional)</Label>
                        <Input
                          type="file"
                          accept={ACCEPTED_TYPES}
                          onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(p)} disabled={uploading}>
                          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditFile(null); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium truncate">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.nombre_archivo} · {formatBytes(p.peso_bytes)}</p>
                    </>
                  )}
                </div>
                {editingId !== p.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => handlePreview(p)} title="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDownload(p)} title="Descargar">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditingId(p.id); setEditName(p.nombre); }}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("¿Eliminar esta plantilla?")) deleteMutation.mutate(p);
                      }}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nueva Plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la plantilla</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Formato de Declaración Jurada"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Archivo</Label>
              <Input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint o TXT</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={uploading || !nombre.trim() || !file}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] rounded-2xl p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-4 pt-2">
            {previewUrl && (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
