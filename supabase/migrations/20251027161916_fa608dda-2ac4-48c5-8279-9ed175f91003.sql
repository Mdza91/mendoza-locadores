-- Tabla para cambios pendientes de datos personales
CREATE TABLE public.cambios_pendientes_datos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  campo TEXT NOT NULL, -- 'correo'
  valor_actual TEXT NOT NULL,
  valor_propuesto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  resuelto_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla para cambios pendientes de documentos
CREATE TABLE public.cambios_pendientes_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nombre_archivo_nuevo TEXT NOT NULL,
  ruta_archivo_nuevo TEXT NOT NULL,
  peso_bytes_nuevo BIGINT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  resuelto_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cambios_pendientes_datos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambios_pendientes_documentos ENABLE ROW LEVEL SECURITY;

-- Policies para cambios_pendientes_datos
CREATE POLICY "Locadores pueden crear cambios en sus datos"
ON public.cambios_pendientes_datos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.locadores
    WHERE locadores.id = locador_id AND locadores.user_id = auth.uid()
  )
);

CREATE POLICY "Locadores pueden ver sus propios cambios pendientes"
ON public.cambios_pendientes_datos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.locadores
    WHERE locadores.id = locador_id AND locadores.user_id = auth.uid()
  ) OR is_hr_or_admin(auth.uid())
);

CREATE POLICY "HR y admins pueden gestionar cambios de datos"
ON public.cambios_pendientes_datos
FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Policies para cambios_pendientes_documentos
CREATE POLICY "Locadores pueden crear cambios en sus documentos"
ON public.cambios_pendientes_documentos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.locadores
    WHERE locadores.id = locador_id AND locadores.user_id = auth.uid()
  )
);

CREATE POLICY "Locadores pueden ver sus propios cambios de documentos"
ON public.cambios_pendientes_documentos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.locadores
    WHERE locadores.id = locador_id AND locadores.user_id = auth.uid()
  ) OR is_hr_or_admin(auth.uid())
);

CREATE POLICY "HR y admins pueden gestionar cambios de documentos"
ON public.cambios_pendientes_documentos
FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_cambios_pendientes_datos_updated_at
BEFORE UPDATE ON public.cambios_pendientes_datos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cambios_pendientes_documentos_updated_at
BEFORE UPDATE ON public.cambios_pendientes_documentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();