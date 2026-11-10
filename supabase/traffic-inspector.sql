create table if not exists public.ar_rahnu_traffic_events (
  event_id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ar_rahnu_organizations (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  session_id uuid,
  captured_at timestamptz not null default clock_timestamp(),
  client_ip text,
  user_agent text,
  method text not null,
  request_path text not null,
  host text not null,
  status integer not null check (status between 0 and 599),
  duration_ms integer not null check (duration_ms >= 0),
  request_payload jsonb,
  response_payload jsonb
);

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create index if not exists ar_rahnu_traffic_events_org_captured
  on public.ar_rahnu_traffic_events (organization_id, captured_at desc);
create index if not exists ar_rahnu_traffic_events_captured
  on public.ar_rahnu_traffic_events (captured_at);

revoke all on public.ar_rahnu_traffic_events from public, anon, authenticated;
grant select on public.ar_rahnu_traffic_events to authenticated;
alter table public.ar_rahnu_traffic_events enable row level security;

drop policy if exists "Organization managers can read traffic inspector events"
  on public.ar_rahnu_traffic_events;
create policy "Organization managers can read traffic inspector events"
  on public.ar_rahnu_traffic_events for select
  to authenticated
  using (public.ar_rahnu_is_org_manager(organization_id));

create or replace function public.ar_rahnu_sanitize_traffic_payload(
  p_payload jsonb,
  p_depth integer default 0
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
begin
  if p_payload is null then
    return null;
  end if;
  if p_depth > 12 then
    return to_jsonb('[TRUNCATED: maximum nesting depth]');
  end if;

  if jsonb_typeof(p_payload) = 'object' then
    select coalesce(jsonb_object_agg(
      entry.key,
      case
        when lower(entry.key) ~ '(password|token|secret|authorization|cookie|email|phone|otp|credential|api.?key|service.?role|access.?key|nric|identity|passport|full.?name|first.?name|last.?name|address)'
          then to_jsonb('[REDACTED]')
        else public.ar_rahnu_sanitize_traffic_payload(entry.value, p_depth + 1)
      end
    ), '{}'::jsonb)
    into v_result
    from jsonb_each(p_payload) as entry;
    return v_result;
  elsif jsonb_typeof(p_payload) = 'array' then
    select coalesce(jsonb_agg(public.ar_rahnu_sanitize_traffic_payload(item.value, p_depth + 1)), '[]'::jsonb)
    into v_result
    from jsonb_array_elements(p_payload) as item;
    return v_result;
  elsif jsonb_typeof(p_payload) = 'string' and length(p_payload #>> '{}') > 2048 then
    return to_jsonb(left(p_payload #>> '{}', 2048) || '…[TRUNCATED]');
  end if;

  return p_payload;
end;
$$;

revoke all on function public.ar_rahnu_sanitize_traffic_payload(jsonb, integer)
  from public, anon, authenticated;

create or replace function public.ar_rahnu_record_traffic_event(
  p_method text,
  p_request_path text,
  p_host text,
  p_status integer,
  p_duration_ms integer,
  p_request_payload jsonb default null,
  p_response_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_role text;
  v_headers jsonb;
  v_ip text;
  v_path text;
  v_event_id uuid := gen_random_uuid();
  v_request_payload jsonb;
  v_response_payload jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication is required to record traffic.';
  end if;
  if p_method is null or p_method !~ '^[A-Z]{3,10}$' then
    raise exception 'Invalid HTTP method.';
  end if;
  if p_request_path is null or left(p_request_path, 1) <> '/' or length(p_request_path) > 1024 then
    raise exception 'Invalid HTTP request path.';
  end if;
  if p_host is null or length(p_host) > 255 or p_host ~ '[[:space:]/]' then
    raise exception 'Invalid HTTP host.';
  end if;
  if p_status is null or p_status < 0 or p_status > 599 or
     p_duration_ms is null or p_duration_ms < 0 or p_duration_ms > 600000 then
    raise exception 'Invalid HTTP status or duration.';
  end if;

  select organization_id, role
    into v_organization_id, v_role
    from public.ar_rahnu_organization_members
    where user_id = v_actor and active;
  if v_organization_id is null or v_role not in ('Admin', 'Manager', 'Staff') then
    raise exception 'An active organization membership is required to record traffic.';
  end if;

  v_path := split_part(p_request_path, '?', 1);
  v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_ip := coalesce(
    nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), ''),
    nullif(v_headers ->> 'x-real-ip', ''),
    nullif(v_headers ->> 'cf-connecting-ip', '')
  );

  if v_path like '/auth/v1/%' then
    v_request_payload := null;
    v_response_payload := null;
  else
    v_request_payload := case
      when octet_length(coalesce(p_request_payload::text, '')) > 65536
        then jsonb_build_object('_omitted', 'Request payload exceeds 64 KB')
      else public.ar_rahnu_sanitize_traffic_payload(p_request_payload)
    end;
    v_response_payload := case
      when octet_length(coalesce(p_response_payload::text, '')) > 65536
        then jsonb_build_object('_omitted', 'Response payload exceeds 64 KB')
      else public.ar_rahnu_sanitize_traffic_payload(p_response_payload)
    end;
  end if;
  if octet_length(coalesce(v_request_payload::text, '') || coalesce(v_response_payload::text, '')) > 16384 then
    v_request_payload := case when v_request_payload is null then null
      else jsonb_build_object('_omitted', 'Sanitized payload exceeds 16 KB') end;
    v_response_payload := case when v_response_payload is null then null
      else jsonb_build_object('_omitted', 'Sanitized payload exceeds 16 KB') end;
  end if;

  insert into public.ar_rahnu_traffic_events (
    event_id, organization_id, actor_user_id, session_id, captured_at,
    client_ip, user_agent, method, request_path, host, status, duration_ms,
    request_payload, response_payload
  ) values (
    v_event_id,
    v_organization_id,
    v_actor,
    nullif((coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'session_id'), '')::uuid,
    clock_timestamp(),
    left(v_ip, 128),
    left(coalesce(v_headers ->> 'user-agent', ''), 1024),
    p_method,
    left(v_path, 1024),
    p_host,
    p_status,
    p_duration_ms,
    v_request_payload,
    v_response_payload
  );

  delete from public.ar_rahnu_traffic_events
    where organization_id = v_organization_id
      and captured_at < clock_timestamp() - interval '7 days';

  return v_event_id;
end;
$$;

revoke all on function public.ar_rahnu_record_traffic_event(text, text, text, integer, integer, jsonb, jsonb)
  from public, anon;
grant execute on function public.ar_rahnu_record_traffic_event(text, text, text, integer, integer, jsonb, jsonb)
  to authenticated;

do $$
declare
  v_cron_schema text;
  v_job_id bigint;
begin
  begin
    if not exists (select 1 from pg_extension where extname = 'pg_cron') then
      execute 'create extension pg_cron';
    end if;

    select namespace.nspname into v_cron_schema
      from pg_extension extension
      join pg_namespace namespace on namespace.oid = extension.extnamespace
      where extension.extname = 'pg_cron';
    if v_cron_schema is null then
      raise exception 'pg_cron schema is unavailable';
    end if;

    execute format('select jobid from %I.job where jobname = $1 limit 1', v_cron_schema)
      into v_job_id using 'ar-rahnu-traffic-retention';
    if v_job_id is not null then
      execute format('select %I.unschedule($1)', v_cron_schema) using v_job_id;
    end if;
    execute format(
      'select %I.schedule($1, $2, $3)',
      v_cron_schema
    ) using
      'ar-rahnu-traffic-retention',
      '*/15 * * * *',
      'delete from public.ar_rahnu_traffic_events where captured_at < clock_timestamp() - interval ''7 days''';
  exception when others then
    raise notice 'Could not schedule seven-day traffic retention with pg_cron (%). Expired rows are also purged on each new event; enable pg_cron and rerun this migration for scheduled cleanup.', sqlerrm;
  end;
end
$$;

notify pgrst, 'reload schema';
