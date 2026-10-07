-- ============================================================
--  3) GYM-MITGLIEDSCHAFT serverseitig speichern
-- ============================================================
--
-- Bisher stand die Gym-Verifizierung nur im Handy des Nutzers
-- (localStorage). Damit die Rangliste den vollen Haken nur bei
-- Kampfrekord UND Gym-Code zeigen kann, wird sie jetzt im Profil
-- gespeichert.
--
-- Die Pruefung des Codes bleibt serverseitig. Die Spalten werden
-- NUR von den beiden Funktionen unten gesetzt (security definer).
-- Die bisherige Funktion verify_gym_code() bleibt unveraendert.
--
-- SO FUEHRST DU DAS AUS:
--   Supabase-Dashboard -> SQL Editor -> New query -> alles hier
--   einfuegen -> "Run". Mehrfaches Ausfuehren schadet nicht.
--
-- HINWEIS: Das Sperren der Spalten gegen direktes Setzen durch Nutzer
-- (record_verified, gym_verified) ist ein eigener, spaeterer Schritt.
-- ============================================================

alter table public.profiles
  add column if not exists gym_verified boolean not null default false,
  add column if not exists gym_verified_name text,
  add column if not exists gym_verified_at timestamptz;

create or replace function public.claim_gym_membership(input_code text)
returns table(gym_name text, gym_city text)
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  select id, name, city into g from public.gyms
   where upper(btrim(verify_code)) = upper(btrim(input_code))
   limit 1;
  if not found then return; end if;
  update public.profiles
     set gym_verified = true,
         gym_verified_name = g.name,
         gym_verified_at = now()
   where user_id = auth.uid();
  return query select g.name::text, g.city::text;
end $$;

create or replace function public.release_gym_membership()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  update public.profiles
     set gym_verified = false, gym_verified_name = null, gym_verified_at = null
   where user_id = auth.uid();
end $$;

revoke all on function public.claim_gym_membership(text) from public, anon;
revoke all on function public.release_gym_membership() from public, anon;
grant execute on function public.claim_gym_membership(text) to authenticated;
grant execute on function public.release_gym_membership() to authenticated;
