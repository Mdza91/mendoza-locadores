-- Crear tabla para configuración de secciones visibles para locadores
CREATE TABLE public.config_secciones_visibles_locadores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seccion TEXT NOT NULL UNIQUE,
    nombre_display TEXT NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT true,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para items dentro de cada sección
CREATE TABLE public.config_items_seccion_locadores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seccion_id UUID NOT NULL REFERENCES public.config_secciones_visibles_locadores(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    nombre_display TEXT NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT true,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(seccion_id, item_key)
);

-- Habilitar RLS
ALTER TABLE public.config_secciones_visibles_locadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_items_seccion_locadores ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura pública (todos los usuarios autenticados pueden leer)
CREATE POLICY "Authenticated users can read sections config"
ON public.config_secciones_visibles_locadores
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read items config"
ON public.config_items_seccion_locadores
FOR SELECT
TO authenticated
USING (true);

-- Políticas para escritura (solo admin/hr)
CREATE POLICY "HR or Admin can update sections config"
ON public.config_secciones_visibles_locadores
FOR UPDATE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR or Admin can update items config"
ON public.config_items_seccion_locadores
FOR UPDATE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

-- Insertar las 4 secciones principales
INSERT INTO public.config_secciones_visibles_locadores (seccion, nombre_display, visible, orden) VALUES
('informacion_personal', 'Información Personal', true, 1),
('informacion_laboral', 'Información Laboral', true, 2),
('descargas', 'Descargas', true, 3),
('mis_documentos', 'Mis Documentos', true, 4);

-- Insertar items para Información Personal
INSERT INTO public.config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'nombres', 'Nombres', true, 1 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_personal'
UNION ALL
SELECT id, 'apellidos', 'Apellidos', true, 2 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_personal'
UNION ALL
SELECT id, 'tipo_documento', 'Tipo de Documento', true, 3 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_personal'
UNION ALL
SELECT id, 'numero_documento', 'Número de Documento', true, 4 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_personal'
UNION ALL
SELECT id, 'ruc', 'RUC', true, 5 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_personal'
UNION ALL
SELECT id, 'celular', 'Celular', true, 6 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_personal'
UNION ALL
SELECT id, 'correo', 'Correo Electrónico', true, 7 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_personal';

-- Insertar items para Información Laboral
INSERT INTO public.config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'unidad', 'Unidad', true, 1 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_laboral'
UNION ALL
SELECT id, 'denominacion', 'Denominación', true, 2 FROM public.config_secciones_visibles_locadores WHERE seccion = 'informacion_laboral';

-- Insertar items para Descargas
INSERT INTO public.config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'expediente_original', 'Expediente Original', true, 1 FROM public.config_secciones_visibles_locadores WHERE seccion = 'descargas'
UNION ALL
SELECT id, 'expediente_pago', 'Expediente de Pago', true, 2 FROM public.config_secciones_visibles_locadores WHERE seccion = 'descargas'
UNION ALL
SELECT id, 'expediente_administrativo', 'Documentos Administrativos', true, 3 FROM public.config_secciones_visibles_locadores WHERE seccion = 'descargas';

-- Insertar items para Mis Documentos (basado en la tabla existente)
INSERT INTO public.config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'suspension_cuarta', 'Suspensión de Cuarta Categoría', true, 1 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos'
UNION ALL
SELECT id, 'rnp', 'RNP', true, 2 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos'
UNION ALL
SELECT id, 'consulta_ruc', 'Consulta RUC', true, 3 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos'
UNION ALL
SELECT id, 'consulta_servir', 'Consulta Servir', true, 4 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos'
UNION ALL
SELECT id, 'sancion_tce', 'Sanción TCE', true, 5 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos'
UNION ALL
SELECT id, 'cv_documentado', 'CV Documentado', true, 6 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos'
UNION ALL
SELECT id, 'constancia_estudios', 'Constancia de Estudios Fedateada', true, 7 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos'
UNION ALL
SELECT id, 'habilidad_vigente', 'Habilidad Vigente', true, 8 FROM public.config_secciones_visibles_locadores WHERE seccion = 'mis_documentos';