-- Create table for locador functions
CREATE TABLE public.locador_funciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locador_id UUID NOT NULL REFERENCES public.locadores(id) ON DELETE CASCADE,
  numero_orden INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(locador_id, numero_orden)
);

-- Enable Row Level Security
ALTER TABLE public.locador_funciones ENABLE ROW LEVEL SECURITY;

-- Policies for HR and admins
CREATE POLICY "HR y admins pueden gestionar funciones"
ON public.locador_funciones
FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Policy for locadores to view their own functions
CREATE POLICY "Locadores pueden ver sus propias funciones"
ON public.locador_funciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = locador_funciones.locador_id
    AND locadores.user_id = auth.uid()
  )
  OR is_hr_or_admin(auth.uid())
);

-- Create index for better performance
CREATE INDEX idx_locador_funciones_locador_id ON public.locador_funciones(locador_id);
CREATE INDEX idx_locador_funciones_orden ON public.locador_funciones(locador_id, numero_orden);

-- Trigger for updating updated_at
CREATE TRIGGER update_locador_funciones_updated_at
BEFORE UPDATE ON public.locador_funciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();