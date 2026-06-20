-- Allow authenticated users to reach user_settings through the Supabase Data API.
-- RLS policies on this table still restrict every operation to auth.uid() = user_id.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_settings TO authenticated;
