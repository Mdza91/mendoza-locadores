-- Crear política para que los locadores puedan actualizar solo su avatar_id
CREATE POLICY "Locadores can update their own avatar" 
ON public.locadores 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);