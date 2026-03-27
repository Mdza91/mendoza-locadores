-- =========================================
-- CRITICAL SECURITY FIX: Restrict configuration access
-- =========================================
-- This migration restricts access to configuration tables
-- Only HR managers and admins can modify these tables
-- All authenticated users can read unidades/denominaciones (for dropdowns)
-- =========================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a unidades" ON public.unidades;
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a denominaciones" ON public.denominaciones;
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a config_notificaciones" ON public.config_notificaciones;
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a documentos_generales" ON public.documentos_generales;

-- =========================================
-- UNIDADES: Secure policies
-- =========================================

-- All authenticated users can read unidades (needed for dropdowns)
CREATE POLICY "Todos pueden ver unidades"
  ON public.unidades
  FOR SELECT
  TO authenticated
  USING (true);

-- Only HR and admins can manage unidades
CREATE POLICY "HR y admins pueden gestionar unidades"
  ON public.unidades
  FOR ALL
  TO authenticated
  USING (is_hr_or_admin(auth.uid()))
  WITH CHECK (is_hr_or_admin(auth.uid()));

-- =========================================
-- DENOMINACIONES: Secure policies
-- =========================================

-- All authenticated users can read denominaciones (needed for dropdowns)
CREATE POLICY "Todos pueden ver denominaciones"
  ON public.denominaciones
  FOR SELECT
  TO authenticated
  USING (true);

-- Only HR and admins can manage denominaciones
CREATE POLICY "HR y admins pueden gestionar denominaciones"
  ON public.denominaciones
  FOR ALL
  TO authenticated
  USING (is_hr_or_admin(auth.uid()))
  WITH CHECK (is_hr_or_admin(auth.uid()));

-- =========================================
-- CONFIG_NOTIFICACIONES: Secure policies
-- =========================================

-- Only HR and admins can read notificaciones config
CREATE POLICY "HR y admins pueden ver config de notificaciones"
  ON public.config_notificaciones
  FOR SELECT
  TO authenticated
  USING (is_hr_or_admin(auth.uid()));

-- Only HR and admins can manage notificaciones config
CREATE POLICY "HR y admins pueden gestionar config de notificaciones"
  ON public.config_notificaciones
  FOR ALL
  TO authenticated
  USING (is_hr_or_admin(auth.uid()))
  WITH CHECK (is_hr_or_admin(auth.uid()));

-- =========================================
-- DOCUMENTOS_GENERALES: Secure policies
-- =========================================

-- Only HR and admins can read documentos_generales
CREATE POLICY "HR y admins pueden ver documentos generales"
  ON public.documentos_generales
  FOR SELECT
  TO authenticated
  USING (is_hr_or_admin(auth.uid()));

-- Only HR and admins can manage documentos_generales
CREATE POLICY "HR y admins pueden gestionar documentos generales"
  ON public.documentos_generales
  FOR ALL
  TO authenticated
  USING (is_hr_or_admin(auth.uid()))
  WITH CHECK (is_hr_or_admin(auth.uid()));