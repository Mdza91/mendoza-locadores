-- Crear tabla para almacenar los links de solicitud de documentos
CREATE TABLE public.config_links_solicitud_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_documento TEXT NOT NULL UNIQUE,
  nombre_display TEXT NOT NULL,
  url_solicitud TEXT,
  habilitado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.config_links_solicitud_documentos ENABLE ROW LEVEL SECURITY;

-- Políticas: todos pueden leer, solo admin/hr pueden modificar
CREATE POLICY "Todos pueden ver los links de solicitud"
  ON public.config_links_solicitud_documentos
  FOR SELECT
  USING (true);

CREATE POLICY "Solo admin o hr pueden modificar links de solicitud"
  ON public.config_links_solicitud_documentos
  FOR ALL
  USING (public.is_hr_or_admin(auth.uid()));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_config_links_solicitud_documentos_updated_at
  BEFORE UPDATE ON public.config_links_solicitud_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar los documentos de "Mis Documentos" (excluyendo los de CV Documentado)
INSERT INTO public.config_links_solicitud_documentos (tipo_documento, nombre_display, habilitado)
VALUES
  ('suspension_cuarta', 'Suspensión de Cuarta Categoría', false),
  ('rnp', 'RNP', false),
  ('consulta_ruc', 'Consulta RUC', false),
  ('consulta_servir', 'Consulta Servir', false),
  ('sancion_tce', 'Sanción TCE', false),
  ('cotizacion', 'Cotización', false),
  ('declaracion_jurada', 'Declaración Jurada', false),
  ('tdr', 'TDR', false),
  ('habilidad_vigente', 'Habilidad Vigente', false),
  ('cci', 'CCI', false);