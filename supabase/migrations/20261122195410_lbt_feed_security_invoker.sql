-- The feed RPC uses the caller's normal table privileges and RLS policies.
-- Audience checks remain enforced by the authenticated posts SELECT policy.
ALTER FUNCTION public.get_feed(uuid, integer, integer) SECURITY INVOKER;
