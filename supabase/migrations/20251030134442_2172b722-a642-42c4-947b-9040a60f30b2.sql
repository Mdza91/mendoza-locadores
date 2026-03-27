-- Agregar política SELECT para que locadores puedan ver sus propios periodo_locadores
DROP POLICY IF EXISTS "Locadores pueden ver sus propios periodos" ON periodo_locadores;

CREATE POLICY "Locadores pueden ver sus propios periodos"
ON periodo_locadores FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id = periodo_locadores.locador_id
    AND locadores.user_id = auth.uid()
  )
);

-- También asegurar que pueden ver ordenes_servicio relacionadas
DROP POLICY IF EXISTS "Locadores pueden ver sus ordenes de servicio" ON ordenes_servicio;

CREATE POLICY "Locadores pueden ver sus ordenes de servicio"
ON ordenes_servicio FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM periodo_locadores pl
    JOIN locadores l ON l.id = pl.locador_id
    WHERE pl.id = ordenes_servicio.periodo_locador_id
    AND l.user_id = auth.uid()
  ) OR is_hr_or_admin(auth.uid())
);