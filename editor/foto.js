/* =========================================================
   FOTOGRAFIJA KUPCA U OKVIRU ŠABLONA
   Strana šablona može imati okvir za fotografiju (sabloni/foto-okviri.js):
     foto: { x, y, w, h, oblik: "krug" | "luk" | "ram" | "maska", r?, okvir?: [boja, debljina], preko?, maska? }
   (jedinice 0,1 mm; luk = gore polukrug, dole ravno; ram = pravougaonik sa uglom r;
    preko = PNG crteža koji ide PREKO fotografije, npr. torta ili cvet koji prelazi ivicu okvira;
    maska = PNG veličine okvira čija providnost je oblik (bilo kakav: talas, tri prozora, nakrivljen ram) i već
    izostavlja sve što u dizajnu prelazi preko fotografije – pravi ga sabloni/pdf/_alati/canva_foto.py)
   Kupac doda fotografiju, a editor je sam iseče: lice (ili glavni motiv) ide u sredinu okvira.
   Posle toga je prevlači da je pomeri i zumira klizačem ili točkićem miša.
   Stanje: fot[i] = { x, y, z } po strani: x, y = tačka slike (0–1) koja je u sredini okvira, z = zum (1 = tačno popuni okvir).
   Slika: fotoSrc[i] (JPEG dataURL, do 2400 px), čuva se odvojeno od nacrta (localStorage „mango-ed-foto:šablon:strana“),
   pa istorija (Nazad/Napred) i link do dizajna ostaju mali. Link nosi samo x, y, z: kad Mango otvori link
   i doda istu fotografiju koju je kupac poslao, ona stane tačno kako ju je kupac namestio.
   Koristi globalne promenljive iz editor/editor.js (T, pi, PG, $, stage, toast, loadScript, loadImg, store, commit…).
   ========================================================= */
let fot = [], fotoSrc = [], fotoImg = [], fotoOn = false;
const FOTO_MAX = 2400, FOTO_ZMAX = 4;
const fotoKey = i => "mango-ed-foto:" + T.id + ":" + i;
const fotoHas = i => !!(T.strane[i]?.foto && fot[i] && fotoImg[i]);
const fotoAny = () => T.strane.some(s => s.foto);

// Okvir u drugom formatu (12,5 × 16,5 ↔ 15 × 15) prati tekstove.
const fitFoto = (F, f) => ({ ...F, x: F.x * f.s + f.ox, y: F.y * f.s + f.oy, w: F.w * f.s, h: F.h * f.s, ...(F.r ? { r: F.r * f.s } : {}) });

function validFoto(v) {
  const n = (a, lo, hi, d) => Number.isFinite(+a) ? Math.min(hi, Math.max(lo, +a)) : d;
  return v && typeof v === "object" ? { x: n(v.x, 0, 1, .5), y: n(v.y, 0, 1, .5), z: n(v.z, 1, FOTO_ZMAX, 1) } : null;
}

// Gde je slika na strani (0,1 mm): cela slika je pokrivena okvirom, tačka (x, y) je u sredini kad god može.
function fotoGeom(i) {
  const F = T.strane[i].foto, img = fotoImg[i], P = fot[i], iw = img.naturalWidth, ih = img.naturalHeight;
  const c = Math.max(F.w / iw, F.h / ih) * P.z, dw = iw * c, dh = ih * c;
  const cl = (v, lo) => Math.min(0, Math.max(lo, v));
  return { dx: F.x + cl(F.w / 2 - P.x * dw, F.w - dw), dy: F.y + cl(F.h / 2 - P.y * dh, F.h - dh), dw, dh, c };
}
// Tačka sredine se drži u dozvoljenom opsegu (da se posle velikog povlačenja slika odmah vraća).
function fotoClamp(i) {
  const F = T.strane[i].foto, img = fotoImg[i], P = fot[i]; if (!F || !img || !P) return;
  const c = Math.max(F.w / img.naturalWidth, F.h / img.naturalHeight) * P.z;
  const hx = F.w / 2 / (img.naturalWidth * c), hy = F.h / 2 / (img.naturalHeight * c);
  P.x = Math.min(1 - hx, Math.max(hx, P.x)); P.y = Math.min(1 - hy, Math.max(hy, P.y));
}
// Koliko je fotografija oštra u štampi (tačaka po inču) u ovom okviru i zumu.
const fotoDpi = i => Math.round(254 / fotoGeom(i).c);

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
async function fotoClipDraw(ctx, i) {
  const F = T.strane[i].foto, g = fotoGeom(i);
  if (!F.maska) { ctx.save(); fotoPath(ctx, F); ctx.clip(); ctx.drawImage(fotoImg[i], g.dx, g.dy, g.dw, g.dh); ctx.restore(); return; }
  const m = await loadImg(F.maska), k = Math.max(1, Math.hypot(ctx.getTransform().a, ctx.getTransform().b));
  const cv = document.createElement("canvas"); cv.width = Math.ceil(F.w * k); cv.height = Math.ceil(F.h * k);
  const c = cv.getContext("2d"); c.scale(k, k); c.imageSmoothingQuality = "high";
  c.drawImage(fotoImg[i], g.dx - F.x, g.dy - F.y, g.dw, g.dh);
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
function fotoHit(e) {
  const F = PG().foto; if (!F) return false;
  const r = stage.getBoundingClientRect();
  return fotoIn(F, (e.clientX - r.left) / S, (e.clientY - r.top) / S);
}
// Prazan okvir (na pozivnici i u listi šablona): svetla podloga sa ikonicom fotoaparata.
const FOTO_IKONA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg>';
function fotoThumb(F) {
  return `<div class="foto empty${F.maska ? " maska" : ""}" style="left:${F.x}px;top:${F.y}px;width:${F.w}px;height:${F.h}px;border-radius:${fotoRadius(F)};${fotoMaskCss(F)}">${FOTO_IKONA}</div>` +
    (F.preko ? `<img class="foto-preko" src="${F.preko}" alt="">` : "");
}

/* ---------- prikaz u editoru ---------- */
function renderFoto() {
  const F = PG().foto, box = $("foto"), has = fotoHas(pi);
  box.hidden = !F; $("fotoPreko").hidden = !F?.preko;
  $("fotoBox").hidden = !F;
  stage.classList.toggle("foto-on", !!F && has && fotoOn);
  if (!F) return;
  if (F.preko && $("fotoPreko").getAttribute("src") !== F.preko) $("fotoPreko").src = F.preko;
  Object.assign(box.style, { left: F.x + "px", top: F.y + "px", width: F.w + "px", height: F.h + "px", borderRadius: fotoRadius(F),
    boxShadow: F.okvir ? `0 0 0 ${F.okvir[1]}px ${F.okvir[0]}` : "" });
  for (const p of ["maskImage", "webkitMaskImage"]) box.style[p] = F.maska ? `url('${F.maska}')` : "";
  for (const p of ["maskSize", "webkitMaskSize"]) box.style[p] = F.maska ? "100% 100%" : "";
  for (const p of ["maskRepeat", "webkitMaskRepeat"]) box.style[p] = F.maska ? "no-repeat" : "";
  box.classList.toggle("maska", !!F.maska);
  box.classList.toggle("empty", !has);
  const im = $("fotoImg");
  if (has) {
    fotoClamp(pi);
    if (im.src !== fotoSrc[pi]) im.src = fotoSrc[pi];
    const g = fotoGeom(pi);
    Object.assign(im.style, { left: g.dx - F.x + "px", top: g.dy - F.y + "px", width: g.dw + "px", height: g.dh + "px" });
  } else im.removeAttribute("src");
  // panel
  $("fotoPick").textContent = has ? "Zameni fotografiju" : "Dodaj fotografiju";
  $("fotoAuto").disabled = $("fotoDel").disabled = $("fotoZ").disabled = !has;
  if (has && document.activeElement !== $("fotoZ")) $("fotoZ").value = fot[pi].z;
  const dpi = has ? fotoDpi(pi) : 0;
  $("oFoto").textContent = has ? (dpi < 150 ? "slabija oštrina" : "dodata") : "nije dodata";
  $("fotoWarn").hidden = !has || dpi >= 150;
}

/* ---------- dodavanje fotografije ---------- */
async function fotoLoadSaved() {
  const t = T.id, src = T.strane.map((s, i) => s.foto ? store.get(fotoKey(i)) : null), img = src.map(() => null);
  await Promise.all(src.map(async (u, i) => {
    if (!u || typeof u !== "string" || !u.startsWith("data:image/")) { src[i] = null; return; }
    try { img[i] = await loadImg(u); } catch { src[i] = null; }
  }));
  if (T.id !== t) return;   // u međuvremenu je otvoren drugi šablon
  // fotografija dodata dok se ova učitavala ostaje
  src.forEach((u, i) => { if (!fotoImg[i] && u) { fotoSrc[i] = u; fotoImg[i] = img[i]; } });
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
async function fotoAutoFit(i) {
  const F = T.strane[i].foto, img = fotoImg[i], iw = img.naturalWidth, ih = img.naturalHeight;
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
  const i = pi;
  document.body.classList.add("busy"); toast("Uklapam fotografiju…");
  try {
    const src = await fotoPrepare(file);
    fotoSrc[i] = src; fotoImg[i] = await loadImg(src);
    // Dizajn iz linka već ima položaj (kupac ga je namestio): ista fotografija staje na isto mesto.
    const keep = fot[i] && !store.get(fotoKey(i)) && fotoFromLink;
    if (!keep) fot[i] = await fotoAutoFit(i);
    store.set(fotoKey(i), src);
    if (store.get(fotoKey(i)) !== src) toast("Fotografija je uklopljena, ali je prevelika da se sačuva u pregledaču. Ostaje dok ne zatvorite stranicu.");
    else toast(keep ? "Fotografija je postavljena kako ju je kupac namestio." : "Fotografija je uklopljena. Prevucite je da je pomerite, a klizačem je približite.");
    fotoOn = true;
    if (i === pi) renderFoto();
    commit();
  } catch (err) { console.error(err); toast("Ova fotografija ne može da se otvori. Probajte JPG ili PNG."); }
  document.body.classList.remove("busy");
}
let fotoFromLink = false;
function fotoPick() { $("fotoFile").value = ""; $("fotoFile").click(); }

/* ---------- crtanje (pregled, PNG, e-pozivnica, PDF) ---------- */
async function fotoDraw(ctx, i) {
  const F = T.strane[i].foto; if (!F) return;
  if (fotoHas(i)) {
    if (F.okvir) { ctx.save(); fotoPath(ctx, F); ctx.strokeStyle = F.okvir[0]; ctx.lineWidth = F.okvir[1] * 2; ctx.stroke(); ctx.restore(); }
    await fotoClipDraw(ctx, i);
  }
  if (F.preko) ctx.drawImage(await loadImg(F.preko), 0, 0, W(), H());
}
// Za PDF: okvir sa fotografijom kao PNG sa providnom pozadinom, 300 dpi. Vraća { url, x, y, w, h } u 0,1 mm.
async function fotoRaster(i) {
  if (!fotoHas(i)) return null;
  const F = T.strane[i].foto, m = F.okvir ? F.okvir[1] + 2 : 2, k = 300 / 254;
  const x = F.x - m, y = F.y - m, w = F.w + 2 * m, h = F.h + 2 * m;
  const cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  const ctx = cv.getContext("2d"); ctx.scale(k, k); ctx.translate(-x, -y);
  if (F.okvir) { ctx.save(); fotoPath(ctx, F); ctx.strokeStyle = F.okvir[0]; ctx.lineWidth = F.okvir[1] * 2; ctx.stroke(); ctx.restore(); }
  await fotoClipDraw(ctx, i);
  return { url: cv.toDataURL("image/png"), x, y, w, h };
}

/* ---------- pomeranje i zum ---------- */
function fotoPan(d, e) {
  const g = fotoGeom(pi), P = fot[pi];
  P.x = d.F0.x - (e.clientX - d.sx) / S / g.dw;
  P.y = d.F0.y - (e.clientY - d.sy) / S / g.dh;
  renderFoto();
}
function fotoZoom(z, now) {
  if (!fotoHas(pi)) return;
  fot[pi].z = Math.min(FOTO_ZMAX, Math.max(1, z));
  renderFoto();
  now ? commit() : commitSoon();
}
function fotoSetOn(on) { if (fotoOn !== on) { fotoOn = on; stage.classList.toggle("foto-on", on && fotoHas(pi)); } }

function fotoInit() {
  $("fotoFile").addEventListener("change", e => fotoAdd(e.target.files[0]));
  $("fotoPick").addEventListener("click", fotoPick);
  $("fotoAuto").addEventListener("click", async () => { if (!fotoHas(pi)) return; fot[pi] = await fotoAutoFit(pi); renderFoto(); commit(); toast("Fotografija je ponovo uklopljena."); });
  $("fotoDel").addEventListener("click", () => { fot[pi] = null; fotoSetOn(false); renderFoto(); commit(); toast("Fotografija je uklonjena. Vraćate je sa „Nazad“."); });
  $("fotoZ").addEventListener("input", e => fotoZoom(+e.target.value));
  $("fotoZ").addEventListener("change", e => fotoZoom(+e.target.value, true));
  // točkić miša iznad fotografije = zum
  stage.addEventListener("wheel", e => {
    if (!fotoHas(pi) || !fotoHit(e) || e.target.closest(".L")) return;
    e.preventDefault(); fotoSetOn(true);
    fotoZoom(fot[pi].z * Math.exp(-e.deltaY * .0015));
  }, { passive: false });
  // prevucite fotografiju sa računara pravo na okvir
  stage.addEventListener("dragover", e => { if (PG().foto && e.dataTransfer?.types?.includes("Files")) e.preventDefault(); });
  stage.addEventListener("drop", e => { const f = e.dataTransfer?.files?.[0]; if (PG().foto && f) { e.preventDefault(); fotoAdd(f); } });
}
