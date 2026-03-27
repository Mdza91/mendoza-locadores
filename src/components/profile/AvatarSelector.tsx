import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Check, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarSelectorProps {
  locadorId: string;
  currentAvatarId?: string | null;
  currentAvatarUrl?: string | null;
  locadorInitials: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
}

interface AvatarOption {
  id: string;
  nombre: string;
  ruta_archivo: string;
  es_default: boolean;
}

export const AvatarSelector = ({
  locadorId,
  currentAvatarId,
  currentAvatarUrl,
  locadorInitials,
  size = "lg",
  editable = true,
}: AvatarSelectorProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-28 w-28",
  };

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["config-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_avatars")
        .select("*")
        .order("es_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AvatarOption[];
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarId: string) => {
      const { error } = await supabase
        .from("locadores")
        .update({ avatar_id: avatarId })
        .eq("id", locadorId);

      if (error) throw error;
      return avatarId;
    },
    onSuccess: () => {
      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
      queryClient.invalidateQueries({ queryKey: ["locador"] });
      queryClient.invalidateQueries({ queryKey: ["locadores"] });
      
      toast.success("¡Avatar actualizado correctamente!");
      setIsOpen(false);
      setSelectedAvatarId(null);
    },
    onError: (error) => {
      console.error("Error updating avatar:", error);
      toast.error("Error al actualizar el avatar");
    },
  });

  const handleConfirmChange = () => {
    if (selectedAvatarId) {
      updateAvatarMutation.mutate(selectedAvatarId);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedAvatarId(null);
    }
  };

  // Get the selected avatar URL for preview
  const getSelectedAvatarUrl = () => {
    if (selectedAvatarId) {
      return avatars?.find(a => a.id === selectedAvatarId)?.ruta_archivo;
    }
    return null;
  };

  // Get avatar to display (current, default, or fallback)
  const getDisplayAvatar = () => {
    if (currentAvatarUrl) return currentAvatarUrl;
    
    // If no avatar, look for default
    const defaultAvatar = avatars?.find((a) => a.es_default);
    return defaultAvatar?.ruta_archivo;
  };

  const displayAvatarUrl = getDisplayAvatar();
  const previewAvatarUrl = getSelectedAvatarUrl();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={!editable}>
        <div className="relative group cursor-pointer">
          <Avatar 
            className={cn(
              sizeClasses[size], 
              "ring-4 ring-background shadow-xl transition-all duration-300",
              isAnimating && "animate-scale-in ring-primary"
            )}
          >
            {displayAvatarUrl ? (
              <AvatarImage 
                src={displayAvatarUrl} 
                alt="Avatar" 
                className={cn(
                  "object-cover transition-transform duration-300",
                  isAnimating && "scale-110"
                )} 
              />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl font-bold">
              {locadorInitials || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          
          {editable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecciona tu Avatar</DialogTitle>
          <DialogDescription>
            Elige una imagen de perfil de las opciones disponibles
          </DialogDescription>
        </DialogHeader>
        
        <div className="pt-4">
          {/* Preview of selected avatar */}
          {selectedAvatarId && (
            <div className="flex flex-col items-center mb-6 pb-4 border-b animate-fade-in">
              <p className="text-sm text-muted-foreground mb-3">Vista previa</p>
              <Avatar className="h-20 w-20 ring-4 ring-primary shadow-lg animate-scale-in">
                {previewAvatarUrl && (
                  <AvatarImage src={previewAvatarUrl} alt="Preview" className="object-cover" />
                )}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold">
                  {locadorInitials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : avatars && avatars.length > 0 ? (
            <>
              <div className="max-h-[40vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
                {avatars.map((avatar) => {
                  const isSelected = selectedAvatarId === avatar.id;
                  const isCurrent = currentAvatarId === avatar.id;
                  
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      disabled={updateAvatarMutation.isPending}
                      className={cn(
                        "relative rounded-xl p-2 border-2 transition-all duration-200 hover:scale-105",
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-105"
                          : isCurrent
                          ? "border-accent bg-accent/10"
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
                    >
                      <img
                        src={avatar.ruta_archivo}
                        alt={avatar.nombre}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1 animate-scale-in">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      {isCurrent && !isSelected && (
                        <div className="absolute top-1 right-1 bg-accent text-accent-foreground rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <p className="mt-1 text-xs text-center truncate text-muted-foreground">
                        {avatar.nombre}
                      </p>
                      {isCurrent && (
                        <p className="text-[10px] text-center text-primary font-medium">
                          Actual
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
              
              {/* Confirm button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={updateAvatarMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmChange}
                  disabled={!selectedAvatarId || selectedAvatarId === currentAvatarId || updateAvatarMutation.isPending}
                  className="gap-2"
                >
                  {updateAvatarMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Cambiar
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay avatares disponibles</p>
              <p className="text-sm">El administrador debe subir avatares primero</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
