-- Create table for inactivity timeout configuration
CREATE TABLE IF NOT EXISTS public.config_timeout_inactividad (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  minutos_inactividad INTEGER NOT NULL DEFAULT 30,
  habilitado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_timeout_inactividad ENABLE ROW LEVEL SECURITY;

-- Policy for viewing configuration (all authenticated users)
CREATE POLICY "Anyone can view timeout configuration"
ON public.config_timeout_inactividad
FOR SELECT
TO authenticated
USING (true);

-- Policy for updating configuration (only hr_manager and admin)
CREATE POLICY "Only hr_manager and admin can update timeout configuration"
ON public.config_timeout_inactividad
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hr_manager', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hr_manager', 'admin')
  )
);

-- Insert default configuration
INSERT INTO public.config_timeout_inactividad (minutos_inactividad, habilitado)
VALUES (30, true)
ON CONFLICT DO NOTHING;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_config_timeout_inactividad_updated_at
BEFORE UPDATE ON public.config_timeout_inactividad
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();