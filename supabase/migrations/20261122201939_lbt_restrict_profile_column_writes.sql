-- Restrict client profile writes to user-editable settings and profile fields.

DROP POLICY IF EXISTS profiles_update_safe ON public.profiles;
CREATE POLICY profiles_update_safe
ON public.profiles
FOR UPDATE TO authenticated
USING (id=(SELECT auth.uid()))
WITH CHECK (id=(SELECT auth.uid()));

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC,anon,authenticated;

GRANT INSERT (id,username,display_name,avatar_url,bio)
ON TABLE public.profiles TO authenticated;

GRANT UPDATE (
  username,
  display_name,
  full_name,
  bio,
  avatar_url,
  cover_url,
  website,
  is_private,
  status_emoji,
  status_text,
  status_expires_at,
  language,
  theme,
  hide_activity,
  allow_mentions,
  allow_messages_from,
  notif_likes,
  notif_comments,
  notif_dms,
  notif_followers,
  notif_mentions,
  notif_reposts,
  push_enabled,
  push_calls,
  push_messages,
  push_likes,
  mic_permission,
  camera_permission,
  notif_permission,
  is_online,
  last_seen,
  updated_at
) ON TABLE public.profiles TO authenticated;
