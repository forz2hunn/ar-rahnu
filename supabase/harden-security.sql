-- Hardening keselamatan: kawalan peranan, audit parameter kritikal dan retensi audit.
-- Selamat dijalankan berulang kali (idempotent).

-- 1) Helper: adakah pengguna ialah Admin organisasi?
create or replace function public.ar_rahnu_is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ar_rahnu_organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.active
      and member.role = 'Admin'
  );
$$;

revoke all on function public.ar_rahnu_is_org_admin(uuid) from public, anon;
grant execute on function public.ar_rahnu_is_org_admin(uuid) to authenticated;

-- 2) Halang bukan-Admin mengubah matriks kebenaran peranan (rolePermissions)
--    dalam portfolio organisasi. Ini menutup jurang eskalasi keistimewaan
--    melalui tulisan terus ke JSON portfolio.
create or replace function public.ar_rahnu_protect_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Hanya portfolio organisasi dilindungi; portfolio peribadi tiada peranan.
  if coalesce(new.organization_id, old.organization_id) is null then
    return new;
  end if;

  -- Jika rolePermissions tidak berubah, benarkan.
  if coalesce(old.data -> 'rolePermissions', '{}'::jsonb)
     is not distinct from coalesce(new.data -> 'rolePermissions', '{}'::jsonb) then
    return new;
  end if;

  if not public.ar_rahnu_is_org_admin(coalesce(new.organization_id, old.organization_id)) then
    raise exception 'Hanya Admin organisasi boleh mengubah kebenaran peranan.';
  end if;

  return new;
end;
$$;

revoke all on function public.ar_rahnu_protect_role_permissions() from public, anon, authenticated;

drop trigger if exists ar_rahnu_role_permissions_guard on public.ar_rahnu_user_data;
create trigger ar_rahnu_role_permissions_guard
  before update on public.ar_rahnu_user_data
  for each row execute function public.ar_rahnu_protect_role_permissions();

-- 3) Retensi audit hanya boleh dicetuskan oleh service_role / cron,
--    bukan oleh mana-mana pengguna yang log masuk.
revoke execute on function public.ar_rahnu_prune_audit_events() from public, anon, authenticated;
grant execute on function public.ar_rahnu_prune_audit_events() to service_role;

-- 4) Senarai putih aktiviti audit: tambah tindakan keselamatan kebal/parameter.
create or replace function public.ar_rahnu_record_activity(
  p_action text,
  p_source_module text,
  p_resource_type text,
  p_resource_id text,
  p_context jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, extensions
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_context jsonb := coalesce(p_context, '{}'::jsonb);
begin
  if v_actor_user_id is null then
    raise exception 'Sesi pengguna diperlukan untuk merekod aktiviti audit.';
  end if;

  if upper(coalesce(p_action, '')) not in (
    'SESSION_START', 'SESSION_END', 'PASSWORD_CHANGED', 'PROFILE_UPDATED',
    'HEIR_UPDATED', 'BANK_UPDATED', 'PDPA_CONSENT', 'AVATAR_UPDATED',
    'AVATAR_REMOVED', 'DATA_EXPORTED', 'AUDIT_EXPORTED', 'SAG_CONSENT',
    'PARAMETER_CHANGED', 'ASSET_STATUS_CHANGED', 'ASSET_DELETED',
    'TRANSACTION_DELETED', 'CUSTODY_APPROVED', 'STATUS_CHANGED'
  ) then
    raise exception 'Tindakan aktiviti audit tidak sah: %', p_action;
  end if;

  if coalesce(p_resource_type, '') not in (
    'auth.users', 'user_activity', 'portfolio_export',
    'sagDocuments', 'assets', 'institutions', 'transactions'
  ) then
    raise exception 'Jenis sumber aktiviti audit tidak sah: %', p_resource_type;
  end if;

  if octet_length(v_context::text) > 8192 then
    raise exception 'Konteks audit melebihi had 8 KB.';
  end if;

  return public.ar_rahnu_append_audit_event(
    upper(left(coalesce(nullif(p_action, ''), 'ACTIVITY'), 64)),
    left(coalesce(nullif(p_resource_type, ''), 'user_activity'), 64),
    left(coalesce(nullif(p_resource_id, ''), v_actor_user_id::text), 200),
    null,
    v_actor_user_id,
    left(coalesce(nullif(p_source_module, ''), 'Aplikasi'), 64),
    v_context || jsonb_build_object('recorded_from', 'client'),
    null,
    null
  );
end;
$$;

revoke all on function public.ar_rahnu_record_activity(text, text, text, text, jsonb) from public, anon;
grant execute on function public.ar_rahnu_record_activity(text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
