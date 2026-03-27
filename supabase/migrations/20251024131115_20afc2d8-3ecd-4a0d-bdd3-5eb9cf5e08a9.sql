-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'hr_manager', 'user');

-- Create user_roles table to store role assignments
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create helper function to check if user is admin or hr_manager
CREATE OR REPLACE FUNCTION public.is_hr_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'hr_manager')
  )
$$;

-- Drop existing overly permissive policy on locadores
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a locadores" ON public.locadores;

-- Create restrictive policies for locadores table
CREATE POLICY "HR and admins can view all employee records"
ON public.locadores
FOR SELECT
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can insert employee records"
ON public.locadores
FOR INSERT
TO authenticated
WITH CHECK (public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can update employee records"
ON public.locadores
FOR UPDATE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can delete employee records"
ON public.locadores
FOR DELETE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

-- Update planillas table policies
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a planillas" ON public.planillas;

CREATE POLICY "HR and admins can view all payroll records"
ON public.planillas
FOR SELECT
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can manage payroll records"
ON public.planillas
FOR ALL
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

-- Update related tables to use same role-based access
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a planilla_locador" ON public.planilla_locadores;

CREATE POLICY "HR and admins can manage planilla assignments"
ON public.planilla_locadores
FOR ALL
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a documentos" ON public.documentos;

CREATE POLICY "HR and admins can view all documents"
ON public.documentos
FOR SELECT
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can manage documents"
ON public.documentos
FOR ALL
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a locador_periodos" ON public.locador_periodos;

CREATE POLICY "HR and admins can manage locador periods"
ON public.locador_periodos
FOR ALL
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

-- Configuration tables can remain accessible to authenticated users for now
-- (denominaciones, unidades, config_notificaciones, documentos_generales)
-- These don't contain sensitive PII