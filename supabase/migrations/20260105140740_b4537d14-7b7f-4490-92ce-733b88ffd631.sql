-- Add new enum values to documento_tipo_original
ALTER TYPE documento_tipo_original ADD VALUE IF NOT EXISTS 'dni_vigente';
ALTER TYPE documento_tipo_original ADD VALUE IF NOT EXISTS 'sustento_cv';