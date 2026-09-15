// READ ONLY probe (2026-09-15): the Round 613 contract's World Cup name bands A/B/D/E/F, applied
// exactly as written, against the 11 winner squads (world_cup_players, SELECT) and every cached
// soccer-grid row on a "YYYY World Cup Winner" label. No network, no repo writes.
const TRANSLIT = { "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d" };
const norm = (s) => (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const nosp = (s) => s.replace(/ /g, "");

const SQ = {
  1970: "Ado|Baldocchi|Brito|Caju|Carlos Alberto|Clodoaldo|Dario|Edu|Everaldo|Félix|Fontana|Gérson|Jairzinho|Joel Camargo|Leão|Marco Antônio|Pelé|Piazza|Rivellino|Roberto Miranda|Tostão|Zé Maria",
  1986: "Carlos Tapia|Claudio Borghi|Daniel Passarella|Diego Maradona|Héctor Enrique|Héctor Zelada|Jorge Burruchaga|Jorge Valdano|José Luis Brown|José Luis Cuciuffo|Julio Olarticoechea|Luis Islas|Marcelo Trobbiani|Nery Pumpido|Néstor Clausen|Oscar Garré|Oscar Ruggeri|Pedro Pasculli|Ricardo Bochini|Ricardo Giusti|Sergio Almirón|Sergio Batista",
  1990: "Andreas Brehme|Andreas Köpke|Andreas Möller|Bodo Illgner|Frank Mill|Guido Buchwald|Günter Hermann|Hans Pflügler|Jürgen Klinsmann|Jürgen Kohler|Karl-Heinz Riedle|Klaus Augenthaler|Lothar Matthäus|Olaf Thon|Paul Steiner|Pierre Littbarski|Raimond Aumann|Rudi Völler|Stefan Reuter|Thomas Berthold|Thomas Häßler|Uwe Bein",
  1994: "Aldair|Bebeto|Branco|Cafu|Cláudio Taffarel|Dunga|Gilmar Rinaldi|Jorginho|Leonardo|Márcio Santos|Mauro Silva|Mazinho|Müller|Paulo Sérgio|Raí|Ricardo Rocha|Romário|Ronaldão|Ronaldo|Viola|Zetti|Zinho",
  1998: "Alain Boghossian|Bernard Diomède|Bernard Lama|Bixente Lizarazu|Christian Karembeu|Christophe Dugarry|David Trezeguet|Didier Deschamps|Emmanuel Petit|Fabien Barthez|Frank Leboeuf|Laurent Blanc|Lilian Thuram|Lionel Charbonnier|Marcel Desailly|Patrick Vieira|Robert Pires|Stéphane Guivarc'h|Thierry Henry|Vincent Candela|Youri Djorkaeff|Zinedine Zidane",
  2002: "Ânderson Polga|Cafu|Denílson|Dida|Edílson|Edmílson|Gilberto Silva|Juliano Belletti|Juninho Paulista|Júnior|Kaká|Kléberson|Lúcio|Luizão|Marcos|Ricardinho|Rivaldo|Roberto Carlos|Rogério Ceni|Ronaldinho|Ronaldo|Roque Júnior|Vampeta",
  2006: "Alberto Gilardino|Alessandro Del Piero|Alessandro Nesta|Andrea Barzagli|Andrea Pirlo|Angelo Peruzzi|Cristian Zaccardo|Daniele De Rossi|Fabio Cannavaro|Fabio Grosso|Filippo Inzaghi|Francesco Totti|Gennaro Gattuso|Gianluca Zambrotta|Gianluigi Buffon|Luca Toni|Marco Amelia|Marco Materazzi|Massimo Oddo|Mauro Camoranesi|Simone Barone|Simone Perrotta|Vincenzo Iaquinta",
  2010: "Álvaro Arbeloa|Andrés Iniesta|Carles Puyol|Carlos Marchena|Cesc Fàbregas|David Silva|David Villa|Fernando Llorente|Fernando Torres|Gerard Piqué|Iker Casillas|Javi Martínez|Jesús Navas|Joan Capdevila|Juan Mata|Pedro|Pepe Reina|Raúl Albiol|Sergio Busquets|Sergio Ramos|Víctor Valdés|Xabi Alonso|Xavi",
  2014: "André Schürrle|Bastian Schweinsteiger|Benedikt Höwedes|Christoph Kramer|Erik Durm|Jérôme Boateng|Julian Draxler|Kevin Großkreutz|Lukas Podolski|Manuel Neuer|Mario Götze|Mats Hummels|Matthias Ginter|Mesut Özil|Miroslav Klose|Per Mertesacker|Philipp Lahm|Roman Weidenfeller|Ron-Robert Zieler|Sami Khedira|Shkodran Mustafi|Thomas Müller|Toni Kroos",
  2018: "Adil Rami|Alphonse Areola|Antoine Griezmann|Benjamin Mendy|Benjamin Pavard|Blaise Matuidi|Corentin Tolisso|Djibril Sidibé|Florian Thauvin|Hugo Lloris|Kylian Mbappé|Lucas Hernandez|N'Golo Kanté|Nabil Fekir|Olivier Giroud|Ousmane Dembélé|Paul Pogba|Presnel Kimpembe|Raphaël Varane|Samuel Umtiti|Steve Mandanda|Steven Nzonzi|Thomas Lemar",
  2022: "Alexis Mac Allister|Ángel Correa|Ángel Di María|Cristian Romero|Emiliano Martínez|Enzo Fernández|Exequiel Palacios|Franco Armani|Germán Pezzella|Gerónimo Rulli|Gonzalo Montiel|Guido Rodríguez|Juan Foyth|Julián Alvarez|Lautaro Martínez|Leandro Paredes|Lionel Messi|Lisandro Martínez|Marcos Acuña|Nahuel Molina|Nicolás Otamendi|Nicolás Tagliafico|Papu Gómez|Paulo Dybala|Rodrigo De Paul|Thiago Almada",
};
const squads = Object.fromEntries(Object.entries(SQ).map(([y, s]) => [y, s.split("|")]));

function lev(a, b) {
  const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

// Contract text, verbatim semantics.
function bandContract(typed, year) {
  const g = norm(typed), gt = g.split(" "), gn = nosp(g);
  const rows = squads[year].map((n) => ({ n, f: norm(n) }));
  const A = rows.filter((r) => r.f === g || nosp(r.f) === gn);
  if (A.length) return ["A", A[0].n];
  const B = rows.filter((r) => { const st = r.f.split(" "); return gt.every((t) => st.includes(t)) || st.includes(gn); });
  if (B.length === 1) return ["B", B[0].n];
  if (B.length > 1) return ["B-multi", B.map((r) => r.n).join("/")];
  const D = rows.filter((r) => { const st = r.f.split(" "); return st.every((t) => gt.includes(t)) && gt.length > st.length; });
  if (D.length) return ["D", D[0].n];
  const E = rows.filter((r) => {
    const st = r.f.split(" "), sn = nosp(r.f);
    if (gt.some((t) => st.includes(t))) return true;
    if (gn.length >= 3 && (st.some((t) => t.startsWith(gn)) || sn.startsWith(gn))) return true;
    if (lev(gn, sn) <= Math.max(1, Math.floor(Math.max(gn.length, sn.length) / 6))) return true;
    if (gt.some((a) => a.length >= 4 && st.some((b) => b.length >= 4 && lev(a, b) <= 1))) return true;
    return false;
  });
  if (E.length) return ["E", E[0].n];
  return ["F", null];
}

// Proposed correction: compare nospace(g) against nospace of every contiguous run of s tokens,
// in B (equality, unique) and in E (distance max(1, floor(len/6))); token pairs use the same scale.
function runs(st) { const out = []; for (let i = 0; i < st.length; i++) for (let j = i + 1; j <= st.length; j++) out.push(st.slice(i, j).join("")); return out; }
function bandFixed(typed, year) {
  const g = norm(typed), gt = g.split(" "), gn = nosp(g);
  const rows = squads[year].map((n) => ({ n, f: norm(n) }));
  const A = rows.filter((r) => r.f === g || nosp(r.f) === gn);
  if (A.length) return ["A", A[0].n];
  const B = rows.filter((r) => { const st = r.f.split(" "); return gt.every((t) => st.includes(t)) || st.includes(gn) || runs(st).filter((x, i, a) => true).some((x) => x === gn && x.endsWith(st[st.length - 1]) && x !== st[st.length - 1] ? true : false); });
  if (B.length === 1) return ["B", B[0].n];
  if (B.length > 1) return ["B-multi", B.map((r) => r.n).join("/")];
  const D = rows.filter((r) => { const st = r.f.split(" "); return st.every((t) => gt.includes(t)) && gt.length > st.length; });
  if (D.length) return ["D", D[0].n];
  const tol = (a, b) => Math.max(1, Math.floor(Math.max(a.length, b.length) / 6));
  const E = rows.filter((r) => {
    const st = r.f.split(" "), sn = nosp(r.f);
    if (gt.some((t) => st.includes(t))) return true;
    if (gn.length >= 3 && (st.some((t) => t.startsWith(gn)) || sn.startsWith(gn))) return true;
    if (runs(st).some((x) => lev(gn, x) <= tol(gn, x))) return true;
    if (gt.some((a) => a.length >= 4 && st.some((b) => b.length >= 4 && lev(a, b) <= tol(a, b)))) return true;
    return false;
  });
  if (E.length) return ["E", E[0].n];
  return ["F", null];
}

// Cached rows on WC year labels: [typed, year, storedValid, source R=records A=ai]
const CACHE = `adriano|1994|0|R;alejandro garnacho|2022|0|R;alessandro del piero|2006|1|R;alexis mac allister|2022|1|R;andre schurrle|2014|1|R;andrea pirlo|1994|0|R;andrea pirlo|2006|1|R;andrea pirlo|2010|0|R;andreas brehme|1990|1|R;andres iniesta|2002|0|R;andres iniesta|2006|0|R;andres iniesta|2010|1|R;andres iniesta|2014|0|R;angel di maria|2022|1|R;antoine griezmann|2018|1|R;argentina|1986|0|R;aurelien tchouameni|2018|0|R;ballotelli|2006|0|R;bastian schweinsteiger|1990|0|R;bastian schweinsteiger|2014|1|R;beberto|1994|0|R;benjamin pavard|2018|1|R;blaise matiudi|2018|0|R;blanc|1998|1|R;boateng|2014|1|R;brazil|1994|0|R;cafu|1970|0|R;cafu|1994|1|R;cafu|1998|0|R;cafu|2002|1|R;cafu|2006|0|R;carles puyol|2006|0|R;carles puyol|2010|1|R;carles puyol|2014|0|R;carlos alberto|1970|1|R;carlos alberto|2002|0|R;casemiro|1986|0|R;casemiro|2022|0|R;christian eriksen|1994|0|R;claude makelele|1998|0|R;clodoaldo|1970|1|R;cristian romero|2022|1|R;cristiano ronaldo|1994|1|R;cubarsi|2002|0|R;cucerella|2006|0|R;david luiz|1990|0|R;david trezeguet|2018|0|R;david villa|2010|1|R;day or upamenco|2018|0|R;de rossi|2002|0|R;di maria|2022|1|R;diego maradona|1986|1|R;diego maradona|1990|0|R;diego maradona|1998|0|R;dunga|1994|1|R;durm|2014|1|R;enzo fernandez|2022|1|R;fabio cannavaro|1998|0|R;fabio cannavaro|2006|1|R;fernando torres|2006|0|R;fernando torres|2010|1|R;fernando torres|2014|0|R;francesco totti|1990|0|R;francesco totti|1998|0|R;francesco totti|2006|1|R;franck ribery|2018|0|R;frank mill|1990|1|R;frank|1990|1|R;gabriel batistuta|1986|0|R;garincha|1970|0|R;gennaro gattuso|2006|1|R;gerson|1970|1|R;gianluigi buffon|1998|0|R;gjj hi|2018|0|R;gotze|2014|1|R;guido buchwald|1990|1|R;gusto|1998|0|R;gyan|2006|0|R;h no|2018|0|R;hector enrique|1986|1|R;hernan crespo|1986|0|R;hh|2018|0|R;hi|2018|0|R;howedes|2014|1|R;inesta|2006|0|R;jairzinio|1970|0|R;jarzihno|1970|0|R;javier mascherano|2014|0|R;javier zanetti|1986|0|R;jorge valdano|1986|1|R;joshua kimmich|2014|0|R;julian alavrez|2022|0|R;julian alvarez|2022|1|R;jurgen klinsmann|1990|1|R;jurgen koller|1990|0|R;kaka|1994|0|R;kaka|2002|1|R;kante|2018|1|R;karim benzema|2018|0|R;kempes|1986|0|R;khedira|2014|1|R;kholer|1990|0|R;kimpembe|2018|1|R;kohler|1990|1|R;konate|1998|0|R;konate|2018|0|R;kylian mbappe|2018|1|R;kylian mbappe|2022|0|R;lahm|2014|1|R;lilian thuram|1998|1|R;lillian thuram|1998|0|R;lionel messi|1986|0|R;lionel messi|2002|0|R;lionel messi|2014|0|R;lionel messi|2022|1|R;lippi|2006|0|R;lomar|1994|0|R;lothar matthaus|1990|1|R;lothar|1990|1|R;lucas hernandez|2018|1|R;lucio|1994|0|R;marcelo|2014|0|R;marco reus|2014|0|R;mario gotze|2014|1|R;mathaus|1990|0|R;matheus|1990|0|R;mats hummels|2014|1|R;matthaus|1990|1|R;matuidi|2018|1|R;mbappe|2018|1|R;mcallister|2022|0|R;mesut ozil|2014|1|R;michael ballack|1990|0|R;michel platini|1998|0|R;miroslav klose|1990|0|R;miroslav klose|2014|1|R;muller|2014|1|R;mustafi|2014|1|R;n'golo kante|1998|0|R;n'golo kante|2018|1|R;n‘zonzi|2018|0|R;nicolas tagliafico|2022|1|R;nicolo barella|2006|0|R;olaf thon|1990|1|R;oliver kahn|1986|0|R;oliver kahn|1990|0|R;oliver kahn|1994|0|R;olivier giroud|2014|0|R;olivier giroud|2018|1|R;oscar ruggeri|1986|1|R;otamendi|2022|1|R;ousmane dembele|2018|1|R;ozil|2014|1|R;paolo maldini|1990|0|R;paolo maldini|1994|0|R;paolo maldini|2002|0|R;paolo maldini|2006|0|R;paredes|2022|1|R;patrice evra|1998|0|R;patrice evra|2018|0|R;pau cubarsi|2002|0|R;pau cubarsi|2006|0|R;paul pogba|2018|1|R;pavard|2018|1|R;pele|1970|1|R;pele|1994|0|R;philipp lahm|2014|1|R;philippe coutinho|1970|0|R;pirl|2006|1|R;rabiot|2018|0|R;rabito|2018|0|R;ram|2010|1|R;raphael varane|2018|1|R;raphael varane|2022|0|R;ricardinho|2002|1|R;ricardino|2002|0|R;rivaldo|2002|1|R;rivellino|1970|1|R;roberto baggio|1990|0|R;roberto baggio|1994|0|R;roberto baggio|2002|0|R;roberto baggio|2006|0|R;roberto carlos|1970|0|R;roberto carlos|1990|0|R;roberto carlos|1994|0|R;roberto carlos|1998|0|R;roberto carlos|2002|1|R;roberto carlos|2006|0|R;romario|1994|1|R;romario|2014|0|R;romero|2022|1|R;ronaldinho|1994|0|R;ronaldinho|2006|0|R;ronaldino|2002|0|R;ronaldo nazario|1990|0|R;ronaldo nazario|1994|1|R;ronaldo nazario|2002|1|R;ruggeri|1986|1|R;rummenigge|1990|0|R;sergio almiron|1986|1|R;sergio ramos|1970|0|R;sergio ramos|2002|0|R;sergio ramos|2010|1|R;sergio ramos|2014|0|R;sergio ramos|2018|0|R;sissoko|2018|0|R;stefa|1990|1|R;sweinsteiger|2014|0|R;tafarel|1994|0|R;tagliafico|2022|1|R;tah|2014|0|R;tchounemi|2018|0|R;tee|1998|0|R;thiago silva|1994|0|R;thierry henry|1990|0|R;thierry henry|1998|1|R;thomas muller|1994|1|R;thomas muller|2014|1|R;thuram|1986|0|R;thuram|1998|1|R;thuram|2018|0|R;toni kroos|2014|1|R;tostao|1970|1|R;umtiti|2018|1|R;umtitti|2018|0|R;upamecano|2018|0|R;upamencano|2018|0|R;upamenco|2018|0|R;upamicano|2018|0|R;upemecano|2018|0|R;valdano|1986|1|R;veron|1994|0|R;vincent kompany|2018|0|R;voler|1990|0|R;voller|1990|1|R;xavi hernandez|2006|0|R;xavi hernandez|2014|0|R;xavi|2006|0|R;zidane|1998|1|R;zinedine zidane|1986|0|R;zinedine zidane|1990|0|R;zinedine zidane|1994|0|R;zinedine zidane|1998|1|R;zinedine zidane|2002|0|R;zinho|1994|1|R`
  .split(";").map((x) => x.split("|"));

const tally = { contract: {}, fixed: {} };
const lines = [];
for (const [typed, year, v] of CACHE) {
  if (!squads[year]) continue;
  const [bc, hc] = bandContract(typed, year);
  const [bf, hf] = bandFixed(typed, year);
  const k = `${v === "1" ? "YES" : "NO"}:`;
  tally.contract[k + bc] = (tally.contract[k + bc] || 0) + 1;
  tally.fixed[k + bf] = (tally.fixed[k + bf] || 0) + 1;
  if (v === "0" && bc !== "F") lines.push(`NO  ${typed} ${year}: contract ${bc} (${hc})  fixed ${bf} (${hf})`);
  if (v === "0" && bc === "F" && bf !== "F") lines.push(`NO  ${typed} ${year}: contract F  fixed ${bf} (${hf})`);
  if (v === "1" && !(bc === "A" || bc === "B")) lines.push(`YES ${typed} ${year}: contract ${bc} (${hc})  fixed ${bf} (${hf})`);
}
console.log("TALLY contract", tally.contract);
console.log("TALLY fixed   ", tally.fixed);
console.log(lines.join("\n"));

console.log("\nPLAUSIBLE REAL SPELLINGS:");
for (const [typed, year] of [["Dimaria", 2022], ["MacAllister", 2022], ["McAllister", 2022], ["DePaul", 2022], ["Delpiero", 2006], ["DeRossi", 2006], ["Paulo Cesar", 1970], ["Emerson Leao", 1970], ["Dada Maravilha", 1970], ["Zemaria", 1970], ["Rivelino", 1970], ["Schweinsteiger", 2014], ["Sweinsteiger", 2014], ["Nzonzi", 2018], ["N'Zonzi", 2018], ["Steven N'Zonzi", 2018], ["Mac Allister", 2022], ["Haessler", 1990], ["Hassler", 1990], ["Kalle Riedle", 1990], ["Tata Brown", 1986], ["Taffarel", 1994], ["Claudio Taffarel", 1994], ["Dibu Martinez", 2022], ["Martinez", 2022], ["Papu Gomez", 2022], ["Alejandro Gomez", 2022], ["Juninho", 2002], ["Junior", 2002], ["Marcos", 2002], ["Kaka", 2002], ["Cafu", 2002], ["Dida", 2002], ["Xavi", 2010], ["Edu", 1970], ["Pedro", 2010], ["Pedro Rodriguez", 2010], ["Reina", 2010], ["Jose Reina", 2010], ["Titi Henry", 1998], ["Guivarch", 1998], ["Mullerr", 2014], ["Lionel Messi", 1994], ["Thomas Muller", 1994], ["Vinicius Junior", 2002], ["Marcos Alonso", 2002], ["Pedro Neto", 2010], ["Rafael Leao", 1970], ["Eduardo Camavinga", 1970]]) {
  console.log(`${typed} ${year}: contract ${bandContract(typed, String(year)).join(" ")} | fixed ${bandFixed(typed, String(year)).join(" ")}`);
}

console.log("\nHARNESS 7 PREFIX CHECK (3 and 4 letter prefixes of each member's longest token that would be YES):");
for (const [y, names] of Object.entries(squads)) for (const n of names) {
  const lt = norm(n).split(" ").sort((a, b) => b.length - a.length)[0];
  for (const L of [3, 4]) { if (lt.length < L) continue; const p = lt.slice(0, L); const b = bandContract(p, y); if (b[0] === "A" || b[0] === "B") console.log(`  ${y} ${n}: prefix "${p}" -> ${b.join(" ")}`); }
}
