-- 14_photo_checks.sql
-- Foto-Pruefung: Ergebnis je Foto (Hash, Status, Gruende).
-- Wird NUR von der Edge Function check-photos (Service-Schluessel) beschrieben.
-- Nutzer duerfen nur ihre eigenen Zeilen lesen (damit die App "Foto wird
-- geprueft" anzeigen kann); schreiben duerfen sie nichts.
--
-- Der Lauf ist wiederholbar (if not exists) und aendert keine bestehenden Tabellen.

create table if not exists public.photo_checks (
  id             bigserial primary key,
  profile_id     uuid        not null,
  kind           text        not null check (kind in ('avatar', 'coach', 'gallery')),
  url            text        not null,                 -- Adresse ohne ?t=...
  phash          text,                                 -- 16 Hex-Zeichen, null bei fast einfarbigen Bildern
  status         text        not null default 'ok'
                 check (status in ('ok', 'flagged', 'hold', 'removed', 'approved')),
  reasons        text[]      not null default '{}',    -- explicit, erotica, gore, offensive, ai_generated, duplicate
  dup_profile_id uuid,                                 -- Profil mit demselben Foto (bei duplicate)
  scores         jsonb,                                -- Werte des Moderations-Dienstes (0..1)
  moderated      boolean     not null default false,   -- lief der Moderations-Dienst schon?
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  unique (profile_id, url)
);

create index if not exists photo_checks_status_idx on public.photo_checks (status);
create index if not exists photo_checks_profile_idx on public.photo_checks (profile_id);

alter table public.photo_checks enable row level security;

drop policy if exists "photo_checks_select_own" on public.photo_checks;
create policy "photo_checks_select_own" on public.photo_checks
  for select to authenticated
  using (profile_id in (select p.id from public.profiles p where p.user_id = auth.uid()));
-- bewusst KEINE insert/update/delete-Regeln: nur der Service-Schluessel schreibt.
