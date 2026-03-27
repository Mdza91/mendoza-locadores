-- Permitir que los locadores puedan ver los periodos a los que están asignados
CREATE POLICY "Locadores pueden ver periodos asignados"
ON public.periodos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM periodo_locadores
    WHERE periodo_locadores.periodo_id = periodos.id
    AND EXISTS (
      SELECT 1 FROM locadores
      WHERE locadores.id = periodo_locadores.locador_id
      AND locadores.user_id = auth.uid()
    )
  )
  OR is_hr_or_admin(auth.uid())
);