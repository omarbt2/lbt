-- Voice objects are stored as voice/<sender-id>/<file>.
-- Enforce ownership on upload and authenticated object selection.
drop policy if exists "Auth users insert voice-messages" on storage.objects;
drop policy if exists "voice_upload" on storage.objects;
create policy "voice_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'voice-messages'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "voice_select" on storage.objects;
create policy "voice_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'voice-messages'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
