-- Add genre column to books for filtering
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS genre text;
