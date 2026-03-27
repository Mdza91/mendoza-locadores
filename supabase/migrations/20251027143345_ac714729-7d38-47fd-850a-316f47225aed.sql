-- Crear tabla de órdenes de servicio
CREATE TABLE IF NOT EXISTS public.ordenes_servicio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_locador_id UUID NOT NULL REFERENCES public.periodo_locadores(id) ON DELETE CASCADE,
  numero_os TEXT NOT NULL,
  numero_siaf TEXT NOT NULL,
  meses_os TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ordenes_servicio ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para ordenes_servicio
CREATE POLICY "HR and admins can manage ordenes_servicio"
  ON public.ordenes_servicio
  FOR ALL
  USING (is_hr_or_admin(auth.uid()))
  WITH CHECK (is_hr_or_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_ordenes_servicio_updated_at
  BEFORE UPDATE ON public.ordenes_servicio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Remover campos de O/S de periodo_locadores ya que ahora están en la tabla separada
-- Pero mantener tiene_orden_servicio como flag general
ALTER TABLE public.periodo_locadores 
  DROP COLUMN IF EXISTS numero_os,
  DROP COLUMN IF EXISTS numero_siaf,
  DROP COLUMN IF EXISTS meses_os;