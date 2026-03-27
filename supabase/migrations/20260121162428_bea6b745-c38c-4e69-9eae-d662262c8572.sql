-- Eliminar tablas relacionadas con Periodos y Entregables
-- Primero eliminamos las tablas que tienen foreign keys a otras

-- Eliminar ordenes_servicio (depende de periodo_locadores)
DROP TABLE IF EXISTS public.ordenes_servicio CASCADE;

-- Eliminar productos_mensuales (depende de periodo_locadores)
DROP TABLE IF EXISTS public.productos_mensuales CASCADE;

-- Eliminar cambios_pendientes_productos
DROP TABLE IF EXISTS public.cambios_pendientes_productos CASCADE;

-- Eliminar periodo_locadores (depende de periodos y locadores)
DROP TABLE IF EXISTS public.periodo_locadores CASCADE;

-- Eliminar periodos
DROP TABLE IF EXISTS public.periodos CASCADE;

-- Eliminar locador_periodos
DROP TABLE IF EXISTS public.locador_periodos CASCADE;