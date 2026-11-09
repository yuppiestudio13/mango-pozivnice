-- =========================================================
-- MANGO · tabela porudžbina (Supabase)
-- Pokreće se jednom: Supabase → SQL Editor → New query → nalepi sve → Run.
--
-- Pravila pristupa:
--  · kupac (anon, sa sajta) može SAMO da upiše novu porudžbinu, ne vidi ničije podatke;
--  · prijavljeni admin (authenticated) vidi, menja i briše sve.
-- U Supabase → Authentication → Sign In / Providers isključiti "Allow new users to sign up",
-- tako da je jedini prijavljeni korisnik nalog koji ručno napravimo za Mango.
-- =========================================================

create table if not exists public.narudzbine (
  id          uuid primary key default gen_random_uuid(),
  napravljena timestamptz not null default now(),
  otisak      text unique,                 -- isti kupac klikne 2 kanala → ista porudžbina se ne upisuje dvaput
  vrsta       text not null check (vrsta in ('stampa', 'e')),
  status      text not null default 'nova'
              check (status in ('nova', 'potvrdjena', 'avans', 'izrada', 'poslato', 'otkazana')),
  izvor       text not null default 'editor', -- editor | rucno
  kanal       text,                        -- whatsapp | viber | instagram | copy
  ime         text,
  telefon     text,
  email       text,
  datum_dogadjaja date,
  napomena    text,
  sablon      text,                        -- naziv šablona (+ vrsta, format)
  sablon_id   text,
  kolicina    int,
  stampa      text,                        -- papir i štampa
  folija      text,
  koverta     text,
  dodaci      text,
  ukupno      int,                         -- dinara
  dizajn      text,                        -- link do dizajna u editoru
  poruka      text,                        -- cela poruka koju je kupac poslao
  beleska     text                         -- interna beleška (vidi samo admin)
);

-- razumne granice, da niko ne može da zatrpa bazu ogromnim upisima
alter table public.narudzbine drop constraint if exists narudzbine_duzine;
alter table public.narudzbine add constraint narudzbine_duzine check (
  coalesce(length(ime), 0) <= 200 and coalesce(length(telefon), 0) <= 60 and coalesce(length(email), 0) <= 200
  and coalesce(length(napomena), 0) <= 3000 and coalesce(length(poruka), 0) <= 12000
  and coalesce(length(dizajn), 0) <= 20000 and coalesce(length(beleska), 0) <= 5000
);

create index if not exists narudzbine_napravljena on public.narudzbine (napravljena desc);

alter table public.narudzbine enable row level security;

drop policy if exists "kupac upisuje" on public.narudzbine;
create policy "kupac upisuje" on public.narudzbine
  for insert to anon
  with check (status = 'nova' and izvor = 'editor' and beleska is null);

drop policy if exists "admin cita" on public.narudzbine;
create policy "admin cita" on public.narudzbine for select to authenticated using (true);
drop policy if exists "admin upisuje" on public.narudzbine;
create policy "admin upisuje" on public.narudzbine for insert to authenticated with check (true);
drop policy if exists "admin menja" on public.narudzbine;
create policy "admin menja" on public.narudzbine for update to authenticated using (true) with check (true);
drop policy if exists "admin brise" on public.narudzbine;
create policy "admin brise" on public.narudzbine for delete to authenticated using (true);

grant insert on public.narudzbine to anon;
grant select, insert, update, delete on public.narudzbine to authenticated;
