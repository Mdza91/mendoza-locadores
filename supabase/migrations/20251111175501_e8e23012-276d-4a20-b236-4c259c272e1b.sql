-- Crear tabla para configurar documentos visibles para locadores
CREATE TABLE public.config_documentos_visibles_locadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_documento text NOT NULL UNIQUE,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_documentos_visibles_locadores ENABLE ROW LEVEL SECURITY;

-- Policy: HR y admins pueden gestionar
CREATE POLICY "HR y admins pueden gestionar config documentos visibles"
ON public.config_documentos_visibles_locadores
FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Policy: Todos pueden ver (los locadores necesitan consultar esto)
CREATE POLICY "Todos pueden ver config documentos visibles"
ON public.config_documentos_visibles_locadores
FOR SELECT
USING (true);

-- Insertar documentos por defecto (todos visibles)
INSERT INTO public.config_documentos_visibles_locadores (tipo_documento, visible) VALUES
  ('suspension_cuarta', true),
  ('rnp', true),
  ('consulta_ruc', true),
  ('consulta_servir', true),
  ('sancion_tce', true),
  ('cv_documentado', true),
  ('constancia_estudios', true),
  ('habilidad_vigente', true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_config_documentos_visibles_locadores_updated_at
BEFORE UPDATE ON public.config_documentos_visibles_locadores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();