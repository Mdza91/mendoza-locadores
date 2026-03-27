-- Create table for pending product changes
CREATE TABLE public.cambios_pendientes_productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locador_id UUID NOT NULL,
  producto_id UUID,
  mes TEXT NOT NULL,
  periodo_locador_id UUID,
  nombre_archivo_nuevo TEXT NOT NULL,
  ruta_archivo_nuevo TEXT NOT NULL,
  peso_bytes_nuevo BIGINT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  resuelto_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cambios_pendientes_productos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Locadores pueden crear cambios en sus productos"
ON public.cambios_pendientes_productos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = cambios_pendientes_productos.locador_id
    AND locadores.user_id = auth.uid()
  )
);

CREATE POLICY "Locadores pueden ver sus propios cambios de productos"
ON public.cambios_pendientes_productos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = cambios_pendientes_productos.locador_id
    AND locadores.user_id = auth.uid()
  )
  OR is_hr_or_admin(auth.uid())
);

CREATE POLICY "HR y admins pueden gestionar cambios de productos"
ON public.cambios_pendientes_productos
FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_cambios_pendientes_productos_updated_at
BEFORE UPDATE ON public.cambios_pendientes_productos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();