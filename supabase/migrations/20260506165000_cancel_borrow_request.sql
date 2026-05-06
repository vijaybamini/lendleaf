CREATE OR REPLACE FUNCTION public.cancel_borrow_request(_book_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _borrower uuid := auth.uid();
  _transaction_id uuid;
BEGIN
  IF _borrower IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.transactions
  SET status = 'rejected', updated_at = now()
  WHERE book_id = _book_id
    AND borrower_id = _borrower
    AND status = 'pending'
  RETURNING id INTO _transaction_id;

  IF _transaction_id IS NULL THEN
    RAISE EXCEPTION 'No pending request found';
  END IF;

  RETURN _transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_borrow_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_borrow_request(uuid) TO authenticated;
