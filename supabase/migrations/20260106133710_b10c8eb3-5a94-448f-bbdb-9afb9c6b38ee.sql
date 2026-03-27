-- Hacer documento_id nullable para permitir nuevos documentos sin referencia
ALTER TABLE public.cambios_pendientes_documentos 
ALTER COLUMN documento_id DROP NOT NULL;

-- Actualizar el constraint para permitir NULL
ALTER TABLE public.cambios_pendientes_documentos 
DROP CONSTRAINT IF EXISTS cambios_pendientes_documentos_documento_id_fkey;

ALTER TABLE public.cambios_pendientes_documentos
ADD CONSTRAINT cambios_pendientes_documentos_documento_id_fkey 
FOREIGN KEY (documento_id) 
REFERENCES public.documentos(id) 
ON DELETE CASCADE;