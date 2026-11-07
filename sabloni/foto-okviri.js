/* =========================================================
   ŠABLONI SA FOTOGRAFIJOM KUPCA (editor/foto.js)
   Verzija postojećeg šablona („od“) sa okvirom za fotografiju i tekstovima pomerenim da joj naprave mesta.
   Original ostaje u listi kakav jeste; verzija sa fotografijom stoji odmah iza njega.
     foto:  { x, y, w, h, oblik, r?, okvir?: [boja, debljina], preko? }   (0,1 mm, u meri originala)
            oblik: "krug" | "luk" (gore polukrug, dole ravno) | "ram" (pravougaonik, r = zaobljenje ugla)
            preko: PNG preko cele strane, za crtež koji prelazi preko fotografije
     polja: { redni broj polja u originalu: izmene (y, size, lh…) }
   ========================================================= */
window.FOTO_SABLONI = [
  {
    od: "safari-bela-pozadina", id: "safari-luk-foto", naziv: "Safari luk sa fotografijom",
    strane: { s1: {
      foto: { x: 265, y: 130, w: 770, h: 440, oblik: "luk", okvir: ["#ffffff", 9] },
      polja: {
        0: { y: 588, size: 11, lh: 1.2 },
        4: { y: 726, size: 23 },
        3: { y: 842, size: 11, lh: 1.2 },
        2: { y: 994, size: 11 },
        1: { y: 1104, size: 10, lh: 1.2 },
      },
    } },
  },
  {
    od: "uros1", id: "dzungla-foto", naziv: "Džungla sa fotografijom",
    strane: { s1: {
      foto: { x: 420, y: 205, w: 410, h: 410, oblik: "krug", okvir: ["#517f6b", 7] },
      polja: {
        2: { y: 640, size: 34 },
        3: { y: 805, size: 14 },
        1: { y: 920, size: 22 },
        0: { y: 1035, size: 13 },
        4: { y: 1262, size: 14 },
      },
    } },
  },
  {
    od: "primer-9", id: "save-the-date-foto", naziv: "Save the date sa fotografijom",
    strane: { s1: {
      foto: { x: 300, y: 150, w: 650, h: 640, oblik: "luk" },
      polja: {
        5: { y: 812, size: 18 },
        2: { y: 900, size: 42 },
        0: { y: 985, size: 64 },
        1: { y: 1245, size: 17, x: 486 },
        4: { y: 1310, size: 19 },
        3: { y: 1405, size: 24 },
      },
    } },
  },
];
(function () {
  const S = window.SABLONI || [];
  for (const V of window.FOTO_SABLONI) {
    const k = S.findIndex(t => t.id === V.od); if (k < 0) continue;
    const t = JSON.parse(JSON.stringify(S[k]));
    t.id = V.id; t.naziv = V.naziv;
    t.strane.forEach(s => {
      const P = V.strane[s.id]; if (!P) return;
      s.foto = P.foto;
      for (const [i, z] of Object.entries(P.polja || {})) if (s.polja[i]) Object.assign(s.polja[i], z);
    });
    Object.assign(t, { mm: t.strane[0].mm, pozadina: t.strane[0].pozadina, polja: t.strane[0].polja });
    S.splice(k + 1, 0, t);
  }
})();
