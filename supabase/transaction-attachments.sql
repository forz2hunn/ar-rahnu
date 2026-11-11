insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ar-rahnu-transaction-attachments',
  'ar-rahnu-transaction-attachments',
  false,
  52428800,
  null
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = null;

drop policy if exists "Portfolio members can read SAG attachments" on storage.objects;
create policy "Portfolio members can read SAG attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ar-rahnu-transaction-attachments'
    and exists (
      select 1
      from public.ar_rahnu_user_data portfolio
      where portfolio.user_id::text = (storage.foldername(name))[1]
        and (
          (portfolio.organization_id is null and portfolio.user_id = auth.uid())
          or public.ar_rahnu_is_org_manager(portfolio.organization_id)
        )
    )
  );

drop policy if exists "Portfolio members can upload SAG attachments" on storage.objects;
create policy "Portfolio members can upload SAG attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ar-rahnu-transaction-attachments'
    and exists (
      select 1
      from public.ar_rahnu_user_data portfolio
      where portfolio.user_id::text = (storage.foldername(name))[1]
        and (
          (portfolio.organization_id is null and portfolio.user_id = auth.uid())
          or public.ar_rahnu_is_org_manager(portfolio.organization_id)
        )
    )
  );

drop policy if exists "Portfolio members can delete SAG attachments" on storage.objects;
create policy "Portfolio members can delete SAG attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ar-rahnu-transaction-attachments'
    and exists (
      select 1
      from public.ar_rahnu_user_data portfolio
      where portfolio.user_id::text = (storage.foldername(name))[1]
        and (
          (portfolio.organization_id is null and portfolio.user_id = auth.uid())
          or public.ar_rahnu_is_org_manager(portfolio.organization_id)
        )
    )
  );
