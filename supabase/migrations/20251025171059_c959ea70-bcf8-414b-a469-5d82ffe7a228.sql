-- Add requiere_constancia field to locadores table
ALTER TABLE public.locadores 
ADD COLUMN requiere_constancia BOOLEAN NOT NULL DEFAULT false;