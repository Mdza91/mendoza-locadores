-- Create function to delete locador user account
CREATE OR REPLACE FUNCTION public.delete_locador_user(p_locador_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id from locadores
  SELECT user_id INTO v_user_id
  FROM public.locadores
  WHERE id = p_locador_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found for this locador';
  END IF;

  -- Delete from user_roles first (foreign key constraint)
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Delete from auth.users (this will cascade to locadores.user_id due to ON DELETE SET NULL)
  DELETE FROM auth.users WHERE id = v_user_id;

  -- Explicitly set user_id to NULL in locadores (in case cascade didn't work)
  UPDATE public.locadores SET user_id = NULL WHERE id = p_locador_id;
END;
$$;