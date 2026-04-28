
-- 1. Enum for room roles
CREATE TYPE public.room_role AS ENUM ('owner', 'editor', 'viewer');

-- 2. room_roles table
CREATE TABLE public.room_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.room_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX idx_room_roles_room ON public.room_roles (room_id);
CREATE INDEX idx_room_roles_user ON public.room_roles (user_id);

ALTER TABLE public.room_roles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_room_roles_updated_at
BEFORE UPDATE ON public.room_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_room_role(_room_id UUID, _user_id UUID)
RETURNS public.room_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.room_roles
  WHERE room_id = _room_id AND user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_room(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_roles
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND role IN ('owner', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_owner(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_roles
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND role = 'owner'
  );
$$;

-- 4. RLS for room_roles itself
CREATE POLICY "Auth can view room roles"
  ON public.room_roles FOR SELECT
  TO authenticated
  USING (true);

-- Allow a user to insert their own viewer-row when they first open a public room (self-join)
CREATE POLICY "User can self-join as viewer"
  ON public.room_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'viewer');

-- Owners can add anyone (used when creating a room: owner_id inserts their own owner row via trigger; also supports inviting)
CREATE POLICY "Owner can manage room roles"
  ON public.room_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_room_owner(room_id, auth.uid()));

CREATE POLICY "Owner can update room roles"
  ON public.room_roles FOR UPDATE
  TO authenticated
  USING (public.is_room_owner(room_id, auth.uid()))
  WITH CHECK (public.is_room_owner(room_id, auth.uid()));

CREATE POLICY "Owner or self can delete room role"
  ON public.room_roles FOR DELETE
  TO authenticated
  USING (
    public.is_room_owner(room_id, auth.uid())
    OR auth.uid() = user_id
  );

-- 5. Auto-assign owner role on room creation
CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_roles (room_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

-- 6. Backfill: existing rooms → assign current owner_id as 'owner'
INSERT INTO public.room_roles (room_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.rooms
ON CONFLICT (room_id, user_id) DO NOTHING;

-- 7. Update existing RLS policies to enforce edit access by role.
-- room_documents
DROP POLICY IF EXISTS "Auth can update docs" ON public.room_documents;
DROP POLICY IF EXISTS "Auth can insert docs" ON public.room_documents;
CREATE POLICY "Editors can update docs"
  ON public.room_documents FOR UPDATE
  TO authenticated
  USING (public.can_edit_room(room_id, auth.uid()))
  WITH CHECK (public.can_edit_room(room_id, auth.uid()));
CREATE POLICY "Editors can insert docs"
  ON public.room_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_room(room_id, auth.uid()));

-- room_notes
DROP POLICY IF EXISTS "Auth can create notes" ON public.room_notes;
DROP POLICY IF EXISTS "Auth can update notes" ON public.room_notes;
DROP POLICY IF EXISTS "Creator or owner can delete notes" ON public.room_notes;
CREATE POLICY "Editors can create notes"
  ON public.room_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.can_edit_room(room_id, auth.uid()));
CREATE POLICY "Editors can update notes"
  ON public.room_notes FOR UPDATE
  TO authenticated
  USING (public.can_edit_room(room_id, auth.uid()))
  WITH CHECK (public.can_edit_room(room_id, auth.uid()));
CREATE POLICY "Editors or owner can delete notes"
  ON public.room_notes FOR DELETE
  TO authenticated
  USING (
    public.can_edit_room(room_id, auth.uid())
    AND (auth.uid() = created_by OR public.is_room_owner(room_id, auth.uid()))
  );

-- chat_messages
DROP POLICY IF EXISTS "Auth can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Author can delete own message" ON public.chat_messages;
CREATE POLICY "Editors can send messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_edit_room(room_id, auth.uid()));
CREATE POLICY "Author or owner can delete message"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_room_owner(room_id, auth.uid()));

-- document_versions
DROP POLICY IF EXISTS "Auth can create versions" ON public.document_versions;
DROP POLICY IF EXISTS "Author or room owner can delete versions" ON public.document_versions;
CREATE POLICY "Editors can create versions"
  ON public.document_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_room(room_id, auth.uid()));
CREATE POLICY "Author or owner can delete versions"
  ON public.document_versions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.is_room_owner(room_id, auth.uid()));

-- room_activity
DROP POLICY IF EXISTS "Auth can create activity" ON public.room_activity;
DROP POLICY IF EXISTS "Author or room owner can delete activity" ON public.room_activity;
CREATE POLICY "Members can create activity"
  ON public.room_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author or owner can delete activity"
  ON public.room_activity FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_room_owner(room_id, auth.uid()));

-- rooms: only owner can delete/update
DROP POLICY IF EXISTS "Owner can delete room" ON public.rooms;
DROP POLICY IF EXISTS "Owner can update room" ON public.rooms;
CREATE POLICY "Owner can delete room"
  ON public.rooms FOR DELETE
  TO authenticated
  USING (public.is_room_owner(id, auth.uid()));
CREATE POLICY "Owner can update room"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (public.is_room_owner(id, auth.uid()));

-- Realtime for role changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_roles;
