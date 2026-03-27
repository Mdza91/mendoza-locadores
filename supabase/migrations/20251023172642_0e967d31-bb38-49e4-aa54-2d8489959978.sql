-- Agregar 'constancia_estudios' al enum documento_tipo_original
ALTER TYPE documento_tipo_original ADD VALUE IF NOT EXISTS 'constancia_estudios';