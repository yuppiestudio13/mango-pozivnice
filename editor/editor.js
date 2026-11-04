/* =========================================================
   MANGO EDITOR POZIVNICA
   Dizajn (pozadina) je zaključan. Kupac menja samo tekst:
   sadržaj, font, veličinu, boju, poravnanje i položaj.
   ========================================================= */
const CONFIG = {
  phone: "381600000000",       // Viber/WhatsApp broj (bez + i nule), isti kao u kalkulatoru
  instagram: "mango.pozivnice",
  minQty: 30,
};

const PT = 3.5278;              // 1 pt u jedinicama šablona (0,1 mm)
const $ = id => document.getElementById(id);
const stage = $("stage"), layersEl = $("layers"), frame = $("frame"), box = $("box");
const CATS = { kaligrafija: "Kaligrafija", rukopis: "Rukopis", serif: "Serif", sans: "Moderni", ukrasni: "Ukrasni", masina: "Boarding / mašina", deciji: "Dečiji" };
const FONT = Object.fromEntries(FONTOVI.map(([n, c, cy, w, i]) => [n, { n, c, cy, w: w.split(",").map(Number), i: i ? i.split(",").map(Number) : [] }]));

let T = null;             // aktivni šablon
let layers = [];          // tekstovi
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
function W() { return T.mm[0] * 10; }
function H() { return T.mm[1] * 10; }
// Svaki tekst prolazi kroz proveru (i onaj iz linka), da u dizajn ne može da uđe ništa osim ispravnih vrednosti.
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
  };
}
function fromTemplate(t) { return t.polja.map(p => norm({ ...p })); }

function loadTemplate(t, preset) {
  T = t;
  stopEdit(true);
  sel = null;
  layers = (preset || store.get("mango-ed:" + t.id)?.layers || fromTemplate(t)).map(L => norm({ ...L, id: undefined }));
  stage.style.width = W() + "px"; stage.style.height = H() + "px";
  $("bg").src = t.pozadina;
  const b = t.bezbedno || 0;
  Object.assign($("safe").style, { left: b + "px", top: b + "px", right: b + "px", bottom: b + "px" });
  $("gv").style.left = W() / 2 + "px"; $("gh").style.top = H() / 2 + "px";
  hist = [JSON.stringify(layers)]; hi = 0;
  document.querySelectorAll(".tpl").forEach(el => el.setAttribute("aria-current", el.dataset.id === t.id));
  try { const u = new URL(location); u.searchParams.set("s", t.id); history.replaceState(null, "", u.pathname + u.search); } catch {}
  renderAll(); fit(); syncProps(); updateTools();
}

/* ---------------- crtanje ---------------- */
function styleLayer(el, L, live = true) {
  ensureFont(L.font);
  const t = el.firstChild;
  el.style.left = L.x + "px"; el.style.top = L.y + "px"; el.style.width = L.w + "px";
  el.style.textAlign = L.align;
  Object.assign(t.style, {
    fontFamily: `"${L.font}", serif`, fontWeight: L.weight, fontStyle: L.italic ? "italic" : "normal",
    fontSize: L.size * PT + "px", color: L.color, letterSpacing: L.ls / 1000 + "em",
    marginRight: -L.ls / 1000 + "em", lineHeight: L.lh, textTransform: L.upper ? "uppercase" : "none",
  });
  if (editing !== L.id && t.textContent !== L.text) t.textContent = L.text;
  if (live) { el.classList.toggle("sel", sel === L.id); requestAnimationFrame(() => checkSafe(el, L)); }
}
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

function checkSafe(el, L) {
  const b = T.bezbedno || 0, h = el.offsetHeight;
  el.classList.toggle("out", L.x < b - 1 || L.y < b - 1 || L.x + L.w > W() - b + 1 || L.y + h > H() - b + 1);
  const any = layersEl.querySelector(".L.out");
  $("hint").innerHTML = any
    ? '<span class="warn">Crveni okvir: tekst je preblizu ivice i može biti odsečen pri sečenju papira. Pomerite ga unutar isprekidane linije.</span>'
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

function drawWatermark() {
  const fs = Math.round(W() / 26), tw = fs * 25;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tw}' height='${fs * 4}'><text x='${tw / 2}' y='${fs * 2.4}' text-anchor='middle' font-family='Josefin Sans,sans-serif' font-size='${fs}' letter-spacing='${fs * .18}' fill='#1c3627'>MANGO POZIVNICE · PRIPREMA</text></svg>`;
  $("wm").style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/* ---------------- lista šablona ---------------- */
function renderTemplates() {
  $("tplList").replaceChildren(...SABLONI.map(t => {
    const b = document.createElement("button");
    b.className = "tpl"; b.dataset.id = t.id;
    const w = t.mm[0] * 10, h = t.mm[1] * 10;
    b.innerHTML = `<div class="thumb" style="aspect-ratio:${w}/${h}"><div class="stage" style="width:${w}px;height:${h}px"><img class="bg" src="${t.pozadina}" alt=""><div class="layers"></div></div></div><b>${t.naziv}</b><small>${t.kategorija} · ${t.mm[0] / 10} × ${t.mm[1] / 10} cm</small>`;
    const st = b.querySelector(".stage");
    st.querySelector(".layers").append(...fromTemplate(t).map(L => makeLayer(L, false)));
    new ResizeObserver(() => { st.style.transform = `scale(${b.querySelector(".thumb").clientWidth / w})`; }).observe(b.querySelector(".thumb"));
    b.onclick = () => { if (T.id !== t.id) loadTemplate(t); };
    return b;
  }));
}

/* ---------------- istorija ---------------- */
let saveT;
function commit() {
  const snap = JSON.stringify(layers);
  if (snap !== hist[hi]) { hist = hist.slice(0, hi + 1); hist.push(snap); if (hist.length > 150) hist.shift(); hi = hist.length - 1; }
  clearTimeout(saveT); saveT = setTimeout(() => store.set("mango-ed:" + T.id, { layers }), 300);
  updateTools();
}
let commitT; const commitSoon = () => { clearTimeout(commitT); commitT = setTimeout(commit, 450); };
function restore(i) {
  stopEdit(true); hi = i; layers = JSON.parse(hist[hi]);
  if (!get(sel)) sel = null;
  renderAll(); syncProps(); updateTools();
  store.set("mango-ed:" + T.id, { layers });
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
}
function startEdit(id) {
  const el = elOf(id); if (!el) return;
  select(id); editing = id;
  const t = el.firstChild;
  el.classList.add("editing");
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
  editing = null;
  if (el) { const t = el.firstChild; t.contentEditable = "false"; el.classList.remove("editing"); if (L) { t.textContent = L.text; styleLayer(el, L); } }
  getSelection().removeAllRanges();
  if (!silent) { commit(); syncProps(); renderList(); }
}
layersEl.addEventListener("input", e => {
  const el = e.target.closest(".L"); if (!el) return;
  const L = get(el.dataset.id); L.text = readText(e.target);
  if (sel === L.id) $("pText").value = L.text;
  checkSafe(el, L); renderList(); commitSoon();
});
layersEl.addEventListener("paste", e => {
  if (!editing) return;
  e.preventDefault();
  document.execCommand("insertText", false, (e.clipboardData.getData("text/plain") || "").replace(/\r/g, ""));
});
layersEl.addEventListener("focusout", e => { if (editing && e.target.classList.contains("t")) stopEdit(); });

/* ---------------- prevlačenje i menjanje veličine ---------------- */
let drag = null;
stage.addEventListener("pointerdown", e => {
  const el = e.target.closest(".L");
  if (!el) { stopEdit(); select(null); return; }
  const id = el.dataset.id, L = get(id);
  if (editing === id) return;                     // dozvoli selektovanje teksta dok se kuca
  e.preventDefault();
  const was = sel === id;
  select(id);
  const mode = e.target.classList.contains("h") ? [...e.target.classList].find(c => c !== "h") : "move";
  drag = { id, mode, sx: e.clientX, sy: e.clientY, L0: { ...L }, h0: el.offsetHeight, moved: false, was };
  el.setPointerCapture(e.pointerId);
});
stage.addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = (e.clientX - drag.sx) / S, dy = (e.clientY - drag.sy) / S;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return;
  drag.moved = true;
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
  $("gv").classList.remove("on"); $("gh").classList.remove("on");
  if (d.moved) { commit(); renderList(); }
  else if (d.was && d.mode === "move") startEdit(d.id);
}
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("dblclick", e => { const el = e.target.closest(".L"); if (el && editing !== el.dataset.id) startEdit(el.dataset.id); });

/* ---------------- tastatura ---------------- */
document.addEventListener("keydown", e => {
  if ($("order").open) return;
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
    case "reset": stopEdit(true); layers = fromTemplate(T); sel = null; renderAll(); syncProps(); commit(); toast("Vraćen originalni tekst. Prethodnu verziju vraćate sa „Nazad“."); break;
    case "png": exportPNG(true); break;
    case "png-clean": exportPNG(false); break;
    case "pdf": exportPDF(); break;
    case "order": openOrder("stampa"); break;
    case "eorder": openOrder("e"); break;
  }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && !b.disabled) act(b.dataset.act); });

/* ---------------- panel sa podešavanjima ---------------- */
function syncProps() {
  const L = get(sel);
  $("pNone").hidden = !!L; $("pSel").hidden = !L;
  if (!L) return;
  if (document.activeElement !== $("pText")) $("pText").value = L.text;
  $("fpName").textContent = L.font; $("fpName").style.fontFamily = `"${L.font}", serif`;
  const f = FONT[L.font] || { w: [400], i: [] };
  const ws = L.italic && f.i.length ? f.i : f.w;
  const names = { 300: "Tanak", 400: "Normalan", 500: "Srednji", 600: "Polu-debeo", 700: "Debeo" };
  $("pWeight").innerHTML = ws.map(w => `<option value="${w}">${names[w] || w}</option>`).join("");
  $("pWeight").value = L.weight; $("pWeight").disabled = ws.length < 2;
  $("pItalic").setAttribute("aria-pressed", !!L.italic); $("pItalic").disabled = !f.i.length && !L.italic;
  $("pUpper").setAttribute("aria-pressed", !!L.upper);
  $("pSize").value = L.size; $("pSizeN").value = L.size; $("oSize").textContent = L.size + " pt";
  $("pLs").value = L.ls; $("oLs").textContent = L.ls;
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
  refresh(L); syncProps();
  now ? commit() : commitSoon();
}
$("pText").addEventListener("input", e => setProp("text", e.target.value));
$("pWeight").onchange = e => setProp("weight", +e.target.value, true);
$("pItalic").onclick = () => setProp("italic", !get(sel).italic, true);
$("pUpper").onclick = () => setProp("upper", !get(sel).upper, true);
$("pSize").oninput = e => setProp("size", +e.target.value);
$("pSizeN").onchange = e => setProp("size", Math.max(4, Math.min(120, +e.target.value || 12)), true);
$("pLs").oninput = e => setProp("ls", +e.target.value);
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
  const list = FONTOVI.filter(([n, c, cy]) =>
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
  $("fpCount").textContent = `${list.length} od ${FONTOVI.length}`;
}

/* ---------------- izvoz (PNG / PDF) ---------------- */
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 3200); }
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }

// Tekst crtamo sami na canvas, red po red, na tačnim pozicijama koje je izračunao pregledač,
// pa je slika identična onome što kupac vidi u editoru.
async function renderCanvas(scale, watermark) {
  stopEdit(true);
  await Promise.all(layers.map(L => document.fonts.load(`${L.italic ? "italic " : ""}${L.weight} 40px "${L.font}"`, L.text || "A").catch(() => {})));
  await document.fonts.ready;
  const cv = document.createElement("canvas");
  cv.width = Math.round(W() * scale); cv.height = Math.round(H() * scale);
  const ctx = cv.getContext("2d");
  ctx.scale(scale, scale);
  const img = new Image(); img.src = T.pozadina; await img.decode();
  ctx.drawImage(img, 0, 0, W(), H());
  const sr = stage.getBoundingClientRect();
  for (const L of layers) {
    const el = elOf(L.id), t = el.firstChild;
    if (!L.text.trim()) continue;
    const px = L.size * PT;
    ctx.font = `${L.italic ? "italic " : ""}${L.weight} ${px}px "${L.font}"`;
    ctx.fillStyle = L.color; ctx.textBaseline = "alphabetic";
    const asc = ctx.measureText("Hg").fontBoundingBoxAscent ?? px * 0.8;
    const lsPx = L.ls / 1000 * px;
    const node = t.firstChild; if (!node) continue;
    const str = node.textContent, r = document.createRange();
    const lines = []; let cur = null;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === "\n") { cur = null; continue; }
      r.setStart(node, i); r.setEnd(node, i + 1);
      const rc = [...r.getClientRects()].find(q => q.width > 0); if (!rc) continue;
      const x = (rc.left - sr.left) / S, y = (rc.top - sr.top) / S;
      if (!cur || Math.abs(y - cur.y) > px * 0.3) { cur = { y, chars: [] }; lines.push(cur); }
      cur.chars.push({ c: L.upper ? str[i].toLocaleUpperCase("sr") : str[i], x });
    }
    for (const ln of lines) {
      const base = ln.y + asc;
      while (ln.chars.length && ln.chars[ln.chars.length - 1].c === " ") ln.chars.pop();
      if (!ln.chars.length) continue;
      if (Math.abs(lsPx) < 0.01) ctx.fillText(ln.chars.map(c => c.c).join(""), ln.chars[0].x, base);
      else for (const ch of ln.chars) ctx.fillText(ch.c, ch.x, base);
    }
  }
  if (watermark) {
    ctx.save();
    const fs = W() / 26;
    ctx.font = `400 ${fs}px "Josefin Sans", sans-serif`; ctx.fillStyle = "rgba(28,54,39,.16)";
    ctx.translate(W() / 2, H() / 2); ctx.rotate(-24 * Math.PI / 180);
    const txt = "MANGO POZIVNICE · PRIPREMA     ", tw = ctx.measureText(txt).width, D = Math.hypot(W(), H());
    for (let y = -D / 2; y < D / 2; y += fs * 4) for (let x = -D / 2 - ((y / fs) % 2) * tw / 2; x < D / 2; x += tw) ctx.fillText(txt, x, y);
    ctx.restore();
    ctx.fillStyle = "rgba(28,54,39,.78)"; ctx.fillRect(0, H() - fs * 0.9, W(), fs * 0.9);
    ctx.font = `400 ${fs * 0.34}px "Josefin Sans", sans-serif`; ctx.fillStyle = "#e4cf9f"; ctx.textAlign = "center";
    ctx.fillText("PRIPREMA · NIJE ZA ŠTAMPU · @MANGO.POZIVNICE", W() / 2, H() - fs * 0.33);
  }
  return cv;
}
function download(url, name) { const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
async function exportPNG(wm) {
  document.body.classList.add("busy");
  try {
    const cv = await renderCanvas(wm ? 0.8 : 300 / 254, wm);
    download(cv.toDataURL("image/png"), `mango-${T.id}-${wm ? "priprema" : "stampa"}.png`);
    toast(wm ? "Priprema je preuzeta, sa vodenim žigom." : "PNG bez žiga je preuzet.");
  } catch (err) { console.error(err); toast("Priprema nije napravljena. Otvorite stranicu preko sajta, ne kao fajl."); }
  document.body.classList.remove("busy");
}
async function exportPDF() {
  document.body.classList.add("busy");
  try {
    if (!window.jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    const cv = await renderCanvas(300 / 254, false);
    const [w, h] = T.mm;
    const pdf = new jspdf.jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "mm", format: [w, h] });
    pdf.addImage(cv.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, w, h);
    pdf.save(`mango-${T.id}-stampa.pdf`);
  } catch (err) { console.error(err); toast("PDF nije napravljen."); }
  document.body.classList.remove("busy");
}

/* ---------------- link do dizajna ---------------- */
const b64u = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function encodeDesign() {
  const data = JSON.stringify({ t: T.id, l: layers.map(({ id, ...L }) => L) });
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

/* ---------------- porudžbina ---------------- */
const dlg = $("order");
function openOrder(kind) {
  stopEdit();
  dlg.querySelector(`input[name=kind][value="${kind}"]`).checked = true;
  syncKind();
  const d = store.get("mango-ed:kontakt");
  if (d) ["oName", "oPhone", "oEmail"].forEach(k => { if (!$(k).value && d[k]) $(k).value = d[k]; });
  dlg.showModal();
}
function syncKind() {
  const e = dlg.querySelector("input[name=kind]:checked").value === "e";
  $("fQty").hidden = e; $("eNote").hidden = !e;
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
  return `Zdravo! Napravio/la sam pozivnicu u vašem editoru.
Vrsta: ${e ? "ELEKTRONSKA pozivnica (bez štampe)" : "Štampane pozivnice"}
Šablon: ${T.naziv} (${T.mm[0] / 10} × ${T.mm[1] / 10} cm)
${e ? "" : `Broj pozivnica: ${v("oQty") || "—"}\n`}Ime: ${v("oName") || "—"}
Telefon: ${v("oPhone") || "—"}
E-mail: ${v("oEmail") || "—"}
Datum događaja: ${date}
Napomena: ${v("oNote") || "—"}

Moj dizajn: ${await designLink()}`;
}
async function copy(txt) { try { await navigator.clipboard.writeText(txt); return true; } catch { return false; } }
$("send").onclick = async e => {
  const b = e.target.closest("button"); if (!b) return;
  const isE = dlg.querySelector("input[name=kind]:checked").value === "e";
  if (isE && !$("oEmail").checkValidity() || isE && !$("oEmail").value) { $("oEmail").focus(); toast("Upišite e-mail na koji šaljemo pozivnicu."); return; }
  const qty = +$("oQty").value;
  if (!isE && qty && qty < CONFIG.minQty) { $("oQty").focus(); toast(`Najmanja porudžbina je ${CONFIG.minQty} pozivnica.`); return; }
  const txt = await orderMessage(), enc = encodeURIComponent(txt);
  if (b.dataset.ch === "whatsapp") window.open(`https://wa.me/${CONFIG.phone}?text=${enc}`, "_blank");
  if (b.dataset.ch === "viber") { await copy(txt); location.href = `viber://forward?text=${enc}`; toast("Poruka je kopirana i otvara se Viber."); }
  if (b.dataset.ch === "instagram") { await copy(txt); toast("Poruka je kopirana. Nalepite je u DM."); setTimeout(() => window.open(`https://ig.me/m/${CONFIG.instagram}`, "_blank"), 700); }
  if (b.dataset.ch === "copy") toast(await copy(txt) ? "Poruka sa linkom do dizajna je kopirana." : "Kopiranje nije uspelo.");
};

/* ---------------- start ---------------- */
(async function init() {
  const qs = new URLSearchParams(location.search);
  if (qs.has("admin")) qs.get("admin") === "0" ? store.del("mango-admin") : store.set("mango-admin", 1);
  if (store.get("mango-admin")) $("app").classList.add("admin");
  renderTemplates();
  let preset = null, t = SABLONI.find(x => x.id === qs.get("s")) || SABLONI[0];
  const m = location.hash.match(/#d=([\w-]+)/);
  if (m) {
    try {
      const d = await decodeDesign(m[1]);
      t = SABLONI.find(x => x.id === d.t) || t; preset = d.l;
      setTimeout(() => toast("Otvoren je dizajn iz linka."), 400);
    } catch (err) { console.error(err); toast("Link do dizajna nije ispravan."); }
  }
  loadTemplate(t, preset);
  if (preset) commit();
  document.fonts.ready.then(() => layersEl.querySelectorAll(".L").forEach(el => checkSafe(el, get(el.dataset.id))));
})();
