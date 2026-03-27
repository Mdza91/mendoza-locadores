
CREATE TABLE public.notificaciones_admin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  contenido TEXT NOT NULL,
  duracion_horas INTEGER NOT NULL DEFAULT 24,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dirigida_a TEXT NOT NULL DEFAULT 'todos',
  activa BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notificaciones_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can manage notifications"
ON public.notificaciones_admin
FOR ALL
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

CREATE POLICY "Users can read active notifications"
ON public.notificaciones_admin
FOR SELECT
TO authenticated
USING (activa = true AND now() >= fecha_inicio AND now() < fecha_inicio + make_interval(hours => duracion_horas));

CREATE TRIGGER update_notificaciones_admin_updated_at
BEFORE UPDATE ON public.notificaciones_admin
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS public.notificacion_admin_seq START 1;
