
-- Table for user templates (documents that admins upload for locadores to download)
CREATE TABLE public.plantillas_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  peso_bytes BIGINT NOT NULL,
  tipo_archivo TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plantillas_usuarios ENABLE ROW LEVEL SECURITY;

-- Admins/HR can do everything
CREATE POLICY "HR y admins pueden gestionar plantillas"
  ON public.plantillas_usuarios FOR ALL
  USING (is_hr_or_admin(auth.uid()))
  WITH CHECK (is_hr_or_admin(auth.uid()));

-- Locadores can read templates
CREATE POLICY "Locadores pueden ver plantillas"
  ON public.plantillas_usuarios FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM locadores WHERE locadores.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_plantillas_usuarios_updated_at
  BEFORE UPDATE ON public.plantillas_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
