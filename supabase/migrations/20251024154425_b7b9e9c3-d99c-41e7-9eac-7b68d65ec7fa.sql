-- Fix Critical Security Issues
-- 1. Remove duplicate permissive storage policies that bypass HR/admin restrictions
-- 2. Add input validation constraints on locadores table

-- ============================================
-- ISSUE 1: Remove Duplicate Storage Policies
-- ============================================
-- Drop ALL permissive authenticated-user policies that allow any user to access documents
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON storage.objects;

-- Also drop any other variations of permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

-- ============================================
-- ISSUE 2: Add Input Validation Constraints
-- ============================================

-- Email format validation - must be a valid email
ALTER TABLE locadores ADD CONSTRAINT email_format_check
  CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Salary must be positive (greater than zero)
ALTER TABLE locadores ADD CONSTRAINT remuneracion_positive_check
  CHECK (remuneracion > 0);

-- Phone number length validation (9-15 digits is standard international range)
ALTER TABLE locadores ADD CONSTRAINT celular_length_check
  CHECK (length(celular) BETWEEN 9 AND 15);

-- Text field length limits to prevent database abuse
ALTER TABLE locadores ADD CONSTRAINT apellidos_length_check
  CHECK (length(apellidos) <= 200);

ALTER TABLE locadores ADD CONSTRAINT nombres_length_check
  CHECK (length(nombres) <= 200);

ALTER TABLE locadores ADD CONSTRAINT direccion_length_check
  CHECK (length(direccion) <= 500);

ALTER TABLE locadores ADD CONSTRAINT banco_length_check
  CHECK (length(banco) <= 100);

-- RUC length validation (11 digits for Peru)
ALTER TABLE locadores ADD CONSTRAINT ruc_length_check
  CHECK (length(ruc) = 11);

-- CCI length validation (20 digits for Peru)
ALTER TABLE locadores ADD CONSTRAINT cci_length_check
  CHECK (length(cci) = 20);

-- Document number length validation (DNI: 8, CE: 9-12)
ALTER TABLE locadores ADD CONSTRAINT numero_documento_length_check
  CHECK (length(numero_documento) BETWEEN 8 AND 12);