
-- Drop policy that depends on the column first
DROP POLICY IF EXISTS "Users can read active notifications" ON public.notificaciones_admin;

-- Now alter the column type
ALTER TABLE public.notificaciones_admin 
ALTER COLUMN duracion_horas TYPE numeric USING duracion_horas::numeric;

-- Recreate the policy
CREATE POLICY "Users can read active notifications"
ON public.notificaciones_admin
FOR SELECT
TO authenticated
USING (activa = true AND now() >= fecha_inicio AND now() < fecha_inicio + make_interval(secs => (duracion_horas * 3600)::integer));
