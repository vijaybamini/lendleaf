-- Mutual return confirmation
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS lender_returned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS borrower_returned boolean NOT NULL DEFAULT false;

-- confirm_return: either party can confirm. Once both confirm, status flips
-- to 'completed' and the book becomes 'available' again. Credits are NOT
-- moved back — the loan was paid for at handover time.
CREATE OR REPLACE FUNCTION public.confirm_return(_transaction_id uuid)
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
  _lender_returned boolean;
  _borrower_returned boolean;
  _is_lender boolean;
  _is_borrower boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lender_id, borrower_id, book_id, status, lender_returned, borrower_returned
  INTO _lender, _borrower, _book_id, _status, _lender_returned, _borrower_returned
  FROM public.transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  IF _lender IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  _is_lender := (_lender = auth.uid());
  _is_borrower := (_borrower = auth.uid());

  IF NOT (_is_lender OR _is_borrower) THEN
    RAISE EXCEPTION 'Only participants can confirm return';
  END IF;

  IF _status <> 'active' THEN
    RAISE EXCEPTION 'Loan must be active before return can be confirmed';
  END IF;

  IF _is_lender THEN
    _lender_returned := true;
  END IF;
  IF _is_borrower THEN
    _borrower_returned := true;
  END IF;

  UPDATE public.transactions
  SET lender_returned = _lender_returned,
      borrower_returned = _borrower_returned,
      updated_at = now()
  WHERE id = _transaction_id;

  -- Only when both have confirmed do we complete the loan + free the book
  IF _lender_returned AND _borrower_returned THEN
    UPDATE public.transactions
    SET status = 'completed', updated_at = now()
    WHERE id = _transaction_id;

    UPDATE public.books SET status = 'available' WHERE id = _book_id;
  END IF;
END;
$function$;