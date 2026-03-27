-- Agregar foreign key constraint para locador_id en cambios_pendientes_productos
ALTER TABLE public.cambios_pendientes_productos
ADD CONSTRAINT cambios_pendientes_productos_locador_id_fkey
FOREIGN KEY (locador_id) 
REFERENCES public.locadores(id) 
ON DELETE CASCADE;