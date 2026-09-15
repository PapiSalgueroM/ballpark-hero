// READ ONLY probe: the v23 checkWorldCupWinner name test (verbatim logic) against mononym squad names
// pulled from world_cup_players on 2026-09-15. No network.
const TRANSLIT = { "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d" };
const norm = (s) => (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const hitOf = (squad, player) => {
  const guess = norm(player);
  return squad.find((r) => { const nn = norm(r); return nn === guess || nn.includes(guess) || guess.includes(nn); }) ?? null;
};
const squads = {
  1970: ["Félix", "Brito", "Piazza", "Clodoaldo", "Jairzinho", "Gérson", "Tostão", "Pelé", "Rivellino", "Ado", "Baldocchi", "Fontana", "Everaldo", "Caju", "Edu", "Dario", "Leão"],
  1994: ["Jorginho", "Ronaldão", "Branco", "Bebeto", "Dunga", "Zinho", "Raí", "Romário", "Zetti", "Aldair", "Cafu", "Leonardo", "Mazinho", "Müller", "Ronaldo", "Viola", "Cláudio Taffarel"],
  2002: ["Marcos", "Cafu", "Lúcio", "Edmílson", "Ricardinho", "Ronaldo", "Rivaldo", "Ronaldinho", "Dida", "Kléberson", "Júnior", "Denílson", "Vampeta", "Edílson", "Luizão", "Kaká"],
  2010: ["Xavi", "Pedro", "Sergio Ramos", "Andrés Iniesta"],
  2018: ["Steven Nzonzi", "Samuel Umtiti"],
  2022: ["Alexis Mac Allister", "Julián Alvarez"],
  2026: ["Gavi", "Rodri", "Pedri"],
};
const cases = [
  [1994, "Cristiano Ronaldo"], [2002, "Cristiano Ronaldo"], [1994, "Thomas Müller"], [2002, "Vinícius Júnior"],
  [1970, "Rafael Leão"], [1970, "Eduardo Camavinga"], [2026, "Rodrigo De Paul"], [2002, "Marcos Alonso"],
  [2010, "Pedro Neto"], [1994, "Raíssa"], [2010, "ram"], [1994, "Taffarel"], [1994, "Tafarel"],
  [2018, "N'Zonzi"], [2018, "Steven N'Zonzi"], [2022, "McAllister"], [2022, "Julian Alvarez"],
];
for (const [y, p] of cases) console.log(`${y} "${p}" -> ${hitOf(squads[y], p) ?? 'NO HIT (refused)'}`);
