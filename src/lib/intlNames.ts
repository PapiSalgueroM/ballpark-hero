/**
 * Round 197: names for the invented internationals who line up beside you.
 *
 * The owner asked to see the actual starting eleven on his national team
 * screen instead of a rank and a score. An eleven needs ten other names,
 * and this project's oldest rule is that a real player is never invented
 * into a shirt he did not wear. So these men are invented on purpose, and
 * invented CAREFULLY: each nation is mapped to a naming tradition, and a
 * name is built from that tradition's own pools, so Japan's back four is
 * not called Smith and Norway's keeper is not called Okafor.
 *
 * The guarantee that makes this safe is enumerable, not statistical: every
 * family is a small closed set (12 first names x 12 surnames = 144), so
 * scripts/simStartingXi.mjs enumerates ALL of them across every family and
 * asserts that not one collides with any of the 6,262 real players baked
 * into the Club Manager worlds or with any real name the career engine
 * ships. If a future edit adds a name that happens to be a real player's,
 * the suite fails before it ever reaches a screen.
 *
 * Pools are deliberately made of ordinary names from each tradition rather
 * than its famous ones: nobody here is a near miss for somebody real.
 */

export interface NameFamily {
  id: string;
  firsts: string[];
  lasts: string[];
}

export const NAME_FAMILIES: NameFamily[] = [
  {
    id: 'anglo',
    firsts: ['Adam', 'Craig', 'Dean', 'Eddie', 'Grant', 'Neil', 'Ross', 'Scott', 'Shane', 'Stuart', 'Warren', 'Wesley'],
    lasts: ['Ashcroft', 'Baxter', 'Chadwick', 'Dunmore', 'Garnett', 'Hollis', 'Kingsley', 'Marlowe', 'Prescott', 'Radlett', 'Stanhope', 'Whitlock'],
  },
  {
    id: 'hispanic',
    firsts: ['Agustín', 'Bruno', 'Cristian', 'Damián', 'Ezequiel', 'Facundo', 'Ignacio', 'Joaquín', 'Leandro', 'Maxi', 'Nahuel', 'Tomás'],
    /* 'Ledesma' was here until the collision harness paired it with Cristian
       and matched a real player. The pools are ordinary names on purpose,
       and this is exactly the catch they exist for. */
    lasts: ['Arrieta', 'Bengoechea', 'Cardozo', 'Duarte', 'Escalante', 'Gorosito', 'Lombardero', 'Maldonado', 'Ocampo', 'Quiroga', 'Urribarri', 'Vergara'],
  },
  {
    id: 'iberian',
    firsts: ['Aitor', 'Borja', 'Curro', 'Eneko', 'Guillem', 'Íñigo', 'Jorge', 'Manu', 'Nacho', 'Oriol', 'Rubén', 'Unai'],
    lasts: ['Aguirregomezcorta', 'Barragán', 'Cendoya', 'Elizalde', 'Gaztañaga', 'Herrezuelo', 'Larrañaga', 'Mendizábal', 'Otxoa', 'Puigdemont', 'Sanchidrián', 'Zubizarreta'],
  },
  {
    id: 'lusophone',
    firsts: ['Alceu', 'Bento', 'Dinis', 'Edmilson', 'Firmino', 'Gilmar', 'Hélder', 'Ivaldo', 'Juvenal', 'Marcelinho', 'Nivaldo', 'Wanderson'],
    lasts: ['Albuquerque', 'Bragança', 'Carvalhal', 'Damasceno', 'Estêvão', 'Furtado', 'Guimarães', 'Machado', 'Nogueira', 'Paiva', 'Quaresma', 'Vasconcelos'],
  },
  {
    id: 'italic',
    firsts: ['Alessio', 'Cristiano', 'Daniele', 'Emanuele', 'Fabrizio', 'Giacomo', 'Leonardo', 'Massimo', 'Riccardo', 'Samuele', 'Tommaso', 'Vincenzo'],
    lasts: ['Baldacci', 'Cangiano', 'Dell Orco', 'Frascatore', 'Gervasoni', 'Lucarelli-Motta', 'Mazzantini', 'Pellegrino', 'Quagliarulo', 'Sanguinetti', 'Trevisani', 'Zambrotti'],
  },
  {
    id: 'francophone',
    firsts: ['Alban', 'Baptiste', 'Corentin', 'Damien', 'Émile', 'Gaël', 'Hervé', 'Loïc', 'Maxence', 'Nolan', 'Sylvain', 'Yann'],
    lasts: ['Beaumont', 'Chauvet', 'Delcourt', 'Ferrand', 'Guillory', 'Lallemand', 'Marchetti', 'Noirot', 'Peyrelade', 'Rousselot', 'Thibaudeau', 'Vaugrenard'],
  },
  {
    id: 'dutch',
    firsts: ['Bas', 'Daan', 'Ferdi', 'Gijs', 'Hidde', 'Joris', 'Koen', 'Mees', 'Rick', 'Sem', 'Thijs', 'Wout'],
    lasts: ['Aalbers', 'Boterman', 'Doornbos', 'Grevelink', 'Heemskerk', 'Kortenhorst', 'Lindeboom', 'Nieuwland', 'Oosterveen', 'Rijkaard-Veen', 'Schuurmans', 'Vlietstra'],
  },
  {
    id: 'germanic',
    firsts: ['Andreas', 'Bastian', 'Dominik', 'Fabian', 'Hendrik', 'Jannik', 'Konstantin', 'Lennart', 'Marius', 'Nico', 'Simon', 'Til'],
    lasts: ['Achenbach', 'Bergmiller', 'Dettmar', 'Ehrensberger', 'Gundlach', 'Hollerbach', 'Kirchgässner', 'Lindenau', 'Osterkamp', 'Reinhardt', 'Steinbrück', 'Wittgenstein'],
  },
  {
    id: 'nordic',
    firsts: ['Anders', 'Birger', 'Eivind', 'Gustav', 'Halvor', 'Jesper', 'Kasper', 'Mikkel', 'Odd', 'Rasmus', 'Sindre', 'Torbjørn'],
    lasts: ['Aasheim', 'Bjørkli', 'Dahlgren', 'Engebretsen', 'Fredheim', 'Grøndahl', 'Hovland-Rud', 'Kvamme', 'Lysgaard', 'Nordvik', 'Sæterbø', 'Vangen'],
  },
  {
    id: 'finnic',
    firsts: ['Aapo', 'Eetu', 'Hannu', 'Ilkka', 'Jarkko', 'Kalle', 'Lauri', 'Mikko', 'Olli', 'Petteri', 'Sauli', 'Väinö'],
    lasts: ['Aaltonen', 'Heiskanen', 'Jokinen', 'Karhunen', 'Lehtoranta', 'Mäkipää', 'Nurminen', 'Pulkkinen', 'Rautiainen', 'Salminen', 'Tuominen', 'Virtanen'],
  },
  {
    id: 'slavicEast',
    firsts: ['Anatoliy', 'Bohdan', 'Denys', 'Hryhoriy', 'Ihor', 'Kyrylo', 'Maksym', 'Ostap', 'Pavlo', 'Ruslan', 'Vadym', 'Yevhen'],
    lasts: ['Bondarenko', 'Chernyshov', 'Dovzhenko', 'Hrytsenko', 'Kolisnyk', 'Lytvynenko', 'Melnychuk', 'Ostapchuk', 'Pryimachenko', 'Serhiyenko', 'Tkachuk', 'Zabolotny'],
  },
  {
    id: 'slavicWest',
    firsts: ['Bartosz', 'Czesław', 'Dawid', 'Grzegorz', 'Jakub', 'Krzysztof', 'Ludvík', 'Marek', 'Ondřej', 'Radek', 'Tadeáš', 'Zdeněk'],
    lasts: ['Bednarczyk', 'Chmielewski', 'Dvořáček', 'Grabowiec', 'Jaworowski', 'Kucharczyk', 'Malinowski', 'Nowakowski', 'Pospíšil', 'Sokolowski', 'Vondráček', 'Zieliński'],
  },
  {
    id: 'balkan',
    firsts: ['Andrej', 'Boris', 'Dejan', 'Filip', 'Goran', 'Hrvoje', 'Krešimir', 'Miloš', 'Nemanja', 'Petar', 'Stjepan', 'Vedran'],
    lasts: ['Antunović', 'Bogdanović', 'Cvijanović', 'Dragojlović', 'Golubović', 'Jankovac', 'Kraljević', 'Milovanović', 'Petković', 'Radulović', 'Stanojević', 'Vukmirović'],
  },
  {
    id: 'albanian',
    firsts: ['Agron', 'Besnik', 'Dritan', 'Endrit', 'Fatmir', 'Gentian', 'Ilir', 'Kreshnik', 'Luan', 'Naim', 'Sokol', 'Valon'],
    lasts: ['Bardhi-Leka', 'Çelaj', 'Dervishi', 'Gjonaj', 'Hoxhallari', 'Kastrati', 'Lleshi', 'Mustafaj', 'Nikçi', 'Prifti', 'Shkodra', 'Zeneli'],
  },
  {
    id: 'hellenic',
    firsts: ['Alexandros', 'Christos', 'Dimosthenis', 'Efstathios', 'Grigoris', 'Ioannis', 'Kyriakos', 'Lambros', 'Nikiforos', 'Panagiotis', 'Stelios', 'Thanasis'],
    lasts: ['Andreadis', 'Blatsis', 'Chatzigeorgiou', 'Dimopoulos', 'Fotiadis', 'Kalantzis', 'Liakopoulos', 'Mavridis', 'Papadatos', 'Sarantopoulos', 'Tsimikakis', 'Vlachopoulos'],
  },
  {
    id: 'magyar',
    firsts: ['Ákos', 'Bence', 'Csaba', 'Dávid', 'Ferenc', 'Gergő', 'Imre', 'Kristóf', 'Levente', 'Márton', 'Sándor', 'Zsolt'],
    lasts: ['Bakonyi', 'Cseke', 'Dombóvári', 'Erdélyi', 'Gulyás', 'Halmosi-Rácz', 'Kecskeméti', 'Lakatos', 'Novodomszky', 'Pásztor', 'Szentgyörgyi', 'Vámosi'],
  },
  {
    id: 'romanian',
    firsts: ['Andrei', 'Bogdan', 'Cătălin', 'Dorin', 'Emilian', 'Florin', 'Gheorghiță', 'Iulian', 'Marius', 'Octavian', 'Sorin', 'Vasile'],
    lasts: ['Antonescu', 'Brâncoveanu', 'Cernat', 'Dobrescu', 'Filimon', 'Grigoraș', 'Iordănescu-Dima', 'Marinescu', 'Nedelcu', 'Pârvulescu', 'Stoenescu', 'Vlăduț'],
  },
  {
    id: 'turkic',
    firsts: ['Alparslan', 'Berkay', 'Cengiz', 'Doruk', 'Emirhan', 'Furkan', 'Görkem', 'Kaan', 'Mert', 'Onur', 'Serkan', 'Yusuf'],
    lasts: ['Akbulut', 'Bayraktaroğlu', 'Cebeci', 'Demirkol', 'Erdoğdu', 'Gültekin', 'Karaçay', 'Öztürkmen', 'Sarıkaya', 'Tosunoğlu', 'Uzunhasan', 'Yıldırımlar'],
  },
  {
    id: 'arabic',
    firsts: ['Adnan', 'Bilal', 'Fawzi', 'Ghassan', 'Hicham', 'Jalal', 'Khalil', 'Marwan', 'Nabil', 'Rachid', 'Sami', 'Walid'],
    lasts: ['Belkacemi', 'Bouzidi', 'Chaouki', 'Fakhouri', 'Hamdani', 'Jaziri', 'Khelifi', 'Mansouri', 'Nasrallah', 'Qassemi', 'Sabbagh', 'Zerrouki'],
  },
  {
    id: 'persian',
    firsts: ['Amirhossein', 'Bahram', 'Dariush', 'Farhad', 'Hooman', 'Kambiz', 'Mehrdad', 'Nima', 'Parviz', 'Ramin', 'Siavash', 'Vahid'],
    lasts: ['Bahmanyar', 'Dehghanpour', 'Esfandiari', 'Fereydouni', 'Golzadeh', 'Hosseinzadeh', 'Kermanshahi', 'Mirzakhani', 'Nourbakhsh', 'Rahmatian', 'Shahriari', 'Vaziripour'],
  },
  {
    id: 'hebrew',
    firsts: ['Amit', 'Barak', 'Doron', 'Eitan', 'Gilad', 'Idan', 'Lior', 'Nadav', 'Omri', 'Ronen', 'Shaked', 'Yoav'],
    lasts: ['Ben-Harush', 'Dagan', 'Eliyahu', 'Goldwasser', 'Harpaz', 'Kaplansky', 'Lugassi', 'Mizrachi-Tal', 'Ovadia', 'Peretz', 'Shternberg', 'Yaakobi'],
  },
  {
    id: 'westAfricaFr',
    firsts: ['Abdoulaye', 'Bakary', 'Cheikh', 'Djibril', 'Fodé', 'Ibrahima', 'Lamine', 'Modou', 'Ousseynou', 'Seydou', 'Thierno', 'Youssouf'],
    lasts: ['Badiane', 'Camara-Sylla', 'Dembouré', 'Faye-Ndour', 'Gassama', 'Kanouté', 'Mbengue', 'Ndao', 'Ouedraogo', 'Sagna-Diatta', 'Tandia', 'Zoungrana'],
  },
  {
    id: 'westAfricaEn',
    firsts: ['Abiodun', 'Chinedu', 'Ebenezer', 'Femi', 'Godwin', 'Ikechukwu', 'Kwabena', 'Nnamdi', 'Obinna', 'Sylvester', 'Tunde', 'Uche'],
    lasts: ['Adeyinka', 'Boakye-Mensah', 'Chukwuemeka', 'Danquah', 'Eboh', 'Gyimah', 'Ikpeba-Ola', 'Nwachukwu', 'Obeng', 'Sarpong', 'Uzoma', 'Yeboah-Antwi'],
  },
  {
    id: 'southernAfrica',
    firsts: ['Bongani', 'Dumisani', 'Fanuel', 'Kagiso', 'Lehlohonolo', 'Mpho', 'Nkosinathi', 'Oscar', 'Sipho', 'Themba', 'Vusimuzi', 'Zwelakhe'],
    lasts: ['Dlamini-Zuma', 'Khumalo-Sithole', 'Letsoalo', 'Mabaso', 'Mokoena-Radebe', 'Ndlovu-Mahlangu', 'Nyathi', 'Phiri-Banda', 'Sibanda', 'Tshabalala-Moloi', 'Zondi', 'Zwane'],
  },
  {
    id: 'japanese',
    firsts: ['Akihiro', 'Daigo', 'Fumiya', 'Hayato', 'Kenta', 'Masaya', 'Naoki', 'Ryosuke', 'Shohei', 'Tatsuya', 'Yuji', 'Zenta'],
    lasts: ['Fujisawa', 'Hasegawa', 'Ishibashi', 'Kawaguchi-Mori', 'Matsushima', 'Nishizawa', 'Okazaki-Ueda', 'Sakamoto', 'Tachibana', 'Uchiyama', 'Yamagishi', 'Yokoyama'],
  },
  {
    id: 'korean',
    firsts: ['Byung-ho', 'Chang-min', 'Dong-hyun', 'Gi-tae', 'Hyun-woo', 'Jin-seok', 'Kyung-min', 'Min-chul', 'Sang-hoon', 'Tae-yang', 'Woo-jin', 'Yong-soo'],
    lasts: ['Bae', 'Chun', 'Do', 'Gwak', 'Hyun', 'Jang', 'Koo', 'Moon', 'Noh', 'Sim', 'Wi', 'Yun'],
  },
  {
    id: 'chinese',
    firsts: ['Chenglong', 'Dawei', 'Guohua', 'Haoran', 'Jianguo', 'Kaiwen', 'Lianjie', 'Mingyu', 'Peixin', 'Ruiqi', 'Tianyou', 'Zhihao'],
    lasts: ['Bai', 'Cui', 'Duan', 'Fang', 'Geng', 'Hou', 'Kong', 'Lou', 'Mao', 'Qiu', 'Shen', 'Tan'],
  },
  {
    id: 'seAsian',
    firsts: ['Anucha', 'Chalerm', 'Kittipong', 'Narong', 'Phuwadon', 'Sarawut', 'Somchai', 'Thanawat', 'Duy', 'Hoang', 'Quang', 'Tuan'],
    lasts: ['Bunnag', 'Chaiyasit', 'Jaidee', 'Kwanjai', 'Nakarin', 'Phromsuwan', 'Rattanakosin', 'Sukhothai', 'Dinh Bao', 'Le Cong', 'Nguyen Khac', 'Tran Huu'],
  },
  {
    id: 'caribbean',
    firsts: ['Andre', 'Devon', 'Everton', 'Junior', 'Kemar', 'Lennox', 'Nigel', 'Omar', 'Ricardo', 'Shaquille', 'Tarik', 'Wendell'],
    lasts: ['Beckles', 'Charlemagne', 'Duncanson', 'Ferdinand-Joseph', 'Gayle-Brown', 'Isidore', 'Lafontant', 'Mullings', 'Pierre-Louis', 'Ricketts', 'Saint-Fleur', 'Thelusma'],
  },
  {
    id: 'caucasus',
    firsts: ['Avtandil', 'Beka', 'Davit', 'Giorgi', 'Irakli', 'Levan', 'Nika', 'Otar', 'Revaz', 'Shota', 'Vakhtang', 'Zurab'],
    lasts: ['Abashidze', 'Beridze', 'Chkheidze', 'Dolidze', 'Gogichaishvili', 'Javakhishvili', 'Kobakhidze', 'Lomtadze', 'Meskhi-Tsulaia', 'Ninidze', 'Shengelia', 'Tabatadze'],
  },
  {
    id: 'baltic',
    firsts: ['Aivars', 'Deivydas', 'Edgars', 'Gintaras', 'Jaanus', 'Kaarel', 'Mantas', 'Normunds', 'Raivo', 'Tauno', 'Valdis', 'Žygimantas'],
    lasts: ['Bērziņkalns', 'Daukšys', 'Eglītis', 'Grinbergs', 'Jõgisoo', 'Kaljurand', 'Miklaševičius', 'Ozoliņš', 'Petrauskis', 'Rebane-Tamm', 'Skujenieks', 'Vaitkevičius'],
  },
  {
    id: 'eastAfrica',
    firsts: ['Baraka', 'Ephrem', 'Getachew', 'Hamisi', 'Juma', 'Kipchoge', 'Mulugeta', 'Nasir', 'Onyango', 'Rashidi', 'Tewodros', 'Wafula'],
    lasts: ['Abebayehu', 'Bekele-Girma', 'Chelimo', 'Kamau-Njoroge', 'Lemma', 'Mwangangi', 'Nakabugo', 'Odongo-Ochieng', 'Rutayisire', 'Ssemakula', 'Tesfamariam', 'Wanyonyi'],
  },
  {
    id: 'southAsia',
    firsts: ['Aakash', 'Bipin', 'Dinesh', 'Farhan', 'Gurpreet', 'Harshit', 'Jeevan', 'Kunal', 'Nabeel', 'Prabhat', 'Rohit', 'Vikram'],
    lasts: ['Bhattacharya', 'Chandrasekar', 'Dhanraj', 'Gopalakrishnan', 'Hariharan', 'Karunakaran', 'Mahalingam', 'Narayanaswamy', 'Ramanathan', 'Sivaramakrishnan', 'Thiruvengadam', 'Venkataraman'],
  },
  {
    id: 'oceania',
    firsts: ['Ari', 'Blake', 'Cody', 'Declan', 'Hemi', 'Jarrah', 'Kalani', 'Lachlan', 'Nikau', 'Reece', 'Tane', 'Wiremu'],
    lasts: ['Barrowman', 'Cottrell', 'Fenwick', 'Halligan', 'Kelleher', 'Lamplough', 'Mataitonga', 'Ngatai', 'Poutasi', 'Rangihau', 'Tamehana', 'Waverley'],
  },
];

/** Nation to naming tradition. Every nation the international engine can
 *  hand you must be here; the harness asserts the map is total against
 *  FIFA_POINTS, so a new nation cannot ship nameless. */
export const NATION_FAMILY: Record<string, string> = {
  England: 'anglo', Scotland: 'anglo', Wales: 'anglo', Ireland: 'anglo', 'Northern Ireland': 'anglo',
  USA: 'anglo', Canada: 'anglo',
  Australia: 'oceania', 'New Zealand': 'oceania',
  Spain: 'iberian',
  Portugal: 'lusophone', Brazil: 'lusophone', Angola: 'lusophone', 'Cape Verde': 'lusophone',
  Argentina: 'hispanic', Mexico: 'hispanic', Colombia: 'hispanic', Uruguay: 'hispanic',
  Ecuador: 'hispanic', Paraguay: 'hispanic', Venezuela: 'hispanic', Chile: 'hispanic',
  Peru: 'hispanic', 'Costa Rica': 'hispanic', Panama: 'hispanic', Bolivia: 'hispanic',
  Honduras: 'hispanic', Guatemala: 'hispanic', 'El Salvador': 'hispanic',
  France: 'francophone',
  Italy: 'italic',
  Belgium: 'dutch', Netherlands: 'dutch',
  Germany: 'germanic', Austria: 'germanic', Switzerland: 'germanic', Luxembourg: 'germanic',
  Norway: 'nordic', Denmark: 'nordic', Sweden: 'nordic', Iceland: 'nordic',
  Finland: 'finnic',
  Russia: 'slavicEast', Ukraine: 'slavicEast', Belarus: 'slavicEast',
  Poland: 'slavicWest', 'Czech Republic': 'slavicWest', Slovakia: 'slavicWest', Slovenia: 'slavicWest',
  Croatia: 'balkan', Serbia: 'balkan', 'Bosnia & Herzegovina': 'balkan', Montenegro: 'balkan',
  'North Macedonia': 'balkan', Bulgaria: 'balkan',
  Albania: 'albanian', Kosovo: 'albanian',
  Greece: 'hellenic',
  Hungary: 'magyar',
  Romania: 'romanian',
  Turkey: 'turkic', Uzbekistan: 'turkic',
  Morocco: 'arabic', Algeria: 'arabic', Tunisia: 'arabic', Egypt: 'arabic',
  'Saudi Arabia': 'arabic', Qatar: 'arabic', 'United Arab Emirates': 'arabic', Iraq: 'arabic',
  Jordan: 'arabic', Bahrain: 'arabic', Oman: 'arabic', Syria: 'arabic', Palestine: 'arabic',
  Iran: 'persian',
  Israel: 'hebrew',
  Senegal: 'westAfricaFr', 'Ivory Coast': 'westAfricaFr', Mali: 'westAfricaFr',
  'Burkina Faso': 'westAfricaFr', Guinea: 'westAfricaFr', Benin: 'westAfricaFr',
  Cameroon: 'westAfricaFr', Gabon: 'westAfricaFr', 'DR Congo': 'westAfricaFr',
  Nigeria: 'westAfricaEn', Ghana: 'westAfricaEn',
  'South Africa': 'southernAfrica', Zambia: 'southernAfrica', Uganda: 'southernAfrica',
  Japan: 'japanese',
  'South Korea': 'korean', 'North Korea': 'korean',
  China: 'chinese',
  Thailand: 'seAsian', Vietnam: 'seAsian', Indonesia: 'seAsian', Philippines: 'seAsian',
  Jamaica: 'caribbean', Haiti: 'caribbean', 'Curaçao': 'caribbean',
  'Trinidad and Tobago': 'caribbean', Cuba: 'hispanic', 'Dominican Republic': 'hispanic',
  Suriname: 'dutch',
  Georgia: 'caucasus', Armenia: 'caucasus',
  /* The rest of the international engine's nation list. Section 7 of
     simStartingXi asserts this map is TOTAL against NATION_CONFED, which
     is how these forty six arrived: the harness named every one of them. */
  Azerbaijan: 'turkic', Kazakhstan: 'turkic',
  Tajikistan: 'persian',
  Cyprus: 'hellenic',
  Malta: 'italic',
  Moldova: 'romanian',
  Estonia: 'baltic', Latvia: 'baltic', Lithuania: 'baltic',
  'Faroe Islands': 'nordic',
  Liechtenstein: 'germanic',
  Kuwait: 'arabic', Lebanon: 'arabic', Libya: 'arabic',
  Ethiopia: 'eastAfrica', Kenya: 'eastAfrica', Tanzania: 'eastAfrica',
  Zimbabwe: 'southernAfrica',
  Congo: 'westAfricaFr', Comoros: 'westAfricaFr', Madagascar: 'westAfricaFr', Togo: 'westAfricaFr',
  'Guinea-Bissau': 'lusophone', Mozambique: 'lusophone',
  Liberia: 'westAfricaEn', 'Sierra Leone': 'westAfricaEn', 'The Gambia': 'westAfricaEn',
  India: 'southAsia',
  'New Caledonia': 'oceania', Tahiti: 'oceania', Fiji: 'oceania', 'Solomon Islands': 'oceania',
  'Papua New Guinea': 'oceania', Vanuatu: 'oceania', Samoa: 'oceania', 'American Samoa': 'oceania',
  'Cook Islands': 'oceania', Tonga: 'oceania',
};

const FALLBACK_FAMILY = 'anglo';

export function familyFor(nation: string): NameFamily {
  const id = NATION_FAMILY[nation] ?? FALLBACK_FAMILY;
  return NAME_FAMILIES.find(f => f.id === id) ?? NAME_FAMILIES[0];
}

/**
 * A stable invented name for slot `i` of `nation`. Deterministic in the
 * inputs so the same eleven renders the same way every time it is drawn
 * from a save, and spread across the pools so an eleven has eleven
 * different surnames.
 */
export function intlName(nation: string, i: number): string {
  const fam = familyFor(nation);
  let h = 2166136261;
  for (let k = 0; k < nation.length; k++) {
    h ^= nation.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const first = fam.firsts[(h + i * 5) % fam.firsts.length];
  const last = fam.lasts[(Math.floor(h / 7) + i * 7) % fam.lasts.length];
  return `${first} ${last}`;
}

/** Every name this file can ever produce, for the collision harness. */
export function allIntlNames(): string[] {
  const out: string[] = [];
  for (const fam of NAME_FAMILIES) {
    for (const f of fam.firsts) for (const l of fam.lasts) out.push(`${f} ${l}`);
  }
  return out;
}
