-- Crear tabla de periodos
CREATE TABLE public.periodos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_entregables INTEGER NOT NULL,
  meses_correspondientes TEXT[] NOT NULL,
  nombre TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de locadores en periodos con órdenes de servicio
CREATE TABLE public.periodo_locadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.periodos(id) ON DELETE CASCADE,
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  tiene_orden_servicio BOOLEAN NOT NULL DEFAULT false,
  numero_os TEXT,
  numero_siaf TEXT,
  meses_os TEXT[], -- Meses específicos cubiertos por la O/S (si no se especifica, cubre todos)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(periodo_id, locador_id)
);

-- Habilitar RLS
ALTER TABLE public.periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodo_locadores ENABLE ROW LEVEL SECURITY;

-- Políticas para periodos
CREATE POLICY "HR and admins can manage periodos"
ON public.periodos
FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Políticas para periodo_locadores
CREATE POLICY "HR and admins can manage periodo_locadores"
ON public.periodo_locadores
FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Trigger para updated_at en periodos
CREATE TRIGGER update_periodos_updated_at
BEFORE UPDATE ON public.periodos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at en periodo_locadores
CREATE TRIGGER update_periodo_locadores_updated_at
BEFORE UPDATE ON public.periodo_locadores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();