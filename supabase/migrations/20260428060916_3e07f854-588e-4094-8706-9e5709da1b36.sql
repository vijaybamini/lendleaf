
-- ========== 1. Fix GPS exposure on profiles ==========
-- Drop the public SELECT policy and replace with owner-only access.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Owner can read their own full profile (including precise coords)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create a safe public view exposing only non-sensitive fields.
-- Uses security_invoker=on so access is governed by a dedicated grant.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, display_name, location_label, created_at
FROM public.profiles;

-- Allow anyone to read the safe view. The view excludes lat/lng.
-- Because security_invoker=on, we also need a SELECT policy that grants
-- limited read access to non-owners. Add a policy that only exposes
-- non-location columns via a dedicated role check isn't possible in RLS,
-- so we switch the view to security_invoker=off (definer) and revoke on base.
DROP VIEW public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT id, display_name, location_label, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ========== 2. Distance RPC for nearby books (keeps coords server-side) ==========
CREATE OR REPLACE FUNCTION public.nearby_book_distances(_lat double precision, _lng double precision)
RETURNS TABLE(book_id uuid, distance_km double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id AS book_id,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(_lat)) * cos(radians(p.location_lat)) *
        cos(radians(p.location_lng) - radians(_lng)) +
        sin(radians(_lat)) * sin(radians(p.location_lat))
      ))
    ))::double precision AS distance_km
  FROM public.books b
  JOIN public.profiles p ON p.id = b.owner_id
  WHERE p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.nearby_book_distances(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearby_book_distances(double precision, double precision) TO authenticated;

-- ========== 3. Restrict transaction updates ==========
-- All legitimate transaction changes go through SECURITY DEFINER RPCs:
-- respond_to_request, confirm_handover, confirm_return.
-- Remove direct UPDATE access so participants can't tamper with fields.
DROP POLICY IF EXISTS "Participants can update their transactions" ON public.transactions;

-- ========== 4. Realtime authorization for messages ==========
-- Restrict realtime channel subscriptions so users can only subscribe to
-- topics matching their own user id.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only receive their own message events" ON realtime.messages;

CREATE POLICY "Users can only receive their own message events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Topic must include the authenticated user's id.
  -- Client should subscribe to a channel named like `messages:<user_id>`.
  (realtime.topic() LIKE ('messages:' || auth.uid()::text || '%'))
);
