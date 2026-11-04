/* =========================================================
   DRŽAVE I MESTA ZA MAPU NA POZIVNICI
   Kad kupac upiše državu, na karti se pojavi mapa te države.
   Kad upiše grad, pribadača ide na to mesto.

   DRZAVE: ključ → nazivi koje kupac može da upiše (ćirilica i
   slova bez kvačica se prepoznaju sama).
   MESTA: ["Naziv|drugi naziv", geografska širina, dužina].
   Prvo mesto na listi je glavni grad: tu ide pribadača kad grad
   nije na listi. Novo mesto = još jedan red (koordinate sa Google Maps).
   ========================================================= */
window.DRZAVE = {
  srbija:   ["Srbija", "Serbia", "Republika Srbija"],
  bih:      ["Bosna i Hercegovina", "BiH", "B i H", "B&H", "Bosna", "Republika Srpska", "RS", "Federacija BiH", "FBiH", "Bosnia", "Bosnia and Herzegovina"],
  hrvatska: ["Hrvatska", "Croatia", "Republika Hrvatska", "HR"],
  austrija: ["Austrija", "Austria", "Österreich", "Osterreich"],
  crnagora: ["Crna Gora", "Montenegro", "CG", "Republika Crna Gora"],
};

window.MESTA = {};
window.MESTA.srbija = [
  ["Beograd", 44.817, 20.457], ["Zemun", 44.843, 20.401], ["Novi Beograd", 44.808, 20.403], ["Surčin", 44.793, 20.280],
  ["Obrenovac", 44.655, 20.200], ["Lazarevac", 44.385, 20.256], ["Mladenovac", 44.437, 20.694], ["Sopot", 44.519, 20.574],
  ["Barajevo", 44.578, 20.411], ["Grocka", 44.672, 20.717],
  ["Novi Sad", 45.267, 19.833], ["Petrovaradin", 45.252, 19.866], ["Sremski Karlovci", 45.203, 19.934], ["Beočin", 45.208, 19.720],
  ["Temerin", 45.408, 19.887], ["Titel", 45.206, 20.294], ["Žabalj", 45.372, 20.064], ["Srbobran", 45.548, 19.791],
  ["Bačka Palanka", 45.250, 19.392], ["Bački Petrovac", 45.360, 19.592], ["Bač", 45.392, 19.239], ["Odžaci", 45.508, 19.262],
  ["Vrbas", 45.572, 19.640], ["Kula", 45.609, 19.527], ["Bečej", 45.616, 20.034], ["Bačka Topola", 45.815, 19.632],
  ["Subotica", 46.100, 19.665], ["Palić", 46.101, 19.763], ["Kanjiža", 46.067, 20.050], ["Senta", 45.927, 20.077], ["Ada", 45.802, 20.127],
  ["Sombor", 45.774, 19.112], ["Apatin", 45.671, 18.984],
  ["Zrenjanin", 45.381, 20.390], ["Novi Bečej", 45.600, 20.137], ["Kikinda", 45.830, 20.465], ["Čoka", 45.942, 20.143],
  ["Novi Kneževac", 46.045, 20.100], ["Nova Crnja", 45.668, 20.605], ["Žitište", 45.485, 20.550], ["Sečanj", 45.367, 20.773],
  ["Pančevo", 44.871, 20.640], ["Opovo", 45.053, 20.430], ["Kovačica", 45.111, 20.621], ["Alibunar", 45.081, 20.966],
  ["Plandište", 45.227, 21.122], ["Vršac", 45.117, 21.303], ["Bela Crkva", 44.898, 21.417], ["Kovin", 44.748, 20.976],
  ["Sremska Mitrovica", 44.977, 19.613], ["Ruma", 45.008, 19.822], ["Inđija", 45.048, 20.082], ["Stara Pazova", 44.985, 20.161],
  ["Irig", 45.100, 19.857], ["Šid", 45.128, 19.227], ["Pećinci", 44.909, 19.965],
  ["Šabac", 44.756, 19.694], ["Bogatić", 44.838, 19.481], ["Vladimirci", 44.613, 19.784], ["Koceljeva", 44.470, 19.818],
  ["Loznica", 44.534, 19.226], ["Banja Koviljača", 44.513, 19.155], ["Mali Zvornik", 44.374, 19.106], ["Krupanj", 44.366, 19.362],
  ["Ljubovija", 44.188, 19.373],
  ["Valjevo", 44.275, 19.890], ["Ub", 44.456, 20.073], ["Lajkovac", 44.369, 20.163], ["Mionica", 44.251, 20.083],
  ["Ljig", 44.226, 20.237], ["Osečina", 44.373, 19.601],
  ["Smederevo", 44.665, 20.928], ["Smederevska Palanka", 44.365, 20.959], ["Velika Plana", 44.333, 21.076],
  ["Požarevac", 44.620, 21.187], ["Žabari", 44.355, 21.212], ["Petrovac na Mlavi", 44.376, 21.418], ["Kučevo", 44.479, 21.676],
  ["Golubac", 44.653, 21.632], ["Veliko Gradište", 44.764, 21.520], ["Srebrno jezero", 44.776, 21.486],
  ["Kragujevac", 44.012, 20.911], ["Aranđelovac", 44.307, 20.560], ["Topola", 44.255, 20.684], ["Rača", 44.227, 20.981],
  ["Batočina", 44.153, 21.081], ["Lapovo", 44.183, 21.103], ["Knić", 43.927, 20.718],
  ["Jagodina", 43.977, 21.261], ["Ćuprija", 43.927, 21.370], ["Paraćin", 43.861, 21.408], ["Svilajnac", 44.234, 21.195],
  ["Despotovac", 44.093, 21.443], ["Rekovac", 43.861, 21.094],
  ["Bor", 44.075, 22.096], ["Majdanpek", 44.421, 21.934], ["Kladovo", 44.607, 22.613], ["Negotin", 44.226, 22.531],
  ["Zaječar", 43.904, 22.284], ["Knjaževac", 43.567, 22.256], ["Boljevac", 43.833, 21.958], ["Sokobanja", 43.643, 21.870],
  ["Čačak", 43.891, 20.350], ["Gornji Milanovac", 44.026, 20.461], ["Lučani", 43.861, 20.138], ["Ivanjica", 43.582, 20.230],
  ["Kraljevo", 43.725, 20.689], ["Vrnjačka Banja", 43.623, 20.894], ["Raška", 43.286, 20.614], ["Kopaonik", 43.286, 20.812],
  ["Novi Pazar", 43.137, 20.512], ["Tutin", 42.991, 20.336], ["Sjenica", 43.272, 20.000],
  ["Užice", 43.858, 19.842], ["Požega", 43.846, 20.036], ["Arilje", 43.753, 20.096], ["Kosjerić", 44.000, 19.909],
  ["Bajina Bašta", 43.971, 19.568], ["Čajetina", 43.750, 19.715], ["Zlatibor", 43.729, 19.700], ["Nova Varoš", 43.459, 19.813],
  ["Priboj", 43.584, 19.526], ["Prijepolje", 43.389, 19.648],
  ["Kruševac", 43.580, 21.334], ["Trstenik", 43.617, 21.002], ["Varvarin", 43.722, 21.367], ["Ćićevac", 43.716, 21.441],
  ["Aleksandrovac", 43.457, 21.046], ["Brus", 43.383, 21.033],
  ["Niš", 43.321, 21.896], ["Niška Banja", 43.295, 22.006], ["Aleksinac", 43.541, 21.707], ["Ražanj", 43.672, 21.549],
  ["Svrljig", 43.414, 22.124], ["Merošina", 43.285, 21.721], ["Doljevac", 43.199, 21.833], ["Gadžin Han", 43.224, 22.034],
  ["Prokuplje", 43.234, 21.588], ["Kuršumlija", 43.140, 21.272], ["Blace", 43.296, 21.288], ["Žitorađa", 43.184, 21.712],
  ["Pirot", 43.153, 22.586], ["Bela Palanka", 43.217, 22.311], ["Babušnica", 43.068, 22.412], ["Dimitrovgrad", 43.016, 22.776],
  ["Leskovac", 42.998, 21.946], ["Vlasotince", 42.966, 22.129], ["Lebane", 42.917, 21.736], ["Bojnik", 43.014, 21.719],
  ["Medveđa", 42.843, 21.585], ["Crna Trava", 42.811, 22.299],
  ["Vranje", 42.551, 21.900], ["Vranjska Banja", 42.555, 22.000], ["Vladičin Han", 42.708, 22.067], ["Surdulica", 42.690, 22.170],
  ["Bosilegrad", 42.500, 22.472], ["Trgovište", 42.352, 22.090], ["Bujanovac", 42.459, 21.766], ["Preševo", 42.308, 21.649],
  ["Priština", 42.663, 21.165], ["Prizren", 42.213, 20.740], ["Peć", 42.659, 20.288], ["Kosovska Mitrovica", 42.891, 20.866],
  ["Gnjilane", 42.464, 21.469], ["Đakovica", 42.380, 20.431], ["Uroševac", 42.370, 21.149],
];

window.MESTA.bih = [
  ["Sarajevo", 43.856, 18.413], ["Banja Luka|Banjaluka", 44.772, 17.191], ["Istočno Sarajevo|Lukavica", 43.823, 18.355], ["Pale", 43.817, 18.569],
  ["Tuzla", 44.538, 18.676], ["Zenica", 44.203, 17.908], ["Mostar", 43.343, 17.808], ["Bijeljina", 44.756, 19.214], ["Brčko", 44.872, 18.810],
  ["Prijedor", 44.980, 16.714], ["Doboj", 44.732, 18.087], ["Trebinje", 42.711, 18.344], ["Bihać", 44.817, 15.871], ["Cazin", 44.967, 15.943],
  ["Velika Kladuša", 45.184, 15.806], ["Zvornik", 44.386, 19.102], ["Gradiška|Bosanska Gradiška", 45.145, 17.255], ["Laktaši", 44.909, 17.301],
  ["Derventa", 44.978, 17.908], ["Modriča", 44.955, 18.302], ["Šamac|Bosanski Šamac", 45.060, 18.468], ["Prnjavor", 44.870, 17.664],
  ["Teslić", 44.606, 17.860], ["Kozarska Dubica|Bosanska Dubica", 45.177, 16.809], ["Novi Grad|Bosanski Novi", 45.048, 16.378],
  ["Sanski Most", 44.766, 16.665], ["Mrkonjić Grad", 44.417, 17.083], ["Jajce", 44.342, 17.270], ["Travnik", 44.226, 17.665],
  ["Bugojno", 44.057, 17.451], ["Livno", 43.827, 17.008], ["Kakanj", 44.133, 18.117], ["Visoko", 43.989, 18.178], ["Konjic", 43.651, 17.962],
  ["Goražde", 43.668, 18.976], ["Foča", 43.506, 18.778], ["Višegrad", 43.782, 19.292], ["Srebrenica", 44.106, 19.297], ["Bratunac", 44.185, 19.332],
  ["Vlasenica", 44.181, 18.941], ["Gračanica", 44.703, 18.308], ["Lukavac", 44.541, 18.529], ["Gradačac", 44.879, 18.426], ["Orašje", 45.037, 18.693],
  ["Široki Brijeg", 43.383, 17.594], ["Čapljina", 43.121, 17.685], ["Neum", 42.923, 17.616], ["Bileća", 42.876, 18.430], ["Gacko", 43.167, 18.535],
  ["Nevesinje", 43.259, 18.113], ["Ljubinje", 42.951, 18.088], ["Međugorje", 43.188, 17.678],
];

window.MESTA.hrvatska = [
  ["Zagreb", 45.815, 15.982], ["Split", 43.508, 16.440], ["Rijeka", 45.327, 14.442], ["Osijek", 45.555, 18.696], ["Zadar", 44.119, 15.231],
  ["Pula", 44.867, 13.850], ["Slavonski Brod", 45.160, 18.016], ["Karlovac", 45.487, 15.548], ["Varaždin", 46.305, 16.336], ["Šibenik", 43.735, 15.890],
  ["Sisak", 45.466, 16.378], ["Vinkovci", 45.288, 18.805], ["Vukovar", 45.351, 19.002], ["Dubrovnik", 42.650, 18.094], ["Bjelovar", 45.898, 16.849],
  ["Koprivnica", 46.162, 16.828], ["Požega", 45.340, 17.685], ["Čakovec", 46.384, 16.434], ["Virovitica", 45.832, 17.384], ["Đakovo", 45.308, 18.410],
  ["Županja", 45.078, 18.698], ["Nova Gradiška", 45.255, 17.383], ["Daruvar", 45.592, 17.225], ["Beli Manastir", 45.770, 18.604], ["Ilok", 45.222, 19.377],
  ["Samobor", 45.801, 15.711], ["Velika Gorica", 45.713, 16.075], ["Zaprešić", 45.857, 15.807], ["Petrinja", 45.437, 16.276], ["Ogulin", 45.266, 15.229],
  ["Gospić", 44.546, 15.375], ["Knin", 44.041, 16.199], ["Sinj", 43.703, 16.639], ["Imotski", 43.447, 17.216], ["Metković", 43.054, 17.648],
  ["Makarska", 43.297, 17.017], ["Omiš", 43.444, 16.689], ["Trogir", 43.516, 16.251], ["Vodice", 43.758, 15.780], ["Biograd na Moru", 43.943, 15.452],
  ["Poreč", 45.227, 13.595], ["Rovinj", 45.081, 13.639], ["Opatija", 45.338, 14.306], ["Crikvenica", 45.177, 14.692], ["Krk", 45.025, 14.575],
  ["Novalja", 44.556, 14.886], ["Hvar", 43.172, 16.442], ["Korčula", 42.960, 17.135], ["Bol", 43.262, 16.655], ["Cavtat", 42.581, 18.218],
];

window.MESTA.austrija = [
  ["Beč|Wien|Vienna", 48.208, 16.373], ["Grac|Graz", 47.071, 15.439], ["Linc|Linz", 48.306, 14.286], ["Salcburg|Salzburg", 47.809, 13.055],
  ["Insbruk|Innsbruck", 47.269, 11.404], ["Klagenfurt|Celovec", 46.624, 14.308], ["Vilah|Villach|Beljak", 46.610, 13.855], ["Vels|Wels", 48.157, 14.025],
  ["Sankt Pelten|St. Pölten|Sankt Pölten|St Pölten", 48.204, 15.626], ["Dornbirn", 47.413, 9.744], ["Bregenc|Bregenz", 47.503, 9.747],
  ["Vinerojštat|Wiener Neustadt|Bečko Novo Mesto", 47.813, 16.243], ["Štajr|Steyr", 48.043, 14.421], ["Feldkirh|Feldkirch", 47.238, 9.598],
  ["Lajben|Leoben", 47.381, 15.097], ["Krems", 48.410, 15.614], ["Baden", 48.006, 16.234], ["Klosterhojburg|Klosterneuburg", 48.305, 16.325],
  ["Traun", 48.226, 14.240], ["Lustenau", 47.427, 9.658], ["Amštetn|Amstetten", 48.123, 14.872], ["Kapfenberg", 47.444, 15.293],
  ["Medling|Mödling", 48.086, 16.290], ["Halajn|Hallein", 47.683, 13.097], ["Kufštajn|Kufstein", 47.583, 12.170], ["Ajzenštat|Eisenstadt", 47.846, 16.527],
  ["Švehat|Schwechat", 48.141, 16.478], ["Bad Išl|Bad Ischl", 47.711, 13.619], ["Cel am Ze|Zell am See", 47.323, 12.796], ["Kicbil|Kitzbühel", 47.446, 12.392],
  ["Bludenc|Bludenz", 47.155, 9.822], ["Tuln|Tulln", 48.330, 16.055], ["Špital|Spittal an der Drau", 46.800, 13.495], ["Volfsberg|Wolfsberg", 46.841, 14.844],
];

window.MESTA.crnagora = [
  ["Podgorica", 42.441, 19.263], ["Nikšić", 42.773, 18.944], ["Herceg Novi", 42.453, 18.537], ["Igalo", 42.457, 18.513], ["Bar", 42.093, 19.100],
  ["Sutomore", 42.142, 19.047], ["Budva", 42.286, 18.840], ["Sveti Stefan", 42.256, 18.891], ["Petrovac", 42.206, 18.943], ["Kotor", 42.425, 18.771],
  ["Perast", 42.486, 18.699], ["Risan", 42.515, 18.695], ["Tivat", 42.436, 18.696], ["Cetinje", 42.391, 18.923], ["Ulcinj", 41.929, 19.224],
  ["Danilovgrad", 42.553, 19.106], ["Tuzi", 42.366, 19.331], ["Bijelo Polje", 43.038, 19.748], ["Pljevlja", 43.357, 19.358], ["Berane", 42.843, 19.873],
  ["Rožaje", 42.841, 20.167], ["Kolašin", 42.823, 19.522], ["Mojkovac", 42.960, 19.583], ["Žabljak", 43.155, 19.123], ["Plav", 42.597, 19.945],
  ["Gusinje", 42.562, 19.833], ["Andrijevica", 42.734, 19.792], ["Šavnik", 42.957, 19.096], ["Plužine", 43.153, 18.840],
];
