-- Add locador role to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'hr_manager', 'locador');
  ELSE
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'locador';
  END IF;
END $$;

-- Add column to link locadores with auth users
ALTER TABLE public.locadores 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_locadores_user_id ON public.locadores(user_id);
CREATE INDEX IF NOT EXISTS idx_locadores_numero_documento ON public.locadores(numero_documento);

-- Update RLS policies for locadores table to allow locadores to view their own profile
CREATE POLICY "Locadores can view their own profile" 
ON public.locadores 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_hr_or_admin(auth.uid())
);

-- Update RLS policies for documentos table to allow locadores to view their own documents
CREATE POLICY "Locadores can view their own documents" 
ON public.documentos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.locadores 
    WHERE locadores.id = documentos.locador_id 
    AND locadores.user_id = auth.uid()
  ) OR 
  is_hr_or_admin(auth.uid())
);

-- Create function to create locador users
CREATE OR REPLACE FUNCTION public.create_locador_user(
  p_locador_id uuid,
  p_numero_documento text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create auth user with numero_documento as email and password
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_numero_documento || '@locador.local',
    crypt(p_numero_documento, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Link user with locador
  UPDATE public.locadores 
  SET user_id = v_user_id 
  WHERE id = p_locador_id;

  -- Assign locador role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'locador');
END;
$$;