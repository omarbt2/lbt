-- New reels are unarchived by the database default.
REVOKE INSERT (is_archived) ON TABLE public.reels FROM authenticated;
