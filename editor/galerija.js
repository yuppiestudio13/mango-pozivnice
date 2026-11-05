/* =========================================================
   MANGO RADIONICA · GALERIJA DIZAJNA
   Prikazuje sve šablone iz sabloni.js sa početnim tekstom.
   Klik na dizajn otvara editor.html?s=<id>.
   ========================================================= */
(function () {
  const PT = 3.5278;
  const GRUPE = [
    ["sve", "Svi dizajni"],
    ["vencanja", "Venčanja"],
    ["boarding", "Boarding pass i pasoš"],
    ["krstenja", "Krštenja"],
    ["rodjendani", "Dečiji rođendani"],
    ["punoletstva", "Punoletstva"],
  ];
  const STRANA = { vencanja: "pozivnice-vencanja.html", boarding: "pozivnice-boarding-pass.html", krstenja: "pozivnice-krstenja.html", rodjendani: "pozivnice-rodjendani.html", punoletstva: "pozivnice-punoletstva.html" };
  const FONT = Object.fromEntries(FONTOVI.map(([n, c, cy, w, i, own]) => [n, { own: !!own, w: w.split(",").map(Number), i: i ? i.split(",").map(Number) : [] }]));
  const grid = document.getElementById("gGrid"), filt = document.getElementById("gFilter"), empty = document.getElementById("gEmpty");

  /* fontovi: isti URL kao u editoru, da se ne traži težina koje nema */
  const loaded = new Set();
  function ensureFont(name) {
    if (loaded.has(name)) return; loaded.add(name);
    const f = FONT[name], fam = name.replace(/ /g, "+");
    if (f && f.own) return;   // naši fontovi: fontovi/fontovi.css
    let spec = "";
    if (f && f.i.length) spec = ":ital,wght@" + [...f.w.map(w => "0," + w), ...f.i.map(w => "1," + w)].join(";");
    else if (f && (f.w.length > 1 || f.w[0] !== 400)) spec = ":wght@" + f.w.join(";");
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${fam}${spec}&display=swap`;
    document.head.appendChild(l);
  }
  const saved = id => { try { return !!JSON.parse(localStorage.getItem("mango-ed:" + id)); } catch { return false; } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function card(t) {
    const w = t.mm[0] * 10, h = t.mm[1] * 10, land = w > h;
    const p = t.strane[0], fo = t.folija && window.FOLIJE && FOLIJE[t.folija.izabrana];
    const FN = { "125x165": "12,5 × 16,5", "150x150": "15 × 15" };
    const dims = t.formati ? (Array.isArray(t.formati) ? t.formati : Object.keys(FN)).map(k => FN[k]).join(" ili ") + " cm" : t.strane.length > 1 ? [...new Set(t.strane.map(s => `${s.mm[0] / 10} × ${s.mm[1] / 10}`))].join(" + ") + " cm" : `${t.mm[0] / 10} × ${t.mm[1] / 10} cm`;
    const art = p.folija && fo ? `<div style="position:absolute;inset:0;background:${fo.sjaj};-webkit-mask:url('${esc(p.folija)}') 0 0/100% 100% no-repeat;mask:url('${esc(p.folija)}') 0 0/100% 100% no-repeat"></div>` : "";
    const a = document.createElement("a");
    a.className = "g-card" + (land ? " land" : "");
    a.href = "editor.html?s=" + encodeURIComponent(t.id);
    a.dataset.grupe = (t.grupe || []).join(" ");
    a.innerHTML = `<div class="g-desk">${saved(t.id) ? '<span class="g-draft">Vaš nacrt</span>' : ""}<div class="g-paper" style="aspect-ratio:${w}/${h}"><div class="g-stage" style="width:${w}px;height:${h}px"><img src="${esc(t.strane[0].mini || t.pozadina)}" alt="" loading="lazy">${art}<div class="g-layers"></div></div></div><span class="g-go">Personalizuj ✦</span></div>
      <div class="g-meta"><h3>${esc(t.naziv)}</h3><span>${esc(t.kategorija)} · ${dims}${t.papir ? " · " + esc(t.papir) + (fo ? " + foliotisak" : "") : ""}</span></div>`;
    const lay = a.querySelector(".g-layers");
    for (const L of t.polja) {
      ensureFont(L.font);
      const d = document.createElement("div"), s = document.createElement("span");
      Object.assign(d.style, { position: "absolute", left: L.x + "px", top: L.y + "px", width: L.w + "px", textAlign: L.align || "center", whiteSpace: "pre-wrap" });
      const ls = (L.ls || 0) / 1000;
      Object.assign(s.style, {
        fontFamily: `"${L.font}", serif`, fontWeight: L.weight || 400, fontStyle: L.italic ? "italic" : "normal",
        fontSize: L.size * PT + "px", color: L.color, letterSpacing: ls + "em", marginRight: -ls + "em",
        lineHeight: L.lh || 1.2, textTransform: L.upper ? "uppercase" : "none",
      });
      if (fo) Object.assign(s.style, { background: fo.sjaj, webkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });
      s.textContent = L.text; d.append(s); lay.append(d);
    }
    const paper = a.querySelector(".g-paper"), st = a.querySelector(".g-stage");
    new ResizeObserver(() => { st.style.transform = `scale(${paper.clientWidth / w})`; }).observe(paper);
    return a;
  }

  const cards = SABLONI.map(card);
  grid.append(...cards);

  function count(g) { return g === "sve" ? cards.length : cards.filter(c => c.dataset.grupe.split(" ").includes(g)).length; }
  filt.append(...GRUPE.map(([g, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.g = g;
    b.innerHTML = `${label}<sup>${count(g)}</sup>`;
    b.onclick = () => { show(g); history.replaceState(null, "", g === "sve" ? location.pathname : "#" + g); };
    return b;
  }));

  function show(g) {
    if (!GRUPE.some(([x]) => x === g)) g = "sve";
    filt.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.g === g));
    let n = 0;
    for (const c of cards) { const on = g === "sve" || c.dataset.grupe.split(" ").includes(g); c.hidden = !on; n += on; }
    empty.hidden = n > 0;
    if (!n) {
      const label = { rodjendani: "dečije rođendane", boarding: "boarding pass i pasoš" }[g] || GRUPE.find(([x]) => x === g)[1].toLowerCase();
      empty.innerHTML = `<b>Šabloni za ${label} stižu uskoro</b><p>Do tada pogledajte naše gotove pozivnice ili nam pišite, pa ćemo vašu napraviti zajedno.</p><a class="link" href="${STRANA[g]}">Pogledaj pozivnice <span>→</span></a>`;
    }
  }
  show(location.hash.slice(1) || "sve");
  addEventListener("hashchange", () => show(location.hash.slice(1) || "sve"));
})();
