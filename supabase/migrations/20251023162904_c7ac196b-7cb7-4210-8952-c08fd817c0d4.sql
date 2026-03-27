-- Crear tipos enumerados para documentos
DO $$ BEGIN
  CREATE TYPE documento_tipo_original AS ENUM (
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
    'cci'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE documento_tipo_pago AS ENUM (
    'anexo_03',
    'anexo_04',
    'ccp_logistica',
    'ccp_oepe'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE documento_general_tipo AS ENUM (
    'requerimiento',
    'informe_logistica',
    'memo_oea',
    'memo_oepe'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Actualizar tabla de documentos para incluir tipo y etapa
DO $$ BEGIN
  ALTER TABLE documentos ADD COLUMN tipo_original documento_tipo_original;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE documentos ADD COLUMN tipo_pago documento_tipo_pago;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE documentos ADD COLUMN etapa TEXT NOT NULL DEFAULT 'original';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Agregar constraint si no existe
DO $$ BEGIN
  ALTER TABLE documentos ADD CONSTRAINT documentos_etapa_check CHECK (etapa IN ('original', 'pago'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE documentos_generales ADD COLUMN tipo documento_general_tipo;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_documentos_locador_etapa ON documentos(locador_id, etapa);
CREATE INDEX IF NOT EXISTS idx_documentos_vencimiento ON documentos(fecha_vencimiento) WHERE fecha_vencimiento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locadores_activo ON locadores(activo);
CREATE INDEX IF NOT EXISTS idx_locadores_apellidos ON locadores(apellidos);

-- Insertar denominaciones que requieren habilidad vigente por defecto
UPDATE denominaciones 
SET requiere_habilidad = true 
WHERE nombre IN (
  'SERVICIO DE AUDITORÍA EN SALUD',
  'SERVICIO DE MONITOREO DE IMPLEMENTACIÓN DE SERVICIOS COMPLEMENTARIOS EN SALUD'
) AND requiere_habilidad = false;