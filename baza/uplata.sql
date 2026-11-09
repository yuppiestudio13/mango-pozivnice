-- =========================================================
-- MANGO · podaci za uplatu avansa
-- Kada admin porudžbini (štampane) stavi status "potvrdjena" (ili je ručno doda kao potvrđenu), kupcu stiže e-mail:
-- konačna cena, avans 50% sa podacima za uplatu, ostatak pouzećem.
-- Podatke za uplatu (primalac, račun…) upisuje Mango u admin.html → "Podaci za uplatu";
-- čuvaju se u tabeli podesavanja koju vidi samo admin.
-- E-mail ide preko FormSubmit "_autoresponse" (kupcu), a kopija stiže na mango.pozivnice@gmail.com.
-- Pokreće se jednom u Supabase → SQL Editor. Funkciju i pravilo upisa posle zamenjuje baza/epozivnica.sql.
-- =========================================================

-- broj porudžbine (za svrhu uplate i poziv na broj) i trenutak slanja podataka za uplatu
alter table public.narudzbine add column if not exists broj bigint generated always as identity;
alter table public.narudzbine add column if not exists uplata_poslata timestamptz;

-- podešavanja: jedan red (id = 1)
create table if not exists public.podesavanja (
  id         int primary key default 1 check (id = 1),
  primalac   text,          -- ime i prezime ili naziv primaoca
  adresa     text,          -- adresa primaoca (nije obavezno)
  racun      text,          -- broj tekućeg računa
  banka      text,          -- naziv banke (nije obavezno)
  napomena   text,          -- dodatna rečenica u e-mailu (nije obavezno)
  azurirano  timestamptz not null default now()
);
alter table public.podesavanja enable row level security;
drop policy if exists "admin podesavanja" on public.podesavanja;
create policy "admin podesavanja" on public.podesavanja for all to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
grant select, insert, update on public.podesavanja to authenticated;
revoke all on public.podesavanja from anon;

create or replace function public.posalji_podatke_za_uplatu()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p public.podesavanja;
  avans int;
  ostatak int;
  din text;
  poruka text;
begin
  if new.vrsta <> 'stampa' or new.status <> 'potvrdjena' or new.uplata_poslata is not null
     or coalesce(new.email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return new;
  end if;
  select * into p from public.podesavanja where id = 1;
  if p.racun is null or p.primalac is null then return new; end if;

  avans := ceil(coalesce(new.ukupno, 0) / 2.0);
  ostatak := coalesce(new.ukupno, 0) - avans;
  din := ' din';

  poruka := 'Poštovani/a ' || coalesce(nullif(new.ime, ''), '') || ',' || E'\n\n'
    || 'hvala Vam na porudžbini! Pregledali smo je i potvrđujemo porudžbinu br. ' || new.broj
    || coalesce(' (' || new.sablon || coalesce(', ' || new.kolicina || ' kom', '') || ')', '') || '.' || E'\n\n'
    || case when new.ukupno is not null then
         'Konačna cena: ' || to_char(new.ukupno, 'FM999G999G999') || din || E'\n'
      || 'Avans (50%): ' || to_char(avans, 'FM999G999G999') || din || E'\n'
      || 'Ostatak (' || to_char(ostatak, 'FM999G999G999') || din || ') plaćate pouzećem, pri preuzimanju pošiljke.' || E'\n\n'
       else '' end
    || 'PODACI ZA UPLATU AVANSA' || E'\n'
    || 'Primalac: ' || p.primalac || coalesce(', ' || nullif(p.adresa, ''), '') || E'\n'
    || 'Račun: ' || p.racun || coalesce(' (' || nullif(p.banka, '') || ')', '') || E'\n'
    || case when new.ukupno is not null then 'Iznos: ' || to_char(avans, 'FM999G999G999') || din || E'\n' else '' end
    || 'Svrha uplate: Avans za pozivnice, porudžbina br. ' || new.broj || E'\n'
    || 'Poziv na broj: ' || new.broj || E'\n\n'
    || 'Izrada počinje po uplati avansa i traje najviše 14 dana.' || E'\n'
    || coalesce(nullif(p.napomena, '') || E'\n', '')
    || E'\n' || 'Srdačan pozdrav,' || E'\n' || 'Mango pozivnice' || E'\n' || 'instagram.com/mango.pozivnice';

  perform net.http_post(
    url := 'https://formsubmit.co/ajax/mango.pozivnice@gmail.com',
    body := jsonb_build_object(
      '_subject', 'Mango pozivnice · podaci za uplatu avansa (porudžbina br. ' || new.broj || ')',
      '_template', 'box',
      '_captcha', 'false',
      '_autoresponse', poruka,
      'email', new.email,
      'Kupac', new.ime,
      'Porudžbina br.', new.broj,
      'Napomena', 'Kupcu su poslati podaci za uplatu avansa (tekst ispod).',
      'Poslato kupcu', poruka
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 'Accept', 'application/json',
      'Referer', 'https://yuppiestudio13.github.io/mango-pozivnice/',
      'Origin', 'https://yuppiestudio13.github.io'
    )
  );
  new.uplata_poslata := now();
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.posalji_podatke_za_uplatu() from public, anon, authenticated;

drop trigger if exists posalji_podatke_za_uplatu on public.narudzbine;
create trigger posalji_podatke_za_uplatu
  before insert or update of status, uplata_poslata on public.narudzbine
  for each row execute function public.posalji_podatke_za_uplatu();

-- kupac ne sme sam da postavi broj ili "uplata poslata"
drop policy if exists "kupac upisuje" on public.narudzbine;
create policy "kupac upisuje" on public.narudzbine
  for insert to anon
  with check (status = 'nova' and izvor in ('editor', 'kalkulator') and beleska is null and uplata_poslata is null);
