create table if not exists public.ar_rahnu_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_rahnu_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists ar_rahnu_single_organization
  on public.ar_rahnu_organizations ((true));

create table if not exists public.ar_rahnu_organization_members (
  organization_id uuid not null references public.ar_rahnu_organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('Admin', 'Manager', 'Staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.ar_rahnu_organization_members
  add column if not exists active boolean not null default true;

alter table public.ar_rahnu_user_data
  add column if not exists organization_id uuid references public.ar_rahnu_organizations (id) on delete set null;

create unique index if not exists ar_rahnu_user_data_one_portfolio_per_organization
  on public.ar_rahnu_user_data (organization_id)
  where organization_id is not null;

create or replace function public.ar_rahnu_is_org_manager(target_organization_id uuid)
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
      and member.role in ('Admin', 'Manager')
  );
$$;

revoke all on function public.ar_rahnu_is_org_manager(uuid) from public, anon;
grant execute on function public.ar_rahnu_is_org_manager(uuid) to authenticated;

revoke all on public.ar_rahnu_user_data from anon;
grant select, insert, update on public.ar_rahnu_user_data to authenticated;
revoke all on public.ar_rahnu_organizations from anon, authenticated;
grant select on public.ar_rahnu_organizations to authenticated;
revoke all on public.ar_rahnu_organization_members from anon, authenticated;
grant select on public.ar_rahnu_organization_members to authenticated;

alter table public.ar_rahnu_user_data enable row level security;
alter table public.ar_rahnu_organizations enable row level security;
alter table public.ar_rahnu_organization_members enable row level security;

drop policy if exists "Users can read their own Ar-Rahnu data" on public.ar_rahnu_user_data;
create policy "Users can read their own Ar-Rahnu data"
  on public.ar_rahnu_user_data for select
  to authenticated
  using (
    (select auth.uid()) = user_id and organization_id is null
    or public.ar_rahnu_is_org_manager(organization_id)
  );

drop policy if exists "Users can create their own Ar-Rahnu data" on public.ar_rahnu_user_data;
create policy "Users can create their own Ar-Rahnu data"
  on public.ar_rahnu_user_data for insert
  to authenticated
  with check (
    ((select auth.uid()) = user_id and organization_id is null)
    or public.ar_rahnu_is_org_manager(organization_id)
  );

drop policy if exists "Users can update their own Ar-Rahnu data" on public.ar_rahnu_user_data;
create policy "Users can update their own Ar-Rahnu data"
  on public.ar_rahnu_user_data for update
  to authenticated
  using (
    (select auth.uid()) = user_id and organization_id is null
    or public.ar_rahnu_is_org_manager(organization_id)
  )
  with check (
    ((select auth.uid()) = user_id and organization_id is null)
    or public.ar_rahnu_is_org_manager(organization_id)
  );

drop policy if exists "Organization members can read their organization" on public.ar_rahnu_organizations;
create policy "Organization members can read their organization"
  on public.ar_rahnu_organizations for select
  to authenticated
  using (
    exists (
      select 1 from public.ar_rahnu_organization_members member
      where member.organization_id = id and member.user_id = auth.uid() and member.active
    )
  );

drop policy if exists "Users can read their own membership and managers can read all" on public.ar_rahnu_organization_members;
create policy "Users can read their own membership and managers can read all"
  on public.ar_rahnu_organization_members for select
  to authenticated
  using (user_id = auth.uid() or public.ar_rahnu_is_org_manager(organization_id));

revoke all on public.ar_rahnu_organization_members from authenticated;
grant select on public.ar_rahnu_organization_members to authenticated;
revoke all on public.ar_rahnu_organizations from authenticated;
grant select on public.ar_rahnu_organizations to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.ar_rahnu_user_data;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.ar_rahnu_organization_members;
exception
  when duplicate_object then null;
end
$$;

notify pgrst, 'reload schema';
