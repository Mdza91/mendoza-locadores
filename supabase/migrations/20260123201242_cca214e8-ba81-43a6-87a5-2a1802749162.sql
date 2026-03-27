-- Eliminar los documentos que no necesitan link de solicitud
DELETE FROM public.config_links_solicitud_documentos 
WHERE tipo_documento IN ('cotizacion', 'declaracion_jurada', 'tdr', 'habilidad_vigente', 'cci');