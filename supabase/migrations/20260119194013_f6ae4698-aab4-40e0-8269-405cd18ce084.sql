-- Eliminar políticas existentes para documentos_emergencia
DROP POLICY IF EXISTS "Locadores pueden subir sus documentos emergencia" ON public.documentos_emergencia;
DROP POLICY IF EXISTS "Locadores pueden actualizar sus documentos emergencia" ON public.documentos_emergencia;

-- Recrear políticas corregidas para INSERT
CREATE POLICY "Locadores pueden subir sus documentos emergencia"
ON public.documentos_emergencia
FOR INSERT
WITH CHECK (
  locador_id IN (
    SELECT id FROM public.locadores WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr_manager')
  )
);

-- Recrear política para UPDATE
CREATE POLICY "Locadores pueden actualizar sus documentos emergencia"
ON public.documentos_emergencia
FOR UPDATE
USING (
  locador_id IN (
    SELECT id FROM public.locadores WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr_manager')
  )
);