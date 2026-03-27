-- Política para permitir a locadores subir documentos a la carpeta pending/
CREATE POLICY "Locadores pueden subir documentos pendientes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documentos' 
  AND (storage.foldername(name))[1] = 'pending'
  AND auth.uid() IS NOT NULL
);

-- Política para que locadores puedan ver sus propios documentos pendientes
CREATE POLICY "Locadores pueden ver sus documentos pendientes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos' 
  AND (storage.foldername(name))[1] = 'pending'
  AND auth.uid() IS NOT NULL
);