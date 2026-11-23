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

/** Different players with the same name and country in one dated snapshot. */
export const WORLD_XI_SAME_SNAPSHOT_NAMESAKES = [
  {
    // LaLiga's 2024/25 opener lists both. Osasuna's left-back is Álvaro Juan Cruz
    // Armada; Leganés' winger is Juan Cruz Díaz Espósito, a Spain youth international.
    // https://www.laliga.com/partido/temporada-2024-2025-laliga-ea-sports-ca-osasuna-cd-leganes-1
    // https://www.osasuna.es/juan-cruz-ha-sido-un-orgullo-y-un-honor-poder-defender-este-escudo
    // https://www.cdleganes.com/en/news/cd-leganes-signs-juan-cruz-for-the-next-four-seasons
    // https://www.malagacf.com/en/players/juan-cruz-diaz-esposito
    name: 'Juan Cruz', country: 'Spain', year: 2025,
    cards: [
      { club: 'CA Osasuna', position: 'Left-Back', age: 32 },
      { club: 'CD Leganés', position: 'Left Winger', age: 24 },
    ],
  },
  {
    // Carpi's 1998-born second striker and Crema's 1997-born second striker.
    // https://www.carpicalcio.it/prima-squadra/
    // https://www.carpicalcio.it/comunicati/mercato-matteo-cortesi-e-un-nuovo-calciatore-dellac-carpi/
    // https://ssarezzo.it/matteo-cortesi-e-un-nuovo-calciatore-dellarezzo/
    // https://www.bergamoesport.it/ufficiale-matteo-cortesi-e-un-nuovo-giocatore-della-real-calepina/
    // https://www.soccerway.com/player/cortesi-matteo/I1PfYqgq/transfers/
    name: 'Matteo Cortesi', country: 'Italy', year: 2025,
    cards: [
      { club: 'AC Carpi', position: 'Second Striker', age: 26 },
      { club: 'AC Crema 1908', position: 'Second Striker', age: 27 },
    ],
  },
  {
    // Ascoli's 2004-born winger also plays second striker. Scafatese's 1993-born
    // forward played behind the striker. These cards retain their snapshot roles.
    // https://www.youtube.com/watch?v=40JnrT8g0hk
    // https://www.transfermarkt.it/ascoli-calcio/startseite/verein/408/saison_id/2024
    // https://fcpistoiese1921.com/mattia-gagliardi-e-un-nuovo-giocatore-arancione/
    // https://www.scafatesecalcio.it/2024/07/24/il-gruppo-a-disposizione-di-mister-fabiano/
    // https://www.scafatesecalcio.it/2025/03/30/la-scafatese-torna-al-successo-al-vitiello-tris-in-rimonta-al-locri/
    // https://lnd.it/it/seried/maglie-personalizzate-2024-2025/girone-i-8/13450-scafatese-integrazione/file
    // https://www.transfermarkt.it/scafatese-calcio-1922/kader/verein/22048/saison_id/2024
    name: 'Mattia Gagliardi', country: 'Italy', year: 2025,
    cards: [
      { club: 'Ascoli Calcio', position: 'Second Striker', age: 20 },
      { club: 'Scafatese Calcio 1922', position: 'Second Striker', age: 31 },
    ],
  },
] as const;

/** Exact stale rows, with a verified card to retain when the same snapshot has one. */
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
  {
    // The official league guide and Caracas's signing release give the same
    // birth date. He was 36 on 2025-01-01. His last Estudiantes season was 2023.
    // https://ligafutve.org/wp-content/uploads/2022/03/GUIA-OFICIAL-LIGA-FUTVE-2022.pdf
    // https://gradadigital.com/home/christian-flores-es-del-caracas-fc/
    // https://www.transfermarkt.es/christian-flores/profil/spieler/308744
    // https://www.playmakerstats.com/player/christian-flores/111021
    name: 'Christian Flores', country: 'Venezuela', position: 'LM', year: 2025,
    stale: { club: 'Estudiantes de Mérida', age: 34 },
  },
  {
    // The Cuban second striker played for Inter San Carlos in 2024/25.
    // He joined Santa Ana in July 2025, for the 2025/26 season.
    // https://gammadigital.uia.ac.cr/futbol-consultants-y-guadalupe-fc-disputaran-el-ascenso-a-primera-division/
    // https://www.national-football-teams.com/player/87797/Christian_Flores.html
    // https://www.transfermarkt.com/christian-flores/profil/spieler/628735
    name: 'Christian Flores', country: 'Cuba', position: 'CF', year: 2025,
    stale: { club: 'Santa Ana FC', age: 25 },
  },
] as const;

export const WORLD_XI_RAFINHA_2025 = {
  name: 'Rafinha', year: 2025,
  // Rafael Alcântara do Nascimento, born February 12, 1993. Al-Arabi confirmed his
  // departure in June 2024. He was still without a club in March 2025 and retired in December.
  // https://players.fcbarcelona.com/en/player/715-rafinha-rafael-alcantara-nascimento
  // https://www.qsl.qa/en/news/al-arabi-announce-departure-brazilian-rafinha-alcantara
  // https://as.com/futbol/primera/los-alcantara-por-fin-juntos-en-el-celta-n/
  // https://www.fcbarcelona.com/en/news/4423670/rafinha-announces-retirement
  brazil: { country: 'Brazil', position: 'Attacking Midfield', age: 31, value: 2_000_000, sourceClub: 'Retired', club: 'Without Club' },
  // Rafael Baldrés Hermann, born December 29, 1997, played for Inter Escaldes in 2024/25.
  // https://fcpetrolul.ro/oficial-rafael-baldres-hermann-rafinha-a-semnat-cu-fc-petrolul-ploiesti/
  // https://www.uefa.com/news-media/mediaservices/informationkits/competitions/uefaconferenceleague/2027/match/2049147/
  spain: { country: 'Spain', position: 'Second Striker', age: 27, value: 1_000_000, club: "Inter Club d'Escaldes" },
} as const;
