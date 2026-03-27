-- Agregar configuración de notificaciones para constancia_estudios
INSERT INTO config_notificaciones (tipo, dias_anticipacion, activa)
VALUES ('constancia_estudios', 7, true)
ON CONFLICT DO NOTHING;