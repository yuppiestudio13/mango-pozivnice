/* =========================================================
   ŠABLONI ZA EDITOR
   ---------------------------------------------------------
   Svaki šablon = zaključana pozadina (slika/SVG bez teksta)
   + početni tekstovi koje kupac može da menja i pomera.

   Jedinice: 1 jedinica = 0,1 mm  (širina 1270 = 127 mm)
   x, y  = gornji levi ugao tekstualnog polja
   w     = širina polja (tekst se prelama unutar nje)
   size  = veličina slova u pt
   ls    = razmak slova (u hiljaditim delovima em, kao u Illustratoru)
   lh    = prored (1.2 = 120%)
   ========================================================= */
window.SABLONI = [
  {
    id: "zelenilo",
    naziv: "Minimal zelenilo",
    kategorija: "Venčanja",
    mm: [127, 178],
    pozadina: "sabloni/zelenilo.svg",
    bezbedno: 110,                       // bezbedna zona od ivice (11 mm)
    boje: ["#1c3627", "#3e5a4b", "#7f9d8c", "#a8864b", "#23251f", "#7d7a70"],
    polja: [
      { text: "Zajedno sa porodicama", x: 235, y: 330, w: 800, font: "Jost", weight: 300, size: 9, color: "#7d7a70", align: "center", ls: 320, lh: 1.3, upper: true },
      { text: "Ana", x: 185, y: 450, w: 900, font: "Great Vibes", weight: 400, size: 54, color: "#1c3627", align: "center", ls: 0, lh: 1 },
      { text: "&", x: 535, y: 640, w: 200, font: "Cormorant Garamond", weight: 300, italic: true, size: 26, color: "#a8864b", align: "center", ls: 0, lh: 1 },
      { text: "Marko", x: 185, y: 770, w: 900, font: "Great Vibes", weight: 400, size: 54, color: "#1c3627", align: "center", ls: 0, lh: 1 },
      { text: "pozivaju vas da budete deo\nnašeg venčanja", x: 235, y: 1010, w: 800, font: "Cormorant Garamond", weight: 400, italic: true, size: 15, color: "#3e5a4b", align: "center", ls: 0, lh: 1.3 },
      { text: "Subota, 14. jun 2027. · 17 časova", x: 185, y: 1200, w: 900, font: "Jost", weight: 400, size: 9.5, color: "#1c3627", align: "center", ls: 220, lh: 1.4, upper: true },
      { text: "Restoran Dunav\nNovi Sad", x: 235, y: 1290, w: 800, font: "Cormorant Garamond", weight: 500, size: 14, color: "#1c3627", align: "center", ls: 40, lh: 1.25 },
      { text: "Molimo potvrdite dolazak do 1. juna", x: 235, y: 1490, w: 800, font: "Cormorant Garamond", weight: 400, italic: true, size: 11, color: "#7d7a70", align: "center", ls: 0, lh: 1.3 }
    ]
  },
  {
    id: "boarding-pass",
    naziv: "Boarding pass",
    kategorija: "Bestseler · venčanja i rođendani",
    mm: [210, 99],
    pozadina: "sabloni/boarding-pass.svg",
    bezbedno: 60,
    boje: ["#1c3627", "#a8864b", "#c9ab72", "#f8f4ec", "#23251f", "#7d7a70"],
    polja: [
      { text: "Boarding pass", x: 150, y: 70, w: 900, font: "Cormorant Garamond", weight: 500, size: 24, color: "#f8f4ec", align: "left", ls: 120, lh: 1, upper: true },
      { text: "Let ka zajedničkom životu", x: 1540, y: 86, w: 490, font: "Jost", weight: 400, size: 6.5, color: "#c9ab72", align: "right", ls: 260, lh: 1.2, upper: true },
      { text: "Putnici", x: 150, y: 260, w: 600, font: "Jost", weight: 400, size: 6.5, color: "#a8864b", align: "left", ls: 300, lh: 1.2, upper: true },
      { text: "Ana & Marko", x: 150, y: 300, w: 1200, font: "Cormorant Garamond", weight: 500, size: 30, color: "#1c3627", align: "left", ls: 0, lh: 1 },
      { text: "NS", x: 340, y: 420, w: 200, font: "Space Mono", weight: 700, size: 26, color: "#1c3627", align: "right", ls: 40, lh: 1 },
      { text: "Novi Sad", x: 340, y: 530, w: 200, font: "Jost", weight: 300, size: 7.5, color: "#7d7a70", align: "right", ls: 120, lh: 1.2, upper: true },
      { text: "LUV", x: 1180, y: 420, w: 260, font: "Space Mono", weight: 700, size: 26, color: "#1c3627", align: "left", ls: 40, lh: 1 },
      { text: "Zauvek", x: 1180, y: 530, w: 260, font: "Jost", weight: 300, size: 7.5, color: "#7d7a70", align: "left", ls: 120, lh: 1.2, upper: true },
      { text: "Datum\n14.06.2027.", x: 150, y: 640, w: 330, font: "Space Mono", weight: 400, size: 9, color: "#1c3627", align: "left", ls: 0, lh: 1.5, upper: true },
      { text: "Ukrcavanje\n17:00", x: 520, y: 640, w: 300, font: "Space Mono", weight: 400, size: 9, color: "#1c3627", align: "left", ls: 0, lh: 1.5, upper: true },
      { text: "Gejt\nRestoran Dunav", x: 860, y: 640, w: 560, font: "Space Mono", weight: 400, size: 9, color: "#1c3627", align: "left", ls: 0, lh: 1.5, upper: true },
      { text: "Molimo potvrdite dolazak do 01.06.", x: 150, y: 860, w: 1240, font: "Cormorant Garamond", weight: 400, italic: true, size: 11, color: "#7d7a70", align: "left", ls: 0, lh: 1.2 },
      { text: "Putnik", x: 1610, y: 260, w: 420, font: "Jost", weight: 400, size: 6.5, color: "#a8864b", align: "left", ls: 300, lh: 1.2, upper: true },
      { text: "Ime gosta", x: 1610, y: 300, w: 420, font: "Cormorant Garamond", weight: 500, size: 17, color: "#1c3627", align: "left", ls: 0, lh: 1.1 },
      { text: "Sedište\nSto 7", x: 1610, y: 470, w: 420, font: "Space Mono", weight: 400, size: 9, color: "#1c3627", align: "left", ls: 0, lh: 1.5, upper: true }
    ]
  }
];
