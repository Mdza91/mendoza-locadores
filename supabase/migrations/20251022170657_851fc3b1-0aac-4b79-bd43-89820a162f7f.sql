-- Tipos enum
CREATE TYPE public.document_type AS ENUM (
  'suspension_cuarta',
  'rnp',
  'consulta_ruc',
  'consulta_servir',
  'sancion_tce',
  'cotizacion',
  'declaracion_jurada',
  'tdr',
  'cv_documentado',
  'habilidad_vigente',
  'cci',
  'anexo_03',
  'anexo_04',
  'ccp_logistica',
  'ccp_oepe'
);

CREATE TYPE public.document_stage AS ENUM ('original', 'pago');

CREATE TYPE public.universal_document_type AS ENUM (
  'requerimiento',
  'informe_logistica',
  'memo_oea',
  'memo_oepe'
);

-- Tabla de unidades
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de denominaciones
CREATE TABLE public.denominaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  requiere_habilidad BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de locadores
CREATE TABLE public.locadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apellidos TEXT NOT NULL,
  nombres TEXT NOT NULL,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('DNI', 'CE')),
  numero_documento TEXT NOT NULL,
  ruc TEXT NOT NULL,
  celular TEXT NOT NULL,
  correo TEXT NOT NULL,
  remuneracion DECIMAL(10,2) NOT NULL,
  banco TEXT NOT NULL,
  cci TEXT NOT NULL CHECK (LENGTH(cci) = 20),
  direccion TEXT NOT NULL,
  unidad_id UUID NOT NULL REFERENCES public.unidades(id),
  denominacion_id UUID NOT NULL REFERENCES public.denominaciones(id),
  inicio_actividades DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(apellidos, nombres),
  UNIQUE(numero_documento),
  UNIQUE(ruc)
);

-- Tabla de documentos de locadores
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  tipo document_type NOT NULL,
  etapa document_stage NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  peso_bytes BIGINT NOT NULL,
  fecha_vencimiento DATE,
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(locador_id, tipo)
);

-- Tabla de periodos de locadores
CREATE TABLE public.locador_periodos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  etapa document_stage NOT NULL,
  numero_entregables INTEGER NOT NULL CHECK (numero_entregables BETWEEN 1 AND 12),
  meses_correspondientes TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(locador_id, etapa)
);

-- Tabla de documentos generales (universales)
CREATE TABLE public.documentos_generales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo universal_document_type NOT NULL UNIQUE,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  peso_bytes BIGINT NOT NULL,
  numero_entregables INTEGER NOT NULL CHECK (numero_entregables BETWEEN 1 AND 12),
  meses_correspondientes TEXT[] NOT NULL,
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de planillas
CREATE TABLE public.planillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  numero_entregables INTEGER NOT NULL CHECK (numero_entregables BETWEEN 1 AND 12),
  meses_correspondientes TEXT[] NOT NULL,
  total_locadores INTEGER NOT NULL DEFAULT 0,
  costo_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de locadores en planillas
CREATE TABLE public.planilla_locadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planilla_id UUID NOT NULL REFERENCES public.planillas(id) ON DELETE CASCADE,
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(planilla_id, locador_id)
);

-- Tabla de configuración de notificaciones
CREATE TABLE public.config_notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL UNIQUE,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  dias_anticipacion INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar unidades por defecto
INSERT INTO public.unidades (nombre) VALUES
  ('Unidad de Admisión y Emergencia'),
  ('Unidad de Telesalud'),
  ('Unidad de Digitación y Liquidación'),
  ('Unidad de Referencias'),
  ('Unidad de Auditoría'),
  ('Unidad de SOAT'),
  ('Unidad de Apoyo Administrativo');

-- Insertar denominaciones por defecto
INSERT INTO public.denominaciones (nombre, requiere_habilidad) VALUES
  ('SERVICIO DE ATENCIÓN EN LÍNEA – ORIENTACIÓN AL USUARIO', FALSE),
  ('SERVICIO DE DIGITACIÓN', FALSE),
  ('SERVICIO DE MONITOREO DE IMPLEMENTACIÓN DE SERVICIOS COMPLEMENTARIOS EN SALUD', TRUE),
  ('SERVICIO DE AUDITORÍA EN SALUD', TRUE),
  ('SERVICIO DE ORDENAMIENTO DE DOCUMENTOS DE ARCHIVO', FALSE),
  ('SERVICIO DE ORIENTADOR', FALSE),
  ('SERVICIO DE SEGUIMIENTO, EMISIÓN Y ELABORACIÓN DE DOCUMENTOS ADMINISTRATIVOS', FALSE),
  ('SERVICIO ESPECIALIZADO EN MONITOREO DE PROGRAMAS PRESUPUESTALES', FALSE);

-- Insertar configuración de notificaciones por defecto
INSERT INTO public.config_notificaciones (tipo, activa, dias_anticipacion) VALUES
  ('habilidad_vigente', TRUE, 7),
  ('consulta_servir', TRUE, 7),
  ('sancion_tce', TRUE, 7);

-- Crear storage bucket para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', FALSE);

-- Políticas de storage para documentos
CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden subir documentos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Habilitar RLS en todas las tablas
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denominaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locador_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_generales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planilla_locadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (acceso completo para usuarios autenticados - admin)
CREATE POLICY "Usuarios autenticados tienen acceso completo a unidades"
  ON public.unidades FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a denominaciones"
  ON public.denominaciones FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a locadores"
  ON public.locadores FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a documentos"
  ON public.documentos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a locador_periodos"
  ON public.locador_periodos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a documentos_generales"
  ON public.documentos_generales FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a planillas"
  ON public.planillas FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a planilla_locadores"
  ON public.planilla_locadores FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados tienen acceso completo a config_notificaciones"
  ON public.config_notificaciones FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_unidades_updated_at BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_denominaciones_updated_at BEFORE UPDATE ON public.denominaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locadores_updated_at BEFORE UPDATE ON public.locadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locador_periodos_updated_at BEFORE UPDATE ON public.locador_periodos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentos_generales_updated_at BEFORE UPDATE ON public.documentos_generales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planillas_updated_at BEFORE UPDATE ON public.planillas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_notificaciones_updated_at BEFORE UPDATE ON public.config_notificaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_locadores_apellidos ON public.locadores(apellidos);
CREATE INDEX idx_locadores_unidad ON public.locadores(unidad_id);
CREATE INDEX idx_locadores_denominacion ON public.locadores(denominacion_id);
CREATE INDEX idx_locadores_activo ON public.locadores(activo);
CREATE INDEX idx_documentos_locador ON public.documentos(locador_id);
CREATE INDEX idx_documentos_vencimiento ON public.documentos(fecha_vencimiento);
CREATE INDEX idx_planilla_locadores_planilla ON public.planilla_locadores(planilla_id);
CREATE INDEX idx_planilla_locadores_locador ON public.planilla_locadores(locador_id);