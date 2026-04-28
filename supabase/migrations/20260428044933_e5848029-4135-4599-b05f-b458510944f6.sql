-- 1) Restrict profiles UPDATE so users cannot change their own credits directly.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to block direct credit changes from non-privileged roles.
-- SECURITY DEFINER RPCs (confirm_handover, etc.) run as the function owner,
-- not as 'authenticated', so they bypass this guard.
CREATE OR REPLACE FUNCTION public.prevent_credit_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.credits IS DISTINCT FROM OLD.credits
     AND current_setting('role') = 'authenticated' THEN
    RAISE EXCEPTION 'Credits cannot be modified directly';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_credit_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_credit_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_credit_self_update();

-- 2) Enforce messages.content length server-side.
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length
  CHECK (char_length(content) BETWEEN 1 AND 2000);
