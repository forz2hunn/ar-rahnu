alter table public.ar_rahnu_user_data
  add column if not exists portfolio_id uuid default gen_random_uuid();

update public.ar_rahnu_user_data
set portfolio_id = gen_random_uuid()
where portfolio_id is null;

alter table public.ar_rahnu_user_data
  alter column portfolio_id set not null;

create unique index if not exists ar_rahnu_user_data_portfolio_id_key
  on public.ar_rahnu_user_data (portfolio_id);

create table if not exists public.ar_rahnu_portfolio_institutions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.ar_rahnu_user_data (portfolio_id) on delete cascade,
  legacy_id text not null,
  name text not null,
  record jsonb not null,
  unique (portfolio_id, legacy_id),
  unique (portfolio_id, id)
);

create table if not exists public.ar_rahnu_portfolio_suppliers (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.ar_rahnu_user_data (portfolio_id) on delete cascade,
  legacy_id text not null,
  code text,
  name text not null,
  record jsonb not null,
  unique (portfolio_id, legacy_id),
  unique (portfolio_id, id)
);

create table if not exists public.ar_rahnu_portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.ar_rahnu_user_data (portfolio_id) on delete cascade,
  legacy_id text not null,
  name text not null,
  record jsonb not null,
  unique (portfolio_id, legacy_id),
  unique (portfolio_id, id)
);

create table if not exists public.ar_rahnu_portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.ar_rahnu_user_data (portfolio_id) on delete cascade,
  legacy_id text not null,
  institution_id uuid,
  record jsonb not null,
  unique (portfolio_id, legacy_id),
  unique (portfolio_id, id),
  constraint ar_rahnu_transaction_institution_fk
    foreign key (portfolio_id, institution_id)
    references public.ar_rahnu_portfolio_institutions (portfolio_id, id)
);

create table if not exists public.ar_rahnu_transaction_assets (
  portfolio_id uuid not null,
  transaction_id uuid not null,
  asset_id uuid not null,
  primary key (portfolio_id, transaction_id, asset_id),
  foreign key (portfolio_id, transaction_id)
    references public.ar_rahnu_portfolio_transactions (portfolio_id, id) on delete cascade,
  foreign key (portfolio_id, asset_id)
    references public.ar_rahnu_portfolio_assets (portfolio_id, id) on delete cascade
);

create table if not exists public.ar_rahnu_asset_suppliers (
  portfolio_id uuid not null,
  asset_id uuid not null,
  supplier_id uuid not null,
  primary key (portfolio_id, asset_id, supplier_id),
  foreign key (portfolio_id, asset_id)
    references public.ar_rahnu_portfolio_assets (portfolio_id, id) on delete cascade,
  foreign key (portfolio_id, supplier_id)
    references public.ar_rahnu_portfolio_suppliers (portfolio_id, id) on delete cascade
);

create index if not exists ar_rahnu_transactions_institution_idx
  on public.ar_rahnu_portfolio_transactions (portfolio_id, institution_id);
create index if not exists ar_rahnu_transaction_assets_asset_idx
  on public.ar_rahnu_transaction_assets (portfolio_id, asset_id);
create index if not exists ar_rahnu_asset_suppliers_supplier_idx
  on public.ar_rahnu_asset_suppliers (portfolio_id, supplier_id);

create or replace function public.ar_rahnu_sync_portfolio_relations(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_portfolio_id uuid;
  portfolio_data jsonb;
begin
  select portfolio_id, data
  into target_portfolio_id, portfolio_data
  from public.ar_rahnu_user_data
  where user_id = target_user_id;

  if target_portfolio_id is null or portfolio_data is null then
    return;
  end if;

  insert into public.ar_rahnu_portfolio_institutions
    (portfolio_id, legacy_id, name, record)
  select
    target_portfolio_id,
    coalesce(nullif(entry.value->>'id', ''), md5(entry.value::text)),
    coalesce(nullif(entry.value->>'name', ''), 'Institusi tanpa nama'),
    entry.value
  from jsonb_array_elements(
    case when jsonb_typeof(portfolio_data->'institutions') = 'array'
      then portfolio_data->'institutions' else '[]'::jsonb end
  ) as entry(value)
  on conflict (portfolio_id, legacy_id) do update
    set name = excluded.name, record = excluded.record;

  insert into public.ar_rahnu_portfolio_suppliers
    (portfolio_id, legacy_id, code, name, record)
  select
    target_portfolio_id,
    coalesce(nullif(entry.value->>'id', ''), md5(entry.value::text)),
    nullif(entry.value->>'code', ''),
    coalesce(nullif(entry.value->>'name', ''), 'Pembekal tanpa nama'),
    entry.value
  from jsonb_array_elements(
    case when jsonb_typeof(portfolio_data->'suppliers') = 'array'
      then portfolio_data->'suppliers' else '[]'::jsonb end
  ) as entry(value)
  on conflict (portfolio_id, legacy_id) do update
    set code = excluded.code, name = excluded.name, record = excluded.record;

  insert into public.ar_rahnu_portfolio_assets
    (portfolio_id, legacy_id, name, record)
  select
    target_portfolio_id,
    coalesce(nullif(entry.value->>'id', ''), md5(entry.value::text)),
    coalesce(nullif(entry.value->>'code', ''), nullif(entry.value->>'type', ''), 'Aset tanpa nama'),
    entry.value
  from jsonb_array_elements(
    case when jsonb_typeof(portfolio_data->'assets') = 'array'
      then portfolio_data->'assets' else '[]'::jsonb end
  ) as entry(value)
  on conflict (portfolio_id, legacy_id) do update
    set name = excluded.name, record = excluded.record;

  insert into public.ar_rahnu_portfolio_transactions
    (portfolio_id, legacy_id, institution_id, record)
  select
    target_portfolio_id,
    coalesce(nullif(tx_entry.value->>'id', ''), md5(tx_entry.value::text)),
    institution.id,
    tx_entry.value
  from jsonb_array_elements(
    case when jsonb_typeof(portfolio_data->'transactions') = 'array'
      then portfolio_data->'transactions' else '[]'::jsonb end
  ) as tx_entry(value)
  left join lateral (
    select candidate.id
    from public.ar_rahnu_portfolio_institutions candidate
    where candidate.portfolio_id = target_portfolio_id
      and lower(candidate.name) = lower(nullif(tx_entry.value->>'institution', ''))
    order by candidate.legacy_id
    limit 1
  ) institution on true
  on conflict (portfolio_id, legacy_id) do update
    set institution_id = excluded.institution_id, record = excluded.record;

  delete from public.ar_rahnu_transaction_assets
  where portfolio_id = target_portfolio_id;

  insert into public.ar_rahnu_transaction_assets
    (portfolio_id, transaction_id, asset_id)
  select distinct
    target_portfolio_id,
    transaction_row.id,
    asset_row.id
  from jsonb_array_elements(
    case when jsonb_typeof(portfolio_data->'transactions') = 'array'
      then portfolio_data->'transactions' else '[]'::jsonb end
  ) as tx_entry(value)
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(tx_entry.value->'selectedAssetIds') = 'array'
        then tx_entry.value->'selectedAssetIds'
      when nullif(tx_entry.value->>'selectedAssetId', '') is not null
        then jsonb_build_array(tx_entry.value->>'selectedAssetId')
      else '[]'::jsonb
    end
  ) as linked_asset(legacy_id)
  join public.ar_rahnu_portfolio_transactions transaction_row
    on transaction_row.portfolio_id = target_portfolio_id
    and transaction_row.legacy_id = coalesce(
      nullif(tx_entry.value->>'id', ''), md5(tx_entry.value::text)
    )
  join public.ar_rahnu_portfolio_assets asset_row
    on asset_row.portfolio_id = target_portfolio_id
    and asset_row.legacy_id = linked_asset.legacy_id
  on conflict do nothing;

  delete from public.ar_rahnu_asset_suppliers
  where portfolio_id = target_portfolio_id;

  insert into public.ar_rahnu_asset_suppliers
    (portfolio_id, asset_id, supplier_id)
  select distinct
    target_portfolio_id,
    asset_row.id,
    supplier_row.id
  from jsonb_array_elements(
    case when jsonb_typeof(portfolio_data->'assets') = 'array'
      then portfolio_data->'assets' else '[]'::jsonb end
  ) as asset(value)
  cross join lateral (
    select upper(trim(code.value)) as supplier_key
    from jsonb_array_elements_text(
      case when jsonb_typeof(asset.value->'supplierCodes') = 'array'
        then asset.value->'supplierCodes' else '[]'::jsonb end
    ) as code(value)
    union
    select lower(trim(regexp_replace(name.value, '\s*\(Salinan\)$', '', 'i')))
    from regexp_split_to_table(coalesce(asset.value->>'supplier', ''), ',') as name(value)
    where trim(name.value) <> ''
  ) as linked_supplier
  join public.ar_rahnu_portfolio_assets asset_row
    on asset_row.portfolio_id = target_portfolio_id
    and asset_row.legacy_id = coalesce(nullif(asset.value->>'id', ''), md5(asset.value::text))
  join public.ar_rahnu_portfolio_suppliers supplier_row
    on supplier_row.portfolio_id = target_portfolio_id
    and (
      upper(coalesce(supplier_row.code, '')) = linked_supplier.supplier_key
      or lower(supplier_row.name) = linked_supplier.supplier_key
    )
  on conflict do nothing;

  delete from public.ar_rahnu_portfolio_transactions transaction_row
  where transaction_row.portfolio_id = target_portfolio_id
    and not exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(portfolio_data->'transactions') = 'array'
          then portfolio_data->'transactions' else '[]'::jsonb end
      ) as entry(value)
      where coalesce(nullif(entry.value->>'id', ''), md5(entry.value::text)) = transaction_row.legacy_id
    );

  delete from public.ar_rahnu_portfolio_assets asset_row
  where asset_row.portfolio_id = target_portfolio_id
    and not exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(portfolio_data->'assets') = 'array'
          then portfolio_data->'assets' else '[]'::jsonb end
      ) as entry(value)
      where coalesce(nullif(entry.value->>'id', ''), md5(entry.value::text)) = asset_row.legacy_id
    );

  delete from public.ar_rahnu_portfolio_institutions institution_row
  where institution_row.portfolio_id = target_portfolio_id
    and not exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(portfolio_data->'institutions') = 'array'
          then portfolio_data->'institutions' else '[]'::jsonb end
      ) as entry(value)
      where coalesce(nullif(entry.value->>'id', ''), md5(entry.value::text)) = institution_row.legacy_id
    );

  delete from public.ar_rahnu_portfolio_suppliers supplier_row
  where supplier_row.portfolio_id = target_portfolio_id
    and not exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(portfolio_data->'suppliers') = 'array'
          then portfolio_data->'suppliers' else '[]'::jsonb end
      ) as entry(value)
      where coalesce(nullif(entry.value->>'id', ''), md5(entry.value::text)) = supplier_row.legacy_id
    );
end;
$$;

create or replace function public.ar_rahnu_sync_portfolio_relations_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ar_rahnu_sync_portfolio_relations(new.user_id);
  return new;
end;
$$;

drop trigger if exists ar_rahnu_sync_portfolio_relations
  on public.ar_rahnu_user_data;
create trigger ar_rahnu_sync_portfolio_relations
  after insert or update of data on public.ar_rahnu_user_data
  for each row
  execute function public.ar_rahnu_sync_portfolio_relations_trigger();

do $$
declare
  portfolio record;
begin
  for portfolio in
    select user_id from public.ar_rahnu_user_data
  loop
    perform public.ar_rahnu_sync_portfolio_relations(portfolio.user_id);
  end loop;
end;
$$;

revoke all on function public.ar_rahnu_sync_portfolio_relations(uuid) from public, anon, authenticated;
revoke all on function public.ar_rahnu_sync_portfolio_relations_trigger() from public, anon, authenticated;
revoke all on public.ar_rahnu_portfolio_institutions from anon, authenticated;
revoke all on public.ar_rahnu_portfolio_suppliers from anon, authenticated;
revoke all on public.ar_rahnu_portfolio_assets from anon, authenticated;
revoke all on public.ar_rahnu_portfolio_transactions from anon, authenticated;
revoke all on public.ar_rahnu_transaction_assets from anon, authenticated;
revoke all on public.ar_rahnu_asset_suppliers from anon, authenticated;
grant select on public.ar_rahnu_portfolio_institutions to authenticated;
grant select on public.ar_rahnu_portfolio_suppliers to authenticated;
grant select on public.ar_rahnu_portfolio_assets to authenticated;
grant select on public.ar_rahnu_portfolio_transactions to authenticated;
grant select on public.ar_rahnu_transaction_assets to authenticated;
grant select on public.ar_rahnu_asset_suppliers to authenticated;

alter table public.ar_rahnu_portfolio_institutions enable row level security;
alter table public.ar_rahnu_portfolio_suppliers enable row level security;
alter table public.ar_rahnu_portfolio_assets enable row level security;
alter table public.ar_rahnu_portfolio_transactions enable row level security;
alter table public.ar_rahnu_transaction_assets enable row level security;
alter table public.ar_rahnu_asset_suppliers enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ar_rahnu_portfolio_institutions',
    'ar_rahnu_portfolio_suppliers',
    'ar_rahnu_portfolio_assets',
    'ar_rahnu_portfolio_transactions',
    'ar_rahnu_transaction_assets',
    'ar_rahnu_asset_suppliers'
  ]
  loop
    execute format('drop policy if exists "Portfolio members can read related records" on public.%I', table_name);
    execute format(
      'create policy "Portfolio members can read related records" on public.%I for select to authenticated using (exists (select 1 from public.ar_rahnu_user_data portfolio where portfolio.portfolio_id = %I.portfolio_id and (((select auth.uid()) = portfolio.user_id and portfolio.organization_id is null) or public.ar_rahnu_is_org_manager(portfolio.organization_id))))',
      table_name,
      table_name
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
