
-- Add distribution type to config_global
ALTER TABLE public.config_global 
ADD COLUMN distribucion_activa text NOT NULL DEFAULT 'clasica';

-- Create table for denomination-specific general documents
CREATE TABLE public.documentos_generales_por_denominacion (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  denominacion_id uuid NOT NULL REFERENCES public.denominaciones(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  nombre_archivo text NOT NULL,
  ruta_archivo text NOT NULL,
  peso_bytes bigint NOT NULL,
  numero_entregables integer NOT NULL DEFAULT 1,
  meses_correspondientes text[] NOT NULL,
  fecha_subida timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(denominacion_id, tipo)
);

-- Enable RLS
ALTER TABLE public.documentos_generales_por_denominacion ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "HR y admins pueden gestionar docs generales por denominacion"
ON public.documentos_generales_por_denominacion
FOR ALL
TO authenticated
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

CREATE POLICY "HR y admins pueden ver docs generales por denominacion"
ON public.documentos_generales_por_denominacion
FOR SELECT
TO authenticated
USING (is_hr_or_admin(auth.uid()));

CREATE POLICY "Locadores pueden ver docs generales por denominacion"
ON public.documentos_generales_por_denominacion
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM locadores WHERE locadores.user_id = auth.uid()
));
