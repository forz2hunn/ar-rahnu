insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ar-rahnu-profile-photos',
  'ar-rahnu-profile-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read own profile photo" on storage.objects;
create policy "Members can read own profile photo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ar-rahnu-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members can upload own profile photo" on storage.objects;
create policy "Members can upload own profile photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ar-rahnu-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members can update own profile photo" on storage.objects;
create policy "Members can update own profile photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'ar-rahnu-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'ar-rahnu-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members can delete own profile photo" on storage.objects;
create policy "Members can delete own profile photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ar-rahnu-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin/Manager organisasi boleh mengurus gambar profil ahli dalam organisasi mereka
-- supaya gambar boleh dikemas kini dari modul Keahlian Ahli.
create or replace function public.ar_rahnu_member_organization(p_user_id text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member.organization_id
  from public.ar_rahnu_organization_members member
  where member.user_id::text = p_user_id
    and member.active
  limit 1;
$$;

revoke all on function public.ar_rahnu_member_organization(text) from public, anon;
grant execute on function public.ar_rahnu_member_organization(text) to authenticated;

drop policy if exists "Organization managers can read member profile photos" on storage.objects;
create policy "Organization managers can read member profile photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ar-rahnu-profile-photos'
    and public.ar_rahnu_is_org_manager(public.ar_rahnu_member_organization((storage.foldername(name))[1]))
  );

drop policy if exists "Organization managers can upload member profile photos" on storage.objects;
create policy "Organization managers can upload member profile photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ar-rahnu-profile-photos'
    and public.ar_rahnu_is_org_manager(public.ar_rahnu_member_organization((storage.foldername(name))[1]))
  );

drop policy if exists "Organization managers can update member profile photos" on storage.objects;
create policy "Organization managers can update member profile photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'ar-rahnu-profile-photos'
    and public.ar_rahnu_is_org_manager(public.ar_rahnu_member_organization((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'ar-rahnu-profile-photos'
    and public.ar_rahnu_is_org_manager(public.ar_rahnu_member_organization((storage.foldername(name))[1]))
  );

drop policy if exists "Organization managers can delete member profile photos" on storage.objects;
create policy "Organization managers can delete member profile photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ar-rahnu-profile-photos'
    and public.ar_rahnu_is_org_manager(public.ar_rahnu_member_organization((storage.foldername(name))[1]))
  );
