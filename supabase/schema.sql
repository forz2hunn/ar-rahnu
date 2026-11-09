create table if not exists public.ar_rahnu_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

revoke all on public.ar_rahnu_user_data from anon;
grant select, insert, update on public.ar_rahnu_user_data to authenticated;

alter table public.ar_rahnu_user_data enable row level security;

drop policy if exists "Users can read their own Ar-Rahnu data" on public.ar_rahnu_user_data;
create policy "Users can read their own Ar-Rahnu data"
  on public.ar_rahnu_user_data for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own Ar-Rahnu data" on public.ar_rahnu_user_data;
create policy "Users can create their own Ar-Rahnu data"
  on public.ar_rahnu_user_data for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Ar-Rahnu data" on public.ar_rahnu_user_data;
create policy "Users can update their own Ar-Rahnu data"
  on public.ar_rahnu_user_data for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
begin
  alter publication supabase_realtime add table public.ar_rahnu_user_data;
exception
  when duplicate_object then null;
end
$$;

notify pgrst, 'reload schema';
