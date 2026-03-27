-- Agregar el nuevo tipo de documento al enum
ALTER TYPE documento_tipo_original ADD VALUE IF NOT EXISTS 'constancia_estudios_sin_fedatear';