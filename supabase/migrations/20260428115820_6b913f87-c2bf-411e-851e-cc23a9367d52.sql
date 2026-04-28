-- 1. Re-create the missing trigger that grants the creator the "owner" role.
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

DROP TRIGGER IF EXISTS on_room_created ON public.rooms;
CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

-- 2. Server-side, atomic room creator. Bypasses any RLS subtleties because
--    it runs as SECURITY DEFINER and uses auth.uid() directly.
CREATE OR REPLACE FUNCTION public.create_room(_name text)
RETURNS public.rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_room public.rooms;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.rooms (name, owner_id)
  VALUES (COALESCE(NULLIF(btrim(_name), ''), 'Untitled room'), uid)
  RETURNING * INTO new_room;

  -- Trigger handles role insert, but we double-insert to be 100% safe.
  INSERT INTO public.room_roles (room_id, user_id, role)
  VALUES (new_room.id, uid, 'owner')
  ON CONFLICT (room_id, user_id) DO NOTHING;

  RETURN new_room;
END;
$$;

REVOKE ALL ON FUNCTION public.create_room(text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_room(text) TO authenticated;