-- Crear tabla para productos mensuales (producción de locadores)
CREATE TABLE public.productos_mensuales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locador_id uuid NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  periodo_locador_id uuid REFERENCES public.periodo_locadores(id) ON DELETE CASCADE,
  mes text NOT NULL,
  nombre_archivo text NOT NULL,
  ruta_archivo text NOT NULL,
  peso_bytes bigint NOT NULL,
  fecha_subida timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(locador_id, periodo_locador_id, mes)
);

-- Enable RLS
ALTER TABLE public.productos_mensuales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para productos_mensuales
CREATE POLICY "Locadores pueden ver sus propios productos"
ON public.productos_mensuales FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = productos_mensuales.locador_id
    AND locadores.user_id = auth.uid()
  ) OR is_hr_or_admin(auth.uid())
);

CREATE POLICY "Locadores pueden insertar sus propios productos"
ON public.productos_mensuales FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = productos_mensuales.locador_id
    AND locadores.user_id = auth.uid()
  )
);

CREATE POLICY "Locadores pueden actualizar sus propios productos"
ON public.productos_mensuales FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = productos_mensuales.locador_id
    AND locadores.user_id = auth.uid()
  )
);

CREATE POLICY "Locadores pueden eliminar sus propios productos"
ON public.productos_mensuales FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = productos_mensuales.locador_id
    AND locadores.user_id = auth.uid()
  )
);

CREATE POLICY "HR y admins pueden gestionar todos los productos"
ON public.productos_mensuales FOR ALL
TO authenticated
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_productos_mensuales_updated_at
BEFORE UPDATE ON public.productos_mensuales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();