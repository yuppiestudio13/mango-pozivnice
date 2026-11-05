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
   grupe = filteri u galeriji (radionica.html): vencanja, boarding,
           krstenja, rodjendani, punoletstva

   Šablon sa više strana (korica, karta, poleđina…) umesto mm/pozadina/
   polja ima listu strane: [{ id, naziv, mm, bezbedno, pozadina, folija, polja }].
   folija (na strani) = SVG crteža koji ide u foliotisak (crno = folija).
   folija (na šablonu) = { boje: [...], izabrana } → sav tekst je u foliji.
   papir = papir i štampa koji uvek idu uz ovaj šablon.
   ========================================================= */
window.SABLONI = [
  {
    id: "boarding-roza",
    naziv: "Boarding roza",
    kategorija: "Pasoš · rođendani, punoletstva i venčanja",
    grupe: ["boarding", "punoletstva", "rodjendani", "vencanja"],
    papir: "350g, mat štampa",
    // Stari nacrti (pre 2026-11-05) su imali zamenske fontove; editor ih pri otvaranju prebacuje na originalne.
    // [novi font, odnos veličine] se koristi samo kad se polje ne može upariti sa poljem iz šablona.
    zameneFontova: { "Crimson Pro": ["Scientia", 0.89], "Ms Madi": ["Retro Signature", 1.13] },
    folija: { boje: ["rose", "gold", "silver", "red"], izabrana: "rose" },   // foliotisak: sav tekst + crtež sa sloja folije
    // Vrste: ista karta i poleđina, druga korica i podrazumevani tekstovi. Prva vrsta = strane kako su ispod;
    // ostale menjaju polja (i foliju) pojedinih strana po id-ju strane. Venčanje: iz „Danijela komplet.pdf“.
    vrste: [
      { id: "rodjendan", naziv: "Rođendan" },
      { id: "vencanje", naziv: "Venčanje", strane: {
        korica: {
          folija: "sabloni/boarding-roza/korica-vencanje-folija.svg",   // krug, X, avion i srce
          polja: [
            { text: "WEDDING\nPASSPORT", x: 891, y: 153, w: 483, font: "Scientia", weight: 400, size: 22.0, color: "#45474a", align: "center", ls: 20, lh: 0.958 },
            { text: "K", x: 915, y: 570, w: 160, font: "Scientia", weight: 400, size: 29.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
            { text: "D", x: 1187, y: 570, w: 160, font: "Scientia", weight: 400, size: 29.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
            { text: "30.08.2026.", x: 933, y: 913, w: 420, font: "Scientia", weight: 400, size: 20.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 }
          ]
        },
        karta: {
          polja: [
            { text: "AVGUST", x: 1426, y: 55, w: 221, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
            { text: "30.", x: 1414, y: 87, w: 235, font: "Scientia", weight: 700, size: 35.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
            { text: "2026.", x: 1480, y: 214, w: 120, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
            { text: "KARTA PRVE KLASE ZA LET\nU NAŠ NOVI ŽIVOT", x: 302, y: 46, w: 851, font: "Scientia", weight: 400, size: 16.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            { text: "Kosta Mihić i Danijela Mirković", x: 190, y: 234, w: 1119, font: "Retro Signature", weight: 400, size: 32.0, color: "#45474a", align: "center", ls: 10, lh: 0.8 },
            { text: "Datum:\n30.8.2026.", x: 215, y: 399, w: 221, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            { text: "Lokacija:\nHotel Moskva", x: 422, y: 399, w: 416, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            { uloga: "grad", text: "Grad:\nNovi Sad", x: 819, y: 399, w: 145, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            { text: "Vreme:\n16:00h", x: 975, y: 399, w: 159, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            { uloga: "drzava", text: "Država:\nSrbija", x: 1125, y: 399, w: 175, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            { text: "Save the date!", x: 402, y: 573, w: 688, font: "Retro Signature", weight: 400, size: 40.0, color: "#45474a", align: "center", ls: 10, lh: 0.8 }
          ]
        },
        poledjina: {
          naziv: "Karta, poleđina (satnica)",
          folija: "sabloni/boarding-roza/poledjina-vencanje-folija.svg",   // avion levo od linije
          polja: [
            { text: "Kosta Mihić i Danijela Mirković", x: 100, y: 38, w: 1500, font: "Retro Signature", weight: 400, size: 40.0, color: "#45474a", align: "center", ls: 0, lh: 0.8 },
            { text: "Dolazak potvrditi do 1. avgusta 2026. godine", x: 250, y: 618, w: 1200, font: "Scientia", weight: 500, size: 12.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 }
          ],
          // Satnica: kupac dodaje/briše korake (najviše max) i bira ikonicu (sabloni/ikonice.js).
          // Koraci se ravnomerno raspoređuju između x0 i x1; linija, tačke i ikonice idu u foliju.
          // vreme/opis = izgled teksta svakog koraka (y, font…); x i širinu računa editor.
          satnica: {
            x0: 220, x1: 1552, linija: [258, 1619, 381], debljina: 4.57, tacka: 9.5, dno: 350, maxW: 185, max: 5,
            vreme: { y: 410, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            opis: { y: 457, font: "Scientia", weight: 500, size: 7.3, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
            koraci: [
              { ikona: "mladenci", vreme: "12:00", opis: "SKUP PORODICE\nMIHIĆ I MIRKOVIĆ\nU CAFFE ARENA\nBEOČIN" },
              { ikona: "crkva", vreme: "14:30", opis: "CRKVENO VENČANJE\nU HRAMU SVETI\nVASILIJE OSTROŠKI\nU BEOČINU" },
              { ikona: "sala", vreme: "16:00", opis: "ODLAZAK U SALU\nHOTEL MOSKVA\nNOVI SAD" },
              { ikona: "burme", vreme: "17:00", opis: "GRAĐANSKO VENČANJE\nU RESTORANU" }
            ]
          }
        }
      } },
    ],
    // Boja pozadine: osnovna = boja iz originalnog PDF-a. Editor je u svim pozadinama zamenjuje izabranom,
    // a svetlije nijanse (mapa sveta) prate je srazmerno. slobodna: true = kupac može i sam da izabere boju.
    // ponuda = najpopularnije boje iz radionice (od korisnika, 2026-11-05). Štampa je CMYK: uz boju može da stoji
    // i tačan CMYK [c, m, y, k] kao treći član; bez njega editor ga računa iz hex-a (približno).
    boja: {
      osnovna: "#ebc8d2",
      ponuda: [
        ["Roza", "#ebc8d2"],
        ["Svetlo roza", "#fbd7db"],
        ["Krem", "#f2e7d4"],
        ["Svetlo plava", "#ccebf2"],
        ["Mint zelena", "#cce5d2"],
        ["Maslinasto zelena", "#4a5b57"],
        ["Tamno plava", "#163158"],
        ["Bordo", "#581027"],
        ["Crna", "#000000"],
      ],
      slobodna: true,
    },
    strane: [
      {
        id: "korica", naziv: "Korica pasoša", mm: [150, 120], bezbedno: 50,
        pozadina: "sabloni/boarding-roza/korica.svg",
        folija: null,
        polja: [
          { text: "BIRTHDAY\nPASSPORT", x: 882, y: 138, w: 483, font: "Scientia", weight: 400, size: 22.0, color: "#45474a", align: "center", ls: 20, lh: 0.958 },
          { text: "18.", x: 775, y: 369, w: 672, font: "Scientia", weight: 400, size: 125.0, color: "#45474a", align: "center", ls: 10, lh: 0.9 },
          { text: "Petra Krstić", x: 804, y: 837, w: 631, font: "Retro Signature", weight: 400, size: 41.0, color: "#45474a", align: "center", ls: 10, lh: 0.8 },
          { text: "19.10.2025.", x: 956, y: 994, w: 349, font: "Scientia", weight: 700, size: 16.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 }
        ]
      },
      {
        id: "karta", naziv: "Karta, prednja strana", mm: [170, 70], bezbedno: 15,
        pozadina: "sabloni/boarding-roza/karta.png",
        folija: "sabloni/boarding-roza/karta-folija.svg",
        // Mapa: država iz polja sa uloga: "drzava" bira crtež, a grad iz polja sa uloga: "grad" pomera pribadaču.
        // Za svaku državu: crtez (crno = folija), okvir = gde je mapa na strani (0,1 mm),
        // geo = [zapad, istok, sever, jug] tog okvira (Merkator). Nazivi država i mesta su u sabloni/mesta.js.
        // Za državu koje nema na listi mapa i pribadača se sklanjaju.
        // putanja = isprekidana linija od mesta gde ulazi u mapu do pribadače (pin je u pt, oko tačke na mestu grada).
        mapa: {
          podrazumevana: "srbija",
          drzave: {
            srbija:   { crtez: "sabloni/boarding-roza/mapa-srbija.svg",   okvir: [1431.2, 319.6, 1653.5, 641.4], geo: [18.82, 23.01, 46.19, 41.85] },
            bih:      { crtez: "sabloni/boarding-roza/mapa-bih.svg?v=3",     okvir: [1397.0,  360.3,  1658.1,  613.4], geo: [15.7161,  19.6189,  45.2845,  42.5592] },
            hrvatska: { crtez: "sabloni/boarding-roza/mapa-hrvatska.svg?v=3", okvir: [1397.0,  358.8,  1658.1,  614.9], geo: [13.5015,  19.4078,  46.547,  42.4163] },
            austrija: { crtez: "sabloni/boarding-roza/mapa-austrija.svg?v=3", okvir: [1397.0,  419.9,  1658.1,  553.8], geo: [9.5212,  17.1483,  49.0098,  46.3786] },
            crnagora: { crtez: "sabloni/boarding-roza/mapa-crnagora.svg?v=3", okvir: [1397.0,  330.1,  1658.1,  643.6], geo: [18.4335,  20.3552,  43.5479,  41.8524] },
          },
          pocetak: [1406.9, 339.9], smer: [0.985, 0.172],
          linija: 2.1, crtica: [10.6, 7.3],
          pin: "M-1.315 -6.097C-1.309 -6.851 -.693 -7.457 .061 -7.45 .816 -7.444 1.421 -6.828 1.415 -6.074 1.409 -5.32 .793 -4.714 .038 -4.72-.715 -4.726-1.321 -5.342-1.315 -6.097ZM-2.171 -5.716C-2.145 -5.563-2.105 -5.416-2.051 -5.275-1.825 -4.598-1.281 -3.451 .013 -1.634 1.336 -3.429 1.899 -4.567 2.137 -5.24 2.193 -5.38 2.237 -5.527 2.264 -5.679 2.323 -5.953 2.301 -6.067 2.301 -6.067 2.311 -7.31 1.312 -8.326 .068 -8.336-1.174 -8.347-2.191 -7.347-2.201 -6.104-2.201 -6.104-2.225 -5.991-2.171 -5.716ZM-.504 0A.504 .504 0 1 0 .504 0 .504 .504 0 1 0-.504 0Z", pinMera: 3.5278
        },
        polja: [
          { text: "OKTOBAR", x: 1430, y: 53, w: 221, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
          { text: "19.", x: 1419, y: 74, w: 235, font: "Scientia", weight: 700, size: 40.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
          { text: "2025.", x: 1480, y: 214, w: 120, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
          { text: "KARTA ZA\nPROSLAVU PUNOLETSTVA", x: 302, y: 46, w: 851, font: "Scientia", weight: 400, size: 16.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
          { text: "Petra Krstić", x: 384, y: 205, w: 692, font: "Retro Signature", weight: 400, size: 45.0, color: "#45474a", align: "center", ls: 10, lh: 0.8 },
          { text: "Datum:\n19.10.2025.", x: 215, y: 399, w: 221, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
          { text: "Lokacija:\nHotel restoran Madera", x: 422, y: 399, w: 416, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
          { uloga: "grad", text: "Grad:\nNiš", x: 819, y: 399, w: 145, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
          { text: "Vreme:\n17:00h", x: 975, y: 399, w: 159, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
          { uloga: "drzava", text: "Država:\nSrbija", x: 1125, y: 399, w: 175, font: "Scientia", weight: 700, size: 10.0, color: "#45474a", align: "center", ls: 10, lh: 1.2 },
          { text: "Save the date!", x: 377, y: 567, w: 688, font: "Retro Signature", weight: 400, size: 41.0, color: "#45474a", align: "center", ls: 10, lh: 0.8 }
        ]
      },
      {
        id: "poledjina", naziv: "Karta, poleđina", mm: [170, 70], bezbedno: 15,
        pozadina: "sabloni/boarding-roza/poledjina.svg",
        folija: null,
        polja: [
          { text: "Hvala Vam što ste deo moje životne avanture!", x: 93, y: 50, w: 1513, font: "Scientia", weight: 400, size: 17.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 },
          { text: "DOBRO DOŠLI NA MOJ\nLET U SVET ODRASLIH!!!", x: 339, y: 290, w: 1021, font: "Scientia", weight: 500, size: 20.0, color: "#45474a", align: "center", ls: 10, lh: 1.0 },
          { text: "Molimo vas svoj dolazak potvrditi do 05.10.2025.", x: 159, y: 537, w: 1382, font: "Scientia", weight: 400, size: 15.0, color: "#45474a", align: "center", ls: 10, lh: 1.15 }
        ]
      }
    ]
  },
  {
    id: "zelenilo",
    naziv: "Minimal zelenilo",
    kategorija: "Venčanja",
    grupe: ["vencanja"],
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
    grupe: ["boarding", "vencanja", "rodjendani"],
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

/* Šablon sa jednom stranom dobija strane: [...], a šablon sa više strana
   dobija mm/pozadina/polja prve strane (za galeriju i sličice). */
window.SABLONI.forEach(t => {
  if (!t.strane) t.strane = [{ id: "prednja", naziv: "Prednja strana", mm: t.mm, bezbedno: t.bezbedno, pozadina: t.pozadina, folija: null, polja: t.polja }];
  const p = t.strane[0];
  t.mm = p.mm; t.pozadina = p.pozadina; t.polja = p.polja; t.bezbedno = p.bezbedno;
  if (!t.boje) t.boje = ["#45474a"];
});

/* Boje folije (prikaz u editoru; u štampi je to prava folija). */
window.FOLIJE = {
  rose:   { naziv: "Rose gold", boja: "#b8817a", sjaj: "linear-gradient(118deg,#9e6660 0%,#d6a49b 28%,#f0cfc6 44%,#bd8a82 60%,#e7bdb3 80%,#a86f68 100%)" },
  gold:   { naziv: "Zlatna",    boja: "#b8954f", sjaj: "linear-gradient(118deg,#8f6d2f 0%,#cfae66 28%,#f1dc9e 44%,#b8954f 60%,#e2c880 80%,#93723a 100%)" },
  silver: { naziv: "Srebrna",   boja: "#9a9ea3", sjaj: "linear-gradient(118deg,#74787d 0%,#b9bdc2 28%,#eceef0 44%,#9a9ea3 60%,#d5d8db 80%,#7c8085 100%)" },
  red:    { naziv: "Crvena",    boja: "#b0302f", sjaj: "linear-gradient(118deg,#7f1c1d 0%,#c2413e 30%,#e2706a 44%,#a92b2a 60%,#cf4f4a 80%,#86201f 100%)" },
};
