-- Empatherapy storage: one table behind lib/store/supabase.mjs.
-- Run this once in the Supabase SQL editor for the project.
--
-- Security: row-level security is ON and there are NO policies, so the public (anon) and signed-in
-- (authenticated) roles can read and write nothing. Only the server, using the service-role key
-- (never sent to a browser), can reach it. Keep SUPABASE_SERVICE_ROLE_KEY in the host's secret settings.

create table if not exists public.records (
  collection  text        not null check (collection ~ '^[a-z_]{1,40}$'),
  id          text        not null check (char_length(id) between 1 and 200),
  data        jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (collection, id)
);

alter table public.records enable row level security;
revoke all on public.records from anon, authenticated;

create index if not exists records_collection_idx on public.records (collection, created_at desc);

-- Photos of Alchemists. A PRIVATE bucket: nothing is readable by the public or by signed-in Supabase users.
-- The server reads it with the service-role key and serves photos through /media, only for public profiles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('alchemist-photos', 'alchemist-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
