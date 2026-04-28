DROP POLICY "Auth can insert docs" ON public.room_documents;
DROP POLICY "Auth can update docs" ON public.room_documents;
DROP POLICY "Auth can update notes" ON public.room_notes;

CREATE POLICY "Auth can insert docs" ON public.room_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update docs" ON public.room_documents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update notes" ON public.room_notes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);