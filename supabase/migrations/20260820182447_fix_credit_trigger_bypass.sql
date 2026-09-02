-- Fix: current_setting('role') does not change inside SECURITY DEFINER
-- functions (it reflects the session GUC set by PostgREST, not the effective
-- user).  Use current_user instead, which correctly resolves to the function
-- owner inside SECURITY DEFINER contexts, allowing RPCs like confirm_handover
-- to update credits as intended.

CREATE OR REPLACE FUNCTION public.prevent_credit_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.credits IS DISTINCT FROM OLD.credits
     AND current_user = 'authenticated' THEN
    RAISE EXCEPTION 'Credits cannot be modified directly';
  END IF;
  RETURN NEW;
END;
$$;
