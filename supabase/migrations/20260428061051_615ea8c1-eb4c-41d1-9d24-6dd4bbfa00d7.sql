
DROP VIEW IF EXISTS public.public_profiles;

-- Use security_invoker=on and add a public SELECT policy that returns
-- all rows. The view projects only safe columns. Since RLS is row-level,
-- the base table also becomes readable, but only the view's columns are
-- accessible via it. We separately restrict location access via a
-- dedicated policy: only the owner can SELECT the location columns.
-- Since column-level RLS isn't available, we'll enforce safe access
-- by REVOKING SELECT on the location columns from anon/authenticated
-- at the GRANT level, while keeping row-level policies.

-- Step 1: make base table readable by all authenticated users for safe columns only
CREATE POLICY "Public can view basic profile info"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Step 2: revoke column privileges on lat/lng so they aren't returned to
-- anon/authenticated roles, even if selected.
REVOKE SELECT (location_lat, location_lng) ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, credits, location_label, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

-- Owners retain full access via auth.uid() = id policy (already in place)
-- plus an explicit grant path: add a SECURITY DEFINER function for own coords.
CREATE OR REPLACE FUNCTION public.get_my_location()
RETURNS TABLE(location_lat double precision, location_lng double precision, location_label text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT location_lat, location_lng, location_label
  FROM public.profiles
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_location() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_location() TO authenticated;
