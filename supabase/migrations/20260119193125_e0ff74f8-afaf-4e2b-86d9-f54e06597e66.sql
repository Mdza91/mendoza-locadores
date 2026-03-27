-- Tabla de configuración para documentos de emergencia
CREATE TABLE public.config_documentos_emergencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_key TEXT NOT NULL UNIQUE, -- 'documento_01' o 'documento_02'
  nombre_display TEXT NOT NULL, -- Nombre configurable por admin
  habilitado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar los dos documentos por defecto
INSERT INTO public.config_documentos_emergencia (documento_key, nombre_display, habilitado)
VALUES 
  ('documento_01', 'Documento 01', false),
  ('documento_02', 'Documento 02', false);

-- Habilitar RLS
ALTER TABLE public.config_documentos_emergencia ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para config_documentos_emergencia
CREATE POLICY "Todos pueden ver la configuración de documentos emergencia"
ON public.config_documentos_emergencia
FOR SELECT
USING (true);

CREATE POLICY "Solo admin y hr_manager pueden modificar configuración"
ON public.config_documentos_emergencia
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr_manager')
  )
);

-- Tabla para almacenar los documentos de emergencia subidos por locadores
CREATE TABLE public.documentos_emergencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  documento_key TEXT NOT NULL, -- 'documento_01' o 'documento_02'
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  peso_bytes INTEGER NOT NULL,
  fecha_subida TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(locador_id, documento_key)
);

-- Habilitar RLS
ALTER TABLE public.documentos_emergencia ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos_emergencia
CREATE POLICY "Locadores pueden ver sus propios documentos emergencia"
ON public.documentos_emergencia
FOR SELECT
USING (
  locador_id IN (
    SELECT id FROM public.locadores WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "Locadores pueden subir sus documentos emergencia"
ON public.documentos_emergencia
FOR INSERT
WITH CHECK (
  locador_id IN (
    SELECT id FROM public.locadores WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Locadores pueden actualizar sus documentos emergencia"
ON public.documentos_emergencia
FOR UPDATE
USING (
  locador_id IN (
    SELECT id FROM public.locadores WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin puede gestionar todos los documentos emergencia"
ON public.documentos_emergencia
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr_manager')
  )
);

-- Trigger para updated_at en config_documentos_emergencia
CREATE TRIGGER update_config_documentos_emergencia_updated_at
BEFORE UPDATE ON public.config_documentos_emergencia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at en documentos_emergencia
CREATE TRIGGER update_documentos_emergencia_updated_at
BEFORE UPDATE ON public.documentos_emergencia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();