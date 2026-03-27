
-- Add separate columns for admin inactivity timeout
ALTER TABLE public.config_timeout_inactividad
ADD COLUMN habilitado_admin boolean NOT NULL DEFAULT true,
ADD COLUMN minutos_inactividad_admin integer NOT NULL DEFAULT 30;

-- Copy current values to admin columns (existing values become locador defaults)
UPDATE public.config_timeout_inactividad
SET habilitado_admin = habilitado,
    minutos_inactividad_admin = minutos_inactividad;
