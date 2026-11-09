/* =========================================================
   MANGO CENOVNIK: jedno mesto za cene, koriste ga kalkulator i editor.
   Cene su u dinarima po komadu, osim „fixed“ (jednom po porudžbini).
   ========================================================= */
window.CENOVNIK = {
  minQty: 30,                     // važi za sve, osim ako papir ima svoj minQty (pasoš = 40)
  formats: [            // kov = koja koverta ide uz format
    { id: "125", name: "12,5 × 16,5 cm", note: "uspravna, koverta 13 × 17 cm", price: 0, kov: ["kov13", "kovplis", "kovstamp"] },
    { id: "150", name: "15 × 15 cm",     note: "kvadratna, koverta 15 × 15 cm", price: 0, kov: ["kov15", "kov15v"] },
    { id: "165", name: "16,5 × 12,5 cm", note: "položena, koverta 13 × 17 cm", price: 0, kov: ["kov13", "kovplis", "kovstamp"] },
  ],
  papers: [              // duplex = doplata za dvostranu štampu (null = nije moguće / uključeno)
    { id: "350",   name: "350g papir",      note: "gladak, mat",                    price: 60,  duplex: 20 },
    { id: "hrap",  name: "Hrapavi papir",   note: "izražena tekstura",              price: 80,  duplex: 20 },
    { id: "sedef", name: "Sedefasti papir", note: "blagi biserni sjaj",             price: 80,  duplex: 20 },
    // foliotisak ide samo na 350g papir sa mat štampom; cena uključuje papir
    { id: "folio", name: "Foliotisak",      note: "350g papir, mat štampa + zlatna, rose gold, srebrna ili crvena folija", price: 130, duplex: 30 },
    { id: "pasos", name: "Boarding pass / pasoš", note: "350g papir + mat štampa + foliotisak", price: 200, duplex: null, minQty: 40 },
  ],
  extras: [               // group = može samo jedno iz grupe; needs = ide samo uz drugi dodatak
    { id: "dvo",    name: "Dvostrana štampa",       note: "+20 din, uz foliotisak +30 din", price: 20 },
    { id: "kov13",  name: "Koverta 13 × 17 cm",     note: "za format 12,5 × 16,5, boja po želji", price: 40, group: "kov" },
    { id: "kovplis", name: "Plišana koverta 13 × 17 cm", note: "somotska, zelena ili kraljevsko plava", price: 120, group: "kov" },
    { id: "kovstamp", name: "Štampana koverta 13 × 17 cm", note: "sa šarom, npr. tačkice (koverta 40 + štampa 50 din)", price: 90, group: "kov" },
    { id: "kov15",  name: "Koverta 15 × 15 cm",     note: "standardno pismo, boja po želji", price: 50, group: "kov" },
    { id: "kov15v", name: "Koverta 15 × 15 cm, na vađenje", note: "pozivnica se izvlači, boja po želji", price: 50, group: "kov" },
    { id: "pecat",  name: "Voštani pečat",          note: "boja i motiv po izboru", price: 30 },
    { id: "paus",   name: "Paus papir omot",        note: "providni omot oko pozivnice", price: 50 },
    { id: "avion",  name: "Akrilni zlatni aviončić", note: "za pasoš i boarding",  price: 30 },
    { id: "vez",    name: "Naše vezivanje",         note: "uz aviončić",           price: 20, needs: "avion" },
  ],
  fixed: [                // jednokratni troškovi, bez obzira na količinu
    { name: "Grafička priprema i provera", note: "pregledamo dizajn, doteramo ga za štampu i šaljemo vam na uvid", price: 1000 },
  ],
  // Samo elektronska pozivnica (bez štampe). Uz štampane pozivnice je gratis.
  // akcija: akcijska cena (npr. 1500) ili null; dok je postavljena, stara cena se prikazuje precrtana.
  epozivnica: { name: "Elektronska pozivnica", price: 2000, akcija: null },
  discounts: [],          // popusti na količinu, npr. { from: 100, pct: 5 } (trenutno nema)
};
