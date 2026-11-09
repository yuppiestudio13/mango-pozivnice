/* =========================================================
   POZIVNICE – fotografije i podstranice
   Nova fotografija = jedan red u FOTO: [fajl iz slike/, opis, povodi, napravi]
   napravi (može da se izostavi) = id šablona u editoru ("Napravi sličnu") ili #filter radionice ("Slični dizajni")
   Povodi: vencanja, boarding, krstenja, rodjendani, punoletstva (krštenja i punoletstva se prikazuju na strani Rođendani)
   ========================================================= */
window.POVODI = [
  { id:"vencanja",    naziv:"Venčanja",              strana:"pozivnice-vencanja.html",    naslov:"Pozivnice za <em>venčanje</em>", cover:"cat-vencanja",
    opis:"Od minimalnih do bogatih florala, sa foliotiskom, voštanim pečatom i kovertom u boji. Svaku pozivnicu prilagođavamo vašim imenima, datumu i boji venčanja." },
  { id:"boarding",    naziv:"Boarding pass i pasoš", strana:"pozivnice-boarding-pass.html", naslov:"Boarding pass i <em>pasoš</em>", cover:"bp-vencanje-zeleni",
    opis:"Naš bestseler. Pozivnica u obliku pasoša ili avionske karte, sa foliotiskom i akrilnim zlatnim aviončićem. Za venčanja i rođendane." },
  { id:"rodjendani",  naziv:"Rođendani",             strana:"pozivnice-rodjendani.html",  naslov:"Pozivnice za <em>rođendan</em>", cover:"cat-rodjendani",
    obuhvata:["rodjendani", "krstenja", "punoletstva"],
    opis:"Vesele pozivnice za dečije rođendane, punoletstva i krštenja: svemir, pasoš sa avionom ili motiv koji vaše dete voli." },
];

window.FOTO = [
  ["cat-vencanja",       "Lučna pozivnica sa krupnim datumom",          "vencanja", "ana-jovan"],
  ["bp-vencanje-zeleni", "Venčani pasoš, zeleni sa zlatotiskom",        "vencanja boarding", "boarding-roza"],
  ["kol-floral",         "Jesenji buket, akvarel cveće",                "vencanja", "marija1"],
  ["bp-rodjendan-roze",  "Pasoš za 18. rođendan, roze",                 "boarding punoletstva", "boarding-roza"],
  ["kol-sage",           "Sage i bakarni voštani pečat",                "vencanja", "#vencanja/minimal"],
  ["cat-rodjendani",     "Svemirski dečiji rođendan",                   "rodjendani", "maksim"],
  ["kol-monogram",       "Monogram sa zaobljenim uglovima",             "vencanja", "#vencanja/monogram"],
  ["bp-boarding-card",   "Boarding karta, teget sa zlatotiskom",        "vencanja boarding", "boarding-roza"],
  ["cat-krstenja",       "Krštenje, zlatotisak na zelenoj podlozi",     "krstenja", "#rodjendani"],
  ["ig-1",               "Kompletan set sa kovertom i pečatom",         "vencanja", "#vencanja/minimal"],
  ["bp-vencanje-bordo",  "Venčani pasoš, bordo",                        "vencanja boarding", "boarding-roza"],
  ["kol-datum",          "Veliki datum sa zlatnim ivicama",             "vencanja", "milica-nov-1-crveno"],
  ["cat-punoletstva",    "Punoletstvo, zlatotisak na zelenom",          "punoletstva", "#rodjendani/punoletstva"],
  ["bp-decji",           "Dečiji rođendanski pasoš sa avionom",         "boarding rodjendani", "boarding-roza"],
  ["hero-3",             "Akvarel cveće i bakarni pečati",              "vencanja", "martina"],
  ["bp-rodjendan-krem",  "Pasoš za 18. rođendan, teget i krem",         "boarding punoletstva", "boarding-roza"],
  ["ig-6",               "Slonovača i beli pečati",                     "vencanja", "#vencanja/minimal"],
  ["bp-vencanje-ruka",   "Venčani pasoš sa zlatnim avionom",            "vencanja boarding", "boarding-roza"],
  ["ig-5",               "Zelenilo i bakarni pečati",                   "vencanja", "natalija"],
  ["bp-rodjendan-teget", "Pasoši za 18. rođendan, roze i teget",        "boarding punoletstva", "boarding-roza"],
  ["hero-5",             "Minimal pozivnica sa zelenim pečatima",       "vencanja", "#vencanja/cirilica"],
  ["bp-karte",           "Venčane boarding karte sa mapom",             "vencanja boarding", "boarding-roza"],
  ["bp-mint",            "Pasoš, mint sa zlatnim avionom",              "boarding", "boarding-roza"],
  ["pecat-paket",        "Set sa zelenom kovertom i bakarnim pečatima", "vencanja"],
  ["kol-pasos",          "Rođendanski pasoš, zeleni",                   "boarding", "boarding-roza"],
  ["bp-rodjendan-plavi", "Rođendanski pasoš, plavi",                    "boarding", "boarding-roza"],
  ["hero",               "Pozivnice sa bakarnim pečatima",              "vencanja", "iva-i-vukota"],
];
