-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update room" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete room" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Room documents (1 per room)
CREATE TABLE public.room_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES public.rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view docs" ON public.room_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert docs" ON public.room_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update docs" ON public.room_documents FOR UPDATE TO authenticated USING (true);

-- Notes
CREATE TABLE public.room_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#fde68a',
  pos_x FLOAT NOT NULL DEFAULT 0,
  pos_y FLOAT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view notes" ON public.room_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can create notes" ON public.room_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Auth can update notes" ON public.room_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Creator or owner can delete notes" ON public.room_notes FOR DELETE TO authenticated USING (
  auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
);

-- Chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author can delete own message" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.room_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  colors TEXT[] := ARRAY['#6366f1','#ec4899','#f59e0b','#10b981','#06b6d4','#8b5cf6','#ef4444','#14b8a6'];
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    colors[1 + floor(random()*8)::int]
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER TABLE public.room_documents REPLICA IDENTITY FULL;
ALTER TABLE public.room_notes REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;