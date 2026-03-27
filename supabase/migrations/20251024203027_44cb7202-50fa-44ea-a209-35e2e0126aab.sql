-- Fix 1: Add audit logging for locadores table access
CREATE TABLE IF NOT EXISTS public.locadores_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locador_id uuid NOT NULL,
  accessed_by uuid NOT NULL,
  access_type text NOT NULL, -- 'SELECT', 'UPDATE', 'DELETE'
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on audit log
ALTER TABLE public.locadores_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.locadores_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Function to log locadores access
CREATE OR REPLACE FUNCTION public.log_locadores_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log SELECT operations (for UPDATE/DELETE, OLD record exists)
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    INSERT INTO public.locadores_audit_log (locador_id, accessed_by, access_type)
    VALUES (OLD.id, auth.uid(), TG_OP);
  END IF;
  
  -- Always return the appropriate record
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for audit logging
CREATE TRIGGER audit_locadores_update
AFTER UPDATE ON public.locadores
FOR EACH ROW
EXECUTE FUNCTION public.log_locadores_access();

CREATE TRIGGER audit_locadores_delete
AFTER DELETE ON public.locadores
FOR EACH ROW
EXECUTE FUNCTION public.log_locadores_access();

-- Fix 2: Restrict storage bucket SELECT to HR/admin only
-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;

-- Create restrictive policy: only HR and admins can view documents
CREATE POLICY "Only HR and admins can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos' 
  AND is_hr_or_admin(auth.uid())
);

-- Keep the existing signed URL policy for public access (this is acceptable)
-- The "Permitir acceso público a signed URLs" policy allows time-limited access