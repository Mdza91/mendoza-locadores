
-- Add subtitulo and texto_ayuda columns to config_documentos_emergencia
ALTER TABLE public.config_documentos_emergencia
  ADD COLUMN subtitulo text NOT NULL DEFAULT '',
  ADD COLUMN texto_ayuda text NOT NULL DEFAULT '';

-- Insert documento_03 and documento_04
INSERT INTO public.config_documentos_emergencia (documento_key, nombre_display, habilitado, subtitulo, texto_ayuda)
VALUES 
  ('documento_03', 'Documento 03', false, '', ''),
  ('documento_04', 'Documento 04', false, '', '');
