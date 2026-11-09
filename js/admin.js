/* =========================================================
   MANGO · admin: spisak porudžbina (štampane + elektronske)
   Podaci su u Supabase tabeli "narudzbine" (baza/narudzbine.sql).
   Bez upisanih BAZA.url/kljuc (js/narudzbine.js) prikazuje primer sa izmišljenim podacima.
   ========================================================= */
const $ = id => document.getElementById(id);
const STATUSI = [
  ["nova", "Nova"], ["potvrdjena", "Potvrđena"], ["avans", "Avans plaćen"],
  ["izrada", "U izradi"], ["poslato", "Poslato"], ["otkazana", "Otkazana"],
];
const SN = Object.fromEntries(STATUSI);
// Elektronske: plaća se ceo iznos, pa je "avans" = "Plaćeno"; "poslato" = pozivnica poslata kupcu.
const SNE = { ...SN, avans: "Plaćeno", izrada: "U pripremi" };
const sn = (vr, k) => (vr === "e" ? SNE : SN)[k];
const KANAL = { whatsapp: "WhatsApp", viber: "Viber", instagram: "Instagram", copy: "kopirana poruka", telefon: "telefon", licno: "lično" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const din = n => n == null ? "—" : Math.round(n).toLocaleString("sr-RS") + " din";
const datum = d => d ? new Date(d.length === 10 ? d + "T12:00" : d).toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "numeric", year: "numeric" }) : "—";
const danaDo = d => d ? Math.round((new Date(d + "T12:00") - new Date()) / 864e5) : null;
const pre = t => { const m = Math.round((Date.now() - new Date(t)) / 6e4); return m < 60 ? `pre ${Math.max(m, 1)} min` : m < 1440 ? `pre ${Math.round(m / 60)} h` : m < 2880 ? "juče" : datum(t); };
const broj = t => { let d = String(t || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "381" + d.slice(1); return d; };
const sigurno = u => /^(https?:\/\/|editor\.html)/i.test(u || "") ? u : null;

// Posle prijave vrati u editor (samo editor.html na ovom sajtu, nikad tuđa adresa).
const nazad = () => { const n = new URLSearchParams(location.search).get("nazad"); return n && /^editor\.html(?:[?#]|$)/.test(n) ? n : null; };
let podesavanja = null;
let sb = null, demo = false, sve = [], vrsta = "stampa", filt = "aktivne", otvorena = null;
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2800); }

/* ---------------- start i prijava ---------------- */
async function init() {
  if (!BAZA.spremna()) { demo = true; sve = primer(); $("demo").hidden = false; return pokazi(); }
  await new Promise((ok, err) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"; s.onload = ok; s.onerror = err; document.head.append(s); })
    .catch(() => { document.body.insertAdjacentHTML("beforeend", "<p class='empty'>Nije moguće učitati vezu sa bazom. Proverite internet.</p>"); });
  sb = supabase.createClient(BAZA.url, BAZA.kljuc, { auth: { persistSession: true } });
  const { data } = await sb.auth.getSession();
  if (data.session && nazad()) { location.href = nazad(); return; }
  if (data.session) pokazi(); else prijava();
}

function prijava() {
  $("app").hidden = true; $("odjava").hidden = true; $("prijava").hidden = false; $("lEmail").focus();
  $("loginForm").onsubmit = async e => {
    e.preventDefault(); $("lErr").hidden = true;
    const { error } = await sb.auth.signInWithPassword({ email: $("lEmail").value.trim(), password: $("lPass").value });
    if (error) { $("lErr").hidden = false; return; }
    $("lPass").value = "";
    if (nazad()) { location.href = nazad(); return; }
    pokazi();
  };
}
$("odjava").onclick = async () => { await sb.auth.signOut(); sve = []; prijava(); };

async function pokazi() {
  $("prijava").hidden = true; $("app").hidden = false; $("odjava").hidden = demo;
  if (!demo) await ucitaj();
  crtaj();
}
async function ucitaj() {
  const { data, error } = await sb.from("narudzbine").select("*").order("napravljena", { ascending: false }).limit(2000);
  if (error) { toast("Greška pri učitavanju: " + error.message); if (/JWT|auth/i.test(error.message)) prijava(); return; }
  sve = data;
  const p = await sb.from("podesavanja").select("*").eq("id", 1).maybeSingle();
  podesavanja = p.data || null;
}
$("osvezi").onclick = async () => { if (!demo) await ucitaj(); crtaj(); toast("Spisak je osvežen."); };

/* ---------------- prikaz ---------------- */
document.querySelector(".tabs").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  vrsta = b.dataset.v; otvorena = null;
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
  crtaj();
};
$("q").oninput = () => crtaj();
$("sort").onchange = () => crtaj();
$("chips").onclick = e => { const b = e.target.closest("button"); if (b) { filt = b.dataset.f; crtaj(); } };

const aktivna = o => o.status !== "poslato" && o.status !== "otkazana";
function vidljive() {
  const q = $("q").value.trim().toLowerCase();
  let L = sve.filter(o => o.vrsta === vrsta);
  if (filt === "aktivne") L = L.filter(aktivna); else if (filt !== "sve") L = L.filter(o => o.status === filt);
  if (q) L = L.filter(o => [o.ime, o.telefon, o.email, o.sablon, o.napomena, o.beleska, o.broj && "br. " + o.broj, o.broj && String(o.broj)].some(x => (x || "").toLowerCase().includes(q)));
  if ($("sort").value === "dogadjaj") L = [...L].sort((a, b) => (a.datum_dogadjaja || "9999").localeCompare(b.datum_dogadjaja || "9999"));
  return L;
}
function crtaj() {
  $("nS").textContent = sve.filter(o => o.vrsta === "stampa" && aktivna(o)).length;
  $("nE").textContent = sve.filter(o => o.vrsta === "e" && aktivna(o)).length;
  const V = sve.filter(o => o.vrsta === vrsta), n = s => V.filter(o => s.includes(o.status)).length;
  $("sum").innerHTML = `
    <div><b>${n(["nova"])}</b><small>Nove</small></div>
    <div><b>${n(["potvrdjena", "avans", "izrada"])}</b><small>U toku</small></div>
    <div><b>${n(["poslato"])}</b><small>Poslato</small></div>
    <div><b>${din(V.filter(aktivna).reduce((a, o) => a + (o.ukupno || 0), 0)).replace(" din", "")}</b><small>Din u toku</small></div>`;
  const cnt = s => s === "sve" ? V.length : s === "aktivne" ? V.filter(aktivna).length : n([s]);
  $("chips").innerHTML = [["aktivne", "Aktivne"], ...STATUSI.map(([k]) => [k, sn(vrsta, k)]), ["sve", "Sve"]]
    .map(([k, t]) => `<button data-f="${k}" aria-pressed="${filt === k}">${t} · ${cnt(k)}</button>`).join("");
  const L = vidljive();
  $("list").innerHTML = L.map(red).join("");
  $("empty").hidden = L.length > 0;
}

function red(o) {
  const d = danaDo(o.datum_dogadjaja), hitno = aktivna(o) && d != null && d >= 0 && d <= 21;
  const dog = o.datum_dogadjaja ? `<span class="${hitno ? "soon" : ""}">Događaj ${datum(o.datum_dogadjaja)}${hitno ? ` · za ${d} ${d === 1 ? "dan" : "dana"}` : ""}</span>` : "Datum događaja —";
  const opis = [esc(o.sablon), o.vrsta === "stampa" && o.kolicina ? `<b>${+o.kolicina} kom</b>` : "", o.vrsta === "stampa" ? esc(o.stampa) : ""].filter(Boolean);
  const open = otvorena === o.id;
  return `<li class="o ${o.status}" data-id="${o.id}">
  <button class="o-h" data-a="toggle" aria-expanded="${open}">
    <div class="o-l"><div class="o-ime">${esc(o.ime) || "<i>bez imena</i>"}${o.broj ? `<span class="o-br">br. ${+o.broj}</span>` : ""}</div><div class="o-meta">${dog} · poručeno ${pre(o.napravljena)}</div></div>
    <div class="o-cena">${din(o.ukupno)}</div>
    <div class="o-meta o-m">${opis.join(" · ") || "—"}</div>
    <span class="pill ${o.status}">${sn(o.vrsta, o.status)}</span>
  </button>
  ${open ? detalji(o) : ""}
</li>`;
}

function detalji(o) {
  const tel = broj(o.telefon), diz = sigurno(o.dizajn);
  const polja = o.vrsta === "stampa"
    ? [["Šablon", o.sablon], ["Količina", o.kolicina && o.kolicina + " kom"], ["Papir i štampa", o.stampa], ["Foliotisak", o.folija], ["Koverta", o.koverta], ["Dodaci", o.dodaci]]
    : [["Šablon", o.sablon]];
  polja.push(["Ukupno", din(o.ukupno)], ["Datum događaja", datum(o.datum_dogadjaja)], ["Telefon", o.telefon], ["E-mail", o.email],
    ["Poručeno", `${datum(o.napravljena)} ${new Date(o.napravljena).toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })}${o.kanal ? " · " + (KANAL[o.kanal] || o.kanal) : ""}${o.izvor === "rucno" ? " · uneto ručno" : o.izvor === "kalkulator" ? " · iz kalkulatora" : ""}`],
    ["Napomena kupca", o.napomena]);
  return `<div class="o-b">
    <div>
      <div class="kont">
        ${tel ? `<a class="ab ghost" href="tel:+${tel}">Pozovi</a><a class="ab ghost" href="viber://chat?number=%2B${tel}">Viber</a><a class="ab ghost" href="https://wa.me/${tel}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        ${o.email ? `<a class="ab ghost" href="mailto:${esc(o.email)}">E-mail</a>` : ""}
      </div>
      <dl class="det" style="margin-top:12px">${polja.filter(p => p[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    </div>
    <div class="row">
      <label>Status<select data-a="status">${STATUSI.map(([k]) => `<option value="${k}"${k === o.status ? " selected" : ""}>${sn(o.vrsta, k)}</option>`).join("")}</select></label>
      <label>Interna beleška<textarea data-a="beleska" rows="3" placeholder="Npr. avans 5.000 din uplaćen 10.11.">${esc(o.beleska)}</textarea></label>
    </div>
    ${uplataInfo(o)}${o.vrsta === "e" ? ePozInfo(o) : ""}
    ${o.poruka ? `<details class="msg full"><summary>Cela poruka kupca</summary><pre>${esc(o.poruka)}</pre></details>` : ""}
    <div class="o-acts full">
      ${diz ? `<a class="ab solid" href="${esc(o.vrsta === "e" ? dizajnZaSlanje(o) : diz)}" target="_blank" rel="noopener">Otvori dizajn</a>` : ""}
      ${o.poruka ? `<button class="ab ghost" data-a="kopiraj">Kopiraj poruku</button>` : ""}
      <button class="ab danger" data-a="obrisi">Obriši</button>
    </div>
  </div>`;
}

// Podaci za uplatu: da li su poslati kupcu i zašto nisu.
const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || "");
function razlogNe(o) {
  if (!emailOk(o.email)) return "kupac nema ispravan e-mail. Pošaljite mu podatke porukom ili upišite e-mail.";
  if (!podesavanja?.racun || !podesavanja?.primalac) return "prvo upišite Podatke za uplatu (dugme iznad spiska).";
  return "pokušajte ponovo.";
}
function uplataInfo(o) {
  if (o.uplata_poslata) {
    const t = new Date(o.uplata_poslata);
    return `<p class="uplata full">✓ Podaci za uplatu ${o.vrsta === "e" ? "" : "avansa "}poslati ${datum(o.uplata_poslata)} u ${t.toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })} na ${esc(o.email)}.${demo ? "" : `<button data-a="ponovo">Pošalji ponovo</button>`}</p>`;
  }
  if (o.status === "nova") return `<p class="uplata full">Kada promenite status u <b>Potvrđena</b>, kupcu automatski stižu podaci za uplatu ${o.vrsta === "e" ? "celog iznosa" : "avansa"}${emailOk(o.email) ? ` na ${esc(o.email)}` : ""}.${emailOk(o.email) ? "" : " <b>Kupac nije ostavio e-mail.</b>"}</p>`;
  return `<p class="uplata ne full">Podaci za uplatu nisu poslati e-mailom: ${esc(razlogNe(o))}${emailOk(o.email) && !demo ? `<button data-a="ponovo">Pošalji sada</button>` : ""}</p>`;
}

/* ---------------- elektronska pozivnica: pravljenje i slanje kupcu ---------------- */
// Editor se otvara nevidljivo (iframe) sa ?n=<id>&posalji=1, pravi sliku bez žiga, šalje je u skladište
// i upisuje link; baza zatim kupcu šalje e-mail. Pozivnice sa fotografijom kupca se šalju ručno iz editora.
const fotoCeka = new Set();
function dizajnZaSlanje(o, auto) {
  const u = new URL(o.dizajn, location.href), q = new URLSearchParams(u.search);
  q.set("n", o.id); if (auto) q.set("posalji", "1");
  return `editor.html?${q}${u.hash}`;
}
function ePozInfo(o) {
  if (o.epozivnica_poslata) {
    const t = new Date(o.epozivnica_poslata);
    return `<p class="uplata full">✓ E-pozivnica poslata ${datum(o.epozivnica_poslata)} u ${t.toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })} na ${esc(o.email)}. ${sigurno(o.epozivnica) ? `<a href="${esc(o.epozivnica)}" target="_blank" rel="noopener">Pogledaj</a>` : ""}${demo ? "" : `<button data-a="epoz">Napravi i pošalji ponovo</button>`}</p>`;
  }
  if (fotoCeka.has(o.id)) return `<p class="uplata ne full">Ova pozivnica ima fotografiju kupca, pa se ne šalje automatski. Kliknite <b>Otvori dizajn</b>, ubacite fotografiju koju vam je kupac poslao i kliknite zlatno dugme <b>Pošalji e-pozivnicu kupcu</b>.</p>`;
  return `<p class="uplata full">Kada uplata stigne, izaberite status <b>Plaćeno</b>: pozivnica bez žiga se sama napravi i pošalje kupcu na e-mail.${sigurno(o.dizajn) && !demo ? `<button data-a="epoz">Napravi i pošalji sada</button>` : ""}</p>`;
}
function autoPosalji(o) {
  if (demo) return toast("U primeru se ništa ne šalje.");
  if (!sigurno(o.dizajn)) return toast("Ova porudžbina nema link do dizajna. Pošaljite pozivnicu ručno.");
  if (!emailOk(o.email)) return toast("Kupac nema ispravan e-mail.");
  toast("Pravim e-pozivnicu bez žiga i šaljem je kupcu… (do 30 sekundi)");
  const f = document.createElement("iframe");
  f.src = dizajnZaSlanje(o, true); f.title = "slanje e-pozivnice"; f.setAttribute("aria-hidden", "true");
  f.style.cssText = "position:fixed;left:-12000px;top:0;width:1280px;height:900px;border:0;opacity:0;pointer-events:none";
  const kraj = async (r) => {
    clearTimeout(tm); removeEventListener("message", on); f.remove();
    if (r.ok) { Object.assign(o, r.red || {}); if (!r.red) await ucitaj(); crtaj(); toast(`E-pozivnica je poslata na ${o.email}. Status: Poslato.`); }
    else if (r.razlog === "foto") { fotoCeka.add(o.id); otvorena = o.id; crtaj(); toast("Pozivnica ima fotografiju kupca: pošaljite je iz editora (uputstvo u porudžbini)."); }
    else toast("Nije poslato: " + (r.razlog || "nepoznata greška"));
  };
  const on = e => { if (e.origin === location.origin && e.data?.mango === "epoz" && e.data.id === o.id) kraj(e.data); };
  const tm = setTimeout(() => kraj({ ok: false, razlog: "isteklo vreme, pokušajte ponovo." }), 60000);
  addEventListener("message", on);
  document.body.append(f);
}

/* ---------------- podaci za uplatu (podešavanja) ---------------- */
const uDlg = $("uDlg"), uForm = $("uForm");
$("uplataBtn").onclick = () => {
  uForm.reset();
  for (const k of ["primalac", "racun", "banka", "adresa", "napomena"]) uForm[k].value = podesavanja?.[k] || "";
  uDlg.showModal();
};
uForm.addEventListener("submit", async e => {
  if (e.submitter?.value !== "ok") return;
  e.preventDefault();
  const f = Object.fromEntries([...new FormData(uForm)].map(([k, v]) => [k, v.trim() || null]));
  if (demo) { podesavanja = f; uDlg.close(); return toast("Sačuvano (primer)."); }
  const { data, error } = await sb.from("podesavanja").upsert({ id: 1, ...f, azurirano: new Date().toISOString() }).select().single();
  if (error) return toast("Nije sačuvano: " + error.message);
  podesavanja = data; uDlg.close(); crtaj(); toast("Podaci za uplatu su sačuvani.");
});

/* ---------------- izmene ---------------- */
async function izmeni(o, polja) {
  if (!demo) {
    const { data, error } = await sb.from("narudzbine").update(polja).eq("id", o.id).select().single();
    if (error) { toast("Nije sačuvano: " + error.message); return false; }
    Object.assign(o, data); return true;
  }
  Object.assign(o, polja); return true;
}
$("list").addEventListener("click", async e => {
  const el = e.target.closest("[data-a]"), li = e.target.closest("li.o"); if (!el || !li) return;
  const o = sve.find(x => String(x.id) === li.dataset.id);
  if (el.dataset.a === "toggle") { otvorena = otvorena === o.id ? null : o.id; crtaj(); return; }
  if (el.dataset.a === "ponovo") {
    if (!await izmeni(o, { uplata_poslata: null })) return;
    crtaj(); toast(o.uplata_poslata ? `Podaci za uplatu su ponovo poslati na ${o.email}.` : `Nije poslato: ${razlogNe(o)}`); return;
  }
  if (el.dataset.a === "epoz") return autoPosalji(o);
  if (el.dataset.a === "kopiraj") { try { await navigator.clipboard.writeText(o.poruka); toast("Poruka je kopirana."); } catch { toast("Kopiranje nije uspelo."); } }
  if (el.dataset.a === "obrisi") {
    if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.textContent = "Sigurno obrisati?"; setTimeout(() => { if (el.isConnected) { el.dataset.sure = ""; el.textContent = "Obriši"; } }, 4000); return; }
    if (!demo) { const { error } = await sb.from("narudzbine").delete().eq("id", o.id); if (error) return toast("Nije obrisano: " + error.message); }
    sve = sve.filter(x => x !== o); otvorena = null; crtaj(); toast("Porudžbina je obrisana.");
  }
});
$("list").addEventListener("change", async e => {
  const el = e.target.closest("[data-a]"), li = e.target.closest("li.o"); if (!el || !li) return;
  const o = sve.find(x => String(x.id) === li.dataset.id);
  if (el.dataset.a === "status") {
    const bilo = !!o.uplata_poslata;
    if (!await izmeni(o, { status: el.value })) return;
    crtaj();
    if (o.vrsta === "e" && el.value === "avans" && !o.epozivnica_poslata) return autoPosalji(o);
    toast(!bilo && o.uplata_poslata ? `Potvrđeno. Kupcu je poslat e-mail sa podacima za uplatu (${o.email}).`
      : el.value === "potvrdjena" && o.vrsta === "stampa" && !o.uplata_poslata ? `Potvrđeno, ali e-mail NIJE poslat: ${razlogNe(o)}`
      : `Status: ${sn(o.vrsta, el.value)}.`);
  }
  if (el.dataset.a === "beleska" && await izmeni(o, { beleska: el.value.trim() || null })) toast("Beleška je sačuvana.");
});

/* ---------------- ručni unos ---------------- */
const dlg = $("dlg"), dForm = $("dForm");
$("dodaj").onclick = () => {
  dForm.reset(); dForm.vrsta.value = vrsta; dForm.classList.toggle("e", vrsta === "e"); dlg.showModal();
};
dForm.addEventListener("change", e => { if (e.target.name === "vrsta") dForm.classList.toggle("e", e.target.value === "e"); });
dForm.addEventListener("submit", async e => {
  if (e.submitter?.value !== "ok") return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(dForm)), red = { izvor: "rucno", status: "potvrdjena" };
  for (const [k, v] of Object.entries(f)) red[k] = v.trim() === "" ? null : v.trim();
  if (red.vrsta === "e") { red.kolicina = red.stampa = red.koverta = red.dodaci = null; }
  red.kolicina = red.kolicina ? parseInt(red.kolicina) : null;
  red.ukupno = red.ukupno ? parseInt(red.ukupno) : null;
  if (demo) sve.unshift({ ...red, id: "d" + Date.now(), napravljena: new Date().toISOString() });
  else {
    const { data, error } = await sb.from("narudzbine").insert(red).select().single();
    if (error) return toast("Nije sačuvano: " + error.message);
    sve.unshift(data);
  }
  dlg.close(); vrsta = red.vrsta; filt = "aktivne";
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x.dataset.v === vrsta));
  crtaj(); toast("Porudžbina je dodata.");
});

/* ---------------- izvoz (CSV koji Excel otvara sa ćirilicom/latinicom kako treba) ---------------- */
// Tekst kupca koji počinje sa = + - @ Excel bi izvršio kao formulu; dodajemo ' ispred (osim za brojeve telefona).
const celija = v => { let t = String(v); if (/^[=+\-@\t\r]/.test(t) && !/^\+[\d\s\/-]+$/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
$("izvoz").onclick = () => {
  const K = [["broj", "Br."], ["napravljena", "Poručeno"], ["status", "Status"], ["ime", "Ime"], ["telefon", "Telefon"], ["email", "E-mail"], ["datum_dogadjaja", "Datum događaja"],
    ["sablon", "Šablon"], ["kolicina", "Količina"], ["stampa", "Papir i štampa"], ["folija", "Foliotisak"], ["koverta", "Koverta"], ["dodaci", "Dodaci"],
    ["ukupno", "Ukupno (din)"], ["napomena", "Napomena"], ["beleska", "Beleška"], ["dizajn", "Dizajn"]];
  const cel = (o, k) => k === "status" ? sn(o.vrsta, o.status) : k === "napravljena" ? datum(o[k]) : k === "datum_dogadjaja" ? (o[k] ? datum(o[k]) : "") : o[k] ?? "";
  const csv = [K.map(k => k[1]), ...vidljive().map(o => K.map(([k]) => cel(o, k)))]
    .map(r => r.map(celija).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `mango-${vrsta === "e" ? "elektronske" : "stampane"}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/* ---------------- primer (samo dok baza nije povezana) ---------------- */
function primer() {
  const t = (dana, sati = 0) => new Date(Date.now() - dana * 864e5 - sati * 36e5).toISOString();
  const za = dana => new Date(Date.now() + dana * 864e5).toISOString().slice(0, 10);
  const P = (id, o) => ({ id: "p" + id, izvor: "editor", kanal: "whatsapp", email: null, napomena: null, beleska: null, folija: null, dodaci: null, poruka: null, dizajn: "editor.html", ...o });
  return [
    P(1, { vrsta: "stampa", status: "nova", napravljena: t(0, 2), ime: "Primer: Ana Petrović", telefon: "064 123 4567", email: "ana@primer.rs", datum_dogadjaja: za(48), sablon: "Boarding roza · Venčanje", kolicina: 80, stampa: "Pasoš: 350g papir, mat štampa + foliotisak", folija: "Rose gold", koverta: "bez koverte (pasoš)", dodaci: "Akrilni avion", ukupno: 27400, napomena: "Može li roza malo tamnija?", poruka: "Zdravo! Napravio/la sam pozivnicu u vašem editoru.\n(primer poruke)" }),
    P(2, { vrsta: "stampa", status: "avans", napravljena: t(3), kanal: "viber", ime: "Primer: Jovana i Nemanja", telefon: "063 555 0101", datum_dogadjaja: za(16), sablon: "Eukaliptus", kolicina: 120, stampa: "350g papir, mat štampa + foliotisak", folija: "Zlatna: Jovana & Nemanja", koverta: "Koverta C6, krem", dodaci: "Voštani pečat (zlatni, J&N)", ukupno: 41800, beleska: "Avans 10.000 din uplaćen." }),
    P(3, { vrsta: "stampa", status: "izrada", napravljena: t(6), kanal: "instagram", ime: "Primer: Milica Jović", telefon: "065 777 8899", datum_dogadjaja: za(9), sablon: "Magična duga (rođendan)", kolicina: 30, stampa: "Hrapavi papir, digitalna štampa", koverta: "bez koverte", ukupno: 6900 }),
    P(4, { vrsta: "stampa", status: "poslato", napravljena: t(15), ime: "Primer: Stefan Ilić", telefon: "062 444 3322", datum_dogadjaja: za(2), sablon: "Muzički 18. rođendan", kolicina: 50, stampa: "350g papir, digitalna štampa", koverta: "Koverta C6, bela", ukupno: 9800, izvor: "rucno" }),
    P(5, { vrsta: "e", status: "nova", napravljena: t(0, 5), ime: "Primer: Teodora Marić", telefon: "061 222 1100", email: "teodora@primer.rs", datum_dogadjaja: za(30), sablon: "Save the date sa fotografijom", ukupno: 2000 }),
    P(6, { vrsta: "e", status: "poslato", napravljena: t(8), kanal: "instagram", ime: "Primer: Luka Savić", email: "luka@primer.rs", datum_dogadjaja: za(12), sablon: "Džungla sa fotografijom", ukupno: 2000 }),
  ];
}

init();
