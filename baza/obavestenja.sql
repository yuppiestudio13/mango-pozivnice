-- =========================================================
-- MANGO · e-mail obaveštenje o novoj porudžbini
-- Posle svakog upisa iz editora/kalkulatora baza (pg_net) šalje e-mail preko FormSubmit-a
-- na mango.pozivnice@gmail.com. Ručno unete porudžbine (izvor = 'rucno') ne šalju e-mail.
-- FormSubmit traži jednu aktivaciju (link "Activate Form" u Gmail-u).
-- Pokreće se jednom u Supabase → SQL Editor.
-- =========================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.obavesti_o_narudzbini()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.izvor = 'rucno' then return new; end if;
  perform net.http_post(
    url := 'https://formsubmit.co/ajax/mango.pozivnice@gmail.com',
    body := jsonb_strip_nulls(jsonb_build_object(
      '_subject', 'Nova porudžbina: ' || coalesce(nullif(new.ime, ''), 'bez imena') || ' · '
                  || case when new.vrsta = 'e' then 'elektronska' else 'štampa' end
                  || coalesce(' · ' || replace(to_char(new.ukupno, 'FM999G999G999'), ',', '.') || ' din', ''),
      '_template', 'table',
      '_captcha', 'false',
      'Vrsta', case when new.vrsta = 'e' then 'Elektronska pozivnica' else 'Štampane pozivnice' end,
      'Ime', new.ime,
      'Telefon', new.telefon,
      'E-mail', new.email,
      'Datum događaja', to_char(new.datum_dogadjaja, 'DD.MM.YYYY.'),
      'Šablon', new.sablon,
      'Količina', new.kolicina,
      'Papir i štampa', new.stampa,
      'Foliotisak', new.folija,
      'Koverta', new.koverta,
      'Dodaci', new.dodaci,
      'Ukupno (din)', new.ukupno,
      'Napomena', new.napomena,
      'Poslato preko', new.kanal,
      'Sve porudžbine', 'https://yuppiestudio13.github.io/mango-pozivnice/admin.html'
    )),
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 'Accept', 'application/json',
      'Referer', 'https://yuppiestudio13.github.io/mango-pozivnice/',
      'Origin', 'https://yuppiestudio13.github.io'
    )
  );
  return new;
exception when others then
  return new;   -- obaveštenje nikad ne sme da spreči upis porudžbine
end;
$$;

revoke all on function public.obavesti_o_narudzbini() from public, anon, authenticated;

drop trigger if exists obavesti_o_narudzbini on public.narudzbine;
create trigger obavesti_o_narudzbini
  after insert on public.narudzbine
  for each row execute function public.obavesti_o_narudzbini();

-- pravilo "kupac upisuje" (editor i kalkulator) je konačno definisano u baza/epozivnica.sql
