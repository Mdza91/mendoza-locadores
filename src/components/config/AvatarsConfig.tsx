import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Star, Upload, Image, Loader2 } from "lucide-react";

interface Avatar {
  id: string;
  nombre: string;
  ruta_archivo: string;
  es_default: boolean;
  created_at: string;
}

export const AvatarsConfig = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["config-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_avatars")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Avatar[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, nombre }: { file: File; nombre: string }) => {
      setIsUploading(true);
      
      // Subir archivo a storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Guardar en base de datos
      const { error: dbError } = await supabase
        .from("config_avatars")
        .insert({
          nombre,
          ruta_archivo: publicUrl,
          es_default: false,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-avatars"] });
      toast.success("Avatar subido correctamente");
      setIsDialogOpen(false);
      setNombre("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error("Error uploading avatar:", error);
      toast.error("Error al subir el avatar");
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (avatar: Avatar) => {
      // Eliminar de la base de datos
      const { error } = await supabase
        .from("config_avatars")
        .delete()
        .eq("id", avatar.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-avatars"] });
      toast.success("Avatar eliminado correctamente");
    },
    onError: () => {
      toast.error("Error al eliminar el avatar");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (avatarId: string) => {
      // Primero quitar el default actual
      await supabase
        .from("config_avatars")
        .update({ es_default: false })
        .eq("es_default", true);

      // Establecer el nuevo default
      const { error } = await supabase
        .from("config_avatars")
        .update({ es_default: true })
        .eq("id", avatarId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-avatars"] });
      toast.success("Avatar establecido como predeterminado");
    },
    onError: () => {
      toast.error("Error al establecer el avatar predeterminado");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor selecciona una imagen");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("La imagen no debe superar 2MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    if (!selectedFile || !nombre.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    uploadMutation.mutate({ file: selectedFile, nombre: nombre.trim() });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Image className="h-5 w-5 text-primary" />
              Gestión de Avatares
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sube imágenes que estarán disponibles como avatar para los locadores
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Subir Avatar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Subir Nuevo Avatar</DialogTitle>
                <DialogDescription>
                  Sube una imagen que estará disponible como avatar para los locadores
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nombre del Avatar</Label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Avatar profesional azul"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Imagen</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {previewUrl ? (
                    <div className="relative group">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-primary/20"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click para seleccionar imagen
                      </span>
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    Formatos: JPG, PNG, WebP. Máximo 2MB
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isUploading || !selectedFile || !nombre.trim()}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    "Subir Avatar"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {avatars && avatars.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {avatars.map((avatar) => (
              <div
                key={avatar.id}
                className="relative group rounded-xl border bg-card p-3 hover:shadow-lg transition-all"
              >
                <div className="relative">
                  <img
                    src={avatar.ruta_archivo}
                    alt={avatar.nombre}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  {avatar.es_default && (
                    <Badge className="absolute -top-2 -right-2 bg-primary shadow-lg">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
                
                <p className="mt-2 text-sm font-medium text-center truncate">
                  {avatar.nombre}
                </p>
                
                <div className="mt-2 flex gap-1">
                  {!avatar.es_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setDefaultMutation.mutate(avatar.id)}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar avatar?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Los locadores que tengan este avatar asignado mostrarán el avatar por defecto.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(avatar)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No hay avatares configurados</p>
            <p className="text-sm">Sube imágenes para que los locadores puedan usarlas como foto de perfil</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
