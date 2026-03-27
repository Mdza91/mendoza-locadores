-- Crear tabla para cambios pendientes de documentos de emergencia
CREATE TABLE public.cambios_pendientes_emergencia (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
    documento_emergencia_id UUID REFERENCES public.documentos_emergencia(id) ON DELETE SET NULL,
    documento_key TEXT NOT NULL,
    nombre_documento TEXT NOT NULL,
    nombre_archivo_nuevo TEXT NOT NULL,
    ruta_archivo_nuevo TEXT NOT NULL,
    peso_bytes_nuevo BIGINT NOT NULL,
    es_reemplazo BOOLEAN NOT NULL DEFAULT false,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    resuelto_por UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cambios_pendientes_emergencia ENABLE ROW LEVEL SECURITY;

-- Política: Locadores pueden crear cambios en sus documentos de emergencia
CREATE POLICY "Locadores pueden crear cambios de emergencia"
ON public.cambios_pendientes_emergencia
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

-- Política: Locadores pueden ver sus propios cambios pendientes
CREATE POLICY "Locadores pueden ver sus cambios de emergencia"
ON public.cambios_pendientes_emergencia
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.locadores
        WHERE locadores.id = locador_id
        AND locadores.user_id = auth.uid()
    )
    OR public.is_hr_or_admin(auth.uid())
);

-- Política: HR y admins pueden gestionar todos los cambios
CREATE POLICY "HR y admins gestionan cambios de emergencia"
ON public.cambios_pendientes_emergencia
FOR ALL
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

-- Agregar política DELETE para documentos_emergencia (admin puede eliminar)
CREATE POLICY "Admin puede eliminar documentos emergencia"
ON public.documentos_emergencia
FOR DELETE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

-- Eliminar la tabla notificaciones_emergencia ya que usaremos cambios_pendientes_emergencia
DROP TABLE IF EXISTS public.notificaciones_emergencia;