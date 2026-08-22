-- Enable realtime change events for transactions so requests UI and
-- notification badges update live (Supabase only delivers postgres_changes
-- for tables added to the supabase_realtime publication).
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
