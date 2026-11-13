-- Buang Traffic Inspector sepenuhnya daripada projek Supabase dan bebaskan
-- ruang yang digunakan oleh data telemetri HTTP.
-- Jalankan sekali dalam Supabase SQL Editor.
do $$
declare
  v_cron_schema text;
  v_job_id bigint;
begin
  begin
    if not exists (select 1 from pg_extension where extname = 'pg_cron') then
      return;
    end if;

    select namespace.nspname into v_cron_schema
      from pg_extension extension
      join pg_namespace namespace on namespace.oid = extension.extnamespace
      where extension.extname = 'pg_cron';
    if v_cron_schema is null then
      return;
    end if;

    execute format('select jobid from %I.job where jobname = $1 limit 1', v_cron_schema)
      into v_job_id using 'ar-rahnu-traffic-retention';
    if v_job_id is not null then
      execute format('select %I.unschedule($1)', v_cron_schema) using v_job_id;
      raise notice 'Pelayar pg_cron "%" telah dinyahjadual.', 'ar-rahnu-traffic-retention';
    end if;
  exception when others then
    raise notice 'Pelayar cron trafik tidak dapat dinyahjadual (%): %', sqlerrm, sqlstate;
  end;
end
$$;

drop function if exists public.ar_rahnu_record_traffic_event(text, text, text, integer, integer, jsonb, jsonb);
drop function if exists public.ar_rahnu_sanitize_traffic_payload(jsonb, integer);
drop table if exists public.ar_rahnu_traffic_events;

notify pgrst, 'reload schema';
