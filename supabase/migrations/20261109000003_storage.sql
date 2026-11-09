-- Private media bucket. Objects are stored under `<organization_id>/<uuid>.<ext>`
-- and are only reachable by members of that organization (signed URLs).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 104857600, -- 100 MB hard ceiling; plan limits enforced by the app
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

create policy media_select_member on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy media_insert_editor on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.can_edit_org(((storage.foldername(name))[1])::uuid));

create policy media_delete_editor on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.can_edit_org(((storage.foldername(name))[1])::uuid));
