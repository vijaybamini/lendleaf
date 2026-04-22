-- Books indexes (FK already exists)
CREATE INDEX IF NOT EXISTS books_owner_id_idx ON public.books(owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS books_owner_isbn_unique
  ON public.books(owner_id, isbn)
  WHERE isbn IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS books_owner_extid_unique
  ON public.books(owner_id, google_books_id)
  WHERE google_books_id IS NOT NULL AND isbn IS NULL;

-- Profiles: credits column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 1;

-- Update handle_new_user to seed 1 credit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    1
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Transactions
DO $$ BEGIN
  CREATE TYPE public.transaction_status AS ENUM ('pending', 'active', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  lender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  borrower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_book_idx ON public.transactions(book_id);
CREATE INDEX IF NOT EXISTS transactions_lender_idx ON public.transactions(lender_id);
CREATE INDEX IF NOT EXISTS transactions_borrower_idx ON public.transactions(borrower_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their transactions" ON public.transactions;
CREATE POLICY "Participants can view their transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = lender_id OR auth.uid() = borrower_id);

DROP POLICY IF EXISTS "Borrowers can create requests" ON public.transactions;
CREATE POLICY "Borrowers can create requests"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = borrower_id AND auth.uid() <> lender_id);

DROP POLICY IF EXISTS "Participants can update their transactions" ON public.transactions;
CREATE POLICY "Participants can update their transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = lender_id OR auth.uid() = borrower_id);

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();