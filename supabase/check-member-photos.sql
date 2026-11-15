-- Diagnostik gambar profil ahli (jalankan dalam Supabase SQL Editor).
-- Menjawab: adakah ahli tertentu pernah menetapkan gambar profil, dan adakah failnya masih wujud.

-- 1) Status gambar bagi setiap ahli organisasi.
with organisation_members as (
  select
    member.organization_id,
    member.user_id,
    member.role,
    member.active,
    lower(coalesce(auth_user.email, '')) as email,
    coalesce(
      nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth_user.raw_user_meta_data ->> 'name', ''),
      ''
    ) as full_name,
    nullif(auth_user.raw_user_meta_data ->> 'avatar_photo_path', '') as avatar_photo_path
  from public.ar_rahnu_organization_members member
  join auth.users auth_user on auth_user.id = member.user_id
)
select
  full_name,
  email,
  user_id,
  role,
  active,
  coalesce(avatar_photo_path, '-') as avatar_photo_path,
  case
    when avatar_photo_path is null then 'TIADA dalam metadata'
    when exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'ar-rahnu-profile-photos'
        and object.name = avatar_photo_path
    ) then 'ADA (fail wujud)'
    else 'LALUAN ADA, FAIL TIADA'
  end as status_gambar,
  (
    select count(*)
    from storage.objects object
    where object.bucket_id = 'ar-rahnu-profile-photos'
      and (storage.foldername(object.name))[1] = organisation_members.user_id::text
  ) as fail_dalam_folder
from organisation_members
order by
  case
    when full_name ilike '%fabulouz%' or email like '%fabulouz%' then 0
    when full_name ilike '%0stad%' or email like '%0stad%' then 1
    when full_name ilike '%shazreen%' or email like '%shazreen%' then 2
    else 3
  end,
  full_name;

-- 2) Semua fail dalam bucket gambar profil, termasuk fail lama yang metadatanya
--    mungkin sudah dipadam (buktikan sama ada ahli pernah memuat naik gambar).
select
  object.name,
  object.owner,
  object.created_at,
  object.updated_at,
  (object.metadata ->> 'size') as size_bytes
from storage.objects object
where object.bucket_id = 'ar-rahnu-profile-photos'
order by object.created_at desc;
