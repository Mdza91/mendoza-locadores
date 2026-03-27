-- Fix the audit trigger to handle service role executions
DROP TRIGGER IF EXISTS log_locadores_access_trigger ON public.locadores;

CREATE OR REPLACE FUNCTION public.log_locadores_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if there's an authenticated user (skip for service role operations)
  IF auth.uid() IS NOT NULL THEN
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
      INSERT INTO public.locadores_audit_log (locador_id, accessed_by, access_type)
      VALUES (OLD.id, auth.uid(), TG_OP);
    END IF;
  END IF;
  
  -- Always return the appropriate record
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Recreate trigger
CREATE TRIGGER log_locadores_access_trigger
AFTER UPDATE OR DELETE ON public.locadores
FOR EACH ROW
EXECUTE FUNCTION public.log_locadores_access();