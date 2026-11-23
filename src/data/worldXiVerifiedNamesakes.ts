/** Different players who share a market-table name across two snapshots. */
export const WORLD_XI_CROSS_SNAPSHOT_NAMESAKES = [
  {
    // https://www.saopaulofc.net/alan-franco-reforca-o-tricolor-2/
    // https://www.atlutd.com/news/acuerdo-con-sao-paulo-para-el-traspaso-de-alan-franco
    // https://atletico.com.br/atleta/alan-franco/
    // https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/articles/convocatoria-ecuador-mundial-2026-lista-jugadores
    name: 'Alan Franco',
    earlier: { country: 'Argentina', position: 'CB', club: 'São Paulo Futebol Clube' },
    other: { country: 'Ecuador', position: 'CM', club: 'Clube Atlético Mineiro' },
  },
  {
    // https://fcjuarez.com/bravo-mundialista-jose-luis-puma-rodriguez-forma-parte-de-la-lista-definitiva-de-panama/
    // https://www.concacaf.com/competitions/fifa-world-cup/teams/panama/roster
    // https://www.auf.org.uy/jose-luis-rodriguez/
    // https://www.cbf.com.br/futebol-brasileiro/atletas/campeonato-brasileiro/serie-a/2026/793749
    name: 'José Luis Rodríguez',
    earlier: { country: 'Panama', position: 'LW', club: 'FC Juárez' },
    other: { country: 'Uruguay', position: 'RB', club: 'Clube de Regatas Vasco da Gama' },
  },
] as const;

/** Earlier club records mistakenly given the same date as a verified snapshot. */
export const WORLD_XI_STALE_SNAPSHOT_DUPLICATES = [
  {
    // Sibir records the July 2025 transfer at age 23. Salyut confirms his birth date
    // and the return date, so the 2025 row at Salyut with age 21 is from the prior spell.
    // https://fcsib.ru/media/news/nikolay-boyarkin-perekhodit-v-salyut-belgorod/
    // https://fcsalyut.ru/players
    name: 'Nikolay Boyarkin', country: 'Russia', position: 'LM', year: 2025,
    stale: { club: 'Salyut Belgorod', age: 21 },
    kept: { club: 'Sibir Novosibirsk', age: 23 },
  },
  {
    // Charlotte was his 2023 club. He played for New Mexico in 2024 and then became a free agent.
    // https://www.uslchampionship.com/news_article/show/1295000
    // https://www.newmexicoutd.com/news/2024/02/09/celebrating-our-roots-with-avionne-flanagan/
    // https://www.transfermarkt.us/avionne-flanagan/profil/spieler/884641
    // https://m.aiscore.com/pt/player-avionne-flanagan/8lk2di19z8pho73
    name: 'Avionne Flanagan', country: 'United States', position: 'LM', year: 2025,
    stale: { club: 'Charlotte Independence', age: 23 },
    kept: { club: 'Without Club', age: 25 },
  },
] as const;
