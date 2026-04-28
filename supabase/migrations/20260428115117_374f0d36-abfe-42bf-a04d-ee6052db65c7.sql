-- Safety net: ensure authenticated users can create rooms they own.
-- This is idempotent and matches the existing intent.
DROP POLICY IF EXISTS "Authenticated can create rooms" ON public.rooms;
CREATE POLICY "Authenticated can create rooms"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);