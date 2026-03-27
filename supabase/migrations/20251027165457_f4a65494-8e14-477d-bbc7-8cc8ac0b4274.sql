-- =========================================
-- CRITICAL FIX: Infinite recursion in user_roles RLS policies
-- =========================================
-- The current policies are causing infinite recursion because they
-- query user_roles within user_roles policies. We need to use the
-- security definer function has_role() instead.
-- =========================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create new policies using the has_role() security definer function
-- This avoids infinite recursion

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to manage all roles using security definer function
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));