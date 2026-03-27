-- Crear tabla de configuración global
CREATE TABLE IF NOT EXISTS public.config_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documentos_administrativos_activo boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insertar registro inicial
INSERT INTO public.config_global (documentos_administrativos_activo)
VALUES (false);

-- Enable RLS
ALTER TABLE public.config_global ENABLE ROW LEVEL SECURITY;

-- HR y admins pueden ver y gestionar config global
CREATE POLICY "HR y admins pueden gestionar config global"
ON public.config_global
FOR ALL
TO authenticated
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_config_global_updated_at
  BEFORE UPDATE ON public.config_global
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();