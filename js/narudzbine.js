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
// Važeća admin sesija (po potrebi osvežena) ili null.
BAZA.sesija = async function () {
  if (!BAZA.spremna()) return null;
  let s; try { s = JSON.parse(localStorage.getItem(BAZA.kljucSesije())); } catch { return null; }
  if (!s?.access_token || !s.refresh_token) return null;
  if (!s.expires_at || s.expires_at * 1000 < Date.now() + 60e3) {
    try {
      const r = await fetch(`${BAZA.url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: BAZA.kljuc, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) return null;
      s = await r.json(); s.expires_at = s.expires_at || Math.floor(Date.now() / 1000) + s.expires_in;
      localStorage.setItem(BAZA.kljucSesije(), JSON.stringify(s));
    } catch { return null; }
  }
  return s;
};
BAZA.adminProvera = async function () {
  const s = await BAZA.sesija(); if (!s) return false;
  try {
    const r = await fetch(`${BAZA.url}/auth/v1/user`, { headers: { apikey: BAZA.kljuc, Authorization: `Bearer ${s.access_token}` } });
    return r.ok && (await r.json()).app_metadata?.role === "admin";
  } catch { return false; }
};
// REST poziv kao admin (narudzbine, storage).
BAZA.admin = async function (put, opt = {}) {
  const s = await BAZA.sesija(); if (!s) throw new Error("Niste prijavljeni.");
  const r = await fetch(`${BAZA.url}${put}`, { ...opt, headers: { apikey: BAZA.kljuc, Authorization: `Bearer ${s.access_token}`, ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};
BAZA.narudzbina = async id => (await BAZA.admin(`/rest/v1/narudzbine?id=eq.${encodeURIComponent(id)}&select=*`))[0] || null;
// Gotova e-pozivnica: JPG u skladište (nasumično ime), link u porudžbinu → baza šalje kupcu e-mail sa linkom.
BAZA.posaljiEPozivnicu = async function (id, blob) {
  const n = await BAZA.narudzbina(id); if (!n) throw new Error("Porudžbina nije nađena.");
  const tajna = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
  const put = `${n.broj || "x"}-${tajna}.jpg`;
  await BAZA.admin(`/storage/v1/object/e-pozivnice/${put}`, { method: "POST", headers: { "Content-Type": "image/jpeg", "x-upsert": "false" }, body: blob });
  const url = `${BAZA.url}/storage/v1/object/public/e-pozivnice/${put}`;
  const [r] = await BAZA.admin(`/rest/v1/narudzbine?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ epozivnica: url, epozivnica_poslata: null, status: "poslato" }),
  });
  return r;
};
BAZA.adminOdjava = async function () {
  let s; try { s = JSON.parse(localStorage.getItem(BAZA.kljucSesije())); localStorage.removeItem(BAZA.kljucSesije()); } catch {}
  if (s?.access_token) try { await fetch(`${BAZA.url}/auth/v1/logout`, { method: "POST", headers: { apikey: BAZA.kljuc, Authorization: `Bearer ${s.access_token}` } }); } catch {}
};
