-- 1. Add 'accepted' to transaction_status enum
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'accepted' BEFORE 'active';

-- 2. Add status column to books
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.books ADD COLUMN status text NOT NULL DEFAULT 'available';
    ALTER TABLE public.books ADD CONSTRAINT books_status_check
      CHECK (status IN ('available', 'lent'));
  END IF;
END $$;

-- 3. RPC: request_borrow
CREATE OR REPLACE FUNCTION public.request_borrow(_book_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _borrower uuid := auth.uid();
  _lender uuid;
  _book_status text;
  _credits int;
  _existing uuid;
  _new_id uuid;
BEGIN
  IF _borrower IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT owner_id, status INTO _lender, _book_status
  FROM public.books WHERE id = _book_id;

  IF _lender IS NULL THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  IF _lender = _borrower THEN
    RAISE EXCEPTION 'You cannot borrow your own book';
  END IF;

  IF _book_status <> 'available' THEN
    RAISE EXCEPTION 'This book is not available';
  END IF;

  SELECT credits INTO _credits FROM public.profiles WHERE id = _borrower;
  IF COALESCE(_credits, 0) < 1 THEN
    RAISE EXCEPTION 'You need at least 1 Leaf Credit to borrow';
  END IF;

  SELECT id INTO _existing FROM public.transactions
  WHERE book_id = _book_id AND borrower_id = _borrower
    AND status IN ('pending', 'accepted', 'active');
  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'You already have an open request for this book';
  END IF;

  INSERT INTO public.transactions (book_id, lender_id, borrower_id, status)
  VALUES (_book_id, _lender, _borrower, 'pending')
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

-- 4. RPC: respond_to_request (accept / reject)
CREATE OR REPLACE FUNCTION public.respond_to_request(_transaction_id uuid, _accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lender uuid;
  _status transaction_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lender_id, status INTO _lender, _status
  FROM public.transactions WHERE id = _transaction_id;

  IF _lender IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF _lender <> auth.uid() THEN
    RAISE EXCEPTION 'Only the lender can respond';
  END IF;

  IF _status <> 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending';
  END IF;

  UPDATE public.transactions
  SET status = CASE WHEN _accept THEN 'accepted'::transaction_status ELSE 'rejected'::transaction_status END,
      updated_at = now()
  WHERE id = _transaction_id;
END;
$$;

-- 5. RPC: confirm_handover (credit swap + activate)
CREATE OR REPLACE FUNCTION public.confirm_handover(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lender uuid;
  _borrower uuid;
  _book_id uuid;
  _status transaction_status;
  _borrower_credits int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lender_id, borrower_id, book_id, status
  INTO _lender, _borrower, _book_id, _status
  FROM public.transactions WHERE id = _transaction_id;

  IF _lender IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF _lender <> auth.uid() THEN
    RAISE EXCEPTION 'Only the lender can confirm handover';
  END IF;

  IF _status <> 'accepted' THEN
    RAISE EXCEPTION 'Request must be accepted before handover';
  END IF;

  SELECT credits INTO _borrower_credits FROM public.profiles WHERE id = _borrower FOR UPDATE;
  IF COALESCE(_borrower_credits, 0) < 1 THEN
    RAISE EXCEPTION 'Borrower no longer has enough credits';
  END IF;

  UPDATE public.profiles SET credits = credits - 1, updated_at = now() WHERE id = _borrower;
  UPDATE public.profiles SET credits = credits + 1, updated_at = now() WHERE id = _lender;

  UPDATE public.transactions
  SET status = 'active', updated_at = now()
  WHERE id = _transaction_id;

  UPDATE public.books SET status = 'lent' WHERE id = _book_id;
END;
$$;

-- 6. Permissions
GRANT EXECUTE ON FUNCTION public.request_borrow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_handover(uuid) TO authenticated;