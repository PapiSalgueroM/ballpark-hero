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
export const BUILD_XI_VERIFIED_SPLIT_ROWS: Partial<Record<string, { id: number; foldedName: string; clubs: string }[]>> = {
  // Corchia started for Benfica against Galatasaray in the Europa League.
  // https://www.slbenfica.pt/en-us/agora/noticias/2018-2019/02/14/direto-futebol-galatasaray-benfica-16-avos-final-liga-europa
  // https://www.uefa.com/MultimediaFiles/Download/Publications/uefaorg/General/02/61/96/23/2619623_DOWNLOAD.pdf
  Benfica: [{ id: 49525, foldedName: 'sebastien corchia', clubs: 'SL Benfica / RCD Espanyol Barcelona' }],

  // Toljan played for Celtic against Valencia in the Europa League.
  // https://www.valenciacf.com/en-match-report-kevin-gameiro-fires-valencia-cf-into-the-uel-last-16-1-0-2019-02-21
  // https://www.uefa.com/uefaeuropaleague/match/2026893--valencia-vs-celtic/
  Celtic: [{ id: 49458, foldedName: 'jeremy toljan', clubs: 'Celtic FC / US Sassuolo' }],

  // Chelsea's debut report and Manchester United's record of his Chelsea spell.
  // https://www.chelseafc.com/en/news/article/match-report-es-tunis-0-3-chelsea
  // https://www.manutd.com/en/teams/mens-team/andrey-santos
  Chelsea: [{ id: 163068, foldedName: 'andrey santos', clubs: 'RC Strasbourg Alsace / Chelsea FC' }],

  // Özbayraklı came on for Galatasaray against Paris Saint-Germain.
  // https://www.galatasaray.org/haber/futbol/sampiyonlar%3Dligi/paris-saint-germain-5-0-galatasaray/45687
  // https://www.uefa.com/newsfiles/UCL/2020/2027105_FR.pdf
  Galatasaray: [{ id: 49713, foldedName: 'sener ozbayrakli', clubs: 'Fenerbahce / Galatasaray' }],

  'Inter Milan': [
    // Soares started against Rapid Wien in the Europa League.
    // https://www.inter.it/en/match_center/4439
    // https://www.skysports.com/football/inter-milan-vs-sk-rapid-wien/teams/403957
    { id: 49384, foldedName: 'cedric soares', clubs: 'Southampton FC / Inter Milan' },
    // Vrsaljko played for Inter against Torino and in the Champions League.
    // https://www.torinofc.it/sites/default/files/pdf/match_report/preview/2018/2018-19_A_UNICO_UNI_2_INTTOR.pdf
    // https://www.uefa.com/MultimediaFiles/Download/Publications/uefaorg/General/02/61/96/22/2619622_DOWNLOAD.pdf
    { id: 50341, foldedName: 'sime vrsaljko', clubs: 'Atlético de Madrid / Inter Milan' },
  ],

  // Juventus's 2018/19 first team before the transfer to Manchester City.
  // https://www.juventus.com/en/news/articles/thank-you-for-everything-joao
  // https://www.mancity.com/news/first-team/first-team-news/2019/august/man-city-joao-cancelo-squad-number-confirmation
  Juventus: [{ id: 49328, foldedName: 'joao cancelo', clubs: 'Juventus FC / Manchester City' }],

  // Correia replaced Gaspar for Sporting against Qarabağ in the Europa League.
  // https://www.sporting.pt/pt/node/69397
  // https://www.uefa.com/uefaeuropaleague/match/2025265--qarabag-vs-sporting-cp/
  'Sporting CP': [
    { id: 49454, foldedName: 'bruno gaspar', clubs: 'Sporting CP / Olympiacos Piraeus' },
    { id: 49423, foldedName: 'thierry correia', clubs: 'Sporting CP / Valencia CF' },
  ],
};
