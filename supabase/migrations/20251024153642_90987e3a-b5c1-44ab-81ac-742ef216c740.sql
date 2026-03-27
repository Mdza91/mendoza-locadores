-- Fix storage bucket security: Restrict documentos bucket to HR and admins only

-- Drop existing permissive policies on storage.objects for documentos bucket
DROP POLICY IF EXISTS "Usuarios autenticados tienen acceso completo a documentos b" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

-- Create restrictive policies for documentos bucket that match table-level security
CREATE POLICY "HR and admins can view documents in storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos' AND is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can upload documents to storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos' AND is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can update documents in storage"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documentos' AND is_hr_or_admin(auth.uid()))
WITH CHECK (bucket_id = 'documentos' AND is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can delete documents from storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos' AND is_hr_or_admin(auth.uid()));