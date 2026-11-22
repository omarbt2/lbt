-- Store private profile details outside the exposed public.profiles table.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS private.profile_private_data (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  dob date,
  date_of_birth date,
  gender text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.profile_private_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.profile_private_data FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.profile_private_data FROM PUBLIC, anon, authenticated;

INSERT INTO private.profile_private_data(user_id,phone,dob,date_of_birth,gender,updated_at)
SELECT id,phone,dob,date_of_birth,gender,now()
FROM public.profiles
WHERE phone IS NOT NULL OR dob IS NOT NULL OR date_of_birth IS NOT NULL OR gender IS NOT NULL
ON CONFLICT(user_id) DO UPDATE
SET phone=COALESCE(EXCLUDED.phone,private.profile_private_data.phone),
    dob=COALESCE(EXCLUDED.dob,private.profile_private_data.dob),
    date_of_birth=COALESCE(EXCLUDED.date_of_birth,private.profile_private_data.date_of_birth),
    gender=COALESCE(EXCLUDED.gender,private.profile_private_data.gender),
    updated_at=now();

CREATE OR REPLACE FUNCTION public.get_my_profile_private_data()
RETURNS TABLE(phone text,dob date,date_of_birth date,gender text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,private
AS $function$
  SELECT d.phone,d.dob,d.date_of_birth,d.gender
  FROM private.profile_private_data d WHERE d.user_id=auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.update_my_profile_private_data(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,private
AS $function$
DECLARE v_user_id uuid:=auth.uid(); v_key text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Invalid private profile payload'; END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF v_key NOT IN ('phone','dob','date_of_birth','gender') THEN RAISE EXCEPTION 'Unsupported private profile field: %',v_key; END IF;
    IF jsonb_typeof(p_payload->v_key) NOT IN ('string','null') THEN RAISE EXCEPTION 'Invalid value for private profile field: %',v_key; END IF;
  END LOOP;
  INSERT INTO private.profile_private_data(user_id,phone,dob,date_of_birth,gender,updated_at)
  VALUES(
    v_user_id,
    CASE WHEN p_payload?'phone' THEN NULLIF(p_payload->>'phone','') ELSE NULL END,
    CASE WHEN p_payload?'dob' AND p_payload->>'dob' IS NOT NULL THEN (p_payload->>'dob')::date ELSE NULL END,
    CASE WHEN p_payload?'date_of_birth' AND p_payload->>'date_of_birth' IS NOT NULL THEN (p_payload->>'date_of_birth')::date ELSE NULL END,
    CASE WHEN p_payload?'gender' THEN NULLIF(p_payload->>'gender','') ELSE NULL END,
    now()
  )
  ON CONFLICT(user_id) DO UPDATE
  SET phone=CASE WHEN p_payload?'phone' THEN EXCLUDED.phone ELSE private.profile_private_data.phone END,
      dob=CASE WHEN p_payload?'dob' THEN EXCLUDED.dob ELSE private.profile_private_data.dob END,
      date_of_birth=CASE WHEN p_payload?'date_of_birth' THEN EXCLUDED.date_of_birth ELSE private.profile_private_data.date_of_birth END,
      gender=CASE WHEN p_payload?'gender' THEN EXCLUDED.gender ELSE private.profile_private_data.gender END,
      updated_at=now();
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_private_data() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_my_profile_private_data(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_private_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile_private_data(jsonb) TO authenticated;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS gender;
