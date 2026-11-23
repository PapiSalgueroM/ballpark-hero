// Extra all-time club records for the Mixed draft. The table's current rows
// reflect their later moves to Al-Ittihad and Inter Miami. These dated records
// are outside the recorded-year pool and keep the actual club for chemistry.
export const BUILD_XI_VERIFIED_CLUB_ROWS: Partial<Record<string, Record<string, unknown>[]>> = {
  // Benfica and Liga Portugal independently record the Benfica stint.
  // https://www.slbenfica.pt/en-us/agora/noticias/2025/07/22/futebol-benfica-richard-rios-contratacao
  // https://www.ligaportugal.pt/player/84101/richard-rios/20252026/278
  // Transfermarkt in May 2026 and zerozero in August 2026 estimated EUR 25m.
  // Use the May age and the pool's 1.08 conversion.
  // https://www.transfermarkt.pt/richard-rios/marktwertverlauf/spieler/735573
  // https://www.zerozero.pt/jogador/richard-rios/744267/valor-de-mercado
  Benfica: [{
    player_name: 'Richard Ríos', club: 'SL Benfica', nationality: 'Colombia',
    position: 'Defensive Midfield', age: 25, market_value_usd: 27_000_000,
  }],

  // Manchester United and the Premier League independently record this stint.
  // https://www.manutd.com/en/news/casemiro-to-leave-man-utd-at-the-end-of-the-2025-26-season
  // https://www.premierleague.com/en/news/4456132/casemiro-revival-proving-key-to-man-utds-upturn-in-form
  // Transfermarkt's 2025/26 squad and zerozero's February 13 2026 valuation
  // both estimate EUR 8m. Use his age on the Transfermarkt record and the
  // pool's 1.08 conversion.
  // https://www.transfermarkt.co/manchester-united/kader/verein/985/sort/marketValueRaw.desc
  // https://www.zerozero.pt/jogador/casemiro/95621/valor-de-mercado?redirm=1
  'Manchester United': [{
    player_name: 'Casemiro', club: 'Manchester United', nationality: 'Brazil',
    position: 'Defensive Midfield', age: 34, market_value_usd: 8_640_000,
  }],
};

/** Exact stored identities for verified all-time club picks on split rows. */
export const BUILD_XI_VERIFIED_SPLIT_ROWS: Partial<Record<string, { id: number; foldedName: string; clubs: string }>> = {
  // Chelsea's debut report and Manchester United's record of his Chelsea spell.
  // https://www.chelseafc.com/en/news/article/match-report-es-tunis-0-3-chelsea
  // https://www.manutd.com/en/teams/mens-team/andrey-santos
  Chelsea: { id: 163068, foldedName: 'andrey santos', clubs: 'RC Strasbourg Alsace / Chelsea FC' },

  // Juventus's 2018/19 first team before the transfer to Manchester City.
  // https://www.juventus.com/en/news/articles/thank-you-for-everything-joao
  // https://www.mancity.com/news/first-team/first-team-news/2019/august/man-city-joao-cancelo-squad-number-confirmation
  Juventus: { id: 49328, foldedName: 'joao cancelo', clubs: 'Juventus FC / Manchester City' },
};
