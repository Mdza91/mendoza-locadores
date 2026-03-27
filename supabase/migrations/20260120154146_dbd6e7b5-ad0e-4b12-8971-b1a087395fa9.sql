-- Crear tabla para notificaciones de documentos de emergencia
CREATE TABLE public.notificaciones_emergencia (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
    documento_emergencia_id UUID NOT NULL REFERENCES public.documentos_emergencia(id) ON DELETE CASCADE,
    documento_key TEXT NOT NULL,
    nombre_documento TEXT NOT NULL,
    nombre_archivo TEXT NOT NULL,
    es_reemplazo BOOLEAN NOT NULL DEFAULT false,
    leido BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificaciones_emergencia ENABLE ROW LEVEL SECURITY;

-- Política: solo admin/hr_manager pueden ver las notificaciones
CREATE POLICY "Admin y HR pueden ver notificaciones de emergencia"
ON public.notificaciones_emergencia
FOR SELECT
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

-- Política: los locadores pueden insertar notificaciones para sus propios documentos
CREATE POLICY "Locadores pueden crear notificaciones de sus documentos"
ON public.notificaciones_emergencia
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.locadores
        WHERE locadores.id = locador_id
        AND locadores.user_id = auth.uid()
    )
    OR public.is_hr_or_admin(auth.uid())
);

-- Política: solo admin/hr_manager pueden actualizar (marcar como leído)
CREATE POLICY "Admin y HR pueden actualizar notificaciones"
ON public.notificaciones_emergencia
FOR UPDATE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

-- Política: solo admin puede eliminar
CREATE POLICY "Admin puede eliminar notificaciones"
ON public.notificaciones_emergencia
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));