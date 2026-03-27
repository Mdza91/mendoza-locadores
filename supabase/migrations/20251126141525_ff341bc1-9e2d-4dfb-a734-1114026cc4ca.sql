-- Add fecha_vencimiento_nueva to cambios_pendientes_documentos
ALTER TABLE cambios_pendientes_documentos 
ADD COLUMN fecha_vencimiento_nueva date;

COMMENT ON COLUMN cambios_pendientes_documentos.fecha_vencimiento_nueva IS 'Nueva fecha de vencimiento propuesta para documentos con vencimiento';