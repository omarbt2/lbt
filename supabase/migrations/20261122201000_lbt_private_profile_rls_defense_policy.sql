-- Defense-in-depth owner policy on the private profile data table.
-- Public/anon/authenticated table privileges remain revoked; clients use only
-- owner-bound get/update RPCs.
DROP POLICY IF EXISTS profile_private_data_owner_only ON private.profile_private_data;
CREATE POLICY profile_private_data_owner_only
ON private.profile_private_data
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
