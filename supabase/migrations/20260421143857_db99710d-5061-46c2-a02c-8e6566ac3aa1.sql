
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_by_name TEXT,
  created_by_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_versions_room_created
  ON public.document_versions (room_id, created_at DESC);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view versions"
  ON public.document_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth can create versions"
  ON public.document_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Author or room owner can delete versions"
  ON public.document_versions
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = document_versions.room_id AND r.owner_id = auth.uid()
    )
  );
