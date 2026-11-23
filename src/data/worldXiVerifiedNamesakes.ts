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
