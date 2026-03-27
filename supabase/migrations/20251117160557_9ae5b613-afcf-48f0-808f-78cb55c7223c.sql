-- Agregar columnas para fin de actividades
ALTER TABLE public.locadores 
ADD COLUMN tiene_fin_actividades BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN fin_actividades DATE;

-- Comentarios para documentación
COMMENT ON COLUMN public.locadores.tiene_fin_actividades IS 'Indica si el locador tiene una fecha de fin de actividades establecida';
COMMENT ON COLUMN public.locadores.fin_actividades IS 'Fecha de fin de actividades del locador (nullable)';