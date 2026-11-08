/* =========================================================
   FOTOGRAFIJA KUPCA U OKVIRU ŠABLONA
   Strana šablona može imati okvir za fotografiju (sabloni/foto-okviri.js, sabloni/uvoz.js),
   ili više okvira (niz), npr. tri fotografije jedna pored druge:
     foto: { x, y, w, h, oblik: "krug" | "luk" | "ram" | "maska", r?, okvir?: [boja, debljina], preko?, maska? }
     foto: [ {…}, {…}, {…} ]
   (jedinice 0,1 mm; luk = gore polukrug, dole ravno; ram = pravougaonik sa uglom r;
    preko = PNG crteža koji ide PREKO fotografije, npr. torta ili cvet koji prelazi ivicu okvira;
    maska = PNG veličine okvira čija providnost je oblik (bilo kakav: talas, prozor, nakrivljen ram) i već
    izostavlja sve što u dizajnu prelazi preko fotografije – pravi ga sabloni/pdf/_alati/canva_foto.py)
   Kupac doda fotografiju, a editor je sam iseče: lice (ili glavni motiv) ide u sredinu okvira.
   Posle toga je prevlači da je pomeri i zumira klizačem ili točkićem miša.
   Stanje: fot[i] = { x, y, z } po strani (jedan okvir) ili niz takvih (više okvira): x, y = tačka slike (0–1)
   koja je u sredini okvira, z = zum (1 = tačno popuni okvir). fj = okvir koji kupac trenutno uređuje.
   Slika: fotoSrc[i][j] (JPEG dataURL, do 2400 px), čuva se odvojeno od nacrta (localStorage
   „mango-ed-foto:šablon:strana“, za drugi i dalje okvire „…:strana.j“), pa istorija i link ostaju mali.
   Link nosi samo x, y, z: kad Mango otvori link i doda iste fotografije, one stanu tačno kako ih je kupac namestio.
   Koristi globalne promenljive iz editor/editor.js (T, pi, PG, $, stage, toast, loadScript, loadImg, store, commit…).
   ========================================================= */
let fot = [], fotoSrc = [], fotoImg = [], fotoOn = false, fj = 0;
const FOTO_MAX = 2400, FOTO_ZMAX = 4;
const okviri = s => !s?.foto ? [] : Array.isArray(s.foto) ? s.foto : [s.foto];
const FR = (i, j) => okviri(T.strane[i])[j];
const fotoKey = (i, j = 0) => "mango-ed-foto:" + T.id + ":" + i + (j ? "." + j : "");
// položaj fotografije u okviru j strane i (fot[i] je objekat za jedan okvir, niz za više)
const fotoP = (i, j) => Array.isArray(fot[i]) ? fot[i][j] || null : j ? null : fot[i];
function fotoSetP(i, j, v) {
  if (okviri(T.strane[i]).length > 1) { if (!Array.isArray(fot[i])) fot[i] = okviri(T.strane[i]).map(() => null); fot[i][j] = v; }
  else fot[i] = v;
}
const fotoImgOf = (i, j) => fotoImg[i]?.[j] || null;
// fotoHas(i) = bar jedna fotografija na strani; fotoHas(i, j) = fotografija u okviru j
const fotoHas = (i, j) => j === undefined ? okviri(T.strane[i]).some((_, k) => fotoHas(i, k)) : !!(FR(i, j) && fotoP(i, j) && fotoImgOf(i, j));
const fotoAny = () => T.strane.some(s => s.foto);

// Okvir u drugom formatu (12,5 × 16,5 ↔ 15 × 15) prati tekstove.
const fitFoto = (F, f) => Array.isArray(F) ? F.map(x => fitFoto(x, f)) : ({ ...F, x: F.x * f.s + f.ox, y: F.y * f.s + f.oy, w: F.w * f.s, h: F.h * f.s, ...(F.r ? { r: F.r * f.s } : {}) });

function validFoto(v) {
  const n = (a, lo, hi, d) => Number.isFinite(+a) ? Math.min(hi, Math.max(lo, +a)) : d;
  return v && typeof v === "object" && !Array.isArray(v) ? { x: n(v.x, 0, 1, .5), y: n(v.y, 0, 1, .5), z: n(v.z, 1, FOTO_ZMAX, 1) } : null;
}
// Stanje strane iz nacrta ili linka: objekat (jedan okvir) ili niz (više okvira).
function fotoValid(s, v) {
  const n = okviri(s).length; if (!n) return null;
  if (n === 1) return validFoto(Array.isArray(v) ? v[0] : v);
  const a = Array.isArray(v) ? v : [v];
  return okviri(s).map((_, j) => validFoto(a[j]));
}

// Gde je slika na strani (0,1 mm): cela slika je pokrivena okvirom, tačka (x, y) je u sredini kad god može.
function fotoGeom(i, j) {
  const F = FR(i, j), img = fotoImgOf(i, j), P = fotoP(i, j), iw = img.naturalWidth, ih = img.naturalHeight;
  const c = Math.max(F.w / iw, F.h / ih) * P.z, dw = iw * c, dh = ih * c;
  const cl = (v, lo) => Math.min(0, Math.max(lo, v));
  return { dx: F.x + cl(F.w / 2 - P.x * dw, F.w - dw), dy: F.y + cl(F.h / 2 - P.y * dh, F.h - dh), dw, dh, c };
}
// Tačka sredine se drži u dozvoljenom opsegu (da se posle velikog povlačenja slika odmah vraća).
function fotoClamp(i, j) {
  const F = FR(i, j), img = fotoImgOf(i, j), P = fotoP(i, j); if (!F || !img || !P) return;
  const c = Math.max(F.w / img.naturalWidth, F.h / img.naturalHeight) * P.z;
  const hx = F.w / 2 / (img.naturalWidth * c), hy = F.h / 2 / (img.naturalHeight * c);
  P.x = Math.min(1 - hx, Math.max(hx, P.x)); P.y = Math.min(1 - hy, Math.max(hy, P.y));
}
// Koliko je fotografija oštra u štampi (tačaka po inču) u ovom okviru i zumu.
const fotoDpi = (i, j) => Math.round(254 / fotoGeom(i, j).c);

/* ---------- oblik okvira ---------- */
function fotoRadius(F) {
  if (F.maska) return "0";
  if (F.oblik === "krug") return "50%";
  if (F.oblik === "luk") return `${F.w / 2}px ${F.w / 2}px ${F.r || 0}px ${F.r || 0}px`;
  return (F.r || 0) + "px";
}
function fotoPath(ctx, F) {
  ctx.beginPath();
  if (F.oblik === "krug") ctx.ellipse(F.x + F.w / 2, F.y + F.h / 2, F.w / 2, F.h / 2, 0, 0, Math.PI * 2);
  else if (F.oblik === "luk") {
    const r = F.w / 2;
    ctx.moveTo(F.x, F.y + F.h); ctx.lineTo(F.x, F.y + r); ctx.arc(F.x + r, F.y + r, r, Math.PI, 0); ctx.lineTo(F.x + F.w, F.y + F.h); ctx.closePath();
  } else if (ctx.roundRect) ctx.roundRect(F.x, F.y, F.w, F.h, F.r || 0);
  else ctx.rect(F.x, F.y, F.w, F.h);
}
// CSS za okvir sa maskom (oblik iz PNG-a)
const fotoMaskCss = F => F.maska ? `-webkit-mask-image:url('${F.maska}');mask-image:url('${F.maska}');-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat` : "";
// Fotografija isečena okvirom, nacrtana na ctx (pregled, PNG, PDF). Maska: preko pomoćnog platna, pa destination-in.
async function fotoClipDraw(ctx, i, j) {
  const F = FR(i, j), g = fotoGeom(i, j), img = fotoImgOf(i, j);
  if (!F.maska) { ctx.save(); fotoPath(ctx, F); ctx.clip(); ctx.drawImage(img, g.dx, g.dy, g.dw, g.dh); ctx.restore(); return; }
  const m = await loadImg(F.maska), k = Math.max(1, Math.hypot(ctx.getTransform().a, ctx.getTransform().b));
  const cv = document.createElement("canvas"); cv.width = Math.ceil(F.w * k); cv.height = Math.ceil(F.h * k);
  const c = cv.getContext("2d"); c.scale(k, k); c.imageSmoothingQuality = "high";
  c.drawImage(img, g.dx - F.x, g.dy - F.y, g.dw, g.dh);
  c.globalCompositeOperation = "destination-in"; c.drawImage(m, 0, 0, F.w, F.h);
  ctx.drawImage(cv, F.x, F.y, F.w, F.h);
}
// Da li je tačka (0,1 mm) u okviru.
function fotoIn(F, x, y) {
  if (x < F.x || x > F.x + F.w || y < F.y || y > F.y + F.h) return false;
  if (F.maska) return true;
  if (F.oblik === "krug") return ((x - F.x - F.w / 2) / (F.w / 2)) ** 2 + ((y - F.y - F.h / 2) / (F.h / 2)) ** 2 <= 1;
  if (F.oblik === "luk" && y < F.y + F.w / 2) return Math.hypot(x - F.x - F.w / 2, y - F.y - F.w / 2) <= F.w / 2;
  return true;
}
// Da li je pokazivač u nekom okviru strane; ako jeste, taj okvir postaje izabran (fj).
function fotoHit(e) {
  const L = okviri(PG()); if (!L.length) return false;
  const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / S, y = (e.clientY - r.top) / S;
  const j = L.findIndex(F => fotoIn(F, x, y)); if (j < 0) return false;
  if (j !== fj) { fj = j; renderFoto(); }
  return true;
}
// Prazan okvir (na pozivnici i u listi šablona): svetla podloga sa ikonicom fotoaparata.
const FOTO_IKONA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg>';
// Primer-fotografija (fotoPrimer iz sabloni/foto-okviri.js) je samo za prikaz: ne crta se u PNG/PDF/pregled.
const fotoPrimerCss = (t, j) => window.fotoPrimer ? `background-image:url('${fotoPrimer(t, j)}');` : "";
function fotoThumb(F, t, j = 0) {
  if (Array.isArray(F)) return F.map((x, k) => fotoThumb(x, t, k)).join("");
  const pr = fotoPrimerCss(t, j);
  return `<div class="foto empty${pr ? " primer" : ""}${F.maska ? " maska" : ""}" style="left:${F.x}px;top:${F.y}px;width:${F.w}px;height:${F.h}px;border-radius:${fotoRadius(F)};${pr}${fotoMaskCss(F)}">${pr ? "" : FOTO_IKONA}</div>` +
    (F.preko ? `<img class="foto-preko" src="${F.preko}" alt="">` : "");
}

/* ---------- prikaz u editoru ---------- */
// Okvir 0 je #foto iz editor.html; ostali su njegove kopije (data-j).
function fotoBoxes(n) {
  const first = $("foto"), out = [first];
  stage.querySelectorAll(".foto[data-j]").forEach(b => { if (+b.dataset.j >= n) b.remove(); });
  for (let j = 1; j < n; j++) {
    let b = stage.querySelector(`.foto[data-j="${j}"]`);
    if (!b) {
      b = first.cloneNode(true); b.removeAttribute("id"); b.dataset.j = j;
      b.querySelector("img").removeAttribute("id"); b.querySelector("img").removeAttribute("src");
      ([...stage.querySelectorAll(".foto[data-j]")].pop() || first).after(b);
    }
    out.push(b);
  }
  return out;
}
function renderFoto() {
  const L = okviri(PG()), any = L.length > 0;
  if (fj >= L.length) fj = 0;
  const boxes = fotoBoxes(Math.max(1, L.length)), preko = L.find(F => F.preko);
  $("foto").hidden = !any; $("fotoPreko").hidden = !preko;
  $("fotoBox").hidden = !any;
  stage.classList.toggle("foto-on", any && fotoHas(pi, fj) && fotoOn);
  if (!any) return;
  if (preko && $("fotoPreko").getAttribute("src") !== preko.preko) $("fotoPreko").src = preko.preko;
  L.forEach((F, j) => {
    const box = boxes[j], has = fotoHas(pi, j);
    box.hidden = false;
    Object.assign(box.style, { left: F.x + "px", top: F.y + "px", width: F.w + "px", height: F.h + "px", borderRadius: fotoRadius(F),
      boxShadow: F.okvir ? `0 0 0 ${F.okvir[1]}px ${F.okvir[0]}` : "" });
    for (const p of ["maskImage", "webkitMaskImage"]) box.style[p] = F.maska ? `url('${F.maska}')` : "";
    for (const p of ["maskSize", "webkitMaskSize"]) box.style[p] = F.maska ? "100% 100%" : "";
    for (const p of ["maskRepeat", "webkitMaskRepeat"]) box.style[p] = F.maska ? "no-repeat" : "";
    box.classList.toggle("maska", !!F.maska);
    box.classList.toggle("empty", !has);
    // prazan okvir: primer-fotografija dok kupac ne doda svoju
    const pr = !has && window.fotoPrimer ? `url("${fotoPrimer(T.base || T, j)}")` : "";
    if (box.style.backgroundImage !== pr) box.style.backgroundImage = pr;
    box.classList.toggle("primer", !!pr);
    box.classList.toggle("akt", j === fj);
    const im = box.querySelector("img");
    if (has) {
      fotoClamp(pi, j);
      if (im.src !== fotoSrc[pi][j]) im.src = fotoSrc[pi][j];
      const g = fotoGeom(pi, j);
      Object.assign(im.style, { left: g.dx - F.x + "px", top: g.dy - F.y + "px", width: g.dw + "px", height: g.dh + "px" });
    } else im.removeAttribute("src");
  });
  // panel (za izabrani okvir; kad ih je više, dugmići za izbor)
  const has = fotoHas(pi, fj), tabs = $("fotoTabs");
  tabs.hidden = L.length < 2;
  if (L.length > 1) tabs.innerHTML = L.map((_, j) => `<button type="button" data-j="${j}" aria-pressed="${j === fj}">${j + 1}${fotoHas(pi, j) ? " ✓" : ""}</button>`).join("");
  $("fotoLab").textContent = L.length > 1 ? `Fotografije (${L.length})` : "Fotografija";
  $("fotoPick").textContent = (has ? "Zameni fotografiju" : "Dodaj fotografiju") + (L.length > 1 ? " " + (fj + 1) : "");
  $("fotoAuto").disabled = $("fotoDel").disabled = $("fotoZ").disabled = !has;
  if (has && document.activeElement !== $("fotoZ")) $("fotoZ").value = fotoP(pi, fj).z;
  const dpi = has ? fotoDpi(pi, fj) : 0, n = L.filter((_, j) => fotoHas(pi, j)).length;
  $("oFoto").textContent = L.length > 1 ? `${n} od ${L.length}` + (has && dpi < 150 ? " · slabija oštrina" : "") : has ? (dpi < 150 ? "slabija oštrina" : "dodata") : "nije dodata";
  $("fotoWarn").hidden = !has || dpi >= 150;
}

/* ---------- dodavanje fotografije ---------- */
async function fotoLoadSaved() {
  const t = T.id, jobs = [];
  T.strane.forEach((s, i) => okviri(s).forEach((_, j) => {
    const u = store.get(fotoKey(i, j));
    if (u && typeof u === "string" && u.startsWith("data:image/")) jobs.push(loadImg(u).then(img => ({ i, j, u, img }), () => null));
  }));
  const done = (await Promise.all(jobs)).filter(Boolean);
  if (T.id !== t) return;   // u međuvremenu je otvoren drugi šablon
  // fotografija dodata dok se ova učitavala ostaje
  for (const { i, j, u, img } of done) {
    fotoSrc[i] ||= []; fotoImg[i] ||= [];
    if (!fotoImg[i][j]) { fotoSrc[i][j] = u; fotoImg[i][j] = img; }
  }
  renderFoto();
}
// Fotografija sa telefona je često 12+ MP; smanjujemo je na najviše 2400 px (dovoljno za 300 dpi okvir od 20 cm).
async function fotoPrepare(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url), k = Math.min(1, FOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", .9);
  } finally { URL.revokeObjectURL(url); }
}
// Automatsko uklapanje: lica (gde pregledač ume da ih nađe) ili smartcrop (traži kožu, ivice i jake boje).
async function fotoAutoFit(i, j) {
  const F = FR(i, j), img = fotoImgOf(i, j), iw = img.naturalWidth, ih = img.naturalHeight;
  const cover = Math.max(F.w / iw, F.h / ih);
  let faces = [];
  if ("FaceDetector" in window) {
    try { faces = (await new FaceDetector({ fastMode: true, maxDetectedFaces: 6 }).detect(img)).map(f => f.boundingBox).filter(b => b.width > iw * .03); } catch {}
  }
  if (faces.length) {
    const x0 = Math.min(...faces.map(b => b.x)), y0 = Math.min(...faces.map(b => b.y));
    const x1 = Math.max(...faces.map(b => b.x + b.width)), y1 = Math.max(...faces.map(b => b.y + b.height));
    // jedno lice zauzima oko 45 % visine okvira; više lica staje sa malo prostora oko njih
    const want = faces.length === 1 ? .45 * F.h / (y1 - y0) : Math.min(.8 * F.w / (x1 - x0), .6 * F.h / (y1 - y0));
    const z = Math.min(FOTO_ZMAX, Math.max(1, want / cover));
    // lice malo iznad sredine okvira (ostaje mesta za ramena)
    return { x: (x0 + x1) / 2 / iw, y: ((y0 + y1) / 2 + .06 * F.h / (cover * z)) / ih, z };
  }
  try {
    if (!window.smartcrop) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/smartcrop/2.0.5/smartcrop.min.js");
    const r = (await smartcrop.crop(img, { width: F.w, height: F.h, minScale: .75, ruleOfThirds: false })).topCrop;
    return { x: (r.x + r.width / 2) / iw, y: (r.y + r.height / 2) / ih, z: Math.min(FOTO_ZMAX, Math.max(1, F.w / r.width / cover)) };
  } catch (err) {
    console.error(err);
    return { x: .5, y: ih > iw ? .4 : .5, z: 1 };   // portret: malo iznad sredine, gde je obično lice
  }
}
async function fotoAdd(file) {
  if (!file) return;
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) { toast("Izaberite fotografiju (JPG ili PNG)."); return; }
  const i = pi, j = fj;
  document.body.classList.add("busy"); toast("Uklapam fotografiju…");
  try {
    const src = await fotoPrepare(file);
    fotoSrc[i] ||= []; fotoImg[i] ||= [];
    fotoSrc[i][j] = src; fotoImg[i][j] = await loadImg(src);
    // Dizajn iz linka već ima položaj (kupac ga je namestio): ista fotografija staje na isto mesto.
    const keep = fotoP(i, j) && !store.get(fotoKey(i, j)) && fotoFromLink;
    if (!keep) fotoSetP(i, j, await fotoAutoFit(i, j));
    store.set(fotoKey(i, j), src);
    if (store.get(fotoKey(i, j)) !== src) toast("Fotografija je uklopljena, ali je prevelika da se sačuva u pregledaču. Ostaje dok ne zatvorite stranicu.");
    else toast(keep ? "Fotografija je postavljena kako ju je kupac namestio." : "Fotografija je uklopljena. Prevucite je da je pomerite, a klizačem je približite.");
    fotoOn = true;
    // sledeći prazan okvir na strani postaje izabran, da kupac odmah doda i sledeću
    const L = okviri(T.strane[i]), next = L.findIndex((_, k) => !fotoHas(i, k));
    if (i === pi && L.length > 1 && next >= 0) { fj = next; fotoOn = false; }
    if (i === pi) renderFoto();
    commit();
  } catch (err) { console.error(err); toast("Ova fotografija ne može da se otvori. Probajte JPG ili PNG."); }
  document.body.classList.remove("busy");
}
let fotoFromLink = false;
function fotoPick() { $("fotoFile").value = ""; $("fotoFile").click(); }

/* ---------- crtanje (pregled, PNG, e-pozivnica, PDF) ---------- */
async function fotoDraw(ctx, i) {
  const L = okviri(T.strane[i]); if (!L.length) return;
  for (let j = 0; j < L.length; j++) {
    const F = L[j]; if (!fotoHas(i, j)) continue;
    if (F.okvir) { ctx.save(); fotoPath(ctx, F); ctx.strokeStyle = F.okvir[0]; ctx.lineWidth = F.okvir[1] * 2; ctx.stroke(); ctx.restore(); }
    await fotoClipDraw(ctx, i, j);
  }
  for (const F of L) if (F.preko) ctx.drawImage(await loadImg(F.preko), 0, 0, W(), H());
}
// Za PDF: svaki okvir sa fotografijom kao PNG sa providnom pozadinom, 300 dpi. Vraća [{ url, x, y, w, h }] u 0,1 mm.
async function fotoRaster(i) {
  const out = [];
  for (const [j, F] of okviri(T.strane[i]).entries()) {
    if (!fotoHas(i, j)) continue;
    const m = F.okvir ? F.okvir[1] + 2 : 2, k = 300 / 254;
    const x = F.x - m, y = F.y - m, w = F.w + 2 * m, h = F.h + 2 * m;
    const cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const ctx = cv.getContext("2d"); ctx.scale(k, k); ctx.translate(-x, -y);
    if (F.okvir) { ctx.save(); fotoPath(ctx, F); ctx.strokeStyle = F.okvir[0]; ctx.lineWidth = F.okvir[1] * 2; ctx.stroke(); ctx.restore(); }
    await fotoClipDraw(ctx, i, j);
    out.push({ url: cv.toDataURL("image/png"), x, y, w, h });
  }
  return out;
}

/* ---------- pomeranje i zum ---------- */
function fotoPan(d, e) {
  const P = fotoP(pi, fj); if (!P) return;
  const g = fotoGeom(pi, fj);
  P.x = d.F0.x - (e.clientX - d.sx) / S / g.dw;
  P.y = d.F0.y - (e.clientY - d.sy) / S / g.dh;
  renderFoto();
}
function fotoZoom(z, now) {
  if (!fotoHas(pi, fj)) return;
  fotoP(pi, fj).z = Math.min(FOTO_ZMAX, Math.max(1, z));
  renderFoto();
  now ? commit() : commitSoon();
}
function fotoSetOn(on) { if (fotoOn !== on) { fotoOn = on; stage.classList.toggle("foto-on", on && fotoHas(pi, fj)); } }

function fotoInit() {
  // dugmići za izbor okvira (kad strana ima više fotografija) i naslov panela
  const lab = $("oFoto").parentNode; lab.firstChild.replaceWith(Object.assign(document.createElement("span"), { id: "fotoLab", textContent: "Fotografija" }), " ");
  const tabs = Object.assign(document.createElement("div"), { id: "fotoTabs", className: "foto-tabs", hidden: true });
  tabs.setAttribute("role", "group"); tabs.setAttribute("aria-label", "Okvir za fotografiju");
  $("fotoPick").before(tabs);
  tabs.addEventListener("click", e => { const b = e.target.closest("[data-j]"); if (!b) return; fj = +b.dataset.j; fotoOn = fotoHas(pi, fj); renderFoto(); });
  $("fotoFile").addEventListener("change", e => fotoAdd(e.target.files[0]));
  $("fotoPick").addEventListener("click", fotoPick);
  $("fotoAuto").addEventListener("click", async () => { if (!fotoHas(pi, fj)) return; fotoSetP(pi, fj, await fotoAutoFit(pi, fj)); renderFoto(); commit(); toast("Fotografija je ponovo uklopljena."); });
  $("fotoDel").addEventListener("click", () => { fotoSetP(pi, fj, null); fotoSetOn(false); renderFoto(); commit(); toast("Fotografija je uklonjena. Vraćate je sa „Nazad“."); });
  $("fotoZ").addEventListener("input", e => fotoZoom(+e.target.value));
  $("fotoZ").addEventListener("change", e => fotoZoom(+e.target.value, true));
  // točkić miša iznad fotografije = zum
  stage.addEventListener("wheel", e => {
    if (e.target.closest(".L") || !fotoHit(e) || !fotoHas(pi, fj)) return;
    e.preventDefault(); fotoSetOn(true);
    fotoZoom(fotoP(pi, fj).z * Math.exp(-e.deltaY * .0015));
  }, { passive: false });
  // prevucite fotografiju sa računara pravo na okvir
  stage.addEventListener("dragover", e => { if (PG().foto && e.dataTransfer?.types?.includes("Files")) e.preventDefault(); });
  stage.addEventListener("drop", e => { const f = e.dataTransfer?.files?.[0]; if (PG().foto && f) { e.preventDefault(); fotoHit(e); fotoAdd(f); } });
}
