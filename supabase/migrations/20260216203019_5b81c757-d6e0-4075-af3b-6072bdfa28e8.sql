
-- Tabla para ajustes generales de la aplicación (nombre, logo)
CREATE TABLE public.config_app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_app TEXT NOT NULL DEFAULT 'Locadores',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO public.config_app_settings (nombre_app) VALUES ('Locadores');

-- Habilitar RLS
ALTER TABLE public.config_app_settings ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
CREATE POLICY "Authenticated users can read app settings"
  ON public.config_app_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins y hr_managers pueden actualizar
CREATE POLICY "Admins can update app settings"
  ON public.config_app_settings
  FOR UPDATE
  USING (public.is_hr_or_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_config_app_settings_updated_at
  BEFORE UPDATE ON public.config_app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
