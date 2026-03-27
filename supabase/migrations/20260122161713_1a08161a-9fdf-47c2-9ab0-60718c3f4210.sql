-- Create configuration table for hiding inactive users
CREATE TABLE public.config_ocultamiento_inactivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ocultar_inactivos BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_ocultamiento_inactivos ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Authenticated users can read config_ocultamiento_inactivos"
  ON public.config_ocultamiento_inactivos
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin/hr to update
CREATE POLICY "HR and admins can update config_ocultamiento_inactivos"
  ON public.config_ocultamiento_inactivos
  FOR UPDATE
  TO authenticated
  USING (public.is_hr_or_admin(auth.uid()));

-- Insert default configuration
INSERT INTO public.config_ocultamiento_inactivos (ocultar_inactivos) VALUES (false);