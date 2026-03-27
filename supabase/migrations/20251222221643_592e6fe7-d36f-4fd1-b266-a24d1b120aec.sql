-- Allow locadores to read documentos_generales for downloading their expediente
CREATE POLICY "Locadores pueden ver documentos generales"
ON public.documentos_generales
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locadores 
    WHERE locadores.user_id = auth.uid()
  )
);