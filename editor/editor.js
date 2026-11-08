/* =========================================================
   MANGO EDITOR POZIVNICA
   Dizajn (pozadina) je zaključan. Kupac menja samo tekst:
   sadržaj, font, veličinu, boju, poravnanje i položaj.
   ========================================================= */
const CONFIG = {
  phone: "381600000000",       // Viber/WhatsApp broj (bez + i nule), isti kao u kalkulatoru
  instagram: "mango.pozivnice",
};

const PT = 3.5278;              // 1 pt u jedinicama šablona (0,1 mm)
const $ = id => document.getElementById(id);
const stage = $("stage"), layersEl = $("layers"), frame = $("frame"), box = $("box");
const CATS = { mango: "Mango originali", kaligrafija: "Kaligrafija", rukopis: "Rukopis", serif: "Serif", sans: "Moderni", ukrasni: "Ukrasni", masina: "Boarding / mašina", deciji: "Dečiji" };
const FONT = Object.fromEntries(FONTOVI.map(([n, c, cy, w, i, own]) => [n, { n, c, cy, own: !!own, w: w.split(",").map(Number), i: i ? i.split(",").map(Number) : [] }]));

let T = null;             // aktivni šablon
let pages = [];           // tekstovi za svaku stranu šablona
let pi = 0;               // strana koja je otvorena
let layers = [];          // tekstovi otvorene strane (= pages[pi])
let foil = null;          // izabrana folija (rose, gold…) ili null kad šablon nema foliotisak
let fmt = null;           // format (npr. "125x165") za šablon sa formati: true, ili null
let vrsta = null;         // vrsta pozivnice (rodjendan, vencanje…) ili null kad šablon nema vrste
let wmDark = false;       // true = pozadina je tamna, pa je vodeni žig svetao
let sat = [];             // satnica za svaku stranu: niz ključeva ikonica (sabloni/ikonice.js) ili null
let tint = null;          // boja pozadine (#rrggbb) ili null kad šablon nema izbor boje
let pins = [];            // pribadača na mapi za svaku stranu: { x, y, k: grad za koji je postavljena } ili null
let sel = null;           // id izabranog
let editing = null;       // id teksta koji se kuca
let S = 1;                // razmera prikaza
let hist = [], hi = -1;
let uid = 1;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/* ---------------- fontovi ---------------- */
const loadedFonts = new Set();
function fontUrl(name) {
  const f = FONT[name], fam = name.replace(/ /g, "+");
  if (!f) return `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
  let spec = "";
  if (f.i.length) spec = ":ital,wght@" + [...f.w.map(w => "0," + w), ...f.i.map(w => "1," + w)].join(";");
  else if (f.w.length > 1 || f.w[0] !== 400) spec = ":wght@" + f.w.join(";");
  return `https://fonts.googleapis.com/css2?family=${fam}${spec}&display=swap`;
}
function ensureFont(name) {
  if (loadedFonts.has(name)) return;
  loadedFonts.add(name);
  if (FONT[name]?.own) return;   // naši fontovi su već opisani u fontovi/fontovi.css (preuzimaju se tek kad zatrebaju)
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = fontUrl(name);
  document.head.appendChild(l);
}
function nearestWeight(name, w, italic) {
  const f = FONT[name]; if (!f) return w;
  const list = italic && f.i.length ? f.i : f.w;
  return list.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a, list[0]);
}

/* ---------------- šablon i tekstovi ---------------- */
const PG = () => T.strane[pi];
const cm = v => String(v / 10).replace(".", ",");   // 125 mm → „12,5“
function W() { return PG().mm[0] * 10; }
function H() { return PG().mm[1] * 10; }
const dims = t => t.formati && !fmtLive(t) ? fmtList(t).map(k => FORMATI[k].naziv.replace(" cm", "")).join(" ili ") + " cm" : t.strane.length > 1
  ? [...new Set(t.strane.map(s => `${s.mm[0] / 10} × ${s.mm[1] / 10}`))].join(" + ") + " cm"
  : `${t.mm[0] / 10} × ${t.mm[1] / 10} cm`;
// Svaki tekst prolazi kroz proveru (i onaj iz linka), da u dizajn ne može da uđe ništa osim ispravnih vrednosti.
// Aktivni šablon u izabranom formatu ima T.mm = format; u listi šablona (original) pišu oba formata.
const fmtLive = t => t === T && !!fmt;
function norm(L) {
  const n = (v, d, lo, hi) => Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d;
  return {
    id: L.id || "L" + uid++,
    text: String(L.text ?? "").slice(0, 2000),
    x: n(L.x, 100, -5000, 5000), y: n(L.y, 100, -5000, 5000), w: n(L.w, 600, 40, 5000),
    font: FONT[L.font] ? L.font : "Cormorant Garamond",
    weight: n(L.weight, 400, 100, 900), italic: !!L.italic, upper: !!L.upper,
    size: n(L.size, 14, 3, 200), ls: n(L.ls, 0, -200, 1500), lh: n(L.lh, 1.2, 0.5, 4),
    color: /^#[0-9a-f]{6}$/i.test(L.color) ? L.color.toLowerCase() : "#1c3627",
    align: ["left", "center", "right"].includes(L.align) ? L.align : "center",
    uloga: ["grad", "drzava", "tl"].includes(L.uloga) ? L.uloga : undefined,
    ...(+L.luk ? { luk: Math.round(n(L.luk, 0, -100, 100)) } : {}),   // savijen tekst: -100 (osmeh) … 100 (luk, pola kruga)
    ...(L.fo ? { fo: true } : {}),          // tekst ide u foliotisak (kad kupac izabere štampu sa folijom)
    ...(L.uloga === "tl" ? { k: n(L.k, 0, 0, 9) | 0, deo: L.deo === "o" ? "o" : "v" } : {}),
  };
}
function fromTemplate(t) { return t.strane.map(defaultPage); }
// Podrazumevani tekstovi strane; strana sa satnicom dobija i vreme + opis za svaki korak.
function defaultPage(s) {
  const P = s.polja.map(p => norm({ ...p, id: undefined })), S = s.satnica;
  return S ? P.concat(S.koraci.flatMap((K, k, A) => [tlLayer(S, A.length, k, "v", K.vreme), tlLayer(S, A.length, k, "o", K.opis)])) : P;
}

// Sačuvan dizajn: { p: [tekstovi po stranama], f: folija }. Stari oblik: { layers } ili samo niz tekstova.
// Šablon sa vrstama (rođendan, venčanje…): vrsta menja polja i foliju pojedinih strana. T.base = izvorni šablon.
// Formati koje kupac bira (dimenzije u mm) i koverta uz njih.
const FORMATI = { "125x165": { mm: [125, 165], naziv: "12,5 × 16,5 cm" }, "150x150": { mm: [150, 150], naziv: "15 × 15 cm" },
  "165x125": { mm: [165, 125], naziv: "16,5 × 12,5 cm" } };
// Podrazumevani format = onaj čiji odnos strana je najbliži originalu.
const fmtList = t => Array.isArray(t.formati) ? t.formati.filter(k => FORMATI[k]) : Object.keys(FORMATI);
const fmtOf = t => fmtList(t).reduce((a, k) => { const r = m => Math.abs(Math.log((m[0] / m[1]) / (t.strane[0].mm[0] / t.strane[0].mm[1]))); return r(FORMATI[k].mm) < r(FORMATI[a].mm) ? k : a; }, fmtList(t)[0]);
// Uklapanje originala (b, mm) u format (f, mm): ceo dizajn stane, bez sečenja; razmera s i pomak (0,1 mm).
function fitOf(b, f) { const s = Math.min(f[0] / b[0], f[1] / b[1]); return { s, ox: (f[0] - b[0] * s) * 5, oy: (f[1] - b[1] * s) * 5, b }; }
const fitL = (L, F) => ({ ...L, x: Math.round(L.x * F.s + F.ox), y: Math.round(L.y * F.s + F.oy), w: Math.round(L.w * F.s), size: Math.round(L.size * F.s * 2) / 2 });
const unfitL = (L, F) => ({ ...L, x: (L.x - F.ox) / F.s, y: (L.y - F.oy) / F.s, w: L.w / F.s, size: L.size / F.s });
// Strane iste veličine kao prva (prednja i zadnja) prate format; ostale (npr. mala kartica) ostaju kakve jesu.
function withFormat(t, f) {
  if (!t.formati || !FORMATI[f]) return t;
  const b = t.strane[0].mm, mm = FORMATI[f].mm;
  const strane = t.strane.map(s => {
    if (s.mm[0] !== b[0] || s.mm[1] !== b[1]) return s;
    const F = fitOf(s.mm, mm);
    return { ...s, mm, fit: F, polja: s.polja.map(L => fitL(L, F)), ...(s.foto ? { foto: fitFoto(s.foto, F) } : {}) };
  });
  return { ...t, strane, mm };
}
const derive = t => withFormat(withVrsta(t, vrsta), fmt);
function withVrsta(t, v) {
  if (!t.vrste) return t;
  const V = t.vrste.find(x => x.id === v) || t.vrste[0];
  return { ...t, base: t, strane: t.strane.map(s => V.strane?.[s.id] ? { ...s, ...V.strane[s.id] } : s) };
}
const baseOf = () => T.base || T;
function loadTemplate(t, preset) {
  stopEdit(true);
  sel = null;
  const d = preset || store.get("mango-ed:" + t.id) || {};
  vrsta = t.vrste ? (t.vrste.some(v => v.id === d.v) ? d.v : t.vrste[0].id) : null;
  fmt = t.formati ? (fmtList(t).includes(d.fo) ? d.fo : fmtOf(t)) : null;
  T = { ...derive(t), base: t };
  const P = Array.isArray(d) ? [d] : d.p || (d.layers ? [d.layers] : null);
  // Strana sa satnicom iz nacrta koji satnicu nije imao dobija nov raspored iz šablona.
  const fresh = (s, i) => !Array.isArray(P?.[i]) || (s.satnica && !Array.isArray(d.s?.[i]));
  pages = T.strane.map((s, i) => fresh(s, i) ? defaultPage(s) : P[i].map(L => norm({ ...L, id: undefined })));
  // Nacrt sačuvan u formatu koji šablon više ne nudi: tekstovi se prenose u sadašnji format.
  if (P && d.fo && d.fo !== fmt && FORMATI[d.fo]) {
    const O = withFormat(t, d.fo);
    pages = pages.map((Pg, i) => { const A = O.strane[i]?.fit, B = T.strane[i].fit; return A && B && !fresh(T.strane[i], i) ? Pg.map(L => norm({ ...fitL(unfitL(L, A), B), id: L.id })) : Pg; });
  }
  sat = T.strane.map((s, i) => validSat(s, fresh(s, i) ? null : d.s?.[i]));
  pr = validPr(t, d.pr); fixKov();
  foil = t.folija ? (FOLIJE[d.f] && t.folija.boje.includes(d.f) ? d.f : t.folija.izabrana) : pr.st === "fol" ? pr.fb : null;
  tint = t.boja ? validTint(t, d.b) : null;
  // Nacrt iz vremena zamenskih fontova: polje koje odgovara polju iz šablona dobija font, veličinu i mesto iz šablona
  // (tekst kupca ostaje), ostala samo novi font u srazmernoj veličini. fz = nacrt je već prebačen.
  const Z = t.zameneFontova;
  if (Z && P && !d.fz) pages = pages.map((Pg, i) => {
    const def = T.strane[i].polja;
    return Pg.map((L, k) => {
      if (!Z[L.font]) return L;
      const D = Pg.length === def.length && Z[L.font][0] === def[k].font ? def[k] : null;
      return norm(D ? { ...L, font: D.font, weight: D.weight, size: D.size, lh: D.lh, ls: D.ls, x: D.x, y: D.y, w: D.w }
        : { ...L, font: Z[L.font][0], size: +(L.size * Z[L.font][1]).toFixed(1), weight: L.weight >= 600 ? 700 : L.weight });
    });
  });
  // Nacrt sačuvan pre nego što su polja dobila ulogu: „Grad:…“ je grad, „Država:…“ je država.
  T.strane.forEach((s, i) => {
    if (!s.mapa) return;
    for (const [u, re] of [["grad", /^\s*grad\s*:/i], ["drzava", /^\s*dr[žz]ava\s*:/i]]) {
      if (pages[i].some(L => L.uloga === u)) continue;
      const L = pages[i].find(L => !L.uloga && re.test(L.text)); if (L) L.uloga = u;
    }
  });
  pins = T.strane.map((s, i) => s.mapa ? validPin(s.mapa, d.m?.[i]) : null);
  fot = T.strane.map((s, i) => fotoValid(s, d.ph?.[i])); fotoFromLink = !!preset; fotoOn = false; fj = 0;
  fotoSrc = []; fotoImg = []; if (fotoAny()) fotoLoadSaved();
  T.strane.forEach((s, i) => { if (s.mapa) autoPin(i, true); });
  pi = 0; layers = pages[0];
  hist = [snap()]; hi = 0;
  document.querySelectorAll(".tpl").forEach(el => el.setAttribute("aria-current", el.dataset.id === t.id));
  // prvi put: kategorija otvorenog šablona; kasnije ostaje kategorija koju je kupac izabrao
  if (!tplKat) setTplKat(store.get("mango-ed-kat") || (t.grupe || []).find(g => TPL_KAT.some(c => c[0] === g)) || "sve");
  try { const u = new URL(location); u.searchParams.set("s", t.id); history.replaceState(null, "", u.pathname + u.search); } catch {}
  renderPageTabs(); renderFmt(); renderVrsta(); renderFoil(); renderTint(); showPage(0); updateTools();
}

function showPage(i) {
  stopEdit(true);
  pages[pi] = layers; pi = i; layers = pages[pi]; sel = null;
  const p = PG();
  stage.style.width = W() + "px"; stage.style.height = H() + "px";
  setBg(p);
  const fa = $("foilart");
  fa.hidden = !p.folija;
  fa.dataset.src = p.folija || "";
  if (p.folija) fa.style.webkitMaskImage = fa.style.maskImage = `url("${p.folija}")`;
  const b = p.bezbedno || 0;
  Object.assign($("safe").style, { left: b + "px", top: b + "px", right: b + "px", bottom: b + "px" });
  $("gv").style.left = W() / 2 + "px"; $("gh").style.top = H() / 2 + "px";
  $("pages").querySelectorAll("button").forEach((x, k) => x.setAttribute("aria-selected", k === pi));
  renderRoute(); renderFoto(); renderAll(); fit(); syncProps();
}

/* ---------------- mapa: pribadača ide na upisani grad ---------------- */
const CYR = { а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ж: "ž", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "ć", у: "u", ф: "f", х: "h", ц: "c", ч: "č", џ: "dž", ш: "š" };
// „Niš“, „nis“, „НИШ“ i „Đakovica“/„Djakovica“/„Dakovica“ daju isti ključ.
const fold = s => s.toLowerCase().replace(/[а-џ]/g, c => CYR[c] ?? c).replace(/đ/g, "d").normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/dj/g, "d").replace(/[^a-z]+/g, " ").trim();
// Mesta po državama i nazivi država (sabloni/mesta.js). „Beč|Wien“ = više naziva za isto mesto.
const MESTO = Object.fromEntries(Object.entries(window.MESTA || {}).map(([k, list]) => [k, new Map(list.flatMap(([n, la, lo]) => {
  const names = n.split("|"); return names.map(x => [fold(x), { n: names[0], la, lo }]);
}))]));
const GLAVNI = Object.fromEntries(Object.entries(window.MESTA || {}).map(([k, list]) => [k, { n: list[0][0].split("|")[0], la: list[0][1], lo: list[0][2] }]));
const DRZAVA = new Map(Object.entries(window.DRZAVE || {}).flatMap(([k, names]) => names.map(n => [fold(n), k])));
const DRZ_NAZIV = k => (window.DRZAVE?.[k] || [k])[0];
// Polje je „Grad:\nNiš“: preskačemo red koji je samo oznaka (završava se dvotačkom).
const valueOf = L => L.text.split("\n").map(s => s.trim()).filter(s => s && !s.endsWith(":")).join(" ").replace(/^(grad|dr[žz]ava)\s*:\s*/i, "");
const merc = f => Math.log(Math.tan(Math.PI / 4 + f * Math.PI / 360));
function geoXY(D, la, lo) {
  const [x0, y0, x1, y1] = D.okvir, [w, e, n, s] = D.geo;
  return [x0 + (lo - w) / (e - w) * (x1 - x0), y0 + (merc(n) - merc(la)) / (merc(n) - merc(s)) * (y1 - y0)];
}
const r1 = v => Math.round(v * 10) / 10;
function validPin(m, v) {
  if (!v || !Number.isFinite(+v.x) || !Number.isFinite(+v.y)) return null;
  const d = m.drzave[v.d] ? v.d : "", [x0, y0, x1, y1] = d ? m.drzave[d].okvir : [-1e4, -1e4, 1e4, 1e4];
  return { x: r1(Math.min(x1, Math.max(x0, +v.x))), y: r1(Math.min(y1, Math.max(y0, +v.y))), k: String(v.k ?? "").slice(0, 80), d };
}
// Država iz polja sa uloga „drzava“: ključ iz DRZAVE, "" kad mape za nju nema (mapa se sklanja).
function countryOf(i) {
  const m = T.strane[i].mapa, L = pages[i].find(x => x.uloga === "drzava");
  const name = L ? valueOf(L) : "";
  if (!fold(name)) return { k: m.podrazumevana, name };
  const k = DRZAVA.get(fold(name));
  return { k: k && m.drzave[k] ? k : "", name };
}
let sayT; const say = t => { clearTimeout(sayT); sayT = setTimeout(() => toast(t), 900); };
// Pomera pribadaču samo kad se grad ili država promene, da ne pregazi ručno pomerenu pribadaču.
function autoPin(i, quiet) {
  const m = T.strane[i].mapa; if (!m) return;
  const L = pages[i].find(x => x.uloga === "grad"), name = L ? valueOf(L) : "", key = fold(name), cur = pins[i];
  const c = countryOf(i);
  if (cur && cur.k === key && cur.d === c.k) return;
  const newCountry = !cur || cur.d !== c.k;
  const place = (p, d) => { const [x, y] = geoXY(m.drzave[d], p.la, p.lo); pins[i] = { x: r1(x), y: r1(y), k: key, d }; };
  if (!c.k) {
    pins[i] = { x: cur?.x ?? 0, y: cur?.y ?? 0, k: key, d: "" };
    if (!quiet && newCountry) say(`Za državu „${c.name}“ još nemamo mapu, pa je mapa sklonjena sa karte.`);
  } else {
    const hit = MESTO[c.k]?.get(key);
    if (hit) { place(hit, c.k); if (!quiet) say(`Pribadača na mapi: ${hit.n}${c.k !== m.podrazumevana ? ", " + DRZ_NAZIV(c.k) : ""}`); }
    else if (!newCountry) { pins[i] = { ...cur, k: key }; if (!quiet && key) say(`„${name}“ nije na našoj listi mesta. Prevucite pribadaču na mapi na pravo mesto.`); }
    else {
      place(GLAVNI[c.k], c.k);
      if (!quiet) say(key ? `„${name}“ nije na listi mesta za ${DRZ_NAZIV(c.k)}. Pribadača je na glavnom gradu (${GLAVNI[c.k].n}), prevucite je na pravo mesto.` : `Mapa: ${DRZ_NAZIV(c.k)}`);
    }
  }
  if (!quiet && i === pi) renderRoute();
}
// Isprekidana linija od ulaska u mapu do pribadače + pribadača; crno = folija.
function routeSVG(i) {
  const s = T.strane[i], m = s.mapa, P = pins[i]; if (!m || !P || !P.d) return null;
  const w = s.mm[0] * 10, h = s.mm[1] * 10, [sx, sy] = m.pocetak, [tx, ty] = m.smer;
  const d = Math.hypot(P.x - sx, P.y - sy), k1 = d * 0.4, k2 = d * 0.27;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<path d="M${sx} ${sy}C${r1(sx + tx * k1)} ${r1(sy + ty * k1)} ${r1(P.x - k2)} ${P.y} ${P.x} ${P.y}" fill="none" stroke="#000" stroke-width="${m.linija}" stroke-dasharray="${m.crtica.join(" ")}" stroke-linecap="round"/>` +
    `<path transform="translate(${P.x} ${P.y}) scale(${m.pinMera})" d="${m.pin}" fill="#000" fill-rule="evenodd"/></svg>`;
}
const mapOf = i => { const m = T.strane[i].mapa, d = pins[i]?.d; return m && d ? m.drzave[d].crtez : null; };
const svgUrl = svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
function renderRoute() {
  renderTl();
  const svg = routeSVG(pi), map = mapOf(pi), el = $("routeart"), h = $("pinH"), ma = $("mapart");
  ma.hidden = !map;
  if (map) ma.style.webkitMaskImage = ma.style.maskImage = `url("${map}")`;
  el.hidden = h.hidden = !svg;
  if (!svg) return;
  el.style.webkitMaskImage = el.style.maskImage = `url("${svgUrl(svg)}")`;
  h.style.left = pins[pi].x + "px"; h.style.top = pins[pi].y + "px";
}
function renderPageTabs() {
  const el = $("pages");
  el.hidden = T.strane.length < 2;
  el.replaceChildren(...T.strane.map((s, k) => {
    const b = document.createElement("button");
    b.setAttribute("role", "tab");
    b.innerHTML = `<span>${k + 1}</span><b></b><small>${cm(s.mm[0])} × ${cm(s.mm[1])} cm</small>`;
    b.querySelector("b").textContent = s.naziv;
    b.onclick = () => { if (k !== pi) showPage(k); };
    return b;
  }));
}

/* ---------------- satnica (poleđina) ---------------- */
const IK = window.IKONICE || {};
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function validSat(s, v) {
  const S = s.satnica; if (!S) return null;
  return Array.isArray(v) ? v.filter(k => IK[k]).slice(0, S.max) : S.koraci.map(K => K.ikona);
}
// Korak k od n: sredina c i širina kolone s.
// Tekst je malo širi od kolone (centriran je, pa se susedi ne dodiruju), da se duži opis ne lomi kod 5 koraka.
function tlPos(S, n, k) { const s = (S.x1 - S.x0) / n, c = S.x0 + (k + .5) * s; return { c, s, x: Math.round(c - (s + 30) / 2), w: Math.round(s + 30) }; }
function tlLayer(S, n, k, deo, text) {
  const { x, w } = tlPos(S, n, k);
  return norm({ ...(deo === "v" ? S.vreme : S.opis), uloga: "tl", k, deo, text, x, w });
}
// Linija, tačke i ikonice; crno = folija.
function tlSVG(i) {
  const st = T.strane[i], S = st.satnica, A = sat[i]; if (!S || !A) return null;
  const w = st.mm[0] * 10, h = st.mm[1] * 10, [lx0, lx1, ly] = S.linija;
  let g = `<path d="M${lx0} ${ly}H${lx1}" stroke="#000" stroke-width="${S.debljina}" fill="none"/>`;
  A.forEach((key, k) => {
    const { c, s } = tlPos(S, A.length, k), I = IK[key];
    g += `<circle cx="${r1(c)}" cy="${ly}" r="${S.tacka}"/>`;
    const [vx, vy, vw, vh] = I.vb, maxW = Math.min(S.maxW, s - 30);
    const m = Math.min(I.mera, maxW / vw);
    g += `<g transform="translate(${r1(c - (vx + vw / 2) * m)} ${r1(S.dno - (vy + vh) * m)}) scale(${+m.toFixed(4)})">${I.svg}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${g}</svg>`;
}
const icoSVG = key => { const I = IK[key]; return `<svg viewBox="${I.vb.join(" ")}" aria-hidden="true">${I.svg.replace(/#000/g, "currentColor")}</svg>`; };
let satPick = null;   // korak kome se bira ikonica
function renderTl() {
  const svg = tlSVG(pi), el = $("tlart");
  el.hidden = !svg;
  if (svg) el.style.webkitMaskImage = el.style.maskImage = `url("${svgUrl(svg)}")`;
  renderSat();
}
function renderSat() {
  const S = PG().satnica, A = sat[pi];
  $("satBox").hidden = !S || !A;
  if (!S || !A) return;
  const txt = k => layers.find(L => L.uloga === "tl" && L.k === k && L.deo === "v")?.text || "";
  $("oSat").textContent = `${A.length} od ${S.max}`;
  $("satList").innerHTML = A.map((key, k) => `<div class="sat-row" data-k="${k}">
      <button class="sat-ic" data-a="pick" title="Promenite ikonicu" aria-label="Ikonica: ${esc(IK[key].naziv)}" aria-expanded="${satPick === k}">${icoSVG(key)}</button>
      <span class="sat-t">${esc(txt(k)) || "&nbsp;"}<small>${esc(IK[key].naziv)}</small></span>
      <button class="sat-b" data-a="up" aria-label="Pomeri levo" title="Pomeri levo"${k ? "" : " disabled"}>‹</button>
      <button class="sat-b" data-a="down" aria-label="Pomeri desno" title="Pomeri desno"${k < A.length - 1 ? "" : " disabled"}>›</button>
      <button class="sat-b" data-a="del" aria-label="Obriši korak" title="Obriši korak"${A.length > 1 ? "" : " disabled"}>×</button>
    </div>` + (satPick === k ? `<div class="sat-grid" data-k="${k}">${Object.keys(IK).map(n => `<button data-a="set" data-i="${n}" aria-pressed="${n === key}">${icoSVG(n)}<span>${esc(IK[n].naziv)}</span></button>`).join("")}</div>` : "")).join("");
  $("satAdd").disabled = A.length >= S.max;
}
// Posle dodavanja/brisanja/pomeranja: vreme i opis svakog koraka idu ispod njegove tačke.
function tlRelayout() {
  const S = PG().satnica, n = sat[pi].length;
  for (const L of layers) if (L.uloga === "tl") {
    const { x, w } = tlPos(S, n, L.k);
    L.x = x; L.w = w; L.y = (L.deo === "v" ? S.vreme : S.opis).y;
  }
  pages[pi] = layers;
  if (!get(sel)) sel = null;
  renderAll(); renderTl(); syncProps(); commit();
}
$("satList").addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  stopEdit(true);
  const k = +b.closest("[data-k]").dataset.k, A = sat[pi];
  if (b.dataset.a === "pick") { satPick = satPick === k ? null : k; renderSat(); return; }
  if (b.dataset.a === "set") { A[k] = b.dataset.i; satPick = null; renderTl(); commit(); return; }
  satPick = null;
  if (b.dataset.a === "del") {
    A.splice(k, 1);
    layers = layers.filter(L => !(L.uloga === "tl" && L.k === k));
    for (const L of layers) if (L.uloga === "tl" && L.k > k) L.k--;
  } else {
    const j = b.dataset.a === "up" ? k - 1 : k + 1;
    [A[k], A[j]] = [A[j], A[k]];
    for (const L of layers) if (L.uloga === "tl") L.k = L.k === k ? j : L.k === j ? k : L.k;
  }
  tlRelayout();
});
$("satAdd").onclick = () => {
  const S = PG().satnica, A = sat[pi]; if (!S || A.length >= S.max) return;
  stopEdit(true);
  A.push("torta"); satPick = A.length - 1;
  layers.push(tlLayer(S, A.length, A.length - 1, "v", "00:00"), tlLayer(S, A.length, A.length - 1, "o", "OPIS"));
  tlRelayout();
  toast("Dodat je korak. Izaberite ikonicu, pa kliknite na tekst na poleđini da upišete vreme i opis.");
};

/* ---------------- format ---------------- */
function renderFmt() {
  const L = baseOf().formati ? fmtList(baseOf()) : [], on = L.length > 1;
  $("fmtBox").hidden = !on;
  if (on) $("fmtSeg").innerHTML = L.map(k => [k, FORMATI[k]]).map(([k, f]) => `<button data-f="${k}" aria-pressed="${k === fmt}">${f.naziv}</button>`).join("");
}
// Tekstovi se prenose u novi format istom razmerom kao dizajn (ono što je kupac upisao ostaje).
$("fmtSeg").addEventListener("click", e => {
  const b = e.target.closest("[data-f]"); if (!b || b.dataset.f === fmt) return;
  stopEdit(true); pages[pi] = layers;
  const old = T.strane.map(s => s.fit);
  fmt = b.dataset.f; T = { ...derive(baseOf()), base: baseOf() };
  pages = pages.map((P, i) => { const A = old[i], B = T.strane[i].fit; return A && B ? P.map(L => norm({ ...fitL(unfitL(L, A), B), id: L.id })) : P; });
  layers = pages[pi];
  if (pr.kov) pr.kov = null;      // koverta prelazi na onu koja ide uz novi format
  fixKov(); renderFmt(); showPage(pi); commit();
  toast(`Format: ${FORMATI[fmt].naziv}. Dizajn je prilagođen novom formatu.`);
});

/* ---------------- vrsta pozivnice ---------------- */
function renderVrsta() {
  const V = (T.base || T).vrste;
  $("vrstaBox").hidden = !V;
  if (V) $("vrstaSeg").innerHTML = V.map(v => `<button data-v="${v.id}" aria-pressed="${v.id === vrsta}">${v.naziv}</button>`).join("");
}
// Nova vrsta = nova korica i podrazumevani tekstovi na svim stranama (Poništi vraća prethodne).
$("vrstaSeg").addEventListener("click", e => {
  const b = e.target.closest("[data-v]"); if (!b || b.dataset.v === vrsta) return;
  stopEdit(true);
  vrsta = b.dataset.v; T = { ...derive(baseOf()), base: baseOf() };
  pages = fromTemplate(T); sat = T.strane.map(s => validSat(s, null));
  pins = T.strane.map(s => s.mapa ? validPin(s.mapa, null) : null);
  T.strane.forEach((s, i) => { if (s.mapa) autoPin(i, true); });
  layers = pages[pi];
  renderVrsta(); showPage(pi); commit();
  toast(`Vrsta: ${b.textContent}. Tekstovi su vraćeni na primer za ovu vrstu.`);
});

/* ---------------- boja pozadine ---------------- */
const HEX = /^#[0-9a-f]{6}$/i;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function validTint(t, v) {
  const ok = typeof v === "string" && HEX.test(v) && (t.boja.slobodna || t.boja.ponuda.some(([, h]) => h === v.toLowerCase()));
  return ok ? v.toLowerCase() : (t.boja.izabrana || t.boja.ponuda[0][1]);
}
const tintName = () => T.boja.ponuda.find(([, h]) => h === tint)?.[0];
// CMYK za štampu: tačan iz šablona ako postoji, inače približno iz hex-a.
function tintCmyk() {
  const set = T.boja.ponuda.find(([, h]) => h === tint)?.[2];
  if (set) return set;
  const [r, g, b] = rgb(tint).map(c => c / 255), k = 1 - Math.max(r, g, b);
  return k >= 1 ? [0, 0, 0, 100] : [r, g, b].map(c => Math.round((1 - c - k) / (1 - k) * 100)).concat(Math.round(k * 100));
}
const cmykText = () => tintCmyk().map((v, i) => "CMYK"[i] + v).join(" ");
// Pozadina u izabranoj boji. SVG: menja se osnovna boja u kodu (ostaje vektor).
// Slika: svaki piksel se meri koliko je „obojen“ u odnosu na osnovnu boju i ista količina se nanosi nove boje,
// pa svetlije nijanse (npr. mapa sveta) ostaju svetlije i u novoj boji.
const tintCache = new Map();
function bgUrl(p) {
  if (p.fit && (p.fit.ox || p.fit.oy)) {
    const key = p.pozadina + "|" + p.mm.join("x");
    if (!tintCache.has(key)) tintCache.set(key, makeFit(p).catch(err => { console.error(err); tintCache.delete(key); return p.pozadina; }));
    return tintCache.get(key);
  }
  if (!tint || !T.boja || tint === T.boja.osnovna.toLowerCase()) return Promise.resolve(p.pozadina);
  const key = p.pozadina + "|" + tint;
  if (!tintCache.has(key)) tintCache.set(key, makeTint(p.pozadina, T.boja.osnovna, tint).catch(err => { console.error(err); tintCache.delete(key); return p.pozadina; }));
  return tintCache.get(key);
}
// Pozadina u drugom formatu: original ceo, umanjen; prazne trake uz ivice dobijaju boju same ivice originala
// (drugi format se nudi samo za šablone čija ivica je čista, pa traka izgleda kao nastavak papira).
async function makeFit(p) {
  const img = await loadImg(p.pozadina), F = p.fit, ppu = img.naturalWidth / (F.b[0] * 10);
  const cv = document.createElement("canvas"); cv.width = Math.round(p.mm[0] * 10 * ppu); cv.height = Math.round(p.mm[1] * 10 * ppu);
  const ctx = cv.getContext("2d"), dw = img.naturalWidth * F.s, dh = img.naturalHeight * F.s, dx = F.ox * ppu, dy = F.oy * ppu;
  const W = img.naturalWidth, H = img.naturalHeight, k = Math.max(2, Math.round(Math.min(W, H) * .01));
  // prosečna boja tankog pojasa uz ivicu originala
  const edge = (sx, sy, sw, sh) => {
    const one = document.createElement("canvas"); one.width = one.height = 1;
    const c1 = one.getContext("2d"); c1.drawImage(img, sx, sy, sw, sh, 0, 0, 1, 1);
    const c = c1.getImageData(0, 0, 1, 1).data; return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  const band = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  if (dx > 0) { band(edge(0, 0, k, H), 0, 0, Math.ceil(dx) + 1, cv.height); band(edge(W - k, 0, k, H), Math.floor(dx + dw) - 1, 0, cv.width, cv.height); }
  if (dy > 0) { band(edge(0, 0, W, k), 0, 0, cv.width, Math.ceil(dy) + 1); band(edge(0, H - k, W, k), 0, Math.floor(dy + dh) - 1, cv.width, cv.height); }
  ctx.drawImage(img, dx, dy, dw, dh);
  return URL.createObjectURL(await new Promise(ok => cv.toBlob(ok, "image/jpeg", .9)));
}
async function makeTint(src, from, to) {
  if (/\.svg(\?|$)/i.test(src)) {
    const txt = await (await fetch(src)).text();
    return svgUrl(txt.replace(new RegExp(from, "gi"), to));
  }
  const img = await loadImg(src);
  const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, cv.width, cv.height), d = id.data;
  const F = rgb(from), N = rgb(to), base = F.reduce((a, c) => a + 255 - c, 0) || 1;
  // Svetle nijanse (k ispod L, npr. mapa sveta) dobijaju istu količinu boje kao u originalu, pa uz tamnu boju
  // ostaju svetle i tekst preko njih se čita. Puni ton (tačkice, linije) dobija punu novu boju.
  const s = Math.min(1, base / (N.reduce((a, c) => a + 255 - c, 0) || 1)), L = 0.8;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let k = (765 - d[i] - d[i + 1] - d[i + 2]) / base;
    k = k <= L ? k * s : L * s + (k - L) / (1 - L) * (1 - L * s);
    for (let c = 0; c < 3; c++) d[i + c] = 255 - k * (255 - N[c]);
  }
  ctx.putImageData(id, 0, 0);
  return URL.createObjectURL(await new Promise(ok => cv.toBlob(ok, "image/png")));
}
function setBg(p) {
  const want = tint;
  bgUrl(p).then(async u => {
    if (PG() !== p || tint !== want) return;
    const img = $("bg"); img.src = u;
    try { await img.decode(); } catch { return; }
    const d = isDark(img); if (d !== wmDark) { wmDark = d; drawWatermark(); }
  });
}
function renderTint() {
  const on = !!tint;
  $("tintBox").hidden = !on;
  if (!on) return;
  $("oTint").textContent = tintName() || "po želji";
  $("tintCmyk").textContent = cmykText();
  $("tintSw").innerHTML = T.boja.ponuda.map(([n, h]) => `<button class="sw tint" style="background:${h}" data-b="${h}" aria-label="${n}" title="${n}" aria-pressed="${h === tint}"></button>`).join("") +
    (T.boja.slobodna ? `<label class="sw tint sw-pick" title="Izaberite svoju boju" aria-pressed="${!tintName()}"${tintName() ? "" : ` style="background:${tint}"`}><input type="color" id="tintPick" value="${tint}" aria-label="Izaberite svoju boju"></label>` : "");
}
function applyTint(h, now) {
  tint = h.toLowerCase();
  $("oTint").textContent = tintName() || "po želji";
  $("tintCmyk").textContent = cmykText();
  setBg(PG());
  if (now) { renderTint(); commit(); } else commitSoon();
}
$("tintSw").addEventListener("click", e => { const b = e.target.closest("[data-b]"); if (b && b.dataset.b !== tint) applyTint(b.dataset.b, true); });
$("tintSw").addEventListener("input", e => { if (e.target.id === "tintPick") { e.target.parentNode.style.background = e.target.value; applyTint(e.target.value); } });
$("tintSw").addEventListener("change", e => { if (e.target.id === "tintPick") { renderTint(); commit(); } });

/* ---------------- foliotisak ---------------- */
// Šablon sa folijom (pasoš): sav tekst i crtež su u foliji. Ostali: folija samo na tekstovima koje kupac označi (L.fo).
function renderFoil() {
  const on = !!foil, all = on && !!T.folija;
  $("foilBox").hidden = !on;
  stage.classList.toggle("foiled", all);
  stage.classList.toggle("partfoil", on && !all);
  if (on) stage.style.setProperty("--foil", FOLIJE[foil].sjaj);
  syncProps();
  if (!on) return;
  $("oFoil").textContent = FOLIJE[foil].naziv;
  $("foilNote").textContent = all ? "Sav tekst i crtež štampaju se folijom." + (T.papir ? ` Papir: ${T.papir}.` : "")
    : "U foliji su samo tekstovi koje označite: kliknite tekst, pa „Ovaj tekst ide u foliotisak“. Papir: 350g, mat štampa.";
  $("foilSw").innerHTML = (T.folija ? T.folija.boje : Object.keys(FOLIJE)).map(k => `<button class="sw foil" style="background:${FOLIJE[k].sjaj}" data-f="${k}" aria-label="${FOLIJE[k].naziv}" title="${FOLIJE[k].naziv}" aria-pressed="${k === foil}"></button>`).join("");
}
$("foilSw").addEventListener("click", e => {
  const b = e.target.closest("[data-f]"); if (!b || b.dataset.f === foil) return;
  setFoilColor(b.dataset.f);
});

/* ---------------- štampa, dodaci i cena ---------------- */
// Cene su u js/cenovnik.js (isti cenovnik koristi i kalkulator).
// pr = izbor kupca: q količina, pap papir, st štampa ("dig" digitalna / "fol" mat + foliotisak), fb boja folije,
// kov koverta ("" = bez, null = ona koja ide uz format), ex ostali dodaci, kb boja koverte, pb boja i motiv pečata.
const CEN = window.CENOVNIK;
const papir = id => CEN.papers.find(x => x.id === id);
const dodatak = id => CEN.extras.find(x => x.id === id);
const PAPIRI = ["350", "hrap", "sedef"];
const OSTALO = ["paus", "pecat", "avion", "vez"];
const isPasos = () => !!baseOf().folija;   // pasoš/boarding: uvek 350g, mat štampa i foliotisak
const din = n => Math.round(n).toLocaleString("sr-RS") + " din";
let pr = null;
function validPr(t, v) {
  v = v && typeof v === "object" ? v : {};
  const str = (x, n) => typeof x === "string" ? x.slice(0, n) : "";
  return {
    q: Number.isFinite(+v.q) && +v.q > 0 ? Math.min(5000, Math.round(+v.q)) : 80,
    pap: PAPIRI.includes(v.pap) ? v.pap : "350",
    st: v.st === "fol" ? "fol" : "dig",
    fb: FOLIJE[v.fb] ? v.fb : "gold",
    kov: v.kov === "" || dodatak(v.kov)?.group === "kov" ? v.kov : null,
    ex: Array.isArray(v.ex) ? [...new Set(v.ex.filter(x => OSTALO.includes(x)))] : [],
    kb: str(v.kb, 60), pb: str(v.pb, 80),
  };
}
// Koverte koje odgovaraju formatu (bez izbora formata: sve).
function kovList() {
  const f = fmt && CEN.formats.find(x => x.id === fmt.split("x")[0]);
  return f ? f.kov : CEN.extras.filter(x => x.group === "kov").map(x => x.id);
}
// Pasoš pozivnice se ne pakuju u koverte; uz njih ide samo akrilni aviončić (i naše vezivanje).
function fixKov() { if (isPasos()) { pr.kov = ""; return; } if (pr.kov === null || (pr.kov && !kovList().includes(pr.kov))) pr.kov = kovList()[0] || ""; }
const SAMO_PASOS = ["avion", "vez"];
const exOk = id => isPasos() ? SAMO_PASOS.includes(id) && (id !== "vez" || pr.ex.includes("avion")) : !SAMO_PASOS.includes(id);
// Dvostrana štampa: šablon ima prednju i zadnju stranu iste veličine.
const dvostrana = () => !isPasos() && T.strane.filter(s => s.mm[0] === T.strane[0].mm[0] && s.mm[1] === T.strane[0].mm[1]).length > 1;
const curPapir = () => isPasos() ? papir("pasos") : pr.st === "fol" ? papir("folio") : papir(pr.pap);
const minQty = () => curPapir().minQty || CEN.minQty;
const stampaNaziv = () => isPasos() ? "Pasoš: 350g papir, mat štampa + foliotisak" : pr.st === "fol" ? "350g papir, mat štampa + foliotisak" : papir(pr.pap).name + ", digitalna štampa";
function cena() {
  const P = curPapir(), q = Math.max(pr.q, minQty()), rows = [];
  rows.push({ n: stampaNaziv(), u: P.price, t: P.price * q });
  if (dvostrana() && P.duplex) rows.push({ n: "Dvostrana štampa", u: P.duplex, t: P.duplex * q });
  if (pr.kov) { const K = dodatak(pr.kov); rows.push({ n: K.name, u: K.price, t: K.price * q }); }
  for (const id of OSTALO) if (pr.ex.includes(id) && exOk(id)) { const X = dodatak(id); rows.push({ n: X.name, u: X.price, t: X.price * q }); }
  for (const F of CEN.fixed || []) rows.push({ n: F.name, t: F.price });
  const sub = rows.reduce((a, r) => a + r.t, 0), D = (CEN.discounts || []).filter(d => q >= d.from).sort((a, b) => b.from - a.from)[0];
  const disc = D ? sub * D.pct / 100 : 0;
  return { q, rows, D, disc, total: sub - disc, per: (sub - disc) / q };
}
// Cena samo elektronske pozivnice (sa akcijom, ako je postavljena u cenovniku).
const ePoz = () => { const E = CEN.epozivnica || {}; const sale = E.akcija && E.akcija < E.price; return { cena: sale ? E.akcija : E.price, stara: sale ? E.price : null }; };
const ePozHtml = () => { const E = ePoz(); return E.cena ? (E.stara ? `<s>${din(E.stara)}</s> ` : "") + din(E.cena) : ""; };
const foilTexts = () => { pages[pi] = layers; return pages.flatMap(P => P.filter(L => L.fo && L.text.trim()).map(L => L.text.replace(/\s*\n\s*/g, " / "))); };
// Kad kupac prvi put izabere foliju: na svakoj strani u foliju ide najveći tekst (obično imena).
function defaultFoil() {
  pages[pi] = layers;
  pages.forEach(P => { const big = P.filter(L => L.text.trim()).sort((a, b) => b.size - a.size)[0]; if (big) big.fo = true; });
}
function setFoilColor(k) {
  foil = k; if (!T.folija) pr.fb = k;
  renderFoil(); commit(); if (dlg.open) renderCfg();
}
function setStampa(st) {
  if (isPasos() || st === pr.st) return;
  pr.st = st;
  if (st === "fol") { pr.pap = "350"; foil = pr.fb; pages[pi] = layers; if (!pages.some(P => P.some(L => L.fo))) defaultFoil(); }
  else foil = null;
  renderFoil(); renderAll(); syncProps(); commit(); renderCfg();
}

const ch = (type, name, val, on, title, note, price, dis) =>
  `<label class="ch${dis ? " dis" : ""}"><input type="${type}" name="${name}" value="${val}"${on ? " checked" : ""}${dis ? " disabled" : ""}><span><b>${title}</b>${note ? `<small>${note}</small>` : ""}</span><em>${price}</em></label>`;
const perKom = n => n ? `${n} din/kom` : "uključeno";
function renderCfg() {
  if (!pr) return;
  const pasos = isPasos(), fol = pasos || pr.st === "fol";
  if (document.activeElement !== $("cQty")) $("cQty").value = pr.q;
  $("cQty").min = minQty();
  $("cQtyHint").textContent = pr.q < minQty() ? `Najmanja porudžbina je ${minQty()} kom, pa cenu računamo za ${minQty()} kom.` : `Najmanja porudžbina je ${minQty()} kom${pasos ? " za pasoš pozivnice" : ""}.`;
  // papir
  $("cPaper").innerHTML = pasos
    ? ch("radio", "cpap", "pasos", true, papir("pasos").name, papir("pasos").note, perKom(papir("pasos").price))
    : PAPIRI.map(id => { const P = papir(id); return ch("radio", "cpap", id, pr.pap === id, P.name, fol && id !== "350" ? "Foliotisak ide samo na 350g papir" : P.note, fol ? (id === "350" ? "u ceni folije" : "—") : perKom(P.price), fol && id !== "350"); }).join("");
  // štampa
  const dup = dvostrana() ? `<p class="cfg-hint">Prednja i zadnja strana: dvostrana štampa +${papir("350").duplex} din/kom, uz foliotisak +${papir("folio").duplex} din/kom.</p>` : "";
  $("cPrint").innerHTML = (pasos
    ? ch("radio", "cst", "fol", true, "Mat štampa + foliotisak", "Uvek uz pasoš pozivnice: sav tekst i crtež su u foliji.", "uključeno")
    : ch("radio", "cst", "dig", pr.st === "dig", "Digitalna štampa", "Štampa u boji, tekst u boji koju ste izabrali.", "uključeno") +
      ch("radio", "cst", "fol", pr.st === "fol", "Mat štampa + foliotisak", "Izabrani tekst se otiskuje folijom koja sija. Samo na 350g papiru.", `+${papir("folio").price - papir("350").price} din/kom`)) + dup;
  $("cFoil").hidden = !fol;
  if (fol) {
    const boje = pasos ? baseOf().folija.boje : Object.keys(FOLIJE), cur = foil || pr.fb;
    $("cFoilName").textContent = FOLIJE[cur].naziv;
    $("cFoilSw").innerHTML = boje.map(k => `<button type="button" class="sw foil" style="background:${FOLIJE[k].sjaj}" data-f="${k}" aria-label="${FOLIJE[k].naziv}" title="${FOLIJE[k].naziv}" aria-pressed="${k === cur}"></button>`).join("");
    pages[pi] = layers;
    $("cTexts").innerHTML = pasos ? `<p class="cfg-hint" style="margin:0">Sav tekst je u foliji.</p>` : T.strane.map((S, k) => {
      const items = pages[k].map((L, j) => L.text.trim() ? `<label class="tx"><input type="checkbox" data-k="${k}" data-j="${j}"${L.fo ? " checked" : ""}><span>${esc((L.upper ? L.text.toLocaleUpperCase("sr") : L.text).replace(/\s*\n\s*/g, " / ").slice(0, 70))}</span></label>` : "").join("");
      return (T.strane.length > 1 ? `<div class="tx-h">${esc(S.naziv)}</div>` : "") + items;
    }).join("");
    $("cTexts").previousElementSibling.hidden = pasos;
    $("cLook").hidden = pasos;
  }
  // dodaci
  const kovs = kovList();
  $("cKovLab").hidden = $("cKov").hidden = $("cOstLab").hidden = pasos;
  $("cPasosNote").hidden = !pasos;
  $("cKov").innerHTML = ch("radio", "ckov", "", !pr.kov, "Bez koverte", "", "") +
    kovs.map(id => { const K = dodatak(id); return ch("radio", "ckov", id, pr.kov === id, K.name, K.note, perKom(K.price)); }).join("");
  $("cKovColorF").hidden = !pr.kov || pasos;
  if (document.activeElement !== $("cKovColor")) $("cKovColor").value = pr.kb;
  $("cExtra").innerHTML = OSTALO.filter(id => SAMO_PASOS.includes(id) === pasos).map(id => {
    const X = dodatak(id), dis = !exOk(id) && id === "vez";
    return ch("checkbox", "cex", id, pr.ex.includes(id) && exOk(id), X.name, dis ? "Uz akrilni aviončić" : X.note, `+${X.price} din/kom`, dis);
  }).join("");
  $("cSealF").hidden = !pr.ex.includes("pecat") || pasos;
  if (document.activeElement !== $("cSeal")) $("cSeal").value = pr.pb;
  renderSum();
}
function renderSum() {
  const C = cena();
  $("sWhat").textContent = `${T.naziv} · ${C.q} kom${fmt ? " · " + FORMATI[fmt].naziv : ""}`;
  $("sRows").innerHTML = C.rows.map(r => `<div class="r"><span>${esc(r.n)}${r.u ? `<small>${C.q} × ${r.u} din</small>` : "<small>jednom po porudžbini</small>"}</span><span>${din(r.t)}</span></div>`).join("") +
    (C.D ? `<div class="r"><span>Popust ${C.D.pct}%</span><span>−${din(C.disc)}</span></div>` : "");
  $("sTotal").textContent = $("bTotal").textContent = din(C.total);
  $("sPer").textContent = $("bPer").textContent = `${din(C.per)} po komadu`;
}
$("cfg").addEventListener("change", e => {
  const t = e.target;
  if (t.name === "cpap" && !isPasos() && pr.st !== "fol") pr.pap = t.value;
  else if (t.name === "cst") return setStampa(t.value);
  else if (t.name === "ckov") pr.kov = t.value;
  else if (t.name === "cex") {
    pr.ex = pr.ex.filter(x => x !== t.value);
    if (t.checked) pr.ex.push(t.value);
    if (t.value === "avion" && !t.checked) pr.ex = pr.ex.filter(x => x !== "vez");
  } else if (t.matches("#cTexts input")) {
    pages[pi] = layers;
    const L = pages[+t.dataset.k][+t.dataset.j]; if (!L) return;
    if (t.checked) L.fo = true; else delete L.fo;
    if (+t.dataset.k === pi) refresh(L);
    syncProps(); commitSoon(); return;
  } else return;
  renderCfg(); commitSoon();
});
$("cfg").addEventListener("click", e => {
  const b = e.target.closest(".sw[data-f]"); if (b) { setFoilColor(b.dataset.f); return; }
  if (e.target.id === "cLook") { dlg.close(); box.scrollIntoView({ behavior: "smooth", block: "center" }); toast("Tekstovi u foliji imaju sjaj. Kad završite, kliknite „Poruči štampu“."); }
});
$("cQty").addEventListener("input", e => { pr.q = Math.max(0, Math.min(5000, Math.round(+e.target.value) || 0)); renderCfg(); commitSoon(); });
$("cQty").addEventListener("blur", () => { if (pr.q < minQty()) { pr.q = minQty(); renderCfg(); commitSoon(); } });
document.querySelectorAll(".q-b").forEach(b => b.onclick = () => { pr.q = Math.max(minQty(), Math.min(5000, (Math.max(pr.q, minQty()) + +b.dataset.q))); renderCfg(); commitSoon(); });
$("cKovColor").addEventListener("input", e => { pr.kb = e.target.value.slice(0, 60); commitSoon(); });
$("cSeal").addEventListener("input", e => { pr.pb = e.target.value.slice(0, 80); commitSoon(); });

/* ---------------- crtanje ---------------- */
function styleLayer(el, L, live = true) {
  ensureFont(L.font);
  const t = el.firstChild;
  el.style.left = L.x + "px"; el.style.top = L.y + "px"; el.style.width = L.w + "px";
  el.style.textAlign = L.align;
  el.classList.toggle("fo", !!L.fo);
  Object.assign(t.style, {
    fontFamily: `"${L.font}", serif`, fontWeight: L.weight, fontStyle: L.italic ? "italic" : "normal",
    fontSize: L.size * PT + "px", color: L.color, letterSpacing: L.ls / 1000 + "em",
    marginRight: `calc(${-L.ls / 1000}em - var(--padx, 0em))`, lineHeight: L.lh, textTransform: L.upper ? "uppercase" : "none",
    minHeight: Math.min(1, L.lh) + "em",
  });
  if (editing !== L.id && t.textContent !== L.text) t.textContent = L.text;
  el._L = L;
  if (L.luk || el.querySelector(".arc")) requestAnimationFrame(() => renderArc(el, L));
  if (live) { el.classList.toggle("sel", sel === L.id); requestAnimationFrame(() => checkSafe(el, L)); }
}

/* ---------- tekst u luku ----------
   Tekst se rasporedi kao ravan red (pregledač: font, razmak slova, poravnanje), pa se svako slovo prenese na
   kružni luk: sredina reda ostaje na mestu, krajevi se spuštaju (luk > 0) ili podižu (luk < 0).
   luk 100 = pola kruga. Isto računanje koriste ekran, pregled/PNG (renderCanvas) i PDF za štampu (stampa-pdf.js). */
// Redovi teksta sa položajem i širinom svakog slova (jedinice šablona), tačno kako ih je složio pregledač.
function charsOf(L, el = elOf(L.id)) {
  const node = el?.firstChild?.firstChild; if (!node) return [];
  const er = el.getBoundingClientRect(), k = er.width / L.w; if (!k) return [];
  const px = L.size * PT, str = node.textContent, r = document.createRange();
  const lines = []; let cur = null;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\n") { cur = null; continue; }
    r.setStart(node, i); r.setEnd(node, i + 1);
    const rc = [...r.getClientRects()].find(q => q.width > 0); if (!rc) continue;
    const x = L.x + (rc.left - er.left) / k, y = L.y + (rc.top - er.top) / k;
    if (!cur || Math.abs(y - cur.y) > px * 0.3) { cur = { y, chars: [] }; lines.push(cur); }
    cur.chars.push({ c: L.upper ? str[i].toLocaleUpperCase("sr") : str[i], x, w: rc.width / k });
  }
  lines.forEach(ln => { while (ln.chars.length && /\s/.test(ln.chars[ln.chars.length - 1].c)) ln.chars.pop(); });
  return lines.filter(ln => ln.chars.length);
}
function ascOf(L) {
  const px = L.size * PT;
  inkCtx.font = `${L.italic ? "italic " : ""}${L.weight} ${px}px "${L.font}"`;
  return inkCtx.measureText("Hg").fontBoundingBoxAscent ?? px * 0.8;
}
// Slova jednog reda na luku: cx, y = sredina slova na osnovnoj liniji, rot = nagib (radijani), hw = pola širine slova.
function arcOf(L, ln, base) {
  const ls = L.ls / 1000 * L.size * PT, hw = ch => Math.max(0, ch.w - ls) / 2;
  if (!L.luk) return ln.chars.map(ch => ({ ...ch, hw: hw(ch), cx: ch.x + hw(ch), y: base, rot: 0 }));
  const a = ln.chars[0].x, z = ln.chars[ln.chars.length - 1], b = z.x + 2 * hw(z), xc = (a + b) / 2;
  const R = Math.max(1, b - a) / (Math.abs(L.luk) / 100 * Math.PI), sg = Math.sign(L.luk);
  return ln.chars.map(ch => {
    const t = (ch.x + hw(ch) - xc) / R;
    return { ...ch, hw: hw(ch), cx: xc + R * Math.sin(t), y: base + sg * R * (1 - Math.cos(t)), rot: sg * t };
  });
}
// Na ekranu: ravan tekst ostaje (providan) zbog izbora i kucanja, a slova na luku su preko njega.
// Dok kupac kuca, tekst je privremeno ravan.
function renderArc(el, L) {
  let a = el.querySelector(".arc");
  const on = !!L.luk && editing !== L.id && !!L.text.trim();
  el.classList.toggle("luk", on);
  if (!on) { a?.remove(); return; }
  if (!a) { a = document.createElement("span"); a.className = "arc"; a.setAttribute("aria-hidden", "true"); el.appendChild(a); }
  const asc = ascOf(L), ch = [];
  for (const ln of charsOf(L, el)) for (const p of arcOf(L, ln, ln.y + asc)) {
    if (!p.c.trim()) continue;
    const s = document.createElement("span"); s.className = "ch"; s.textContent = p.c;
    Object.assign(s.style, { left: p.cx - L.x + "px", top: p.y - L.y + "px", transform: `rotate(${p.rot}rad) translate(${-p.hw}px,${-asc}px)`,
      fontFamily: `"${L.font}", serif`, fontWeight: L.weight, fontStyle: L.italic ? "italic" : "normal", fontSize: L.size * PT + "px", color: L.color });
    ch.push(s);
  }
  a.replaceChildren(...ch);
}
// Font stigne kasnije (Google): slova na luku se ponovo rasporede.
document.fonts.addEventListener("loadingdone", () => document.querySelectorAll(".L.luk").forEach(el => el._L && renderArc(el, el._L)));
function makeLayer(L, live = true) {
  const el = document.createElement("div");
  el.className = "L"; el.dataset.id = L.id;
  el.innerHTML = '<span class="t"></span>' + (live ? '<i class="h l"></i><i class="h r"></i><i class="h br"></i>' : "");
  styleLayer(el, L, live);
  return el;
}
function renderAll() {
  layersEl.replaceChildren(...layers.map(L => makeLayer(L)));
  renderList();
}
const elOf = id => layersEl.querySelector(`[data-id="${id}"]`);
const get = id => layers.find(L => L.id === id);
function refresh(L) { const el = elOf(L.id); if (el) styleLayer(el, L); renderList(); }

// Visina slova teksta (u jedinicama šablona): asc = od vrha reda do osnovne linije, up/down = slova iznad/ispod nje.
const inkCtx = document.createElement("canvas").getContext("2d");
function inkOf(L) {
  const txt = (L.upper ? L.text.toLocaleUpperCase("sr") : L.text).replace(/\s+/g, "");
  if (!txt) return null;
  const px = L.size * PT;
  inkCtx.font = `${L.italic ? "italic " : ""}${L.weight} ${px}px "${L.font}"`;
  const m = inkCtx.measureText(txt);
  if (!Number.isFinite(m.fontBoundingBoxAscent) || !Number.isFinite(m.actualBoundingBoxAscent)) return null;
  return { asc: m.fontBoundingBoxAscent, up: m.actualBoundingBoxAscent, down: m.actualBoundingBoxDescent };
}
function checkSafe(el, L) {
  const b = PG().bezbedno || 0, h = el.offsetHeight;
  // gledaju se sama slova, ne širina polja (centriran tekst u širokom polju nije preblizu ivice)
  let x0 = L.x, y0 = L.y, x1 = L.x + L.w, y1 = L.y + h;
  const rg = document.createRange(); rg.selectNodeContents(el.firstChild);
  const r = rg.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  if (r.width && sr.width) {
    x0 = (r.left - sr.left) / S; x1 = (r.right - sr.left) / S; y0 = (r.top - sr.top) / S; y1 = (r.bottom - sr.top) / S;
    // Gore i dole: stvarna slova, ne visina reda (rukopisni fontovi imaju red mnogo viši od slova).
    const ink = inkOf(L), lines = [...rg.getClientRects()].filter(q => q.width > 0);
    if (ink && lines.length) {
      y0 = (lines[0].top - sr.top) / S + ink.asc - ink.up;
      y1 = (lines[lines.length - 1].top - sr.top) / S + ink.asc + ink.down;
    }
  }
  el.classList.toggle("out", x0 < b - 1 || y0 < b - 1 || x1 > W() - b + 1 || y1 > H() - b + 1);
  const any = layersEl.querySelector(".L.out");
  $("hint").innerHTML = any
    ? '<span class="warn">Crveni okvir: tekst je preblizu ivice i može biti odsečen pri sečenju papira. Pomerite ga unutar isprekidane linije.</span>'
    : matchMedia("(pointer:coarse)").matches
      ? 'Dodirnite tekst da ga izaberete, dodirnite ga ponovo da kucate. Izabrani tekst prevucite prstom da ga pomerite.'
      : 'Kliknite na tekst da ga izaberete, ponovo kliknite da kucate. Prevucite tekst da ga pomerite. Fino pomeranje: <kbd>← ↑ → ↓</kbd>';
}

function fit() {
  if (!T) return;
  const avW = box.clientWidth - (innerWidth < 980 ? 32 : 56);
  const avH = Math.max(320, Math.min(innerHeight - 200, 980));
  S = Math.min(avW / W(), avH / H());
  stage.style.transform = `scale(${S})`;
  stage.style.setProperty("--k", 1 / S);
  frame.style.width = W() * S + "px"; frame.style.height = H() * S + "px";
  drawWatermark();
}
new ResizeObserver(fit).observe(box);

// Prosečna svetlina pozadine: na tamnoj je žig svetao, na svetloj taman.
function isDark(img) {
  const c = document.createElement("canvas"); c.width = c.height = 24;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0, 24, 24);
  const d = x.getImageData(0, 0, 24, 24).data; let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i + 3] < 128 ? 255 : .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
  return sum / (d.length / 4) < 140;
}
const WM = () => wmDark ? ["#ffffff", .3] : ["#1c3627", .15];
function drawWatermark() {
  const fs = Math.round(W() / 26), tw = fs * 25, [col, op] = WM();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tw}' height='${fs * 3.2}'><text x='${tw / 2}' y='${fs * 2}' text-anchor='middle' font-family='Josefin Sans,sans-serif' font-size='${fs}' letter-spacing='${fs * .18}' fill='${col}' fill-opacity='${op}'>MANGO POZIVNICE · PRIPREMA</text></svg>`;
  $("wm").style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/* ---------------- lista šablona ---------------- */
function renderTemplates() {
  $("tplList").replaceChildren(...SABLONI.map(t => {
    const b = document.createElement("button");
    b.className = "tpl"; b.dataset.id = t.id;
    const w = t.mm[0] * 10, h = t.mm[1] * 10;
    const p = t.strane[0], fo = t.folija && FOLIJE[t.folija.izabrana];
    b.innerHTML = `<div class="thumb" style="aspect-ratio:${w}/${h}"><div class="stage${fo ? " foiled" : ""}" style="width:${w}px;height:${h}px${fo ? ";--foil:" + fo.sjaj : ""}"><img class="bg" src="${p.mini || p.pozadina}" alt="" loading="lazy">${p.foto ? fotoThumb(p.foto, t) : ""}${p.folija ? `<div class="foilart" style="-webkit-mask-image:url('${p.folija}');mask-image:url('${p.folija}')"></div>` : ""}<div class="layers"></div></div></div><b>${t.naziv}</b><small>${t.kategorija} · ${dims(t)}${t.papir ? " · " + t.papir : ""}${t.strane.some(s => s.foto) ? " · sa fotografijom" : ""}</small>`;
    const st = b.querySelector(".stage");
    st.querySelector(".layers").append(...fromTemplate(t)[0].map(L => makeLayer(L, false)));
    new ResizeObserver(() => { st.style.transform = `scale(${b.querySelector(".thumb").clientWidth / w})`; }).observe(b.querySelector(".thumb"));
    b.onclick = () => { if (T.id !== t.id) loadTemplate(t); };
    return b;
  }));
  renderTplCats();
}
// Kategorije iznad liste (da se ne lista svih 50 šablona): prilika iz t.grupe, plus „Sa fotografijom“.
// Izbor se pamti; prvi put je to prilika šablona koji je otvoren.
const TPL_KAT = [["vencanja", "Venčanja"], ["rodjendani", "Rođendani"], ["krstenja", "Krštenja"], ["punoletstva", "Punoletstva"],
  ["boarding", "Pasoš"], ["foto", "Sa fotografijom"], ["sve", "Sve"]];
const uKat = (t, k) => k === "sve" || (k === "foto" ? t.strane.some(s => s.foto) : (t.grupe || []).includes(k));
let tplKat = null;
function renderTplCats() {
  const L = TPL_KAT.map(([k, n]) => [k, n, SABLONI.filter(t => uKat(t, k)).length]).filter(c => c[2]);
  $("tplCats").innerHTML = L.map(([k, n, c]) => `<button data-k="${k}" aria-pressed="false">${n} <small>${c}</small></button>`).join("");
}
function setTplKat(k, save) {
  tplKat = TPL_KAT.some(c => c[0] === k) ? k : "sve";
  $("tplCats").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === tplKat));
  const byId = Object.fromEntries(SABLONI.map(t => [t.id, t]));
  $("tplList").querySelectorAll(".tpl").forEach(b => { b.hidden = !uKat(byId[b.dataset.id], tplKat); });
  if (save) store.set("mango-ed-kat", tplKat);
}
$("tplCats").addEventListener("click", e => {
  const b = e.target.closest("[data-k]"); if (!b) return;
  setTplKat(b.dataset.k, true); $("tplList").closest(".ed-tpl").scrollTop = 0;
});

/* ---------------- istorija ---------------- */
let saveT;
// Akcije ponekad prave novi niz (layers = layers.filter…), pa ga ovde vraćamo u pages.
function snap() { pages[pi] = layers; return JSON.stringify({ p: pages, f: foil, m: pins, b: tint, v: vrsta, s: sat, fo: fmt, fz: 1, pr, ph: fot }); }
const saveNow = () => store.set("mango-ed:" + T.id, { p: pages, f: foil, m: pins, b: tint, v: vrsta, s: sat, fo: fmt, fz: 1, pr, ph: fot });
function commit() {
  const s = snap();
  if (s !== hist[hi]) { hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 150) hist.shift(); hi = hist.length - 1; }
  clearTimeout(saveT); saveT = setTimeout(saveNow, 300);
  updateTools();
}
let commitT; const commitSoon = () => { clearTimeout(commitT); commitT = setTimeout(commit, 450); };
function restore(i) {
  stopEdit(true); hi = i;
  const d = JSON.parse(hist[hi]);
  pages = d.p; foil = d.f; pins = d.m || []; tint = d.b || null; layers = pages[pi];
  pr = validPr(baseOf(), d.pr);
  const nv = d.v || null, nf = d.fo || null;
  const remake = nv !== vrsta || nf !== fmt;
  if (remake) { vrsta = nv; fmt = nf; T = { ...derive(baseOf()), base: baseOf() }; renderVrsta(); renderFmt(); }
  fixKov(); if (dlg.open) renderCfg();
  sat = T.strane.map((s, k) => validSat(s, d.s?.[k]));
  fot = T.strane.map((s, k) => fotoValid(s, d.ph?.[k]));
  renderTint(); renderFoil();
  if (remake || PG().folija !== $("foilart").dataset.src) showPage(pi);
  else { if (!get(sel)) sel = null; setBg(PG()); renderRoute(); renderFoto(); renderAll(); syncProps(); }
  updateTools();
  saveNow();
}
function updateTools() {
  document.querySelector('[data-act=undo]').disabled = hi <= 0;
  document.querySelector('[data-act=redo]').disabled = hi >= hist.length - 1;
}

/* ---------------- izbor i kucanje ---------------- */
function select(id) {
  if (sel === id) return;
  if (editing && editing !== id) stopEdit();
  sel = id;
  layersEl.querySelectorAll(".L").forEach(el => el.classList.toggle("sel", el.dataset.id === id));
  closeFontPicker(); syncProps(); renderList();
  sheetFor(id);
}
/* telefon: panel odozdo; izabrani tekst ostaje vidljiv iznad panela */
const mob = () => matchMedia("(max-width:980px)").matches;
function sheetFor(id) {
  document.body.classList.toggle("has-sheet", !!id && mob());
  if (!id || !mob()) return;
  requestAnimationFrame(() => {
    const el = elOf(id); if (!el) return;
    const r = el.getBoundingClientRect(), top = $("pSel").getBoundingClientRect().top;
    const hd = (document.querySelector("header")?.getBoundingClientRect().bottom || 0) + 8;
    if (r.bottom > top - 12) scrollBy({ top: Math.min(r.bottom - top + 24, r.top - hd), behavior: "smooth" });
    else if (r.top < hd) scrollBy({ top: r.top - hd, behavior: "smooth" });
  });
}
$("sheetX").addEventListener("click", () => { stopEdit(); select(null); });
function startEdit(id) {
  const el = elOf(id); if (!el) return;
  select(id); editing = id;
  const t = el.firstChild;
  el.classList.add("editing"); document.body.classList.add("typing");
  if (el._L?.luk) renderArc(el, el._L);   // dok se kuca, tekst u luku je privremeno ravan
  try { t.contentEditable = "plaintext-only"; } catch { t.contentEditable = "true"; }
  if (t.contentEditable !== "plaintext-only") t.contentEditable = "true";
  t.focus();
  const r = document.createRange(); r.selectNodeContents(t);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function readText(t) {
  let s = t.innerText;
  if (t.lastChild && t.lastChild.nodeName === "BR") s = s.replace(/\n$/, "");
  return s.replace(/ /g, " ");
}
function stopEdit(silent) {
  if (!editing) return;
  const el = elOf(editing), L = get(editing);
  editing = null; document.body.classList.remove("typing");
  if (el) { const t = el.firstChild; t.contentEditable = "false"; el.classList.remove("editing"); if (L) { t.textContent = L.text; styleLayer(el, L); } }
  getSelection().removeAllRanges();
  if (!silent) { commit(); syncProps(); renderList(); }
}
layersEl.addEventListener("input", e => {
  const el = e.target.closest(".L"); if (!el) return;
  const L = get(el.dataset.id); L.text = readText(e.target);
  if (sel === L.id) $("pText").value = L.text;
  if (L.uloga) autoPin(pi);
  checkSafe(el, L); renderList(); commitSoon();
});
layersEl.addEventListener("paste", e => {
  if (!editing) return;
  e.preventDefault();
  document.execCommand("insertText", false, (e.clipboardData.getData("text/plain") || "").replace(/\r/g, ""));
});
layersEl.addEventListener("focusout", e => { if (editing && e.target.classList.contains("t")) stopEdit(); });

/* ---------------- prevlačenje i menjanje veličine ---------------- */
let drag = null, tap = null;
stage.addEventListener("pointerdown", e => {
  tap = null;
  if (e.target.id === "pinH") {
    e.preventDefault(); stopEdit(); select(null);
    drag = { mode: "pin", sx: e.clientX, sy: e.clientY, P0: { ...pins[pi] }, moved: false };
    try { e.target.setPointerCapture(e.pointerId); } catch {} return;
  }
  const el = e.target.closest(".L");
  const touch = e.pointerType === "touch";
  // fotografija: prazan okvir = izbor fotografije; puna = prevlačenje (prstom tek kad je dodirnuta, da stranica može da se skroluje)
  if (!el && fotoHit(e)) {
    if (touch && !(fotoOn && fotoHas(pi, fj))) { tap = { foto: true, x: e.clientX, y: e.clientY }; return; }
    e.preventDefault(); stopEdit(); select(null);
    if (!fotoHas(pi, fj)) { fotoPick(); return; }
    fotoSetOn(true);
    drag = { mode: "foto", sx: e.clientX, sy: e.clientY, F0: { ...fotoP(pi, fj) }, moved: false };
    try { stage.setPointerCapture(e.pointerId); } catch {} return;
  }
  fotoSetOn(false);
  // prstom: neizabran tekst se bira tek na dodir (ne na prevlačenje), da stranica može da se skroluje
  if (touch && (!el || (sel !== el.dataset.id && editing !== el.dataset.id))) { tap = { id: el ? el.dataset.id : null, x: e.clientX, y: e.clientY }; return; }
  if (!el) { stopEdit(); select(null); return; }
  const id = el.dataset.id, L = get(id);
  if (editing === id) return;                     // dozvoli selektovanje teksta dok se kuca
  e.preventDefault();
  const was = sel === id;
  select(id);
  const mode = e.target.classList.contains("h") ? [...e.target.classList].find(c => c !== "h") : "move";
  drag = { id, mode, sx: e.clientX, sy: e.clientY, L0: { ...L }, h0: el.offsetHeight, moved: false, was };
  try { el.setPointerCapture(e.pointerId); } catch {}
});
stage.addEventListener("pointermove", e => {
  if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap = null;
  if (!drag) return;
  const dx = (e.clientX - drag.sx) / S, dy = (e.clientY - drag.sy) / S;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return;
  drag.moved = true;
  if (drag.mode === "pin") {
    const [x0, y0, x1, y1] = PG().mapa.drzave[drag.P0.d].okvir, c = (v, lo, hi) => Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10;
    pins[pi] = { ...drag.P0, x: c(drag.P0.x + dx, x0, x1), y: c(drag.P0.y + dy, y0, y1) };
    renderRoute(); return;
  }
  if (drag.mode === "foto") { fotoPan(drag, e); return; }
  const L = get(drag.id), o = drag.L0, snap = 7 / S;
  if (drag.mode === "move") {
    let x = o.x + dx, y = o.y + dy;
    const cx = x + o.w / 2, cy = y + drag.h0 / 2;
    const sv = Math.abs(cx - W() / 2) < snap, sh = Math.abs(cy - H() / 2) < snap;
    if (sv) x = W() / 2 - o.w / 2;
    if (sh) y = H() / 2 - drag.h0 / 2;
    $("gv").classList.toggle("on", sv); $("gh").classList.toggle("on", sh);
    L.x = Math.round(Math.min(Math.max(x, -o.w / 2), W() - o.w / 2));
    L.y = Math.round(Math.min(Math.max(y, -drag.h0 / 2), H() - drag.h0 / 2));
  } else if (drag.mode === "r") {
    L.w = Math.round(Math.max(60, o.w + dx));
  } else if (drag.mode === "l") {
    const w = Math.max(60, o.w - dx); L.x = Math.round(o.x + o.w - w); L.w = Math.round(w);
  } else if (drag.mode === "br") {
    const f = Math.max(0.2, (o.w + dx) / o.w);
    L.w = Math.round(o.w * f); L.size = Math.round(o.size * f * 2) / 2;
    syncProps();
  }
  styleLayer(elOf(L.id), L);
});
function endDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.mode === "foto") { if (d.moved) commit(); return; }
  if (d.mode === "pin") { if (d.moved) { commit(); toast("Pribadača je pomerena. Ostaje tu dok ne upišete drugi grad."); } return; }
  $("gv").classList.remove("on"); $("gh").classList.remove("on");
  if (d.moved) { commit(); renderList(); }
  else if (d.was && d.mode === "move") startEdit(d.id);
}
stage.addEventListener("pointerup", e => {
  if (tap?.foto) { tap = null; stopEdit(); select(null); if (!fotoHas(pi, fj)) fotoPick(); else { fotoSetOn(true); toast("Sada prevucite fotografiju prstom da je pomerite."); } return; }
  if (tap) { const t = tap; tap = null; if (!t.id) stopEdit(); select(t.id); }
  endDrag();
});
stage.addEventListener("pointercancel", () => { tap = null; endDrag(); });
stage.addEventListener("dblclick", e => { const el = e.target.closest(".L"); if (el && editing !== el.dataset.id) startEdit(el.dataset.id); });

/* ---------------- tastatura ---------------- */
document.addEventListener("keydown", e => {
  if ($("order").open || $("prev").open) return;
  const mod = e.metaKey || e.ctrlKey;
  const inField = editing || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (mod && e.key.toLowerCase() === "z" && !inField) { e.preventDefault(); e.shiftKey ? act("redo") : act("undo"); return; }
  if (mod && e.key.toLowerCase() === "y" && !inField) { e.preventDefault(); act("redo"); return; }
  if (e.key === "Escape") { if (editing) stopEdit(); else select(null); return; }
  if (inField || !sel) return;
  const L = get(sel), step = e.shiftKey ? 10 : 2;
  const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (mv) { e.preventDefault(); L.x += mv[0]; L.y += mv[1]; refresh(L); commitSoon(); return; }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); act("del"); return; }
  if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); act("dup"); return; }
  if (e.key === "Enter") { e.preventDefault(); startEdit(sel); }
});

/* ---------------- akcije ---------------- */
function act(a) {
  const L = get(sel);
  switch (a) {
    case "undo": if (hi > 0) restore(hi - 1); break;
    case "redo": if (hi < hist.length - 1) restore(hi + 1); break;
    case "add": {
      const base = L || layers[layers.length - 1] || {};
      const N = norm({ text: "Novi tekst", x: Math.round(W() / 2 - 300), y: Math.round(H() / 2 - 40), w: 600, font: base.font, weight: base.weight, size: Math.min(base.size || 14, 18), color: base.color || T.boje[0], align: "center" });
      layers.push(N); renderAll(); select(N.id); commit(); startEdit(N.id); break;
    }
    case "dup": if (L) { const N = norm({ ...L, id: undefined, x: L.x + 30, y: L.y + 30 }); layers.splice(layers.indexOf(L) + 1, 0, N); renderAll(); select(N.id); commit(); } break;
    case "del": if (L) { layers = layers.filter(x => x !== L); sel = null; renderAll(); syncProps(); commit(); toast("Tekst obrisan. Vraćate ga sa „Nazad“."); } break;
    case "front": if (L) { layers = layers.filter(x => x !== L).concat(L); renderAll(); commit(); } break;
    case "back": if (L) { layers = [L, ...layers.filter(x => x !== L)]; renderAll(); commit(); } break;
    case "centerH": if (L) { L.x = Math.round(W() / 2 - L.w / 2); refresh(L); commit(); } break;
    case "guides": { const b = document.querySelector("[data-act=guides]"), on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); stage.classList.toggle("guides", on); break; }
    case "reset": stopEdit(true); pages = fromTemplate(T); sat = T.strane.map(s => validSat(s, null)); layers = pages[pi]; sel = null;
      if (foil && !T.folija) defaultFoil();
      pins = T.strane.map(() => null); T.strane.forEach((s, i) => autoPin(i, true)); renderRoute(); renderAll(); syncProps(); commit(); toast(T.strane.length > 1 ? "Vraćen originalni tekst na svim stranama. Prethodnu verziju vraćate sa „Nazad“." : "Vraćen originalni tekst. Prethodnu verziju vraćate sa „Nazad“."); break;
    case "png": exportPNG(true); break;
    case "png-clean": if (isAdmin) exportPNG(false); break;
    case "pdf": if (isAdmin) exportPDF(); break;
    case "epoz": if (isAdmin) exportEPozivnica(); break;
    case "preview": openPreview(null); break;
    case "order": openPreview("stampa"); break;
    case "eorder": openPreview("e"); break;
  }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && !b.disabled) act(b.dataset.act); });

/* ---------------- panel sa podešavanjima ---------------- */
function syncProps() {
  const L = get(sel);
  $("pNone").hidden = !!L; $("pSel").hidden = !L;
  if (!L) return;
  // folija: kod pasoša je sav tekst u foliji; inače kupac bira za svaki tekst
  const part = !!foil && !T.folija, inFoil = !!foil && (!!T.folija || !!L.fo);
  $("pgFoil").hidden = !part; $("pgColor").hidden = inFoil;
  $("pFoil").setAttribute("aria-pressed", !!L.fo);
  $("oFoilL").textContent = part && L.fo ? FOLIJE[foil].naziv : "";
  if (part) $("pFoil").style.setProperty("--foil", FOLIJE[foil].sjaj);
  if (document.activeElement !== $("pText")) $("pText").value = L.text;
  $("fpName").textContent = L.font; $("fpName").style.fontFamily = `"${L.font}", serif`;
  const nf = fali(L);
  $("fpWarn").hidden = !nf.length;
  if (nf.length) $("fpWarn").textContent = `Font ${L.font} nema slova ${nf.join(" ")}, pa ih ne možemo odštampati u ovom fontu. Izaberite drugi font.`;
  const f = FONT[L.font] || { w: [400], i: [] };
  const ws = L.italic && f.i.length ? f.i : f.w;
  const names = { 300: "Tanak", 400: "Normalan", 500: "Srednji", 600: "Polu-debeo", 700: "Debeo" };
  $("pWeight").innerHTML = ws.map(w => `<option value="${w}">${names[w] || w}</option>`).join("");
  $("pWeight").value = L.weight; $("pWeight").disabled = ws.length < 2;
  $("pItalic").setAttribute("aria-pressed", !!L.italic); $("pItalic").disabled = !f.i.length && !L.italic;
  $("pUpper").setAttribute("aria-pressed", !!L.upper);
  $("pSize").value = L.size; $("pSizeN").value = L.size; $("oSize").textContent = L.size + " pt";
  $("pLs").value = L.ls; $("oLs").textContent = L.ls;
  $("pLuk").value = L.luk || 0; $("oLuk").textContent = !L.luk ? "ravno" : L.luk > 0 ? "luk " + L.luk : "osmeh " + -L.luk;
  $("pLh").value = L.lh; $("oLh").textContent = Math.round(L.lh * 100) + "%";
  document.querySelectorAll("#pAlign button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === L.align));
  const cols = [...new Set([...T.boje, L.color.toLowerCase()])];
  $("pColors").innerHTML = cols.map(c => `<button class="sw" style="background:${c}" data-c="${c}" aria-label="Boja ${c}" aria-pressed="${c === L.color.toLowerCase()}"></button>`).join("") +
    `<label class="sw sw-pick" title="Druga boja"><input type="color" id="pColor" value="${L.color}" aria-label="Druga boja"></label>`;
}
function setProp(k, v, now) {
  const L = get(sel); if (!L) return;
  L[k] = v;
  if (k === "font" || k === "italic") L.weight = nearestWeight(L.font, L.weight, L.italic);
  if (k === "text" && L.uloga) autoPin(pi);
  refresh(L); syncProps();
  now ? commit() : commitSoon();
}
$("pText").addEventListener("input", e => setProp("text", e.target.value));
$("pFoil").onclick = () => { const L = get(sel); if (!L) return; if (L.fo) delete L.fo; else L.fo = true; refresh(L); syncProps(); commit(); if (dlg.open) renderCfg(); };
$("pWeight").onchange = e => setProp("weight", +e.target.value, true);
$("pItalic").onclick = () => setProp("italic", !get(sel).italic, true);
$("pUpper").onclick = () => setProp("upper", !get(sel).upper, true);
$("pSize").oninput = e => setProp("size", +e.target.value);
$("pSizeN").onchange = e => setProp("size", Math.max(4, Math.min(200, +e.target.value || 12)), true);
$("pLs").oninput = e => setProp("ls", +e.target.value);
$("pLuk").oninput = e => setProp("luk", +e.target.value);
$("pLh").oninput = e => setProp("lh", +e.target.value);
$("pAlign").onclick = e => { const b = e.target.closest("button"); if (b) setProp("align", b.dataset.v, true); };
$("pColors").addEventListener("click", e => { const b = e.target.closest(".sw[data-c]"); if (b) setProp("color", b.dataset.c, true); });
$("pColors").addEventListener("input", e => { if (e.target.id === "pColor") { const L = get(sel); L.color = e.target.value; refresh(L); commitSoon(); } });
$("pColors").addEventListener("change", e => { if (e.target.id === "pColor") syncProps(); });

function renderList() {
  $("layerList").replaceChildren(...[...layers].reverse().map(L => {
    const b = document.createElement("button");
    b.setAttribute("aria-current", L.id === sel);
    b.innerHTML = `<i>Aa</i><span></span>`;
    b.querySelector("i").style.fontFamily = `"${L.font}"`;
    b.querySelector("span").textContent = L.text.replace(/\n/g, " / ") || "(prazno)";
    b.onclick = () => { select(L.id); if (innerWidth < 980) box.scrollIntoView({ behavior: "smooth", block: "center" }); };
    return b;
  }));
}

/* ---------------- birač fonta ---------------- */
let fpCat = "sve";
const NEMA = window.FONT_NEMA || {};
// Slova iz teksta kojih nema u fontu (npr. č, ć, đ u nekim kaligrafskim fontovima).
const fali = L => [...new Set([...(L.upper ? L.text.toLocaleUpperCase("sr") : L.text)].filter(c => (NEMA[L.font] || "").includes(c)))];
function closeFontPicker() { $("fp").hidden = true; $("fpBtn").setAttribute("aria-expanded", false); }
$("fpBtn").onclick = () => {
  const open = $("fp").hidden;
  $("fp").hidden = !open; $("fpBtn").setAttribute("aria-expanded", open);
  if (open) { renderFontList(); $("fpList").querySelector("[aria-selected=true]")?.scrollIntoView({ block: "center" }); }
};
$("fpCats").innerHTML = [["sve", "Svi"], ["koriste", "U dizajnu"], ...Object.entries(CATS)].map(([k, v]) => `<button data-c="${k}" aria-pressed="${k === fpCat}">${v}</button>`).join("");
$("fpCats").onclick = e => { const b = e.target.closest("button"); if (!b) return; fpCat = b.dataset.c; $("fpCats").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); renderFontList(); };
$("fpSearch").oninput = renderFontList;
$("fpCyr").onchange = renderFontList;
const fio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { ensureFont(e.target.dataset.f); fio.unobserve(e.target); } }), { root: $("fpList"), rootMargin: "120px" });
function renderFontList() {
  const q = $("fpSearch").value.trim().toLowerCase(), cyr = $("fpCyr").checked, cur = get(sel)?.font;
  const used = new Set(layers.map(L => L.font));
  // fontovi kojima fale naša slova (FONT_NEMA) se ne nude, osim ako ih dizajn već koristi
  const list = FONTOVI.filter(([n, c, cy]) => (!NEMA[n] || used.has(n)) &&
    (fpCat === "sve" || (fpCat === "koriste" ? used.has(n) : c === fpCat)) && (!cyr || cy) && (!q || n.toLowerCase().includes(q)));
  fio.disconnect();
  $("fpList").replaceChildren(...list.map(([n, c, cy]) => {
    const b = document.createElement("button");
    b.setAttribute("role", "option"); b.dataset.f = n; b.setAttribute("aria-selected", n === cur);
    b.innerHTML = `<span style="font-family:'${n}',serif">${n}</span><small>${cy ? "ЋИР · " : ""}${CATS[c]}</small>`;
    b.onclick = () => { setProp("font", n, true); $("fpList").querySelectorAll("[aria-selected]").forEach(x => x.setAttribute("aria-selected", x === b)); };
    fio.observe(b);
    return b;
  }));
  $("fpCount").textContent = `${list.length} od ${FONTOVI.length - Object.keys(NEMA).length}`;
}

/* ---------------- izvoz (PNG / PDF) ---------------- */
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 3200); }
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }

// Tekst crtamo sami na canvas, red po red, na tačnim pozicijama koje je izračunao pregledač,
// pa je slika identična onome što kupac vidi u editoru.
const loadImg = async src => { const img = new Image(); img.src = src; await img.decode(); return img; };
// Sjaj folije iz CSS gradijenta (FOLIJE[x].sjaj) prenosimo na canvas, dijagonalno preko cele strane.
function foilGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, W(), H());
  for (const [, c, p] of FOLIJE[foil].sjaj.matchAll(/(#[0-9a-f]{6}) (\d+)%/gi)) g.addColorStop(p / 100, c);
  return g;
}
// mode: "kompozit" = kako izgleda (pregled), "stampa" = samo ono što ide u kolor štampu,
// "folija" = crno na belom, sve što ide u foliotisak (tekst + crtež sa sloja folije),
// "priprema" = priprema za štampu: kolor štampa, a sve što ide u foliju u tamnosivoj (FOLIJA_PRIPREMA),
// isto kao u Mango PDF-ovima od dizajnera.
const FOLIJA_PRIPREMA = "#45474a";
async function renderCanvas(scale, watermark, mode = "kompozit") {
  stopEdit(true);
  await Promise.all(layers.map(L => document.fonts.load(`${L.italic ? "italic " : ""}${L.weight} 40px "${L.font}"`, L.text || "A").catch(() => {})));
  await document.fonts.ready;
  const cv = document.createElement("canvas");
  cv.width = Math.round(W() * scale); cv.height = Math.round(H() * scale);
  const ctx = cv.getContext("2d");
  ctx.scale(scale, scale);
  const p = PG(), fx = L => !!foil && (!!T.folija || !!L.fo);   // da li tekst ide u foliotisak
  if (mode === "folija") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W(), H()); }
  else { const bg = await loadImg(await bgUrl(p)); ctx.drawImage(bg, 0, 0, W(), H()); wmDark = isDark(bg); await fotoDraw(ctx, pi); }
  const route = routeSVG(pi), tl = tlSVG(pi);
  for (const src of mode === "stampa" ? [] : [p.folija, mapOf(pi), route && svgUrl(route), tl && svgUrl(tl)].filter(Boolean)) {
    const art = await loadImg(src);
    if (mode === "folija") ctx.drawImage(art, 0, 0, W(), H());
    else {
      const off = document.createElement("canvas"); off.width = cv.width; off.height = cv.height;
      const o = off.getContext("2d"); o.scale(scale, scale);
      o.drawImage(art, 0, 0, W(), H());
      o.globalCompositeOperation = "source-in"; o.fillStyle = mode === "priprema" ? FOLIJA_PRIPREMA : foilGradient(o); o.fillRect(0, 0, W(), H());
      ctx.drawImage(off, 0, 0, W(), H());
    }
  }
  for (const L of layers) {
    if (mode === "stampa" && fx(L) || mode === "folija" && !fx(L)) continue;
    const el = elOf(L.id);
    if (!L.text.trim()) continue;
    const px = L.size * PT;
    ctx.font = `${L.italic ? "italic " : ""}${L.weight} ${px}px "${L.font}"`;
    ctx.fillStyle = mode === "folija" ? "#000" : fx(L) ? (mode === "priprema" ? FOLIJA_PRIPREMA : foilGradient(ctx)) : L.color; ctx.textBaseline = "alphabetic";
    const asc = ctx.measureText("Hg").fontBoundingBoxAscent ?? px * 0.8;
    const lsPx = L.ls / 1000 * px;
    for (const ln of charsOf(L, el)) {
      const base = ln.y + asc;
      if (L.luk) for (const p of arcOf(L, ln, base)) { ctx.save(); ctx.translate(p.cx, p.y); ctx.rotate(p.rot); ctx.fillText(p.c, -p.hw, 0); ctx.restore(); }
      else if (Math.abs(lsPx) < 0.01) ctx.fillText(ln.chars.map(c => c.c).join(""), ln.chars[0].x, base);
      else for (const ch of ln.chars) ctx.fillText(ch.c, ch.x, base);
    }
  }
  // watermark "blag" = samo dijagonalni žig, bez trake na dnu (pregled pre porudžbine)
  if (watermark) {
    ctx.save();
    const fs = W() / 26;
    ctx.font = `400 ${fs}px "Jost", sans-serif`;
    ctx.translate(W() / 2, H() / 2); ctx.rotate(-24 * Math.PI / 180);
    const txt = "MANGO POZIVNICE · PRIPREMA     ", tw = ctx.measureText(txt).width, D = Math.hypot(W(), H()), [col, op] = WM();
    const blag = watermark === "blag";
    ctx.fillStyle = col; ctx.globalAlpha = blag ? op : op + .03;
    for (let y = -D / 2; y < D / 2; y += fs * (blag ? 5.5 : 3.2)) for (let x = -D / 2 - ((y / fs) % 2) * tw / 2; x < D / 2; x += tw) ctx.fillText(txt, x, y);
    ctx.restore();
    if (watermark !== "blag") {
      ctx.fillStyle = "rgba(28,54,39,.78)"; ctx.fillRect(0, H() - fs * 0.9, W(), fs * 0.9);
      ctx.font = `400 ${fs * 0.34}px "Jost", sans-serif`; ctx.fillStyle = "#e4cf9f"; ctx.textAlign = "center";
      ctx.fillText("PRIPREMA · NIJE ZA ŠTAMPU · @MANGO.POZIVNICE", W() / 2, H() - fs * 0.33);
    }
  }
  return cv;
}
function download(url, name) { const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
// Prolazi kroz sve strane (svaku prikaže, da bi pozicije teksta bile tačne) i vraća se na otvorenu.
async function eachPage(fn) {
  const cur = pi;
  try { for (let k = 0; k < T.strane.length; k++) { if (k !== pi) showPage(k); await new Promise(r => requestAnimationFrame(r)); await fn(k); } }
  finally { if (pi !== cur) showPage(cur); }
}
const pageTag = () => T.strane.length > 1 ? "-" + PG().id : "";
async function exportPNG(wm) {
  document.body.classList.add("busy");
  try {
    const cv = await renderCanvas(wm ? 0.8 : 300 / 254, wm);
    download(cv.toDataURL("image/png"), `mango-${T.id}${pageTag()}-${wm ? "priprema" : "stampa"}.png`);
    const strana = T.strane.length > 1 ? ` (${PG().naziv.toLowerCase()})` : "";
    toast(wm ? `Priprema${strana} je preuzeta, sa vodenim žigom.` : `PNG bez žiga${strana} je preuzet.`);
  } catch (err) { console.error(err); toast("Priprema nije napravljena. Otvorite stranicu preko sajta, ne kao fajl."); }
  document.body.classList.remove("busy");
}
// E-pozivnica za kupca koji je platio: sve strane jedna ispod druge, bez žiga, u jednoj slici za Viber/WhatsApp.
async function exportEPozivnica() {
  document.body.classList.add("busy");
  try {
    const shots = [], px = 1600, pad = 70, gap = 50;
    await eachPage(async () => shots.push(await renderCanvas(px / Math.max(...T.strane.map(s => s.mm[0] * 10)), false)));
    const cv = document.createElement("canvas");
    cv.width = Math.max(...shots.map(c => c.width)) + pad * 2;
    cv.height = shots.reduce((a, c) => a + c.height, 0) + gap * (shots.length - 1) + pad * 2;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#f6f1e8"; ctx.fillRect(0, 0, cv.width, cv.height);
    let y = pad;
    for (const c of shots) {
      const x = (cv.width - c.width) / 2;
      ctx.save(); ctx.shadowColor = "rgba(40,30,20,.18)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#fff"; ctx.fillRect(x, y, c.width, c.height); ctx.restore();
      ctx.drawImage(c, x, y); y += c.height + gap;
    }
    download(cv.toDataURL("image/jpeg", .92), `mango-e-pozivnica-${T.id}.jpg`);
    toast("E-pozivnica bez žiga je preuzeta. Pošaljite je kupcu.");
  } catch (err) { console.error(err); toast("E-pozivnica nije napravljena."); }
  document.body.classList.remove("busy");
}
// Priprema za štampu: vektorski PDF (editor/stampa-pdf.js), jedna stranica po strani + 3 mm za sečenje.
// Biblioteke (js/vendor/mango-pdf.js, ~800 KB) se učitavaju tek ovde, pa ne usporavaju sajt kupcima.
async function exportPDF() {
  document.body.classList.add("busy");
  toast("Pravim vektorski PDF za štampu…");
  try {
    if (!window.MangoPDF) await loadScript("js/vendor/mango-pdf.js?v=5");
    if (!window.stampaPDF) await loadScript("editor/stampa-pdf.js?v=10");
    const r = await stampaPDF();
    const n = `${r.strane} ${r.strane === 1 ? "stranica" : "stranice"}`;
    toast(r.missing ? `PDF je napravljen (${n}), ali font nema ova slova: ${[...new Set(r.znaci.map(z => z.split(" ")[0]))].join(" ")}. U PDF-u ih nema, promenite font tog teksta.`
      : foil ? `Vektorski PDF: ${n}, 3 mm za sečenje. Sve u tamnosivoj ide u foliju (${FOLIJE[foil].naziv}).` : `Vektorski PDF: ${n}, 3 mm za sečenje.`);
  } catch (err) { console.error(err); toast("PDF nije napravljen. Pogledajte konzolu."); }
  document.body.classList.remove("busy");
}

/* ---------------- link do dizajna ---------------- */
const b64u = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function encodeDesign() {
  pages[pi] = layers;
  const strip = P => P.map(({ id, ...L }) => L);
  const data = JSON.stringify(true ? { t: T.id, p: pages.map(strip), f: foil, m: pins, b: tint, v: vrsta, s: sat, fo: fmt, fz: 1, pr, ph: fot } : { t: T.id, l: strip(layers) });
  const raw = new TextEncoder().encode(data);
  if (window.CompressionStream) {
    const buf = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
    return "z" + b64u(new Uint8Array(buf));
  }
  return "j" + b64u(raw);
}
async function decodeDesign(s) {
  let bytes = unb64u(s.slice(1));
  if (s[0] === "z") bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function designLink() { return location.origin + location.pathname + "#d=" + await encodeDesign(); }

/* ---------------- pregled pre porudžbine ---------------- */
// Sve strane zajedno, u pravom odnosu veličina, sa blagim žigom; ispod je sažetak izbora.
// kind: "stampa" / "e" = otvoren iz „Poruči“, pa dugme vodi dalje na porudžbinu; null = samo pregled.
const prev = $("prev");
let prevKind = null, prevRun = 0;
async function openPreview(kind) {
  stopEdit(); select(null);
  prevKind = kind;
  const run = ++prevRun;
  $("prevEyebrow").textContent = kind ? "Pre porudžbine" : "Pregled";
  $("prevGo").textContent = kind === "e" ? "Izgleda dobro, nastavi" : "Izgleda dobro, poruči";
  $("prevWarn").hidden = true;
  $("prevSum").innerHTML = previewSummary();
  // jedinica: najduža ivica bilo koje strane = 440 px na ekranu (na telefonu manje)
  const maxMm = Math.max(...T.strane.flatMap(s => s.mm));
  const pc = $("prevPages");
  pc.style.setProperty("--n", T.strane.length);
  pc.innerHTML = T.strane.map((s, k) => `<figure style="--w:${s.mm[0] / maxMm}"><div class="prev-sheet" style="aspect-ratio:${s.mm[0]}/${s.mm[1]}"><span class="prev-load"></span></div><figcaption>${T.strane.length > 1 ? `<b>${k + 1}</b> ${esc(s.naziv)} · ` : ""}${cm(s.mm[0])} × ${cm(s.mm[1])} cm</figcaption></figure>`).join("");
  if (!prev.open) prev.showModal();
  document.body.classList.add("busy");
  const out = [];
  try {
    const scale = 900 / (maxMm * 10);
    await eachPage(async k => {
      if (run !== prevRun) return;
      const cv = await renderCanvas(scale, "blag");
      // posle učitavanja fontova ponovo proveravamo ivice (raspored slova se tada promeni)
      layers.forEach(L => { const el = elOf(L.id); if (el) checkSafe(el, L); });
      if (layersEl.querySelector(".L.out")) out.push(k);
      const sheet = pc.children[k]?.querySelector(".prev-sheet");
      if (sheet && run === prevRun) { cv.setAttribute("role", "img"); cv.setAttribute("aria-label", T.strane[k].naziv); sheet.replaceChildren(cv); }
    });
  } catch (err) { console.error(err); toast("Pregled nije napravljen. Pokušajte ponovo."); }
  document.body.classList.remove("busy");
  if (run !== prevRun) return;
  if (out.length) {
    const w = $("prevWarn");
    w.innerHTML = `<b>Proverite pre porudžbine:</b> tekst je preblizu ivice i može biti odsečen pri sečenju papira` +
      (T.strane.length > 1 ? ` (${out.map(k => `<button type="button" data-p="page" data-k="${k}">${esc(T.strane[k].naziv.toLowerCase())}</button>`).join(", ")}).` : `. <button type="button" data-p="page" data-k="0">Popravite</button>`);
    w.hidden = false;
  }
}
function previewSummary() {
  const B = baseOf(), row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const V = vrsta && B.vrste ? B.vrste.find(v => v.id === vrsta) : null;
  return row("Šablon", esc(T.naziv) + (V ? " · " + esc(V.naziv) : "")) +
    (fmt ? row("Format", FORMATI[fmt].naziv) : row("Veličina", T.strane.length > 1 ? T.strane.map(s => `${cm(s.mm[0])} × ${cm(s.mm[1])}`).join(" + ") + " cm" : dims(T))) +
    (T.papir ? row("Papir", esc(T.papir)) : "") +
    (tint && HEX.test(tint) ? row("Boja pozadine", `<i class="prev-dot" style="background:${tint}"></i>${esc(tintName() || "po želji")}`) : "") +
    (fotoAny() ? row("Fotografija", T.strane.some((s, k) => fotoHas(k)) ? "dodata" : '<span class="warn">nije dodata</span>') : "") +
    (foil ? row("Foliotisak", `<i class="prev-dot" style="background:${FOLIJE[foil].sjaj}"></i>${esc(FOLIJE[foil].naziv)}`) : "");
}
prev.addEventListener("click", e => {
  if (e.target === prev) { prevRun++; prev.close(); return; }
  const b = e.target.closest("[data-p]"); if (!b) return;
  if (b.dataset.p === "close") { prevRun++; prev.close(); }
  if (b.dataset.p === "page") { prevRun++; prev.close(); const k = +b.dataset.k; if (k !== pi) showPage(k); layers.forEach(L => { const el = elOf(L.id); if (el) checkSafe(el, L); }); box.scrollIntoView({ behavior: "smooth", block: "center" }); }
  if (b.dataset.p === "order") { prevRun++; prev.close(); openOrder(prevKind || "stampa"); }
});
prev.addEventListener("cancel", () => { prevRun++; });

/* ---------------- porudžbina ---------------- */
const dlg = $("order");
function openOrder(kind) {
  stopEdit();
  dlg.querySelector(`input[name=kind][value="${kind}"]`).checked = true;
  syncKind(); renderCfg();
  const d = store.get("mango-ed:kontakt");
  if (d) ["oName", "oPhone", "oEmail"].forEach(k => { if (!$(k).value && d[k]) $(k).value = d[k]; });
  dlg.showModal();
}
function syncKind() {
  const e = dlg.querySelector("input[name=kind]:checked").value === "e";
  $("cfg").hidden = $("cContactH").hidden = $("cBar").hidden = e; $("eNote").hidden = !e;
  dlg.classList.toggle("wide", !e);
  $("ePrice").innerHTML = ePozHtml();
  $("orderTitle").textContent = e ? "Elektronska pozivnica" : "Pošaljite nam svoj dizajn";
  $("oEmail").required = e;
}
dlg.addEventListener("change", e => { if (e.target.name === "kind") syncKind(); });
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
async function orderMessage() {
  const v = id => $(id).value.trim();
  const e = dlg.querySelector("input[name=kind]:checked").value === "e";
  const date = v("oDate") ? new Date(v("oDate")).toLocaleDateString("sr-Latn-RS") : "—";
  store.set("mango-ed:kontakt", { oName: v("oName"), oPhone: v("oPhone"), oEmail: v("oEmail") });
  const sablon = `Šablon: ${T.naziv}${vrsta ? " · " + (T.base || T).vrste.find(v => v.id === vrsta).naziv : ""} (${T.strane.length > 1 ? T.strane.map(s => `${s.naziv.toLowerCase()} ${cm(s.mm[0])} × ${cm(s.mm[1])} cm`).join(", ") : dims(T)})`;
  const kontakt = `Ime: ${v("oName") || "—"}
Telefon: ${v("oPhone") || "—"}
E-mail: ${v("oEmail") || "—"}
Datum događaja: ${date}
Napomena: ${v("oNote") || "—"}`;
  if (e) return `Zdravo! Napravio/la sam pozivnicu u vašem editoru.
Vrsta: ELEKTRONSKA pozivnica (bez štampe)
${sablon}
Cena: ${din(ePoz().cena)}${ePoz().stara ? ` (akcija, umesto ${din(ePoz().stara)})` : ""}
${fmt ? `Format: ${FORMATI[fmt].naziv}\n` : ""}${kontakt}

${fotoPoruka()}Moj dizajn: ${await designLink()}`;
  const C = cena(), ft = foilTexts();
  const folija = isPasos() ? `Foliotisak: ${FOLIJE[foil].naziv} (sav tekst i crtež)\n`
    : pr.st === "fol" ? `Foliotisak: ${FOLIJE[foil].naziv}\nU foliji: ${ft.length ? ft.map(t => `„${t}“`).join(", ") : "— (nije označen nijedan tekst)"}\n` : "";
  const kov = pr.kov ? `${dodatak(pr.kov).name}${pr.kb.trim() ? `, boja: ${pr.kb.trim()}` : ""}` : "bez koverte";
  const ost = OSTALO.filter(id => pr.ex.includes(id) && exOk(id)).map(id => dodatak(id).name + (id === "pecat" && pr.pb.trim() ? ` (${pr.pb.trim()})` : ""));
  return `Zdravo! Napravio/la sam pozivnicu u vašem editoru.
Vrsta: Štampane pozivnice
${sablon}
${fmt ? `Format: ${FORMATI[fmt].naziv}\n` : ""}Količina: ${C.q} kom
Papir i štampa: ${stampaNaziv()}${dvostrana() ? ", dvostrana" : ""}
${folija}${tint ? `Boja pozadine: ${tintName() || "po želji"} (${tint}, ${cmykText()})\n` : ""}${isPasos() ? "Pakovanje: bez koverte (pasoš)" : `Koverta: ${kov}`}
Dodaci: ${ost.length ? ost.join(", ") : "—"}

Cena (okvirno):
${C.rows.map(r => `· ${r.n}: ${r.u ? `${C.q} × ${r.u} din = ` : ""}${din(r.t)}`).join("\n")}${C.D ? `\n· Popust ${C.D.pct}%: −${din(C.disc)}` : ""}
UKUPNO: ${din(C.total)} (${din(C.per)} po komadu)

${kontakt}

${fotoPoruka()}Moj dizajn: ${await designLink()}`;
}
const fotoPoruka = () => !fotoAny() ? "" : T.strane.some((s, k) => fotoHas(k))
  ? "Fotografija: šaljem je odmah posle ove poruke (u linku je samo njen položaj).\n\n"
  : "Fotografija: nisam je dodao/la, šaljem je posle ove poruke.\n\n";
async function copy(txt) { try { await navigator.clipboard.writeText(txt); return true; } catch { return false; } }
$("send").onclick = async e => {
  const b = e.target.closest("button"); if (!b) return;
  const isE = dlg.querySelector("input[name=kind]:checked").value === "e";
  if (isE && !$("oEmail").checkValidity() || isE && !$("oEmail").value) { $("oEmail").focus(); toast("Upišite e-mail na koji šaljemo pozivnicu."); return; }
  if (!isE && pr.q < minQty()) { pr.q = minQty(); renderCfg(); commitSoon(); }
  if (!isE && !isPasos() && pr.st === "fol" && !foilTexts().length) { toast("Izabrali ste foliotisak, a nijedan tekst nije označen za foliju. Označite bar jedan tekst."); $("cTexts").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  const txt = await orderMessage(), enc = encodeURIComponent(txt);
  if (b.dataset.ch === "whatsapp") window.open(`https://wa.me/${CONFIG.phone}?text=${enc}`, "_blank");
  if (b.dataset.ch === "viber") { await copy(txt); location.href = `viber://forward?text=${enc}`; toast("Poruka je kopirana i otvara se Viber."); }
  if (b.dataset.ch === "instagram") { await copy(txt); toast("Poruka je kopirana. Nalepite je u DM."); setTimeout(() => window.open(`https://ig.me/m/${CONFIG.instagram}`, "_blank"), 700); }
  if (b.dataset.ch === "copy") toast(await copy(txt) ? "Poruka sa linkom do dizajna je kopirana." : "Kopiranje nije uspelo.");
};

/* ---------------- admin (Mango): prijava lozinkom ---------------- */
// U kodu je samo otisak lozinke (PBKDF2 + SHA-256), ne i lozinka. Posle prijave pregledač pamti izvedeni ključ;
// pri svakom otvaranju proveravamo da njegov otisak odgovara ADMIN.h. Ovo sprečava obične kupce da preuzmu
// pozivnicu bez žiga; pravu zaštitu (server) dobijamo uz plaćanje karticom.
const ADMIN = { so: "3396f9dc2456141a2db62af6cc9dd959", it: 310000, h: "a53f931861ab13b46e714aafe7b4ac430e954a096b3f43ce2c1c89cfc346a83f" };
let isAdmin = false;
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const unhex = h => Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));
async function adminKey(pass) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(ADMIN.so), iterations: ADMIN.it }, k, 256));
}
const adminOk = async key => typeof key === "string" && /^[0-9a-f]{64}$/.test(key) && hex(await crypto.subtle.digest("SHA-256", unhex(key))) === ADMIN.h;
function setAdmin(on) { isAdmin = on; $("app").classList.toggle("admin", on); }
async function adminLogin() {
  const d = $("adminLogin"), f = $("adminForm"), inp = $("adminPass"), err = $("adminErr");
  err.hidden = true; inp.value = ""; d.showModal(); inp.focus();
  f.onsubmit = async e => {
    e.preventDefault();
    if (e.submitter?.value === "close") { d.close(); return; }
    f.classList.add("busy");
    const key = await adminKey(inp.value).catch(() => "");
    f.classList.remove("busy");
    if (await adminOk(key)) { store.set("mango-admin", key); setAdmin(true); d.close(); toast("Prijavljeni ste. Režim za štampu je uključen."); }
    else { err.hidden = false; inp.select(); }
  };
}
$("adminOut").onclick = () => { store.del("mango-admin"); setAdmin(false); toast("Odjavljeni ste iz režima za štampu."); };

/* ---------------- start ---------------- */
(async function init() {
  const qs = new URLSearchParams(location.search);
  // ?admin otvara prijavu, ?admin=0 odjavljuje; parametar se odmah sklanja iz adrese
  if (qs.has("admin")) {
    const a = qs.get("admin"); qs.delete("admin");
    try { history.replaceState(null, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash); } catch {}
    if (a === "0") store.del("mango-admin"); else setTimeout(() => { if (!isAdmin) adminLogin(); }, 300);
  }
  const saved = store.get("mango-admin");
  if (saved && window.crypto?.subtle) adminOk(saved).then(ok => { if (ok) setAdmin(true); else store.del("mango-admin"); });
  fotoInit();
  renderTemplates();
  let preset = null, t = SABLONI.find(x => x.id === qs.get("s")) || SABLONI[0];
  const m = location.hash.match(/#d=([\w-]+)/);
  if (m) {
    try {
      const d = await decodeDesign(m[1]);
      t = SABLONI.find(x => x.id === d.t) || t; preset = d.p ? { p: d.p, f: d.f, m: d.m, b: d.b, v: d.v, s: d.s, fo: d.fo, fz: d.fz, pr: d.pr, ph: d.ph } : { p: [d.l] };
      setTimeout(() => toast("Otvoren je dizajn iz linka."), 400);
    } catch (err) { console.error(err); toast("Link do dizajna nije ispravan."); }
  }
  loadTemplate(t, preset);
  if (preset) commit();
  document.fonts.ready.then(() => layersEl.querySelectorAll(".L").forEach(el => checkSafe(el, get(el.dataset.id))));
})();
