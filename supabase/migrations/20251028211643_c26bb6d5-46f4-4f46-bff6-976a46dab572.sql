-- Eliminar políticas existentes y recrearlas para el bucket documentos

-- Eliminar política si existe
DROP POLICY IF EXISTS "Locadores pueden subir archivos en su carpeta" ON storage.objects;
DROP POLICY IF EXISTS "Locadores pueden actualizar archivos en su carpeta" ON storage.objects;

-- Crear política para que locadores puedan subir documentos en su propia carpeta
CREATE POLICY "Locadores pueden subir archivos en su carpeta"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id::text = (storage.foldername(name))[1]
    AND locadores.user_id = auth.uid()
  )
);

-- Crear política para que locadores puedan actualizar archivos en su propia carpeta
CREATE POLICY "Locadores pueden actualizar archivos en su carpeta"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM locadores
    WHERE locadores.id::text = (storage.foldername(name))[1]
    AND locadores.user_id = auth.uid()
  )
);