CREATE OR REPLACE FUNCTION public.cancel_borrow_request(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _borrower uuid;
  _status text;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT borrower_id, status INTO _borrower, _status
  FROM public.transactions
  WHERE id = _transaction_id;

  IF _borrower IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF _borrower <> _caller THEN
    RAISE EXCEPTION 'Only the borrower can cancel their request';
  END IF;

  IF _status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Request cannot be cancelled in its current state';
  END IF;

  UPDATE public.transactions
  SET status = 'rejected', updated_at = now()
  WHERE id = _transaction_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_borrow_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_borrow_request(uuid) TO authenticated;
