/**
 * Référentiel géographique utilisé par la recherche de prospects (Jason).
 * Continents -> pays -> régions -> départements (quand le pays en possède).
 */

export type GeoRegion = { name: string; departments?: string[] };
export type GeoCountry = {
  name: string;
  /** Libellé du 1er niveau administratif (Région, État, Province, Canton...) */
  regionLabel?: string;
  /** Libellé du 2e niveau (Département, Province, Comté...) */
  departmentLabel?: string;
  regions?: GeoRegion[];
};

export const CONTINENTS = [
  "Afrique",
  "Amérique du Nord",
  "Amérique du Sud",
  "Asie",
  "Europe",
  "Océanie",
] as const;

export type Continent = (typeof CONTINENTS)[number];

const FRANCE: GeoCountry = {
  name: "France",
  regionLabel: "Région",
  departmentLabel: "Département",
  regions: [
    {
      name: "Auvergne-Rhône-Alpes",
      departments: ["Ain (01)", "Allier (03)", "Ardèche (07)", "Cantal (15)", "Drôme (26)", "Isère (38)", "Loire (42)", "Haute-Loire (43)", "Puy-de-Dôme (63)", "Rhône (69)", "Savoie (73)", "Haute-Savoie (74)"],
    },
    {
      name: "Bourgogne-Franche-Comté",
      departments: ["Côte-d'Or (21)", "Doubs (25)", "Jura (39)", "Nièvre (58)", "Haute-Saône (70)", "Saône-et-Loire (71)", "Yonne (89)", "Territoire de Belfort (90)"],
    },
    {
      name: "Bretagne",
      departments: ["Côtes-d'Armor (22)", "Finistère (29)", "Ille-et-Vilaine (35)", "Morbihan (56)"],
    },
    {
      name: "Centre-Val de Loire",
      departments: ["Cher (18)", "Eure-et-Loir (28)", "Indre (36)", "Indre-et-Loire (37)", "Loir-et-Cher (41)", "Loiret (45)"],
    },
    { name: "Corse", departments: ["Corse-du-Sud (2A)", "Haute-Corse (2B)"] },
    {
      name: "Grand Est",
      departments: ["Ardennes (08)", "Aube (10)", "Marne (51)", "Haute-Marne (52)", "Meurthe-et-Moselle (54)", "Meuse (55)", "Moselle (57)", "Bas-Rhin (67)", "Haut-Rhin (68)", "Vosges (88)"],
    },
    {
      name: "Hauts-de-France",
      departments: ["Aisne (02)", "Nord (59)", "Oise (60)", "Pas-de-Calais (62)", "Somme (80)"],
    },
    {
      name: "Île-de-France",
      departments: ["Paris (75)", "Seine-et-Marne (77)", "Yvelines (78)", "Essonne (91)", "Hauts-de-Seine (92)", "Seine-Saint-Denis (93)", "Val-de-Marne (94)", "Val-d'Oise (95)"],
    },
    {
      name: "Normandie",
      departments: ["Calvados (14)", "Eure (27)", "Manche (50)", "Orne (61)", "Seine-Maritime (76)"],
    },
    {
      name: "Nouvelle-Aquitaine",
      departments: ["Charente (16)", "Charente-Maritime (17)", "Corrèze (19)", "Creuse (23)", "Dordogne (24)", "Gironde (33)", "Landes (40)", "Lot-et-Garonne (47)", "Pyrénées-Atlantiques (64)", "Deux-Sèvres (79)", "Vienne (86)", "Haute-Vienne (87)"],
    },
    {
      name: "Occitanie",
      departments: ["Ariège (09)", "Aude (11)", "Aveyron (12)", "Gard (30)", "Haute-Garonne (31)", "Gers (32)", "Hérault (34)", "Lot (46)", "Lozère (48)", "Hautes-Pyrénées (65)", "Pyrénées-Orientales (66)", "Tarn (81)", "Tarn-et-Garonne (82)"],
    },
    {
      name: "Pays de la Loire",
      departments: ["Loire-Atlantique (44)", "Maine-et-Loire (49)", "Mayenne (53)", "Sarthe (72)", "Vendée (85)"],
    },
    {
      name: "Provence-Alpes-Côte d'Azur",
      departments: ["Alpes-de-Haute-Provence (04)", "Hautes-Alpes (05)", "Alpes-Maritimes (06)", "Bouches-du-Rhône (13)", "Var (83)", "Vaucluse (84)"],
    },
    {
      name: "Outre-mer",
      departments: ["Guadeloupe (971)", "Martinique (972)", "Guyane (973)", "La Réunion (974)", "Mayotte (976)"],
    },
  ],
};

const BELGIQUE: GeoCountry = {
  name: "Belgique",
  regionLabel: "Région",
  departmentLabel: "Province",
  regions: [
    { name: "Bruxelles-Capitale" },
    { name: "Flandre", departments: ["Anvers", "Brabant flamand", "Flandre-Occidentale", "Flandre-Orientale", "Limbourg"] },
    { name: "Wallonie", departments: ["Brabant wallon", "Hainaut", "Liège", "Luxembourg", "Namur"] },
  ],
};

const SUISSE: GeoCountry = {
  name: "Suisse",
  regionLabel: "Canton",
  regions: ["Zurich", "Berne", "Lucerne", "Uri", "Schwyz", "Obwald", "Nidwald", "Glaris", "Zoug", "Fribourg", "Soleure", "Bâle-Ville", "Bâle-Campagne", "Schaffhouse", "Appenzell Rhodes-Extérieures", "Appenzell Rhodes-Intérieures", "Saint-Gall", "Grisons", "Argovie", "Thurgovie", "Tessin", "Vaud", "Valais", "Neuchâtel", "Genève", "Jura"].map((n) => ({ name: n })),
};

const CANADA: GeoCountry = {
  name: "Canada",
  regionLabel: "Province / Territoire",
  regions: ["Alberta", "Colombie-Britannique", "Île-du-Prince-Édouard", "Manitoba", "Nouveau-Brunswick", "Nouvelle-Écosse", "Nunavut", "Ontario", "Québec", "Saskatchewan", "Terre-Neuve-et-Labrador", "Territoires du Nord-Ouest", "Yukon"].map((n) => ({ name: n })),
};

const USA: GeoCountry = {
  name: "États-Unis",
  regionLabel: "État",
  regions: ["Alabama", "Alaska", "Arizona", "Arkansas", "Californie", "Caroline du Nord", "Caroline du Sud", "Colorado", "Connecticut", "Dakota du Nord", "Dakota du Sud", "Delaware", "Floride", "Géorgie", "Hawaï", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiane", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New York", "Nouveau-Mexique", "Ohio", "Oklahoma", "Oregon", "Pennsylvanie", "Rhode Island", "Tennessee", "Texas", "Utah", "Vermont", "Virginie", "Virginie-Occidentale", "Washington", "Washington D.C.", "Wisconsin", "Wyoming"].map((n) => ({ name: n })),
};

const ESPAGNE: GeoCountry = {
  name: "Espagne",
  regionLabel: "Communauté autonome",
  departmentLabel: "Province",
  regions: [
    { name: "Andalousie", departments: ["Almería", "Cádiz", "Córdoba", "Grenade", "Huelva", "Jaén", "Málaga", "Séville"] },
    { name: "Aragon", departments: ["Huesca", "Teruel", "Saragosse"] },
    { name: "Asturies" },
    { name: "Baléares" },
    { name: "Canaries", departments: ["Las Palmas", "Santa Cruz de Tenerife"] },
    { name: "Cantabrie" },
    { name: "Castille-La Manche", departments: ["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Tolède"] },
    { name: "Castille-et-León", departments: ["Ávila", "Burgos", "León", "Palencia", "Salamanque", "Ségovie", "Soria", "Valladolid", "Zamora"] },
    { name: "Catalogne", departments: ["Barcelone", "Gérone", "Lérida", "Tarragone"] },
    { name: "Communauté de Madrid" },
    { name: "Communauté valencienne", departments: ["Alicante", "Castellón", "Valence"] },
    { name: "Estrémadure", departments: ["Badajoz", "Cáceres"] },
    { name: "Galice", departments: ["La Corogne", "Lugo", "Ourense", "Pontevedra"] },
    { name: "Murcie" },
    { name: "Navarre" },
    { name: "Pays basque", departments: ["Álava", "Biscaye", "Guipuscoa"] },
    { name: "La Rioja" },
  ],
};

const ITALIE: GeoCountry = {
  name: "Italie",
  regionLabel: "Région",
  departmentLabel: "Province",
  regions: [
    { name: "Lombardie", departments: ["Milan", "Bergame", "Brescia", "Côme", "Monza", "Varèse", "Pavie", "Mantoue"] },
    { name: "Latium", departments: ["Rome", "Frosinone", "Latina", "Rieti", "Viterbe"] },
    { name: "Campanie", departments: ["Naples", "Salerne", "Caserte", "Avellino", "Bénévent"] },
    { name: "Vénétie", departments: ["Venise", "Vérone", "Padoue", "Trévise", "Vicence", "Rovigo", "Bellune"] },
    { name: "Piémont", departments: ["Turin", "Cuneo", "Alexandrie", "Asti", "Novare", "Verceil", "Biella", "Verbano-Cusio-Ossola"] },
    { name: "Émilie-Romagne", departments: ["Bologne", "Modène", "Parme", "Reggio d'Émilie", "Ravenne", "Ferrare", "Forlì-Cesena", "Rimini", "Plaisance"] },
    { name: "Toscane", departments: ["Florence", "Pise", "Sienne", "Livourne", "Lucques", "Arezzo", "Prato", "Grosseto", "Pistoia", "Massa-Carrara"] },
    { name: "Sicile", departments: ["Palerme", "Catane", "Messine", "Syracuse", "Trapani", "Agrigente", "Raguse", "Caltanissetta", "Enna"] },
    { name: "Pouilles", departments: ["Bari", "Lecce", "Tarente", "Foggia", "Brindisi", "Barletta-Andria-Trani"] },
    { name: "Sardaigne" }, { name: "Ligurie" }, { name: "Marches" }, { name: "Abruzzes" }, { name: "Calabre" },
    { name: "Ombrie" }, { name: "Frioul-Vénétie Julienne" }, { name: "Trentin-Haut-Adige" }, { name: "Basilicate" },
    { name: "Molise" }, { name: "Vallée d'Aoste" },
  ],
};

const ALLEMAGNE: GeoCountry = {
  name: "Allemagne",
  regionLabel: "Land",
  regions: ["Bade-Wurtemberg", "Bavière", "Berlin", "Brandebourg", "Brême", "Hambourg", "Hesse", "Mecklembourg-Poméranie", "Basse-Saxe", "Rhénanie-du-Nord-Westphalie", "Rhénanie-Palatinat", "Sarre", "Saxe", "Saxe-Anhalt", "Schleswig-Holstein", "Thuringe"].map((n) => ({ name: n })),
};

const ROYAUME_UNI: GeoCountry = {
  name: "Royaume-Uni",
  regionLabel: "Nation / Région",
  departmentLabel: "Comté",
  regions: [
    { name: "Angleterre", departments: ["Grand Londres", "Grand Manchester", "West Midlands", "Merseyside", "Yorkshire de l'Ouest", "Kent", "Essex", "Surrey", "Hampshire", "Lancashire"] },
    { name: "Écosse", departments: ["Édimbourg", "Glasgow", "Aberdeen", "Highlands"] },
    { name: "Pays de Galles", departments: ["Cardiff", "Swansea", "Newport"] },
    { name: "Irlande du Nord", departments: ["Belfast", "Londonderry"] },
  ],
};

const PORTUGAL: GeoCountry = {
  name: "Portugal",
  regionLabel: "Région",
  departmentLabel: "District",
  regions: [
    { name: "Nord", departments: ["Porto", "Braga", "Viana do Castelo", "Vila Real", "Bragance"] },
    { name: "Centre", departments: ["Coimbra", "Aveiro", "Leiria", "Viseu", "Castelo Branco", "Guarda"] },
    { name: "Lisbonne", departments: ["Lisbonne", "Setúbal"] },
    { name: "Alentejo", departments: ["Évora", "Beja", "Portalegre"] },
    { name: "Algarve", departments: ["Faro"] },
    { name: "Açores" }, { name: "Madère" },
  ],
};

const PAYS_BAS: GeoCountry = {
  name: "Pays-Bas",
  regionLabel: "Province",
  regions: ["Drenthe", "Flevoland", "Frise", "Gueldre", "Groningue", "Limbourg", "Brabant-Septentrional", "Hollande-Septentrionale", "Overijssel", "Utrecht", "Zélande", "Hollande-Méridionale"].map((n) => ({ name: n })),
};

const MAROC: GeoCountry = {
  name: "Maroc",
  regionLabel: "Région",
  departmentLabel: "Préfecture / Province",
  regions: [
    { name: "Casablanca-Settat", departments: ["Casablanca", "Mohammedia", "Settat", "El Jadida", "Berrechid", "Benslimane", "Médiouna", "Nouaceur", "Sidi Bennour"] },
    { name: "Rabat-Salé-Kénitra", departments: ["Rabat", "Salé", "Skhirat-Témara", "Kénitra", "Khémisset", "Sidi Kacem", "Sidi Slimane"] },
    { name: "Marrakech-Safi", departments: ["Marrakech", "Safi", "Essaouira", "El Kelâa des Sraghna", "Chichaoua", "Youssoufia", "Rehamna", "Al Haouz"] },
    { name: "Fès-Meknès", departments: ["Fès", "Meknès", "Ifrane", "Taza", "Sefrou", "Taounate", "El Hajeb", "Moulay Yacoub", "Boulemane"] },
    { name: "Tanger-Tétouan-Al Hoceïma", departments: ["Tanger-Assilah", "Tétouan", "Al Hoceïma", "Larache", "Chefchaouen", "Ouezzane", "Fahs-Anjra", "M'diq-Fnideq"] },
    { name: "Souss-Massa", departments: ["Agadir Ida-Outanane", "Inezgane-Aït Melloul", "Taroudant", "Tiznit", "Chtouka-Aït Baha", "Tata"] },
    { name: "Oriental", departments: ["Oujda-Angad", "Nador", "Berkane", "Taourirt", "Jerada", "Driouch", "Guercif", "Figuig"] },
    { name: "Béni Mellal-Khénifra", departments: ["Béni Mellal", "Khénifra", "Khouribga", "Azilal", "Fquih Ben Salah"] },
    { name: "Drâa-Tafilalet", departments: ["Errachidia", "Ouarzazate", "Zagora", "Tinghir", "Midelt"] },
    { name: "Guelmim-Oued Noun" }, { name: "Laâyoune-Sakia El Hamra" }, { name: "Dakhla-Oued Ed-Dahab" },
  ],
};

const SENEGAL: GeoCountry = {
  name: "Sénégal",
  regionLabel: "Région",
  departmentLabel: "Département",
  regions: [
    { name: "Dakar", departments: ["Dakar", "Guédiawaye", "Pikine", "Rufisque", "Keur Massar"] },
    { name: "Thiès", departments: ["Thiès", "Mbour", "Tivaouane"] },
    { name: "Diourbel", departments: ["Diourbel", "Bambey", "Mbacké"] },
    { name: "Saint-Louis", departments: ["Saint-Louis", "Dagana", "Podor"] },
    { name: "Louga", departments: ["Louga", "Kébémer", "Linguère"] },
    { name: "Fatick", departments: ["Fatick", "Foundiougne", "Gossas"] },
    { name: "Kaolack", departments: ["Kaolack", "Guinguinéo", "Nioro du Rip"] },
    { name: "Kaffrine", departments: ["Kaffrine", "Birkelane", "Koungheul", "Malem Hodar"] },
    { name: "Matam", departments: ["Matam", "Kanel", "Ranérou"] },
    { name: "Tambacounda", departments: ["Tambacounda", "Bakel", "Goudiry", "Koumpentoum"] },
    { name: "Kédougou", departments: ["Kédougou", "Salémata", "Saraya"] },
    { name: "Kolda", departments: ["Kolda", "Médina Yoro Foulah", "Vélingara"] },
    { name: "Sédhiou", departments: ["Sédhiou", "Bounkiling", "Goudomp"] },
    { name: "Ziguinchor", departments: ["Ziguinchor", "Bignona", "Oussouye"] },
  ],
};

const COTE_IVOIRE: GeoCountry = {
  name: "Côte d'Ivoire",
  regionLabel: "District",
  departmentLabel: "Région / Département",
  regions: [
    { name: "Abidjan", departments: ["Abidjan", "Bingerville", "Anyama"] },
    { name: "Yamoussoukro", departments: ["Yamoussoukro", "Attiégouakro"] },
    { name: "Lagunes", departments: ["Agboville", "Dabou", "Grand-Lahou", "Tiassalé"] },
    { name: "Bas-Sassandra", departments: ["San-Pédro", "Soubré", "Tabou", "Sassandra"] },
    { name: "Vallée du Bandama", departments: ["Bouaké", "Béoumi", "Katiola", "Dabakala"] },
    { name: "Savanes", departments: ["Korhogo", "Ferkessédougou", "Boundiali", "Tengrela"] },
    { name: "Montagnes", departments: ["Man", "Danané", "Duékoué", "Guiglo"] },
    { name: "Sassandra-Marahoué", departments: ["Daloa", "Issia", "Bouaflé", "Sinfra"] },
    { name: "Comoé", departments: ["Abengourou", "Aboisso", "Adiaké", "Bonoua"] },
    { name: "Gôh-Djiboua", departments: ["Gagnoa", "Divo", "Oumé", "Lakota"] },
    { name: "Zanzan", departments: ["Bondoukou", "Bouna", "Tanda"] },
    { name: "Woroba", departments: ["Séguéla", "Mankono", "Touba"] },
    { name: "Denguélé", departments: ["Odienné", "Minignan"] },
    { name: "Lacs", departments: ["Dimbokro", "Bongouanou", "Toumodi", "M'Bahiakro"] },
  ],
};

const TUNISIE: GeoCountry = {
  name: "Tunisie",
  regionLabel: "Gouvernorat",
  regions: ["Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse", "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili"].map((n) => ({ name: n })),
};

const ALGERIE: GeoCountry = {
  name: "Algérie",
  regionLabel: "Wilaya",
  regions: ["Alger", "Oran", "Constantine", "Annaba", "Blida", "Batna", "Sétif", "Tlemcen", "Béjaïa", "Tizi Ouzou", "Djelfa", "Biskra", "Skikda", "Tiaret", "Béchar", "Ouargla", "Ghardaïa", "Mostaganem", "Chlef", "Médéa", "Boumerdès", "Bouira", "Jijel", "Mascara", "Sidi Bel Abbès", "Souk Ahras", "Tébessa", "Adrar", "Tamanrasset", "Laghouat"].map((n) => ({ name: n })),
};

const CAMEROUN: GeoCountry = {
  name: "Cameroun",
  regionLabel: "Région",
  departmentLabel: "Département",
  regions: [
    { name: "Centre", departments: ["Mfoundi (Yaoundé)", "Lekié", "Mefou-et-Afamba", "Nyong-et-Kéllé"] },
    { name: "Littoral", departments: ["Wouri (Douala)", "Sanaga-Maritime", "Nkam", "Moungo"] },
    { name: "Ouest", departments: ["Mifi (Bafoussam)", "Bamboutos", "Menoua", "Noun"] },
    { name: "Nord", departments: ["Bénoué (Garoua)", "Mayo-Louti", "Mayo-Rey"] },
    { name: "Extrême-Nord", departments: ["Diamaré (Maroua)", "Logone-et-Chari", "Mayo-Sava"] },
    { name: "Sud" }, { name: "Est" }, { name: "Adamaoua" }, { name: "Nord-Ouest" }, { name: "Sud-Ouest" },
  ],
};

const simple = (names: string[]): GeoCountry[] => names.map((name) => ({ name }));

export const COUNTRIES_BY_CONTINENT: Record<Continent, GeoCountry[]> = {
  Europe: [
    FRANCE, BELGIQUE, SUISSE, ESPAGNE, ITALIE, ALLEMAGNE, ROYAUME_UNI, PORTUGAL, PAYS_BAS,
    ...simple(["Luxembourg", "Autriche", "Irlande", "Danemark", "Suède", "Norvège", "Finlande", "Pologne", "Tchéquie", "Roumanie", "Grèce", "Hongrie", "Croatie", "Bulgarie", "Slovaquie", "Slovénie", "Serbie", "Ukraine", "Monaco"]),
  ],
  Afrique: [
    MAROC, SENEGAL, COTE_IVOIRE, TUNISIE, ALGERIE, CAMEROUN,
    ...simple(["Bénin", "Burkina Faso", "Mali", "Niger", "Togo", "Guinée", "Gabon", "Congo", "RD Congo", "Tchad", "Mauritanie", "Madagascar", "Maurice", "Nigeria", "Ghana", "Kenya", "Afrique du Sud", "Égypte", "Éthiopie", "Rwanda"]),
  ],
  "Amérique du Nord": [
    USA, CANADA,
    ...simple(["Mexique", "Costa Rica", "Panama", "Guatemala", "République dominicaine", "Haïti", "Cuba", "Jamaïque"]),
  ],
  "Amérique du Sud": simple(["Brésil", "Argentine", "Chili", "Colombie", "Pérou", "Uruguay", "Équateur", "Bolivie", "Paraguay", "Venezuela", "Guyane"]),
  Asie: simple(["Émirats arabes unis", "Arabie saoudite", "Qatar", "Liban", "Turquie", "Israël", "Inde", "Chine", "Japon", "Corée du Sud", "Singapour", "Thaïlande", "Vietnam", "Indonésie", "Malaisie", "Philippines", "Pakistan", "Bangladesh"]),
  Océanie: simple(["Australie", "Nouvelle-Zélande", "Fidji", "Papouasie-Nouvelle-Guinée", "Nouvelle-Calédonie", "Polynésie française"]),
};

export function getCountries(continent: string): GeoCountry[] {
  return COUNTRIES_BY_CONTINENT[continent as Continent] ?? [];
}

export function getCountry(continent: string, country: string): GeoCountry | undefined {
  return getCountries(continent).find((c) => c.name === country);
}

export function getRegions(continent: string, country: string): GeoRegion[] {
  return getCountry(continent, country)?.regions ?? [];
}

export function getDepartments(continent: string, country: string, region: string): string[] {
  return getRegions(continent, country).find((r) => r.name === region)?.departments ?? [];
}
