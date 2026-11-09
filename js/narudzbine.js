/* =========================================================
   MANGO · porudžbine u bazi (Supabase)
   Editor ovde upisuje svaku poslatu porudžbinu; admin.html ih čita.
   Dok BAZA.url i BAZA.kljuc nisu upisani, ništa se ne šalje (sajt radi kao i pre).
   Ključ je "publishable/anon": javan je po prirodi, a pravila u bazi (baza/narudzbine.sql)
   dozvoljavaju kupcu samo upis nove porudžbine, ne i čitanje.
   ========================================================= */
window.BAZA = {
  url: "https://sevbybvccyukeephsiai.supabase.co",
  kljuc: "sb_publishable_XQUXdaK3eAUAMl1jpjQVug_XXj8yhFf",   // Project Settings → API Keys → publishable (javni)
};
BAZA.spremna = () => !!(BAZA.url && BAZA.kljuc);

// Otisak porudžbine: isti sadržaj (kupac klikne i WhatsApp i "Kopiraj") → jedan red u bazi.
async function otisakNarudzbine(tekst) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tekst));
  return [...new Uint8Array(b)].slice(0, 16).map(x => x.toString(16).padStart(2, "0")).join("");
}

// Upis ne sme da zaustavi slanje poruke: greške se samo beleže u konzoli.
window.sacuvajNarudzbinu = async function (red) {
  if (!BAZA.spremna()) return false;
  try {
    red.otisak = await otisakNarudzbine(red.poruka || JSON.stringify(red));
    const r = await fetch(`${BAZA.url}/rest/v1/narudzbine`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: BAZA.kljuc, Authorization: `Bearer ${BAZA.kljuc}`, "Content-Type": "application/json",
        Prefer: "return=minimal",   // bez on_conflict: kupac nema pravo čitanja, pa duplikat (isti otisak) baza odbije sa 409
      },
      body: JSON.stringify(red),
    });
    if (r.status === 409) return true;   // ista porudžbina je već upisana
    if (!r.ok) console.warn("Porudžbina nije upisana:", r.status, await r.text());
    return r.ok;
  } catch (e) { console.warn("Porudžbina nije upisana:", e); return false; }
};

/* ---------------- admin prijava (deli je sa admin.html) ----------------
   admin.html se prijavljuje preko supabase-js, koji sesiju čuva u localStorage pod ključem ispod.
   Editor tu sesiju samo čita, po potrebi osveži i proveri kod Supabase servera da nalog ima ulogu "admin".
   Kupac nikad nema ovu sesiju, pa se za njega ne šalje nijedan zahtev. */
BAZA.kljucSesije = () => `sb-${new URL(BAZA.url).hostname.split(".")[0]}-auth-token`;
BAZA.adminProvera = async function () {
  if (!BAZA.spremna()) return false;
  let s; try { s = JSON.parse(localStorage.getItem(BAZA.kljucSesije())); } catch { return false; }
  if (!s?.access_token || !s.refresh_token) return false;
  const h = { apikey: BAZA.kljuc, "Content-Type": "application/json" };
  try {
    if (!s.expires_at || s.expires_at * 1000 < Date.now() + 60e3) {
      const r = await fetch(`${BAZA.url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: h, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) return false;
      s = await r.json(); s.expires_at = s.expires_at || Math.floor(Date.now() / 1000) + s.expires_in;
      localStorage.setItem(BAZA.kljucSesije(), JSON.stringify(s));
    }
    const r = await fetch(`${BAZA.url}/auth/v1/user`, { headers: { ...h, Authorization: `Bearer ${s.access_token}` } });
    if (!r.ok) return false;
    return (await r.json()).app_metadata?.role === "admin";
  } catch { return false; }
};
BAZA.adminOdjava = async function () {
  let s; try { s = JSON.parse(localStorage.getItem(BAZA.kljucSesije())); localStorage.removeItem(BAZA.kljucSesije()); } catch {}
  if (s?.access_token) try { await fetch(`${BAZA.url}/auth/v1/logout`, { method: "POST", headers: { apikey: BAZA.kljuc, Authorization: `Bearer ${s.access_token}` } }); } catch {}
};
