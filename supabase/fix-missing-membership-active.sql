alter table public.ar_rahnu_organization_members
  add column if not exists active boolean not null default true;

notify pgrst, 'reload schema';

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ar_rahnu_organization_members'
  and column_name = 'active';
