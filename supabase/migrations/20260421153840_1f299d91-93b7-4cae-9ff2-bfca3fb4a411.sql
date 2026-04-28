-- Tighten Row-Level Security so users only see their own data.
-- Previously most SELECT policies were USING (true), letting any logged-in
-- user read every row in the database. We replace those with membership-
-- based checks tied to room_roles.

-- Helper: is the user a member of a room (any role)?
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_roles
    WHERE room_id = _room_id
      AND user_id = _user_id
  );
$$;

-- ROOMS: only members can view
DROP POLICY IF EXISTS "Authenticated can view rooms" ON public.rooms;
CREATE POLICY "Members can view rooms"
ON public.rooms FOR SELECT
TO authenticated
USING (public.is_room_member(id, auth.uid()));

-- ROOM_ROLES: a user can only see role rows for rooms they're a member of
DROP POLICY IF EXISTS "Auth can view room roles" ON public.room_roles;
CREATE POLICY "Members can view room roles"
ON public.room_roles FOR SELECT
TO authenticated
USING (public.is_room_member(room_id, auth.uid()));

-- CHAT_MESSAGES: only members can read
DROP POLICY IF EXISTS "Auth can view messages" ON public.chat_messages;
CREATE POLICY "Members can view messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (public.is_room_member(room_id, auth.uid()));

-- ROOM_NOTES: only members can read
DROP POLICY IF EXISTS "Auth can view notes" ON public.room_notes;
CREATE POLICY "Members can view notes"
ON public.room_notes FOR SELECT
TO authenticated
USING (public.is_room_member(room_id, auth.uid()));

-- ROOM_DOCUMENTS: only members can read
DROP POLICY IF EXISTS "Auth can view docs" ON public.room_documents;
CREATE POLICY "Members can view docs"
ON public.room_documents FOR SELECT
TO authenticated
USING (public.is_room_member(room_id, auth.uid()));

-- DOCUMENT_VERSIONS: only members can read
DROP POLICY IF EXISTS "Auth can view versions" ON public.document_versions;
CREATE POLICY "Members can view versions"
ON public.document_versions FOR SELECT
TO authenticated
USING (public.is_room_member(room_id, auth.uid()));

-- ROOM_ACTIVITY: only members can read
DROP POLICY IF EXISTS "Auth can view activity" ON public.room_activity;
CREATE POLICY "Members can view activity"
ON public.room_activity FOR SELECT
TO authenticated
USING (public.is_room_member(room_id, auth.uid()));