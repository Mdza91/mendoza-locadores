-- Crear tabla para avatares disponibles
CREATE TABLE public.config_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  es_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.config_avatars ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos pueden ver los avatares
CREATE POLICY "Avatars are viewable by everyone"
ON public.config_avatars
FOR SELECT
USING (true);

-- Solo admin/hr pueden gestionar avatares
CREATE POLICY "Admin and HR can manage avatars"
ON public.config_avatars
FOR ALL
USING (public.is_hr_or_admin(auth.uid()));

-- Agregar campo avatar_id a locadores
ALTER TABLE public.locadores
ADD COLUMN avatar_id UUID REFERENCES public.config_avatars(id) ON DELETE SET NULL;

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_config_avatars_updated_at
BEFORE UPDATE ON public.config_avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear bucket para avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para avatares
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Admin and HR can upload avatars"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND public.is_hr_or_admin(auth.uid()));

CREATE POLICY "Admin and HR can update avatars"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars' AND public.is_hr_or_admin(auth.uid()));

CREATE POLICY "Admin and HR can delete avatars"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars' AND public.is_hr_or_admin(auth.uid()));