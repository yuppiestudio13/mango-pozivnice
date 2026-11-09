-- =========================================================
-- MANGO · elektronske pozivnice: uplata celog iznosa + automatsko slanje pozivnice
-- Zamenjuje funkciju iz baza/uplata.sql (ista imena), pa se pokreće posle nje.
--  · status "potvrdjena": kupcu e-mail sa podacima za uplatu
--      štampa → konačna cena, avans 50%, ostatak pouzećem
--      elektronska → ceo iznos unapred
--  · elektronska, kada admin.html/editor upiše link do gotove pozivnice (kolona epozivnica):
--      kupcu e-mail sa linkom za preuzimanje (jednom; "pošalji ponovo" = epozivnica_poslata na null)
-- Gotove pozivnice su u Storage bucket-u "e-pozivnice" (javno čitanje, nasumična imena fajlova;
-- upload samo admin). Pokreće se jednom u Supabase → SQL Editor.
-- =========================================================

alter table public.narudzbine add column if not exists epozivnica text;
alter table public.narudzbine add column if not exists epozivnica_poslata timestamptz;

-- skladište za gotove e-pozivnice
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('e-pozivnice', 'e-pozivnice', true, 10485760, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg'];

drop policy if exists "admin e-pozivnice upis" on storage.objects;
create policy "admin e-pozivnice upis" on storage.objects for insert to authenticated
  with check (bucket_id = 'e-pozivnice' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "admin e-pozivnice izmena" on storage.objects;
create policy "admin e-pozivnice izmena" on storage.objects for update to authenticated
  using (bucket_id = 'e-pozivnice' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "admin e-pozivnice brisanje" on storage.objects;
create policy "admin e-pozivnice brisanje" on storage.objects for delete to authenticated
  using (bucket_id = 'e-pozivnice' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- slanje e-maila kupcu preko FormSubmit autoresponse (kopija ide Mango-u)
create or replace function public.mango_posalji_kupcu(naslov text, poruka text, kupac_email text, kupac text, broj bigint)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://formsubmit.co/ajax/mango.pozivnice@gmail.com',
    body := jsonb_build_object(
      '_subject', naslov, '_template', 'box', '_captcha', 'false',
      '_autoresponse', poruka, 'email', kupac_email,
      'Kupac', kupac, 'Porudžbina br.', broj, 'Poslato kupcu', poruka
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 'Accept', 'application/json',
      'Referer', 'https://yuppiestudio13.github.io/mango-pozivnice/',
      'Origin', 'https://yuppiestudio13.github.io'
    )
  );
end;
$$;
revoke all on function public.mango_posalji_kupcu(text, text, text, text, bigint) from public, anon, authenticated;

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
  iznos int;
  poruka text;
  pozdrav text := E'\n' || 'Srdačan pozdrav,' || E'\n' || 'Mango pozivnice' || E'\n' || 'instagram.com/mango.pozivnice';
  f text := 'FM999G999G999';
begin
  if coalesce(new.email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return new; end if;

  -- 1) podaci za uplatu, kada admin potvrdi porudžbinu
  if new.status = 'potvrdjena' and new.uplata_poslata is null then
    select * into p from public.podesavanja where id = 1;
    if p.racun is not null and p.primalac is not null then
      avans := ceil(coalesce(new.ukupno, 0) / 2.0);
      ostatak := coalesce(new.ukupno, 0) - avans;
      iznos := case when new.vrsta = 'e' then new.ukupno else avans end;
      poruka := 'Poštovani/a ' || coalesce(nullif(new.ime, ''), '') || ',' || E'\n\n'
        || 'hvala Vam na porudžbini! Pregledali smo je i potvrđujemo porudžbinu br. ' || new.broj
        || coalesce(' (' || new.sablon || case when new.vrsta = 'e' then ', elektronska pozivnica' else coalesce(', ' || new.kolicina || ' kom', '') end || ')', '') || '.' || E'\n\n'
        || case
             when new.ukupno is null then ''
             when new.vrsta = 'e' then
               'Cena: ' || replace(to_char(new.ukupno, f), ',', '.') || ' din' || E'\n'
               || 'Elektronska pozivnica se plaća u celosti unapred. Čim uplata stigne, pozivnicu bez vodenog žiga šaljemo na ovaj e-mail.' || E'\n\n'
             else
               'Konačna cena: ' || replace(to_char(new.ukupno, f), ',', '.') || ' din' || E'\n'
               || 'Avans (50%): ' || replace(to_char(avans, f), ',', '.') || ' din' || E'\n'
               || 'Ostatak (' || replace(to_char(ostatak, f), ',', '.') || ' din) plaćate pouzećem, pri preuzimanju pošiljke.' || E'\n\n'
           end
        || case when new.vrsta = 'e' then 'PODACI ZA UPLATU' else 'PODACI ZA UPLATU AVANSA' end || E'\n'
        || 'Primalac: ' || p.primalac || coalesce(', ' || nullif(p.adresa, ''), '') || E'\n'
        || 'Račun: ' || p.racun || coalesce(' (' || nullif(p.banka, '') || ')', '') || E'\n'
        || case when iznos is not null then 'Iznos: ' || replace(to_char(iznos, f), ',', '.') || ' din' || E'\n' else '' end
        || 'Svrha uplate: ' || case when new.vrsta = 'e' then 'Elektronska pozivnica' else 'Avans za pozivnice' end || ', porudžbina br. ' || new.broj || E'\n'
        || 'Poziv na broj: ' || new.broj || E'\n\n'
        || case when new.vrsta = 'e' then '' else 'Izrada počinje po uplati avansa i traje najviše 14 dana.' || E'\n' end
        || coalesce(nullif(p.napomena, '') || E'\n', '')
        || pozdrav;
      perform public.mango_posalji_kupcu(
        'Mango pozivnice · podaci za uplatu (porudžbina br. ' || new.broj || ')', poruka, new.email, new.ime, new.broj);
      new.uplata_poslata := now();
    end if;
  end if;

  -- 2) gotova elektronska pozivnica, kada admin postavi link
  if new.vrsta = 'e' and new.epozivnica is not null and new.epozivnica_poslata is null then
    poruka := 'Poštovani/a ' || coalesce(nullif(new.ime, ''), '') || ',' || E'\n\n'
      || 'hvala Vam na uplati! Vaša elektronska pozivnica (porudžbina br. ' || new.broj || ') je spremna.' || E'\n\n'
      || 'Preuzmite je ovde:' || E'\n' || new.epozivnica || E'\n\n'
      || 'Sliku sačuvajte na telefonu i pošaljite gostima preko Vibera, WhatsApp-a ili Instagrama. Link je samo Vaš, ne delite ga javno.' || E'\n'
      || pozdrav;
    perform public.mango_posalji_kupcu(
      'Mango pozivnice · Vaša elektronska pozivnica (porudžbina br. ' || new.broj || ')', poruka, new.email, new.ime, new.broj);
    new.epozivnica_poslata := now();
  end if;

  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.posalji_podatke_za_uplatu() from public, anon, authenticated;

drop trigger if exists posalji_podatke_za_uplatu on public.narudzbine;
create trigger posalji_podatke_za_uplatu
  before insert or update of status, uplata_poslata, epozivnica, epozivnica_poslata on public.narudzbine
  for each row execute function public.posalji_podatke_za_uplatu();

-- kupac ne sme sam da postavi ove kolone
drop policy if exists "kupac upisuje" on public.narudzbine;
create policy "kupac upisuje" on public.narudzbine
  for insert to anon
  with check (status = 'nova' and izvor in ('editor', 'kalkulator') and beleska is null
              and uplata_poslata is null and epozivnica is null and epozivnica_poslata is null);
