-- Agregar campos de snapshot a planilla_locadores para guardar datos del locador en el momento de la planilla
ALTER TABLE planilla_locadores 
ADD COLUMN nombres_snapshot text,
ADD COLUMN apellidos_snapshot text,
ADD COLUMN ruc_snapshot text,
ADD COLUMN remuneracion_snapshot numeric,
ADD COLUMN unidad_nombre_snapshot text,
ADD COLUMN denominacion_nombre_snapshot text,
ADD COLUMN inicio_actividades_snapshot date,
ADD COLUMN fin_actividades_snapshot date,
ADD COLUMN tiene_fin_actividades_snapshot boolean DEFAULT false;