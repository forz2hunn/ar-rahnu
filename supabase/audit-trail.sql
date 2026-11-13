create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ar_rahnu_audit_events (
  event_id uuid primary key,
  chain_scope text not null,
  sequence_no bigint not null,
  event_payload jsonb not null,
  canonical_payload text not null,
  previous_hash text not null,
  event_hash text not null,
  created_at timestamptz not null,
  unique (chain_scope, sequence_no)
);

create index if not exists ar_rahnu_audit_events_scope_created
  on public.ar_rahnu_audit_events (chain_scope, created_at desc);

revoke all on public.ar_rahnu_audit_events from public, anon, authenticated;
grant select on public.ar_rahnu_audit_events to authenticated;
alter table public.ar_rahnu_audit_events enable row level security;

drop policy if exists "Organization managers can read organization audit events"
  on public.ar_rahnu_audit_events;
create policy "Organization managers can read organization audit events"
  on public.ar_rahnu_audit_events for select
  to authenticated
  using (
    event_payload ->> 'organization_id' is not null
    and public.ar_rahnu_is_org_manager((event_payload ->> 'organization_id')::uuid)
  );

create or replace function public.ar_rahnu_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Audit events are append-only.';
end;
$$;

revoke all on function public.ar_rahnu_reject_audit_mutation() from public, anon, authenticated;

drop trigger if exists ar_rahnu_audit_events_immutable
  on public.ar_rahnu_audit_events;
create trigger ar_rahnu_audit_events_immutable
  before update or delete on public.ar_rahnu_audit_events
  for each row execute function public.ar_rahnu_reject_audit_mutation();

create or replace function public.ar_rahnu_append_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_organization_id uuid,
  p_subject_user_id uuid,
  p_source_module text,
  p_context jsonb,
  p_payload_before jsonb,
  p_payload_after jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, extensions
as $$
declare
  v_headers jsonb;
  v_claims jsonb;
  v_event_id uuid := gen_random_uuid();
  v_event_time timestamptz := clock_timestamp();
  v_chain_scope text;
  v_sequence_no bigint;
  v_previous_hash text;
  v_event_payload jsonb;
  v_canonical_payload text;
  v_event_hash text;
  v_actor_user_id uuid;
  v_forwarded_for text;
  v_source_ip text;
  v_proxy_ip text;
begin
  if p_organization_id is null then
    if p_subject_user_id is null then
      raise exception 'An organization or subject user is required for an audit event.';
    end if;
    v_chain_scope := 'user:' || p_subject_user_id::text;
  else
    v_chain_scope := 'organization:' || p_organization_id::text;
  end if;

  v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_actor_user_id := coalesce(
    auth.uid(),
    nullif(v_headers ->> 'x-audit-actor-user-id', '')::uuid
  );
  v_forwarded_for := coalesce(
    nullif(v_headers ->> 'x-forwarded-for', ''),
    nullif(v_headers ->> 'x-audit-forwarded-for', '')
  );
  v_source_ip := coalesce(
    nullif(split_part(v_forwarded_for, ',', 1), ''),
    nullif(v_headers ->> 'x-real-ip', '')
  );
  v_proxy_ip := nullif(v_headers ->> 'x-proxy-ip', '');

  perform pg_advisory_xact_lock(hashtextextended(v_chain_scope, 0));

  select sequence_no + 1, event_hash
    into v_sequence_no, v_previous_hash
    from public.ar_rahnu_audit_events
    where chain_scope = v_chain_scope
    order by sequence_no desc
    limit 1;

  if v_sequence_no is null then
    v_sequence_no := 1;
    v_previous_hash := repeat('0', 64);
  end if;

  v_event_payload := jsonb_build_object(
    'event_id', v_event_id,
    'chain_scope', v_chain_scope,
    'sequence_no', v_sequence_no,
    'occurred_at_utc', to_char(v_event_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'timestamp_source', 'supabase_database_clock_unattested',
    'organization_id', p_organization_id,
    'actor_user_id', v_actor_user_id,
    'actor_email', nullif(v_claims ->> 'email', ''),
    'actor_display_name', coalesce(
      nullif(v_claims #>> '{user_metadata,full_name}', ''),
      nullif(v_claims #>> '{user_metadata,name}', ''),
      nullif(v_claims ->> 'email', '')
    ),
    'subject_user_id', p_subject_user_id,
    'session_id', coalesce(v_claims ->> 'session_id', v_headers ->> 'x-audit-session-id'),
    'user_agent', coalesce(v_headers ->> 'user-agent', v_headers ->> 'x-audit-user-agent'),
    'device_id', nullif(v_headers ->> 'x-audit-device-id', ''),
    'source_ip', v_source_ip,
    'proxy_ip', v_proxy_ip,
    'action', p_action,
    'resource_type', p_resource_type,
    'resource_id', p_resource_id,
    'source_module', p_source_module,
    'context', coalesce(p_context, '{}'::jsonb) ||
      jsonb_strip_nulls(jsonb_build_object('forwarded_for', v_forwarded_for)),
    'payload_before', p_payload_before,
    'payload_before_canonical', case when p_payload_before is null then null
      else p_payload_before::text end,
    'payload_before_sha256', case when p_payload_before is null then null
      else encode(digest(convert_to(p_payload_before::text, 'UTF8'), 'sha256'), 'hex') end,
    'payload_after', p_payload_after,
    'payload_after_canonical', case when p_payload_after is null then null
      else p_payload_after::text end,
    'payload_after_sha256', case when p_payload_after is null then null
      else encode(digest(convert_to(p_payload_after::text, 'UTF8'), 'sha256'), 'hex') end,
    'previous_hash', v_previous_hash
  );

  v_canonical_payload := v_event_payload::text;
  v_event_hash := encode(
    digest(convert_to(v_previous_hash || v_canonical_payload, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.ar_rahnu_audit_events (
    event_id, chain_scope, sequence_no, event_payload,
    canonical_payload, previous_hash, event_hash, created_at
  ) values (
    v_event_id, v_chain_scope, v_sequence_no, v_event_payload,
    v_canonical_payload, v_previous_hash, v_event_hash, v_event_time
  );

  return v_event_id;
end;
$$;

revoke all on function public.ar_rahnu_append_audit_event(
  text, text, text, uuid, uuid, text, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.ar_rahnu_append_audit_event(
  text, text, text, uuid, uuid, text, jsonb, jsonb, jsonb
) to service_role;

create or replace function public.ar_rahnu_capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action text;
  v_organization_id uuid;
  v_subject_user_id uuid;
  v_resource_id text;
  v_before jsonb;
  v_after jsonb;
  v_context jsonb := '{}'::jsonb;
  v_source_module text;
begin
  if tg_op = 'UPDATE' and old is not distinct from new then
    return new;
  end if;

  v_action := case tg_op
    when 'INSERT' then 'CREATE'
    when 'UPDATE' then 'UPDATE'
    else 'DELETE'
  end;

  if tg_table_name = 'ar_rahnu_user_data' then
    v_source_module := 'Portfolio';
    v_organization_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
    v_subject_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    v_resource_id := v_subject_user_id::text;
    if tg_op <> 'INSERT' then
      v_before := jsonb_build_object(
        'user_id', old.user_id,
        'organization_id', old.organization_id,
        'data', old.data
      );
    end if;
    if tg_op <> 'DELETE' then
      v_after := jsonb_build_object(
        'user_id', new.user_id,
        'organization_id', new.organization_id,
        'data', new.data
      );
    end if;
  elsif tg_table_name = 'ar_rahnu_organization_members' then
    v_source_module := 'User Management';
    v_organization_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
    v_subject_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    v_resource_id := v_subject_user_id::text;
    if tg_op <> 'INSERT' then
      v_before := jsonb_build_object(
        'organization_id', old.organization_id,
        'user_id', old.user_id,
        'role', old.role,
        'active', old.active
      );
    end if;
    if tg_op <> 'DELETE' then
      v_after := jsonb_build_object(
        'organization_id', new.organization_id,
        'user_id', new.user_id,
        'role', new.role,
        'active', new.active
      );
    end if;
  elsif tg_table_name = 'ar_rahnu_organizations' then
    v_source_module := 'Organization Management';
    v_organization_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_subject_user_id := case when tg_op = 'DELETE' then old.created_by else new.created_by end;
    v_resource_id := v_organization_id::text;
    if tg_op <> 'INSERT' then
      v_before := jsonb_build_object('id', old.id, 'name', old.name, 'created_by', old.created_by);
    end if;
    if tg_op <> 'DELETE' then
      v_after := jsonb_build_object('id', new.id, 'name', new.name, 'created_by', new.created_by);
    end if;
  else
    raise exception 'Unsupported audit trigger table: %', tg_table_name;
  end if;

  v_context := jsonb_build_object('database_table', tg_table_name, 'database_operation', tg_op);
  perform public.ar_rahnu_append_audit_event(
    v_action,
    tg_table_name,
    v_resource_id,
    v_organization_id,
    v_subject_user_id,
    v_source_module,
    v_context,
    v_before,
    v_after
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.ar_rahnu_capture_audit_event() from public, anon, authenticated;

drop trigger if exists ar_rahnu_user_data_audit on public.ar_rahnu_user_data;
create trigger ar_rahnu_user_data_audit
  after insert or update or delete on public.ar_rahnu_user_data
  for each row execute function public.ar_rahnu_capture_audit_event();

drop trigger if exists ar_rahnu_organization_members_audit on public.ar_rahnu_organization_members;
create trigger ar_rahnu_organization_members_audit
  after insert or update or delete on public.ar_rahnu_organization_members
  for each row execute function public.ar_rahnu_capture_audit_event();

drop trigger if exists ar_rahnu_organizations_audit on public.ar_rahnu_organizations;
create trigger ar_rahnu_organizations_audit
  after insert or update or delete on public.ar_rahnu_organizations
  for each row execute function public.ar_rahnu_capture_audit_event();

-- Rekod audit per rekod portfolio (transaksi, aset, institusi, pembekal).
-- Setiap perubahan rekod menghasilkan satu peristiwa audit berasingan yang
-- menyimpan siapa (actor_user_id/actor_email), waktu (database clock) dan
-- jenis rekod/transaksi dalam context.
create or replace function public.ar_rahnu_collection_records(p_data jsonb, p_collection text)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(p_data -> p_collection) = 'array' then p_data -> p_collection
    else '[]'::jsonb
  end;
$$;

revoke all on function public.ar_rahnu_collection_records(jsonb, text) from public, anon, authenticated;

create or replace function public.ar_rahnu_capture_portfolio_record_events()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_collections constant text[] := array['transactions', 'assets', 'institutions', 'suppliers'];
  v_collection text;
  v_before_records jsonb;
  v_after_records jsonb;
  v_old_map jsonb;
  v_new_map jsonb;
  v_key text;
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_label text;
  v_category text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  foreach v_collection in array v_collections loop
    v_before_records := case
      when tg_op = 'INSERT' then '[]'::jsonb
      else public.ar_rahnu_collection_records(old.data, v_collection)
    end;
    v_after_records := public.ar_rahnu_collection_records(new.data, v_collection);

    select coalesce(jsonb_object_agg(records.record_key, records.record_value), '{}'::jsonb)
      into v_old_map
      from (
        select
          coalesce(nullif(item.value ->> 'id', ''), md5(item.value::text)) as record_key,
          (array_agg(item.value))[1] as record_value
        from jsonb_array_elements(v_before_records) as item(value)
        group by 1
      ) as records;

    select coalesce(jsonb_object_agg(records.record_key, records.record_value), '{}'::jsonb)
      into v_new_map
      from (
        select
          coalesce(nullif(item.value ->> 'id', ''), md5(item.value::text)) as record_key,
          (array_agg(item.value))[1] as record_value
        from jsonb_array_elements(v_after_records) as item(value)
        group by 1
      ) as records;

    for v_key, v_after in select entry.key, entry.value from jsonb_each(v_new_map) as entry loop
      v_before := v_old_map -> v_key;
      if v_before is null then
        v_action := 'CREATE';
      elsif v_before is distinct from v_after then
        v_action := 'UPDATE';
      else
        continue;
      end if;

      if v_action = 'UPDATE' and v_after ->> 'lastAction' = 'DELETE' then
        v_action := 'DELETE';
      end if;

      v_label := coalesce(
        nullif(v_after ->> 'refNo', ''),
        nullif(v_after ->> 'code', ''),
        nullif(v_after ->> 'name', ''),
        v_key
      );
      v_category := coalesce(nullif(v_after ->> 'type', ''), nullif(v_after ->> 'category', ''));

      perform public.ar_rahnu_append_audit_event(
        v_action,
        v_collection,
        v_key,
        new.organization_id,
        new.user_id,
        'Portfolio',
        jsonb_build_object(
          'database_table', 'ar_rahnu_user_data',
          'database_operation', tg_op,
          'collection', v_collection,
          'record_label', v_label,
          'record_category', v_category,
          'record_action', v_after ->> 'lastAction',
          'changed_by', coalesce(v_after -> 'updatedBy', v_after -> 'createdBy'),
          'changed_at', coalesce(v_after ->> 'updatedAt', v_after ->> 'createdAt')
        ),
        v_before,
        v_after
      );
    end loop;

    for v_key, v_before in select entry.key, entry.value from jsonb_each(v_old_map) as entry loop
      if v_new_map ? v_key then
        continue;
      end if;

      v_label := coalesce(
        nullif(v_before ->> 'refNo', ''),
        nullif(v_before ->> 'code', ''),
        nullif(v_before ->> 'name', ''),
        v_key
      );
      v_category := coalesce(nullif(v_before ->> 'type', ''), nullif(v_before ->> 'category', ''));

      perform public.ar_rahnu_append_audit_event(
        'DELETE',
        v_collection,
        v_key,
        new.organization_id,
        new.user_id,
        'Portfolio',
        jsonb_build_object(
          'database_table', 'ar_rahnu_user_data',
          'database_operation', tg_op,
          'collection', v_collection,
          'record_label', v_label,
          'record_category', v_category,
          'deleted_by', v_before -> 'deletedBy'
        ),
        v_before,
        null
      );
    end loop;
  end loop;

  return new;
end;
$$;

revoke all on function public.ar_rahnu_capture_portfolio_record_events() from public, anon, authenticated;

drop trigger if exists ar_rahnu_user_data_record_audit on public.ar_rahnu_user_data;
create trigger ar_rahnu_user_data_record_audit
  after insert or update on public.ar_rahnu_user_data
  for each row execute function public.ar_rahnu_capture_portfolio_record_events();

notify pgrst, 'reload schema';
