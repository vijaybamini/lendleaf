-- Mutual confirmation for handover
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS lender_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS borrower_confirmed boolean NOT NULL DEFAULT false;

-- Replace confirm_handover so either party can confirm; activation
-- (status flip + credit transfer + book becoming lent) only happens once
-- BOTH the lender and borrower have confirmed the physical handover.
CREATE OR REPLACE FUNCTION public.confirm_handover(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _lender uuid;
  _borrower uuid;
  _book_id uuid;
  _status transaction_status;
  _lender_confirmed boolean;
  _borrower_confirmed boolean;
  _borrower_credits int;
  _is_lender boolean;
  _is_borrower boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lender_id, borrower_id, book_id, status, lender_confirmed, borrower_confirmed
  INTO _lender, _borrower, _book_id, _status, _lender_confirmed, _borrower_confirmed
  FROM public.transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  IF _lender IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  _is_lender := (_lender = auth.uid());
  _is_borrower := (_borrower = auth.uid());

  IF NOT (_is_lender OR _is_borrower) THEN
    RAISE EXCEPTION 'Only participants can confirm handover';
  END IF;

  IF _status <> 'accepted' THEN
    RAISE EXCEPTION 'Request must be accepted before handover';
  END IF;

  -- Record this party's confirmation
  IF _is_lender THEN
    _lender_confirmed := true;
  END IF;
  IF _is_borrower THEN
    _borrower_confirmed := true;
  END IF;

  UPDATE public.transactions
  SET lender_confirmed = _lender_confirmed,
      borrower_confirmed = _borrower_confirmed,
      updated_at = now()
  WHERE id = _transaction_id;

  -- Only when both have confirmed do we activate the loan + move credits
  IF _lender_confirmed AND _borrower_confirmed THEN
    SELECT credits INTO _borrower_credits
    FROM public.profiles WHERE id = _borrower FOR UPDATE;

    IF COALESCE(_borrower_credits, 0) < 1 THEN
      RAISE EXCEPTION 'Borrower no longer has enough credits';
    END IF;

    UPDATE public.profiles SET credits = credits - 1, updated_at = now() WHERE id = _borrower;
    UPDATE public.profiles SET credits = credits + 1, updated_at = now() WHERE id = _lender;

    UPDATE public.transactions
    SET status = 'active', updated_at = now()
    WHERE id = _transaction_id;

    UPDATE public.books SET status = 'lent' WHERE id = _book_id;
  END IF;
END;
$function$;