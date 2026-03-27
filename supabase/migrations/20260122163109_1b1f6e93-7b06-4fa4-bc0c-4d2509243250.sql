-- Primero, agregar la sección "CV Documentado" 
INSERT INTO config_secciones_visibles_locadores (seccion, nombre_display, visible, orden)
VALUES ('cv_documentado', 'CV Documentado', true, 5);

-- Agregar la sección "Mis Entregas"
INSERT INTO config_secciones_visibles_locadores (seccion, nombre_display, visible, orden)
VALUES ('mis_entregas', 'Mis Entregas', true, 6);

-- Obtener el ID de la nueva sección cv_documentado para agregar sus items
-- Insertar items para CV Documentado
INSERT INTO config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'cv_documentado', 'Hoja de Vida - CV', true, 1
FROM config_secciones_visibles_locadores WHERE seccion = 'cv_documentado';

INSERT INTO config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'dni_vigente', 'DNI Vigente', true, 2
FROM config_secciones_visibles_locadores WHERE seccion = 'cv_documentado';

INSERT INTO config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'sustento_cv', 'Sustento - CV', true, 3
FROM config_secciones_visibles_locadores WHERE seccion = 'cv_documentado';

INSERT INTO config_items_seccion_locadores (seccion_id, item_key, nombre_display, visible, orden)
SELECT id, 'constancia_estudios_sin_fedatear', 'Constancia de Estudios', true, 4
FROM config_secciones_visibles_locadores WHERE seccion = 'cv_documentado';

-- Eliminar los items de CV Documentado de la sección mis_documentos (ya que ahora están en su propia sección)
DELETE FROM config_items_seccion_locadores 
WHERE item_key IN ('cv_documentado', 'dni_vigente', 'sustento_cv', 'constancia_estudios_sin_fedatear', 'constancia_estudios')
AND seccion_id = (SELECT id FROM config_secciones_visibles_locadores WHERE seccion = 'mis_documentos');

-- Actualizar el orden de las secciones existentes
UPDATE config_secciones_visibles_locadores SET orden = 4 WHERE seccion = 'cv_documentado';
UPDATE config_secciones_visibles_locadores SET orden = 5 WHERE seccion = 'mis_documentos';
UPDATE config_secciones_visibles_locadores SET orden = 6 WHERE seccion = 'mis_entregas';