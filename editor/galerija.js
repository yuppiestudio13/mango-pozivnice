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
    ["rodjendani", "Rođendani"],
    ["boarding", "Boarding pass"],
  ];
  /* Kartica „Rođendani” obuhvata i punoletstva (podfilter ispod nje). Krštenja nemaju svoju karticu (idu uz venčanje ili rođendan); stari link #krstenja vodi na Rođendane. */
  const U_KARTICI = { rodjendani: ["rodjendani", "punoletstva"] };
  const STARO = { krstenja: "rodjendani", punoletstva: "rodjendani/punoletstva" };
  const STRANA = { vencanja: "pozivnice-vencanja.html", boarding: "pozivnice-boarding-pass.html", krstenja: "pozivnice-krstenja.html", rodjendani: "pozivnice-rodjendani.html", punoletstva: "pozivnice-punoletstva.html" };
  /* Stil šablona za venčanja (podfilteri ispod „Venčanja”); jedan šablon može biti u više grupa. */
  const STILOVI = [["cvetni", "Cvetni"], ["minimal", "Minimalistički"], ["monogram", "Monogram"], ["datum", "Save the date"], ["cirilica", "Ćirilica"]];
  const PODFILTERI = {
    vencanja: [["", "Svi stilovi"], ...STILOVI],
    rodjendani: [["", "Svi"], ["decji", "Dečiji"], ["punoletstva", "Punoletstva"]],
  };
  const STIL = {
    "3-svadba": "cvetni",
    "its-me-milica": "cvetni",
    "marija1": "cvetni",
    "martina": "cvetni cirilica",
    "milica-aleksandra-i-aleksandar": "cvetni cirilica",
    "natalija": "cvetni cirilica",
    "eva1": "cvetni",
    "jovanamilos": "cvetni",
    "maja-mirko-cirilica2": "cvetni cirilica",
    "marija-mihajlo": "cvetni cirilica",
    "marina-anusic-sa-potvrdom": "cvetni",
    "primer-2-bey-poyadine": "cvetni",
    "rozi-cvetovi-2": "cvetni cirilica",
    "zlatno-srce-cvetovi-tekst": "cvetni",
    "bordo-bozur": "cvetni",
    "poljski-venac": "cvetni",
    "bele-ruze": "cvetni",
    "mg-bele-ruze": "cvetni",
    "mg-buket-ruza": "cvetni",
    "mg-ruze-linija": "cvetni",
    "mg-roze-akvarel": "cvetni",
    "mg-eukaliptus-venac": "cvetni datum",
    "mg-eukaliptus-zlato": "cvetni",
    "mg-roze-monogram": "cvetni monogram",
    "mg-grancice": "cvetni",
    "mg-anemone-romb": "cvetni datum",
    "mg-anemone": "cvetni",
    "mg-sukulenti": "cvetni",
    "mg-sukulenti-datum": "cvetni datum",
    "mg-plavo-cvece": "cvetni",
    "mg-heksagon-datum": "cvetni datum",
    "mg-lisce-akvarel": "cvetni",
    "mg-breskva": "cvetni",
    "mg-terakota-datum": "cvetni datum",
    "mg-terakota-traka": "cvetni",
    "mg-zlatno-datum": "cvetni datum",
    "mg-zlatno-cvece": "cvetni",
    "ana-jovan": "minimal datum",
    "iva-i-vukota": "minimal",
    "milica-nov-1-crveno": "minimal cirilica",
    "natasa-milan": "minimal datum",
    "primer-9": "minimal datum",
    "ivanauros": "minimal datum",
    "ljilja-2": "minimal datum",
    "martina1": "minimal",
    "kolaz-par": "minimal",
    "mg-monogram-linija": "minimal monogram",
    "mg-monogram-braon": "minimal monogram",
    "mg-botanicki-tus": "minimal",
    "mg-plavi-akvarel": "minimal",
    "mg-pastelni": "minimal datum"
  };
  /* Oznaka „Novo” (šabloni dodati 8. 11. 2026); skinuti kad prestanu da budu novi. */
  const NOVO = new Set(["mr-veseli-drugari", "mr-zeka-baloni", "mr-jednorog-cvece", "mr-dino-akvarel", "mr-jednorog-livada", "mr-pastelna-duga", "mr-flamingosi", "mr-jednorog-oblaci", "mr-sarena-duga", "mr-roze-duga",
    "mg-sukulenti", "mg-sukulenti-datum", "mg-plavo-cvece", "mg-heksagon-datum", "mg-lisce-akvarel", "mg-plavi-akvarel",
    "mg-breskva", "mg-pastelni", "mg-terakota-datum", "mg-terakota-traka", "mg-zlatno-datum", "mg-zlatno-cvece"]);
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
    const FN = { "125x165": "12,5 × 16,5", "150x150": "15 × 15", "165x125": "16,5 × 12,5" };
    const dims = t.formati ? (Array.isArray(t.formati) ? t.formati : Object.keys(FN)).map(k => FN[k]).join(" ili ") + " cm" : t.strane.length > 1 ? [...new Set(t.strane.map(s => `${s.mm[0] / 10} × ${s.mm[1] / 10}`))].join(" + ") + " cm" : `${t.mm[0] / 10} × ${t.mm[1] / 10} cm`;
    const art = p.folija && fo ? `<div style="position:absolute;inset:0;background:${fo.sjaj};-webkit-mask:url('${esc(p.folija)}') 0 0/100% 100% no-repeat;mask:url('${esc(p.folija)}') 0 0/100% 100% no-repeat"></div>` : "";
    // okvir za fotografiju kupca (sabloni/foto-okviri.js): primer-fotografija (fotoPrimer), da se vidi kako izgleda
    const rad = F => F.maska ? "0" : F.oblik === "krug" ? "50%" : F.oblik === "luk" ? `${F.w / 2}px ${F.w / 2}px 0 0` : (F.r || 0) + "px";
    const prim = j => window.fotoPrimer ? `url('${esc(fotoPrimer(t, j))}') center 30%/cover no-repeat,` : "";
    const foto = (p.foto ? [].concat(p.foto) : []).map((F, j) => `<div style="position:absolute;left:${F.x}px;top:${F.y}px;width:${F.w}px;height:${F.h}px;border-radius:${rad(F)};background:${prim(j)}#e9e3da;${F.maska ? `-webkit-mask:url('${esc(F.maska)}') 0 0/100% 100% no-repeat;mask:url('${esc(F.maska)}') 0 0/100% 100% no-repeat;` : ""}${F.okvir ? `box-shadow:0 0 0 ${F.okvir[1]}px ${F.okvir[0]};` : ""}display:grid;place-items:center;color:#8a8070">${window.fotoPrimer ? "" : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="width:${Math.min(F.w, F.h) * .3}px"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg>`}</div>`).join("");
    const a = document.createElement("a");
    a.className = "g-card" + (land ? " land" : "");
    a.href = "editor.html?s=" + encodeURIComponent(t.id);
    a.dataset.grupe = (t.grupe || []).join(" ");
    const gr = t.grupe || [];
    a.dataset.stil = [STIL[t.id] || "", ...gr, gr.includes("rodjendani") && !gr.includes("punoletstva") ? "decji" : ""].join(" ").trim();
    a.innerHTML = `<div class="g-desk">${saved(t.id) ? '<span class="g-draft">Vaš nacrt</span>' : NOVO.has(t.id) ? '<span class="g-draft g-novo">Novo</span>' : ""}<div class="g-paper" style="aspect-ratio:${w}/${h}"><div class="g-stage" style="width:${w}px;height:${h}px"><img src="${esc(t.strane[0].mini || t.pozadina)}" alt="" loading="lazy">${foto}${art}<div class="g-layers"></div></div></div><span class="g-go">Personalizuj ✦</span></div>
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

  const uGrupi = (c, g) => g === "sve" || c.dataset.grupe.split(" ").some(x => (U_KARTICI[g] || [g]).includes(x));
  const imaTag = (c, t) => c.dataset.stil.split(" ").includes(t);
  filt.append(...GRUPE.map(([g, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.g = g;
    b.innerHTML = `${label}<sup>${cards.filter(c => uGrupi(c, g)).length}</sup>`;
    b.onclick = () => { show(g); history.replaceState(null, "", g === "sve" ? location.pathname : "#" + g); };
    return b;
  }));

  // podfilteri: stil za venčanja (#vencanja/cvetni), vrsta proslave za rođendane (#rodjendani/punoletstva)
  const subs = {};
  let prev = filt;
  for (const [g, lista] of Object.entries(PODFILTERI)) {
    const sub = document.createElement("div");
    sub.className = "g-filter g-sub"; sub.setAttribute("role", "group"); sub.setAttribute("aria-label", g === "vencanja" ? "Stil" : "Vrsta proslave");
    const uG = cards.filter(c => uGrupi(c, g));
    sub.append(...lista.map(([t, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.s = t;
      b.innerHTML = `${label}<sup>${t ? uG.filter(c => imaTag(c, t)).length : uG.length}</sup>`;
      b.onclick = () => { const h = g + (t ? "/" + t : ""); show(h); history.replaceState(null, "", "#" + h); };
      return b;
    }));
    prev.after(sub); prev = sub; subs[g] = sub;
  }

  function show(h) {
    let [g, s = ""] = (STARO[h] || h).split("/");
    if (!GRUPE.some(([x]) => x === g)) g = "sve";
    if (!(PODFILTERI[g] || []).some(([x]) => x && x === s)) s = "";
    filt.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.g === g));
    for (const [k, sub] of Object.entries(subs)) {
      sub.hidden = k !== g;
      sub.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.s === s));
    }
    let n = 0;
    for (const c of cards) { const on = uGrupi(c, g) && (!s || imaTag(c, s)); c.hidden = !on; n += on; }
    empty.hidden = n > 0;
    if (!n) {
      const label = { rodjendani: "rođendane", boarding: "boarding pass i pasoš" }[g] || GRUPE.find(([x]) => x === g)[1].toLowerCase();
      empty.innerHTML = `<b>Šabloni za ${label} stižu uskoro</b><p>Do tada pogledajte naše gotove pozivnice ili nam pišite, pa ćemo vašu napraviti zajedno.</p><a class="link" href="${STRANA[g]}">Pogledaj pozivnice <span>→</span></a>`;
    }
  }
  show(location.hash.slice(1) || "sve");
  addEventListener("hashchange", () => show(location.hash.slice(1) || "sve"));
})();
