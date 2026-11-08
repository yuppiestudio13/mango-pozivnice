/* =========================================================
   VEKTORSKI PDF ZA ŠTAMPU (samo za Mango, admin režim)
   - jedna stranica za svaku stranu pozivnice, u pravoj veličini + 3 mm za sečenje sa svake strane
   - tekst je pretvoren u krive (štampariji ne trebaju naši fontovi, ivice su potpuno oštre)
   - SVG pozadine i crteži ostaju vektor; slike (uvezeni šabloni) ostaju slike od ~300 dpi
   - sve što ide u foliotisak je tamnosivo #45474a (kao u Mango PDF-ovima od dizajnera)
   Koristi stanje editora (T, pages, foil…) iz editor/editor.js i biblioteke iz js/vendor/mango-pdf.js.
   ========================================================= */
(function () {
  const BLEED = 3;                       // mm za sečenje sa svake strane
  const { jsPDF, fontkit, woff2ToTtf } = window.MangoPDF;

  /* ---------- fontovi: @font-face iz CSS-a → fontkit ---------- */
  const cssCache = new Map(), fileCache = new Map();
  function parseRanges(s) {
    if (!s) return [[0, 0x10ffff]];
    return s.split(",").map(x => x.trim().replace(/^U\+/i, "")).map(x => {
      if (x.includes("?")) return [parseInt(x.replace(/\?/g, "0"), 16), parseInt(x.replace(/\?/g, "F"), 16)];
      const [a, b] = x.split("-"); return [parseInt(a, 16), parseInt(b || a, 16)];
    });
  }
  // Sva @font-face pravila za font: { family, style, w0, w1, url, ranges }
  async function facesOf(name) {
    const cssUrl = FONT[name]?.own ? new URL("fontovi/fontovi.css", location.href).href : fontUrl(name);
    if (!cssCache.has(cssUrl)) cssCache.set(cssUrl, (async () => {
      const css = await (await fetch(cssUrl)).text();
      return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, b]) => {
        const g = re => (b.match(re) || [])[1];
        const w = (g(/font-weight:\s*([\d\s]+)/) || "400").trim().split(/\s+/).map(Number);
        const src = [...b.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1]);
        return {
          family: (g(/font-family:\s*['"]?([^;'"]+)/) || "").trim(), style: (g(/font-style:\s*(\w+)/) || "normal"),
          w0: w[0], w1: w[1] ?? w[0], url: new URL(src.find(u => /woff2/.test(u)) || src[0], cssUrl).href,
          ranges: parseRanges(g(/unicode-range:\s*([^;]+)/)),
        };
      });
    })());
    return cssCache.get(cssUrl);
  }
  const bytesCache = new Map();
  // woff2 se raspakuje u običan TTF (Google woff2 dekoder), jer fontkit pogrešno čita promenljive woff2 fontove
  const bytesOf = url => {
    if (!bytesCache.has(url)) bytesCache.set(url, fetch(url).then(r => r.arrayBuffer()).then(async b => {
      const u = new Uint8Array(b);
      if (String.fromCharCode(...u.subarray(0, 4)) !== "wOF2") return u;
      const late = new Promise((_, no) => setTimeout(() => no(new Error("Raspakivanje fonta traje predugo: " + url)), 20000));
      return new Uint8Array(await Promise.race([woff2ToTtf(u), late]));
    }));
    return bytesCache.get(url);
  };
  function loadFile(url) {
    if (!fileCache.has(url)) fileCache.set(url, bytesOf(url).then(b => fontkit.create(b)));
    return fileCache.get(url);
  }
  // Font za jedan znak teksta L (prava debljina i kurziv; promenljivi fontovi dobijaju tačnu debljinu).
  async function fontFor(L, cp) {
    const all = (await facesOf(L.font)).filter(f => f.family === L.font);
    const want = L.italic ? "italic" : "normal";
    let list = all.filter(f => f.style === want); if (!list.length) list = all;
    const dist = f => L.weight < f.w0 ? f.w0 - L.weight : L.weight > f.w1 ? L.weight - f.w1 : 0;
    const best = Math.min(...list.map(dist));
    list = list.filter(f => dist(f) === best);
    const face = list.find(f => f.ranges.some(([a, b]) => cp >= a && cp <= b)) || list[0];
    if (!face) return null;
    let font = await loadFile(face.url);
    if (font.variationAxes?.wght) {
      // promenljivi font (Google): nova kopija fonta sa zadatom debljinom
      const ax = font.variationAxes.wght, wv = Math.min(ax.max, Math.max(ax.min, L.weight));
      const key = face.url + "@" + wv;
      if (!fileCache.has(key)) fileCache.set(key, Promise.resolve(font.getVariation({ wght: wv })));
      font = await fileCache.get(key);
    }
    return font;
  }

  /* ---------- crtanje krivih u PDF ---------- */
  // Komande putanje (fontkit ili SVG) → jsPDF; f(x, y) prebacuje koordinate u mm na stranici.
  function drawPath(pdf, cmds, f) {
    let cx = 0, cy = 0, sx = 0, sy = 0, open = false;
    for (const { command: c, args: a } of cmds) {
      if (c === "moveTo") { if (open) pdf.close(); [cx, cy] = a; [sx, sy] = a; pdf.moveTo(...f(cx, cy)); open = true; }
      else if (c === "lineTo") { [cx, cy] = a; pdf.lineTo(...f(cx, cy)); }
      else if (c === "quadraticCurveTo") {
        const [qx, qy, x, y] = a;
        pdf.curveTo(...f(cx + 2 / 3 * (qx - cx), cy + 2 / 3 * (qy - cy)), ...f(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y)), ...f(x, y));
        cx = x; cy = y;
      } else if (c === "bezierCurveTo") { pdf.curveTo(...f(a[0], a[1]), ...f(a[2], a[3]), ...f(a[4], a[5])); cx = a[4]; cy = a[5]; }
      else if (c === "closePath") { pdf.close(); open = false; cx = sx; cy = sy; }
    }
    if (open) pdf.close();
  }

  // Redovi teksta sa položajem svakog slova, tačno kako ih je rasporedio pregledač: charsOf u editor.js
  const linesOf = L => charsOf(L);

  // Znak koga nema u fontu (pregledač ga pozajmi iz drugog fonta) menja se sličnim koji font ima.
  const ALT = { "ʺ": "″\"", "ʹ": "′'", "″": "\"", "′": "'", "‘": "'", "’": "'", "‚": ",", "“": "\"", "”": "\"", "„": "\"", "–": "-", "—": "-", "…": "...", " ": " ", "ʼ": "'" };
  function fixChars(font, s) {
    return [...s].map(c => {
      if (font.hasGlyphForCodePoint(c.codePointAt(0))) return c;
      for (const a of ALT[c] || "") if (a === "." ? font.hasGlyphForCodePoint(46) : font.hasGlyphForCodePoint(a.codePointAt(0))) return c === "…" ? "..." : a;
      return c;
    }).join("");
  }
  async function covered(L, c) {
    const cp = c.codePointAt(0), f = await fontFor(L, cp);
    return !!f && f.hasGlyphForCodePoint(cp);
  }
  let missing = 0; const missingCh = new Set();
  async function drawText(pdf, L, color) {
    const px = L.size * PT, lsPx = L.ls / 1000 * px;
    inkCtx.font = `${L.italic ? "italic " : ""}${L.weight} ${px}px "${L.font}"`;
    const asc = inkCtx.measureText("Hg").fontBoundingBoxAscent ?? px * 0.8;
    pdf.setFillColor(color);
    let any = false;
    for (const ln of linesOf(L)) {
      const base = ln.y + asc;
      if (L.luk) {
        // tekst u luku: svako slovo za sebe, zaokrenuto (arcOf u editor.js)
        for (const q of arcOf(L, ln, base)) {
          if (!(await covered(L, q.c)) && ALT[q.c]) for (const a of ALT[q.c]) if (await covered(L, a)) { q.c = a; break; }
          const font = await fontFor(L, q.c.codePointAt(0));
          if (!font) { missing++; missingCh.add(`${q.c} (${L.font})`); continue; }
          const k = px / font.unitsPerEm, g = font.layout(fixChars(font, q.c)), co = Math.cos(q.rot), si = Math.sin(q.rot);
          let pen = -q.hw;
          g.glyphs.forEach((gl, i) => {
            const p = g.positions[i];
            if (!gl.id) { missing++; missingCh.add(`${q.c} (${L.font})`); }
            const ox = pen + p.xOffset * k, oy = -p.yOffset * k;
            if (gl.path.commands.length) {
              drawPath(pdf, gl.path.commands, (x, y) => { const u = ox + x * k, v = oy - y * k; return [BLEED + (q.cx + u * co - v * si) / 10, BLEED + (q.y + u * si + v * co) / 10]; });
              any = true;
            }
            pen += p.xAdvance * k;
          });
        }
        continue;
      }
      // red se deli na delove sa istim fajlom fonta (Google deli font po pismima: latinica, ćirilica…)
      const runs = [];
      for (const ch of ln.chars) {
        // znak koji font nema ni u jednom delu (pismu): probaj sličan znak koji ima
        if (!(await covered(L, ch.c)) && ALT[ch.c]) for (const a of ALT[ch.c]) if (await covered(L, a)) { ch.c = a; break; }
        const font = await fontFor(L, ch.c.codePointAt(0));
        const last = runs[runs.length - 1];
        if (last && last.font === font) last.s += ch.c; else runs.push({ font, s: ch.c, x: ch.x });
      }
      for (const run of runs) {
        if (!run.font) { missing += run.s.length; [...run.s].forEach(c => missingCh.add(`${c} (${L.font})`)); continue; }
        const k = px / run.font.unitsPerEm, g = run.font.layout(fixChars(run.font, run.s));
        let pen = run.x;
        g.glyphs.forEach((gl, i) => {
          const p = g.positions[i];
          if (!gl.id) { missing++; missingCh.add(`${String.fromCodePoint(...gl.codePoints)} U+${(gl.codePoints[0] || 0).toString(16)} (${L.font})`); }
          const ox = pen + p.xOffset * k, oy = base - p.yOffset * k;
          if (gl.path.commands.length) { drawPath(pdf, gl.path.commands, (x, y) => [BLEED + (ox + x * k) / 10, BLEED + (oy - y * k) / 10]); any = true; }
          pen += p.xAdvance * k + lsPx;   // razmak slova dodaje se posle svakog znaka, kao u pregledaču
        });
      }
    }
    if (any) pdf.fill();
  }

  /* ---------- SVG crteži (pozadina, folija, mapa, ruta, satnica) ---------- */
  const svgText = async src => src.startsWith("data:") ? decodeURIComponent(src.slice(src.indexOf(",") + 1)) : (await fetch(src)).text();
  // Sve boje u SVG-u (osim „none“) → jedna boja; koristi se za sloj folije.
  const recolor = (svg, col) => svg.replace(/(fill|stroke)(\s*[:=]\s*["']?)(#[0-9a-f]{3,8}|black|white|rgb\([^)]*\))/gi, `$1$2${col}`);
  async function drawSvg(pdf, svg, w, h) {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden";
    // DOMParser (image/svg+xml) ne izvršava skripte; SVG-ovi su naši (šabloni i crteži koje editor sam pravi)
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml"), root = doc.documentElement;
    if (root.nodeName !== "svg") throw new Error("SVG nije ispravan");
    root.querySelectorAll("script,foreignObject").forEach(n => n.remove());
    const el = document.importNode(root, true);
    host.appendChild(el); document.body.appendChild(host);
    try { await pdf.svg(el, { x: BLEED, y: BLEED, width: w, height: h }); } finally { host.remove(); }
  }

  /* ---------- pozadina sa 3 mm za sečenje ---------- */
  // Slika pozadine u pravoj veličini; zona za sečenje dobija odraz (ogledalo) poslednja 3 mm dizajna,
  // pa se boje i šare nastavljaju preko linije sečenja bez trake i bez belog ruba.
  async function bleedImage(src, w, h) {
    const img = await loadImg(src), dpm = 300 / 25.4, b = Math.round(BLEED * dpm);
    const cw = Math.round(w * dpm), ch = Math.round(h * dpm), nw = img.naturalWidth, nh = img.naturalHeight;
    const sw = b * nw / cw, sh = b * nh / ch;          // 3 mm u pikselima izvorne slike
    const cv = document.createElement("canvas"); cv.width = cw + 2 * b; cv.height = ch + 2 * b;
    const c = cv.getContext("2d");
    c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
    const m = (tx, ty, fx, fy, sx, sy, sW, sH, dx, dy, dW, dH) => { c.save(); c.translate(tx, ty); c.scale(fx, fy); c.drawImage(img, sx, sy, sW, sH, dx, dy, dW, dH); c.restore(); };
    m(b, b, -1, 1, 0, 0, sw, nh, 0, 0, b, ch);                       // levo
    m(b + cw, b, -1, 1, nw - sw, 0, sw, nh, -b, 0, b, ch);           // desno
    m(b, b, 1, -1, 0, 0, nw, sh, 0, 0, cw, b);                       // gore
    m(b, b + ch, 1, -1, 0, nh - sh, nw, sh, 0, -b, cw, b);           // dole
    m(b, b, -1, -1, 0, 0, sw, sh, 0, 0, b, b);                       // uglovi
    m(b + cw, b, -1, -1, nw - sw, 0, sw, sh, -b, 0, b, b);
    m(b, b + ch, -1, -1, 0, nh - sh, sw, sh, 0, -b, b, b);
    m(b + cw, b + ch, -1, -1, nw - sw, nh - sh, sw, sh, -b, -b, b, b);
    c.drawImage(img, b, b, cw, ch);
    return cv.toDataURL("image/jpeg", 0.95);
  }

  /* ---------- izvoz ---------- */
  window.stampaPDF = async function () {
    stopEdit(true);
    missing = 0; missingCh.clear();
    const FOL = FOLIJA_PRIPREMA, fx = L => !!foil && (!!T.folija || !!L.fo);
    let pdf = null;
    await eachPage(async () => {
      const p = PG(), [w, h] = p.mm, o = w + 2 * BLEED > h + 2 * BLEED ? "landscape" : "portrait", fmt = [w + 2 * BLEED, h + 2 * BLEED];
      if (!pdf) pdf = new jsPDF({ orientation: o, unit: "mm", format: fmt, compress: true }); else pdf.addPage(fmt, o);
      await Promise.all(layers.map(L => document.fonts.load(`${L.italic ? "italic " : ""}${L.weight} 40px "${L.font}"`, L.text || "A").catch(() => {})));
      await document.fonts.ready;
      // 1) pozadina: slika do ivice zone sečenja; SVG pozadina još jednom preko nje kao vektor
      const bg = await bgUrl(p);
      pdf.addImage(await bleedImage(bg, w, h), "JPEG", 0, 0, w + 2 * BLEED, h + 2 * BLEED);
      const isSvg = /\.svg(\?|$)/i.test(p.pozadina) && !(p.fit && (p.fit.ox || p.fit.oy));
      if (isSvg) await drawSvg(pdf, await svgText(bg), w, h);
      // 1b) fotografija kupca (300 dpi, providno van okvira) i crtež koji ide preko nje
      const ph = window.fotoRaster && await fotoRaster(pi);
      if (ph) pdf.addImage(ph.url, "PNG", BLEED + ph.x / 10, BLEED + ph.y / 10, ph.w / 10, ph.h / 10);
      if (ph && p.foto.preko) pdf.addImage(await loadImg(p.foto.preko), "PNG", BLEED, BLEED, w, h);
      // 2) crteži koji idu u foliju (vektor, tamnosivo)
      const route = routeSVG(pi), tl = tlSVG(pi);
      for (const src of [p.folija, mapOf(pi), route && svgUrl(route), tl && svgUrl(tl)].filter(Boolean))
        await drawSvg(pdf, recolor(await svgText(src), FOL), w, h);
      // 3) tekst u krivama
      for (const L of layers) if (L.text.trim()) await drawText(pdf, L, fx(L) ? FOL : L.color);
    });
    const naziv = `Mango · ${T.naziv}`;
    pdf.setProperties({
      title: naziv, creator: "Mango Radionica",
      subject: `Format bez sečenja: ${T.strane.map(s => `${s.mm[0]}×${s.mm[1]} mm`).join(", ")}; +${BLEED} mm za sečenje sa svake strane. ` +
        (foil ? `Foliotisak ${FOLIJE[foil].naziv}: sve u tamnosivoj ${FOL}.` : "Digitalna štampa."),
    });
    pdf.save(`mango-${T.id}-stampa.pdf`);
    if (missingCh.size) console.warn("Znakovi kojih nema u fontu:", [...missingCh].join(", "));
    return { strane: T.strane.length, missing, znaci: [...missingCh] };
  };
})();
