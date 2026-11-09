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
