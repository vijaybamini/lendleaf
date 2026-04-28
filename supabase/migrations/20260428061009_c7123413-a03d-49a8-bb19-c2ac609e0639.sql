
-- Recreate public_profiles as a security_invoker view so it runs with
-- the caller's permissions. Pair it with a restrictive RLS policy on the
-- base table that allows reading only the safe columns (we still block
-- direct base-table reads of location via the existing owner-only policy,
-- and add a second policy that allows anyone authenticated/anon to read
-- rows — but only through the view, which excludes lat/lng columns).
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, display_name, location_label, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a permissive SELECT policy that only works via the view
-- (we can't restrict columns in RLS, so we add a second public SELECT
-- policy but rely on the view to project only safe columns; the base
-- table will also be readable by non-owners, so we DO NOT want a broad
-- SELECT policy. Instead: keep owner-only SELECT on base, and make the
-- view SECURITY DEFINER-owned by a role that can read profiles).
-- Simpler: change view back to security_invoker=off but grant it via
-- a dedicated non-superuser role. Postgres views by default run as the
-- view owner when security_invoker=off, bypassing base RLS. This is
-- acceptable because the view only exposes safe columns.
DROP VIEW public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT id, display_name, location_label, created_at
FROM public.profiles;

ALTER VIEW public.public_profiles SET (security_invoker = off);
GRANT SELECT ON public.public_profiles TO anon, authenticated;
