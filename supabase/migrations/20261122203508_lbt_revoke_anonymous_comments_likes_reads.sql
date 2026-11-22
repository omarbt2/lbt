-- The LBT client is authenticated-only. Remove base table SELECT grants
-- from anonymous users; authenticated SELECT remains governed by audience RLS.
REVOKE SELECT ON TABLE public.comments, public.likes FROM PUBLIC, anon;
