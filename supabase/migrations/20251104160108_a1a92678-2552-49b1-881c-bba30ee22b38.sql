-- Agregar anexo_03 y anexo_04 al enum de documentos generales
DO $$ 
BEGIN
  -- Agregar nuevos valores al enum si no existen
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'anexo_03' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'documento_general_tipo')) THEN
    ALTER TYPE documento_general_tipo ADD VALUE 'anexo_03';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'anexo_04' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'documento_general_tipo')) THEN
    ALTER TYPE documento_general_tipo ADD VALUE 'anexo_04';
  END IF;
END $$;