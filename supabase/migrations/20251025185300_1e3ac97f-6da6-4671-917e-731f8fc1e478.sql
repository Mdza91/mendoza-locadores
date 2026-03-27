-- Primero, eliminar duplicados manteniendo solo el más reciente por locador
DELETE FROM locador_periodos
WHERE id NOT IN (
  SELECT DISTINCT ON (locador_id) id
  FROM locador_periodos
  ORDER BY locador_id, updated_at DESC
);

-- Agregar constraint UNIQUE en locador_id para prevenir duplicados
ALTER TABLE locador_periodos
ADD CONSTRAINT locador_periodos_locador_id_unique UNIQUE (locador_id);