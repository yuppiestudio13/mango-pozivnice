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
const KANAL = { whatsapp: "WhatsApp", viber: "Viber", instagram: "Instagram", copy: "kopirana poruka", telefon: "telefon", licno: "lično" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const din = n => n == null ? "—" : Math.round(n).toLocaleString("sr-RS") + " din";
const datum = d => d ? new Date(d.length === 10 ? d + "T12:00" : d).toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "numeric", year: "numeric" }) : "—";
const danaDo = d => d ? Math.round((new Date(d + "T12:00") - new Date()) / 864e5) : null;
const pre = t => { const m = Math.round((Date.now() - new Date(t)) / 6e4); return m < 60 ? `pre ${Math.max(m, 1)} min` : m < 1440 ? `pre ${Math.round(m / 60)} h` : m < 2880 ? "juče" : datum(t); };
const broj = t => { let d = String(t || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "381" + d.slice(1); return d; };
const sigurno = u => /^(https?:\/\/|editor\.html)/i.test(u || "") ? u : null;

let sb = null, demo = false, sve = [], vrsta = "stampa", filt = "aktivne", otvorena = null;
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2800); }

/* ---------------- start i prijava ---------------- */
(async function init() {
  if (!BAZA.spremna()) { demo = true; sve = primer(); $("demo").hidden = false; return pokazi(); }
  await new Promise((ok, err) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"; s.onload = ok; s.onerror = err; document.head.append(s); })
    .catch(() => { document.body.insertAdjacentHTML("beforeend", "<p class='empty'>Nije moguće učitati vezu sa bazom. Proverite internet.</p>"); });
  sb = supabase.createClient(BAZA.url, BAZA.kljuc, { auth: { persistSession: true } });
  const { data } = await sb.auth.getSession();
  if (data.session) pokazi(); else prijava();
})();

function prijava() {
  $("app").hidden = true; $("odjava").hidden = true; $("prijava").hidden = false; $("lEmail").focus();
  $("loginForm").onsubmit = async e => {
    e.preventDefault(); $("lErr").hidden = true;
    const { error } = await sb.auth.signInWithPassword({ email: $("lEmail").value.trim(), password: $("lPass").value });
    if (error) { $("lErr").hidden = false; return; }
    $("lPass").value = ""; pokazi();
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
  if (q) L = L.filter(o => [o.ime, o.telefon, o.email, o.sablon, o.napomena, o.beleska].some(x => (x || "").toLowerCase().includes(q)));
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
  $("chips").innerHTML = [["aktivne", "Aktivne"], ...STATUSI, ["sve", "Sve"]]
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
    <div class="o-l"><div class="o-ime">${esc(o.ime) || "<i>bez imena</i>"}</div><div class="o-meta">${dog} · poručeno ${pre(o.napravljena)}</div></div>
    <div class="o-cena">${din(o.ukupno)}</div>
    <div class="o-meta o-m">${opis.join(" · ") || "—"}</div>
    <span class="pill ${o.status}">${SN[o.status]}</span>
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
    ["Poručeno", `${datum(o.napravljena)} ${new Date(o.napravljena).toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit" })}${o.kanal ? " · " + (KANAL[o.kanal] || o.kanal) : ""}${o.izvor === "rucno" ? " · uneto ručno" : ""}`],
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
      <label>Status<select data-a="status">${STATUSI.map(([k, t]) => `<option value="${k}"${k === o.status ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>Interna beleška<textarea data-a="beleska" rows="3" placeholder="Npr. avans 5.000 din uplaćen 10.11.">${esc(o.beleska)}</textarea></label>
    </div>
    ${o.poruka ? `<details class="msg full"><summary>Cela poruka kupca</summary><pre>${esc(o.poruka)}</pre></details>` : ""}
    <div class="o-acts full">
      ${diz ? `<a class="ab solid" href="${esc(diz)}" target="_blank" rel="noopener">Otvori dizajn</a>` : ""}
      ${o.poruka ? `<button class="ab ghost" data-a="kopiraj">Kopiraj poruku</button>` : ""}
      <button class="ab danger" data-a="obrisi">Obriši</button>
    </div>
  </div>`;
}

/* ---------------- izmene ---------------- */
async function izmeni(o, polja) {
  if (!demo) {
    const { error } = await sb.from("narudzbine").update(polja).eq("id", o.id);
    if (error) { toast("Nije sačuvano: " + error.message); return false; }
  }
  Object.assign(o, polja); return true;
}
$("list").addEventListener("click", async e => {
  const el = e.target.closest("[data-a]"), li = e.target.closest("li.o"); if (!el || !li) return;
  const o = sve.find(x => String(x.id) === li.dataset.id);
  if (el.dataset.a === "toggle") { otvorena = otvorena === o.id ? null : o.id; crtaj(); return; }
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
  if (el.dataset.a === "status" && await izmeni(o, { status: el.value })) { crtaj(); toast(`Status: ${SN[el.value]}.`); }
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
$("izvoz").onclick = () => {
  const K = [["napravljena", "Poručeno"], ["status", "Status"], ["ime", "Ime"], ["telefon", "Telefon"], ["email", "E-mail"], ["datum_dogadjaja", "Datum događaja"],
    ["sablon", "Šablon"], ["kolicina", "Količina"], ["stampa", "Papir i štampa"], ["folija", "Foliotisak"], ["koverta", "Koverta"], ["dodaci", "Dodaci"],
    ["ukupno", "Ukupno (din)"], ["napomena", "Napomena"], ["beleska", "Beleška"], ["dizajn", "Dizajn"]];
  const cel = (o, k) => k === "status" ? SN[o.status] : k === "napravljena" ? datum(o[k]) : k === "datum_dogadjaja" ? (o[k] ? datum(o[k]) : "") : o[k] ?? "";
  const csv = [K.map(k => k[1]), ...vidljive().map(o => K.map(([k]) => cel(o, k)))]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
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
