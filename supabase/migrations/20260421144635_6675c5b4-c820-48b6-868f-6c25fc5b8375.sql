
CREATE TABLE public.room_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT,
  user_color TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_activity_room_created ON public.room_activity (room_id, created_at DESC);

ALTER TABLE public.room_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view activity"
  ON public.room_activity FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth can create activity"
  ON public.room_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Author or room owner can delete activity"
  ON public.room_activity FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_activity.room_id AND r.owner_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_activity;
