import type { ConquestMapSport, ConquestMapTeam, ConquestRegion } from '@/lib/conquestMapLook';
import type { ImperialismSport, ImperialismTeam } from '@/lib/imperialismEngine';

/**
 * Round 459: the Soccer Conquest. The 96 clubs of the 2026-27 top five leagues
 * on one map of Europe, played through the shared imperialism engine
 * (src/lib/imperialismEngine.ts) and drawn by the shared map
 * (src/components/conquest/ConquestRegionMap.tsx). His words, 2026-08-28:
 * "add a soccer conquest covering the top five leagues, fully working" and
 * "Original colors and names only, never logos."
 *
 * THE MAP is a hex cartogram, not a coastline: every region is one hexagon,
 * laid out so that England sits north of France across an empty Channel row,
 * Spain hangs south west of France off the Pyrenees, Germany sits east of
 * France across the Rhine, and Italy south east of France with an empty Alps
 * row under Germany. Ninety six hexes are club home areas, named after the
 * real district or region the ground is in (Trafford, Chamartín, Sinsheim,
 * Rome North), and the rest are connective regions named after the real
 * countryside between them (Cumbria, Auvergne, La Mancha, Thuringia, Umbria).
 * Every connective region opens in the hands of the nearest club of its own
 * country, hex distance, ties to the earlier club in the table, which is the
 * "nearest stadium" seeding the NFL map uses. The geometry and the border
 * table are derived from the layout below, so the borders are symmetric by
 * construction and scripts/simConquestMap.mjs holds them that way.
 *
 * MEMBERSHIP is the 2026-27 top flight of each league, the same lists Club
 * Manager plays (src/lib/clubManager.ts REAL_LEAGUES, verified there
 * 2026-08-13) and re-verified 2026-09-05 against two named sources per league:
 *   Premier League: premierleague.com, "The 2026/27 Premier League season
 *     officially starts" (Coventry City, Ipswich Town and Hull City up;
 *     Wolves, Burnley and West Ham down) and NBC Chicago, "These are the 20
 *     teams in the 2026-27 Premier League season".
 *   La Liga: laliga.com club directory (20 clubs) and ESPN's 2026-27 LALIGA
 *     standings (Racing Santander, Deportivo and Málaga up; Mallorca, Girona
 *     and Oviedo down).
 *   Serie A: legaseriea.it, "Looking forward to the 2026/27 Serie A fixture
 *     list" (Venezia, Frosinone and Monza up) and ESPN's 2026-27 Serie A
 *     standings (Cremonese, Verona and Pisa down).
 *   Bundesliga: bundesliga.com club directory (18 clubs) and beIN Sports,
 *     "Bundesliga 2026-27: Teams, Format and Everything You Need to Know"
 *     (Schalke, Elversberg and Paderborn up; Wolfsburg, Heidenheim and
 *     St. Pauli down).
 *   Ligue 1: ESPN's 2026-27 Ligue 1 standings (18 clubs) and the 2026-27
 *     Ligue 1 season page on Wikipedia (Troyes and Le Mans up; Metz and
 *     Nantes down), read as a spot check because ligue1.com refused the
 *     fetch on 2026-09-05.
 * scripts/simSoccerConquest.mjs holds this list equal to Club Manager's, so
 * a promotion applied in one place cannot be missed in the other.
 *
 * STRENGTH is never typed. Every club's overall comes from the same market
 * value basis the rest of the site uses: the 2026 rows of
 * player_market_values summed per club (scripts/data/soccerConquestValues.json
 * carries the pull, the name aliases and the date; scripts/simSoccerConquest.mjs
 * --refresh re-pulls it and rewrites both files), mapped onto the 55 to 95
 * band the other conquest engines use with a log curve (strengthFromValue).
 * That table only covers the top five thousand or so players on the planet,
 * so a promoted club can sit under its floor with a handful of rows. Those
 * clubs are in SOCCER_CONQUEST_PARTIAL, the same honesty rule as Club
 * Manager's CM_PARTIAL, and the pick tile says so. Real Madrid at $1.65B are
 * the 95, Le Mans with one row on record are the 55.
 *
 * COLOURS are documented, never guessed. Each club carries a primary and,
 * where documented, a secondary. See SOCCER_CLUB_COLOURS for the sources and
 * for the clubs whose colours could not be sourced from two references, which
 * wear a neutral generated tint and say so.
 */

export type SoccerCountry = 'ENG' | 'ESP' | 'ITA' | 'GER' | 'FRA';

export const SOCCER_LEAGUE_OF: Record<SoccerCountry, string> = {
  ENG: 'Premier League',
  ESP: 'La Liga',
  ITA: 'Serie A',
  GER: 'Bundesliga',
  FRA: 'Ligue 1',
};

/* ------------------------------------------------------------------ */
/* The hex layout: [col, row, id, name, clubId?]                        */
/* ------------------------------------------------------------------ */

type Cell = [col: number, row: number, id: string, name: string, club?: string];

const ENGLAND: Cell[] = [
  [6, 0, 'ENG_CUMB', 'Cumbria'],
  [7, 0, 'ENG_TYNE', 'Tyneside', 'NEW'],
  [8, 0, 'ENG_WEAR', 'Wearside', 'SUN'],
  [5, 1, 'ENG_ANFI', 'Anfield', 'LIV'],
  [6, 1, 'ENG_DOCK', 'Liverpool Docks', 'EVE'],
  [7, 1, 'ENG_WYOR', 'West Yorkshire', 'LEE'],
  [8, 1, 'ENG_EYOR', 'East Yorkshire', 'HUL'],
  [5, 2, 'ENG_CHES', 'Cheshire'],
  [6, 2, 'ENG_TRAF', 'Trafford', 'MUN'],
  [7, 2, 'ENG_EMAN', 'East Manchester', 'MCI'],
  [8, 2, 'ENG_NOTT', 'Nottingham', 'NFO'],
  [9, 2, 'ENG_LINC', 'Lincolnshire'],
  [4, 3, 'ENG_SHRO', 'Shropshire'],
  [5, 3, 'ENG_BIRM', 'Birmingham', 'AVL'],
  [6, 3, 'ENG_COVE', 'Coventry', 'COV'],
  [7, 3, 'ENG_CAMB', 'Cambridgeshire'],
  [8, 3, 'ENG_IPSW', 'Ipswich', 'IPS'],
  [4, 4, 'ENG_COTS', 'Cotswolds'],
  [5, 4, 'ENG_BREN', 'Brentford', 'BRE'],
  [6, 4, 'ENG_FULH', 'Fulham', 'FUL'],
  [7, 4, 'ENG_ISLI', 'Islington', 'ARS'],
  [8, 4, 'ENG_TOTT', 'Tottenham', 'TOT'],
  [9, 4, 'ENG_ESSX', 'Essex'],
  [4, 5, 'ENG_BOUR', 'Bournemouth', 'BOU'],
  [5, 5, 'ENG_BRIG', 'Brighton', 'BHA'],
  [6, 5, 'ENG_CHEL', 'Chelsea', 'CHE'],
  [7, 5, 'ENG_CROY', 'Croydon', 'CRY'],
  [8, 5, 'ENG_KENT', 'Kent'],
];

const FRANCE: Cell[] = [
  [8, 7, 'FRA_LILL', 'Lille', 'LIL'],
  [9, 7, 'FRA_LENS', 'Lens', 'RCL'],
  [6, 8, 'FRA_HAVR', 'Le Havre', 'HAC'],
  [7, 8, 'FRA_PICA', 'Picardy'],
  [8, 8, 'FRA_PARW', 'Paris West', 'PSG'],
  [9, 8, 'FRA_CHAM', 'Champagne'],
  [10, 8, 'FRA_LORR', 'Lorraine'],
  [5, 9, 'FRA_BRES', 'Brest', 'BST'],
  [6, 9, 'FRA_RENN', 'Rennes', 'REN'],
  [7, 9, 'FRA_MANS', 'Le Mans', 'LEM'],
  [8, 9, 'FRA_PARS', 'Paris South', 'PFC'],
  [9, 9, 'FRA_TROY', 'Troyes', 'TRO'],
  [10, 9, 'FRA_VOSG', 'Vosges'],
  [11, 9, 'FRA_STRA', 'Strasbourg', 'STR'],
  [5, 10, 'FRA_LORI', 'Lorient', 'LOR'],
  [6, 10, 'FRA_ANGE', 'Angers', 'ANG'],
  [7, 10, 'FRA_TOUR', 'Touraine'],
  [8, 10, 'FRA_AUXE', 'Auxerre', 'AJA'],
  [9, 10, 'FRA_BURG', 'Burgundy'],
  [10, 10, 'FRA_FRCO', 'Franche-Comté'],
  [5, 11, 'FRA_VEND', 'Vendée'],
  [6, 11, 'FRA_LIMO', 'Limousin'],
  [7, 11, 'FRA_AUVE', 'Auvergne'],
  [8, 11, 'FRA_LYON', 'Lyon', 'LYO'],
  [9, 11, 'FRA_SAVO', 'Savoy'],
  [5, 12, 'FRA_BORD', 'Bordeaux'],
  [6, 12, 'FRA_TOUL', 'Toulouse', 'TFC'],
  [7, 12, 'FRA_LANG', 'Languedoc'],
  [8, 12, 'FRA_MARS', 'Marseille', 'MAR'],
  [9, 12, 'FRA_NICE', 'Nice', 'NCE'],
  [10, 12, 'FRA_MONA', 'Monaco', 'ASM'],
];

const SPAIN: Cell[] = [
  [0, 13, 'ESP_CORU', 'A Coruña', 'DEP'],
  [1, 13, 'ESP_CANT', 'Cantabria', 'RAC'],
  [2, 13, 'ESP_BILB', 'Bilbao', 'ATH'],
  [3, 13, 'ESP_GIPU', 'Gipuzkoa', 'RSO'],
  [4, 13, 'ESP_CORT', 'Les Corts', 'BAR'],
  [0, 14, 'ESP_VIGO', 'Vigo', 'CEL'],
  [1, 14, 'ESP_LEON', 'León'],
  [2, 14, 'ESP_VITO', 'Vitoria', 'ALA'],
  [3, 14, 'ESP_NAVA', 'Navarre', 'OSA'],
  [4, 14, 'ESP_CORN', 'Cornellà', 'ESP'],
  [1, 15, 'ESP_CAST', 'Castile'],
  [2, 15, 'ESP_CHAM', 'Chamartín', 'RMA'],
  [3, 15, 'ESP_VALL', 'Vallecas', 'RAY'],
  [4, 15, 'ESP_ARAG', 'Aragon'],
  [5, 15, 'ESP_CSTL', 'Castellón', 'VIL'],
  [0, 16, 'ESP_EXTR', 'Extremadura'],
  [1, 16, 'ESP_GETA', 'Getafe', 'GET'],
  [2, 16, 'ESP_SBLA', 'San Blas', 'ATM'],
  [3, 16, 'ESP_MANC', 'La Mancha'],
  [4, 16, 'ESP_ORRI', 'Orriols', 'LEV'],
  [5, 16, 'ESP_MEST', 'Mestalla', 'VAL'],
  [1, 17, 'ESP_NERV', 'Nervión', 'SEV'],
  [2, 17, 'ESP_HELI', 'Heliópolis', 'BET'],
  [3, 17, 'ESP_JAEN', 'Jaén'],
  [4, 17, 'ESP_MURC', 'Murcia'],
  [5, 17, 'ESP_ELCH', 'Elche', 'ELC'],
  [1, 18, 'ESP_CADI', 'Cádiz'],
  [2, 18, 'ESP_MALA', 'Málaga', 'MAL'],
  [3, 18, 'ESP_GRAN', 'Granada'],
];

const GERMANY: Cell[] = [
  [16, 2, 'GER_SCHL', 'Schleswig-Holstein'],
  [17, 2, 'GER_MECK', 'Mecklenburg'],
  [14, 3, 'GER_BREM', 'Bremen', 'SVW'],
  [15, 3, 'GER_HAMB', 'Hamburg', 'HSV'],
  [16, 3, 'GER_BRAN', 'Brandenburg'],
  [17, 3, 'GER_BERL', 'Berlin', 'FCU'],
  [14, 4, 'GER_MUNS', 'Münsterland'],
  [15, 4, 'GER_NSAX', 'Lower Saxony'],
  [16, 4, 'GER_SANH', 'Saxony-Anhalt'],
  [17, 4, 'GER_LUSA', 'Lusatia'],
  [13, 5, 'GER_GELS', 'Gelsenkirchen', 'S04'],
  [14, 5, 'GER_DORT', 'Dortmund', 'BVB'],
  [15, 5, 'GER_PADE', 'Paderborn', 'PAD'],
  [16, 5, 'GER_HARZ', 'Harz'],
  [17, 5, 'GER_LEIP', 'Leipzig', 'RBL'],
  [13, 6, 'GER_MGLA', 'Mönchengladbach', 'BMG'],
  [14, 6, 'GER_LEVE', 'Leverkusen', 'B04'],
  [15, 6, 'GER_SAUE', 'Sauerland'],
  [16, 6, 'GER_KASS', 'Kassel'],
  [17, 6, 'GER_THUR', 'Thuringia'],
  [18, 6, 'GER_SAXO', 'Saxony'],
  [12, 7, 'GER_COLO', 'Cologne', 'KOE'],
  [13, 7, 'GER_KOBL', 'Koblenz'],
  [14, 7, 'GER_FRAN', 'Frankfurt', 'SGE'],
  [15, 7, 'GER_WURZ', 'Würzburg'],
  [16, 7, 'GER_FRCO', 'Franconia'],
  [12, 8, 'GER_SAAR', 'Saarland', 'ELV'],
  [13, 8, 'GER_MAIN', 'Mainz', 'M05'],
  [14, 8, 'GER_SINS', 'Sinsheim', 'TSG'],
  [15, 8, 'GER_STUT', 'Stuttgart', 'VFB'],
  [16, 8, 'GER_NURE', 'Nuremberg'],
  [12, 9, 'GER_FREI', 'Freiburg', 'SCF'],
  [13, 9, 'GER_SWAB', 'Swabia'],
  [14, 9, 'GER_AUGS', 'Augsburg', 'AUG'],
  [15, 9, 'GER_MUNI', 'Munich', 'BAY'],
];

const ITALY: Cell[] = [
  [12, 11, 'ITA_COMO', 'Como', 'COM'],
  [13, 11, 'ITA_TREN', 'Trentino'],
  [14, 11, 'ITA_FRIU', 'Friuli', 'UDI'],
  [11, 12, 'ITA_TURN', 'Turin North', 'JUV'],
  [12, 12, 'ITA_MILN', 'Milan North', 'INT'],
  [13, 12, 'ITA_MONZ', 'Monza', 'MNZ'],
  [14, 12, 'ITA_BERG', 'Bergamo', 'ATA'],
  [15, 12, 'ITA_VENI', 'Venice', 'VEN'],
  [11, 13, 'ITA_TURI', 'Turin', 'TOR'],
  [12, 13, 'ITA_MILS', 'Milan South', 'MIL'],
  [13, 13, 'ITA_CREM', 'Cremona'],
  [14, 13, 'ITA_VERO', 'Verona'],
  [12, 14, 'ITA_GENO', 'Genoa', 'GEN'],
  [13, 14, 'ITA_PARM', 'Parma', 'PAR'],
  [14, 14, 'ITA_SASS', 'Sassuolo', 'SAS'],
  [15, 14, 'ITA_BOLO', 'Bologna', 'BOL'],
  [12, 15, 'ITA_LIGU', 'Liguria East'],
  [13, 15, 'ITA_FLOR', 'Florence', 'FIO'],
  [14, 15, 'ITA_ROMG', 'Romagna'],
  [15, 15, 'ITA_MARC', 'Marche'],
  [13, 16, 'ITA_UMBR', 'Umbria'],
  [14, 16, 'ITA_ROMN', 'Rome North', 'LAZ'],
  [15, 16, 'ITA_ABRU', 'Abruzzo'],
  [11, 17, 'ITA_SARD', 'Sardinia', 'CAG'],
  [14, 17, 'ITA_ROMS', 'Rome South', 'ROM'],
  [15, 17, 'ITA_FROS', 'Frosinone', 'FRO'],
  [16, 17, 'ITA_MOLI', 'Molise'],
  [14, 18, 'ITA_NAPL', 'Naples', 'NAP'],
  [15, 18, 'ITA_BASI', 'Basilicata'],
  [16, 18, 'ITA_BARI', 'Bari'],
  [17, 18, 'ITA_LECC', 'Lecce', 'LEC'],
];

const COUNTRIES: [SoccerCountry, Cell[]][] = [
  ['ENG', ENGLAND], ['FRA', FRANCE], ['ESP', SPAIN], ['GER', GERMANY], ['ITA', ITALY],
];

/* ------------------------------------------------------------------ */
/* Hex geometry: pointy top hexes on an odd-r offset grid               */
/* ------------------------------------------------------------------ */

/** Circumradius of one hex in viewBox units. */
export const HEX_R = 12;
const HEX_W = Math.sqrt(3) * HEX_R;
const ROW_STEP = 1.5 * HEX_R;
const MARGIN = 6;
const X0 = HEX_W / 2 + MARGIN;
const Y0 = HEX_R + MARGIN;

function hexCentre(col: number, row: number): { x: number; y: number } {
  return { x: X0 + HEX_W * (col + (row % 2 ? 0.5 : 0)), y: Y0 + ROW_STEP * row };
}

function hexPath(cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + HEX_R * Math.cos(a)).toFixed(1)},${(cy + HEX_R * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** The six neighbours of an offset cell (odd rows shifted right). */
function hexNeighbours(col: number, row: number): [number, number][] {
  return row % 2
    ? [[col, row - 1], [col + 1, row - 1], [col - 1, row], [col + 1, row], [col, row + 1], [col + 1, row + 1]]
    : [[col - 1, row - 1], [col, row - 1], [col - 1, row], [col + 1, row], [col - 1, row + 1], [col, row + 1]];
}

/** Offset to cube coordinates, so distance is a max of three differences. */
function hexDistance(a: [number, number], b: [number, number]): number {
  const cube = ([c, r]: [number, number]) => {
    const x = c - (r - (r & 1)) / 2;
    const z = r;
    return [x, -x - z, z];
  };
  const [ax, ay, az] = cube(a);
  const [bx, by, bz] = cube(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

export interface SoccerRegion extends ConquestRegion {
  country: SoccerCountry;
  col: number;
  row: number;
  /** The club whose home this is, when it is one. */
  club?: string;
}

const built = (() => {
  const regions: SoccerRegion[] = [];
  const byCell = new Map<string, SoccerRegion>();
  for (const [country, cells] of COUNTRIES) {
    for (const [col, row, id, name, club] of cells) {
      const { x, y } = hexCentre(col, row);
      const region: SoccerRegion = { id, name, path: hexPath(x, y), labelX: Math.round(x * 10) / 10, labelY: Math.round(y * 10) / 10, country, col, row, club };
      regions.push(region);
      byCell.set(`${col},${row}`, region);
    }
  }
  const adjacency: Record<string, string[]> = {};
  for (const r of regions) {
    adjacency[r.id] = hexNeighbours(r.col, r.row)
      .map(([c, rw]) => byCell.get(`${c},${rw}`))
      .filter((n): n is SoccerRegion => !!n)
      .map(n => n.id)
      .sort();
  }
  let maxX = 0, maxY = 0;
  for (const r of regions) {
    maxX = Math.max(maxX, r.labelX + HEX_W / 2);
    maxY = Math.max(maxY, r.labelY + HEX_R);
  }
  return { regions, adjacency, viewBox: { width: Math.ceil(maxX + MARGIN), height: Math.ceil(maxY + MARGIN) } };
})();

export const SOCCER_REGIONS: SoccerRegion[] = built.regions;
export const SOCCER_ADJACENCY: Record<string, string[]> = built.adjacency;

/* ------------------------------------------------------------------ */
/* The clubs                                                            */
/* ------------------------------------------------------------------ */

export interface SoccerClubColours {
  color: string;
  secondaryColor?: string;
  /** True when no documented colour could be sourced and a neutral tint stands in. */
  neutral?: boolean;
}

/**
 * Documented club colours, two references each. Source A is the palette list
 * at footylogos.com/color-codes (read 2026-09-05), which carries every club
 * below unless the entry says otherwise; source B is teamcolorcodes.com's
 * per club page for the same club, and for Serie A infysia.com's Serie A
 * palette guide. The base colour is source A's first colour, unless source
 * B's first colour also appears in source A's palette (within a small colour
 * distance), in which case that colour is the base, because B lists shirt
 * colours first and A sometimes leads with a crest accent. The secondary is
 * the next colour in source A's palette. Clubs marked neutral could not be
 * sourced from two references on 2026-09-05 and wear a generated tint that
 * is nobody's colour; replace the tint the day a second source is found,
 * never with a guess.
 */
export const SOCCER_CLUB_COLOURS: Record<string, SoccerClubColours> = {
  // Premier League
  ARS: { color: '#EF0107', secondaryColor: '#9C824A' },
  AVL: { color: '#000000', neutral: true },
  BOU: { color: '#000000', neutral: true },
  BRE: { color: '#E30613', secondaryColor: '#FBB800' },
  BHA: { color: '#005DAA', secondaryColor: '#FFFFFF' },
  CHE: { color: '#001489', secondaryColor: '#FFFFFF' },
  COV: { color: '#000000', neutral: true },
  CRY: { color: '#0055A5', secondaryColor: '#FFFFFF' },
  EVE: { color: '#00009E', secondaryColor: '#FFFFFF' },
  FUL: { color: '#CC0000', secondaryColor: '#FFFFFF' },
  HUL: { color: '#000000', neutral: true },
  IPS: { color: '#000000', neutral: true },
  LEE: { color: '#FFE003', secondaryColor: '#0060A9' },
  LIV: { color: '#E51C25' },
  MCI: { color: '#6CADDF', secondaryColor: '#00285E' },
  MUN: { color: '#C1040B', secondaryColor: '#FFE500' },
  NEW: { color: '#231F20', secondaryColor: '#FFFFFF' },
  NFO: { color: '#DD0000' },
  SUN: { color: '#EB172B', secondaryColor: '#FFFFFF' },
  TOT: { color: '#132257' },
  // La Liga
  ALA: { color: '#0232A0', secondaryColor: '#FFFFFF' },
  ATH: { color: '#EE2523', secondaryColor: '#FFFFFF' },
  ATM: { color: '#282A6F', secondaryColor: '#E8151E' },
  BAR: { color: '#A50044', secondaryColor: '#004D98' },
  BET: { color: '#00954C', secondaryColor: '#FFFFFF' },
  CEL: { color: '#6DACE5', secondaryColor: '#D50032' },
  DEP: { color: '#000000', neutral: true },
  ELC: { color: '#C5112E', secondaryColor: '#1B458F' },
  ESP: { color: '#0077BD', secondaryColor: '#E01517' },
  GET: { color: '#000000', neutral: true },
  LEV: { color: '#B4053F', secondaryColor: '#005CA5' },
  MAL: { color: '#000000', neutral: true },
  OSA: { color: '#CB2725', secondaryColor: '#2C1A69' },
  RAC: { color: '#000000', neutral: true },
  RAY: { color: '#E3361D', secondaryColor: '#C0AE33' },
  RMA: { color: '#FEBE10', secondaryColor: '#00529F' },
  RSO: { color: '#143C8B', secondaryColor: '#FFFFFF' },
  SEV: { color: '#000000', neutral: true },
  VAL: { color: '#E23C07', secondaryColor: '#FFE524' },
  VIL: { color: '#FFD733', secondaryColor: '#EE0028' },
  // Serie A
  ATA: { color: '#0D68B1', secondaryColor: '#FFFFFF' },
  BOL: { color: '#1B2838', secondaryColor: '#9F1F33' },
  CAG: { color: '#B01028', secondaryColor: '#082242' },
  COM: { color: '#10416A', secondaryColor: '#FFFFFF' },
  FIO: { color: '#61358B', secondaryColor: '#FFFFFF' },
  FRO: { color: '#000000', neutral: true },
  GEN: { color: '#002942', secondaryColor: '#AB131C' },
  INT: { color: '#00239C', secondaryColor: '#FFFFFF' },
  JUV: { color: '#000000', secondaryColor: '#FFFFFF' },
  LAZ: { color: '#74D1EA', secondaryColor: '#FFFFFF' },
  LEC: { color: '#263B63', secondaryColor: '#D5B978' },
  MIL: { color: '#E4002B', secondaryColor: '#101820' },
  MNZ: { color: '#000000', neutral: true },
  NAP: { color: '#00ABE7', secondaryColor: '#FFFFFF' },
  PAR: { color: '#FFCF01', secondaryColor: '#24338A' },
  ROM: { color: '#980A2B', secondaryColor: '#FBB900' },
  SAS: { color: '#1EA451', secondaryColor: '#000000' },
  TOR: { color: '#8B2A1F', secondaryColor: '#ECAC00' },
  UDI: { color: '#000000', secondaryColor: '#FFFFFF' },
  VEN: { color: '#000000', neutral: true },
  // Bundesliga
  AUG: { color: '#BA3733', secondaryColor: '#FFFFFF' },
  B04: { color: '#FF0000', secondaryColor: '#FFFF00' },
  BAY: { color: '#ED0038', secondaryColor: '#286CFD' },
  BVB: { color: '#FFD900', secondaryColor: '#000000' },
  BMG: { color: '#000000', secondaryColor: '#FFFFFF' },
  SGE: { color: '#E1020C', secondaryColor: '#FFFFFF' },
  SCF: { color: '#000000', secondaryColor: '#FFFFFF' },
  HSV: { color: '#1E5CB3', secondaryColor: '#FFFFFF' },
  TSG: { color: '#1961B5', secondaryColor: '#FFFFFF' },
  KOE: { color: '#E20613', secondaryColor: '#FFFFFF' },
  M05: { color: '#AE0F0A', secondaryColor: '#FFFFFF' },
  RBL: { color: '#DD0741', secondaryColor: '#FFFFFF' },
  S04: { color: '#000000', neutral: true },
  ELV: { color: '#000000', neutral: true },
  PAD: { color: '#000000', neutral: true },
  VFB: { color: '#D40723', secondaryColor: '#FFDC00' },
  FCU: { color: '#E30613', secondaryColor: '#FFDD00' },
  SVW: { color: '#1D9053', secondaryColor: '#FFFFFF' },
  // Ligue 1
  ANG: { color: '#140E0B', secondaryColor: '#FFFFFF' },
  AJA: { color: '#1C4F9C', secondaryColor: '#FFFFFF' },
  BST: { color: '#ED1C24', secondaryColor: '#231F20' },
  HAC: { color: '#89C2EB', secondaryColor: '#213255' },
  LEM: { color: '#000000', neutral: true },
  RCL: { color: '#B71315', secondaryColor: '#FFC700' },
  LIL: { color: '#E01E13', secondaryColor: '#24216A' },
  LOR: { color: '#EA670B', secondaryColor: '#1B1615' },
  LYO: { color: '#0F23AA', secondaryColor: '#E5202E' },
  MAR: { color: '#0B61AD', secondaryColor: '#FFFFFF' },
  ASM: { color: '#FF002E', secondaryColor: '#FFFFFF' },
  NCE: { color: '#ED1C24', secondaryColor: '#231F20' },
  PFC: { color: '#000000', neutral: true },
  PSG: { color: '#004170', secondaryColor: '#E30613' },
  REN: { color: '#E13327', secondaryColor: '#000000' },
  STR: { color: '#009FE3', secondaryColor: '#DC2F34' },
  TFC: { color: '#695188', secondaryColor: '#38284F' },
  TRO: { color: '#006EB2', secondaryColor: '#DC9D0F' },
};

/** A tint that is nobody's colour: low saturation, mid lightness, hue from the id. */
export function neutralTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const s = 0.14, l = 0.46;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** [id, name, country, home region, 2026 market value in USD, rows on record] */
type ClubRow = [id: string, name: string, country: SoccerCountry, home: string, valueUsd: number, valueRows: number];

const CLUB_ROWS: ClubRow[] = [
  // Premier League
  ['ARS', 'Arsenal', 'ENG', 'ENG_ISLI', 1392000000, 25],
  ['AVL', 'Aston Villa', 'ENG', 'ENG_BIRM', 545800000, 23],
  ['BOU', 'Bournemouth', 'ENG', 'ENG_BOUR', 528000000, 23],
  ['BRE', 'Brentford', 'ENG', 'ENG_BREN', 566000000, 24],
  ['BHA', 'Brighton', 'ENG', 'ENG_BRIG', 544000000, 25],
  ['CHE', 'Chelsea', 'ENG', 'ENG_CHEL', 1112300000, 27],
  ['COV', 'Coventry City', 'ENG', 'ENG_COVE', 212000000, 19],
  ['CRY', 'Crystal Palace', 'ENG', 'ENG_CROY', 531800000, 29],
  ['EVE', 'Everton', 'ENG', 'ENG_DOCK', 357000000, 16],
  ['FUL', 'Fulham', 'ENG', 'ENG_FULH', 427000000, 23],
  ['HUL', 'Hull City', 'ENG', 'ENG_EYOR', 133000000, 17],
  ['IPS', 'Ipswich Town', 'ENG', 'ENG_IPSW', 295000000, 25],
  ['LEE', 'Leeds United', 'ENG', 'ENG_WYOR', 325000000, 19],
  ['LIV', 'Liverpool', 'ENG', 'ENG_ANFI', 1123400000, 23],
  ['MCI', 'Manchester City', 'ENG', 'ENG_EMAN', 1337000000, 23],
  ['MUN', 'Manchester United', 'ENG', 'ENG_TRAF', 886000000, 23],
  ['NEW', 'Newcastle', 'ENG', 'ENG_TYNE', 570000000, 24],
  ['NFO', 'Nottingham Forest', 'ENG', 'ENG_NOTT', 559000000, 24],
  ['SUN', 'Sunderland', 'ENG', 'ENG_WEAR', 433600000, 25],
  ['TOT', 'Tottenham', 'ENG', 'ENG_TOTT', 946000000, 27],
  // La Liga
  ['ALA', 'Alavés', 'ESP', 'ESP_VITO', 42000000, 11],
  ['ATH', 'Athletic Club', 'ESP', 'ESP_BILB', 291000000, 20],
  ['ATM', 'Atlético Madrid', 'ESP', 'ESP_SBLA', 645000000, 22],
  ['BAR', 'Barcelona', 'ESP', 'ESP_CORT', 1318900000, 24],
  ['BET', 'Real Betis', 'ESP', 'ESP_HELI', 247300000, 21],
  ['CEL', 'Celta Vigo', 'ESP', 'ESP_VIGO', 153300000, 17],
  ['DEP', 'Deportivo La Coruña', 'ESP', 'ESP_CORU', 36700000, 5],
  ['ELC', 'Elche', 'ESP', 'ESP_ELCH', 97000000, 14],
  ['ESP', 'Espanyol', 'ESP', 'ESP_CORN', 102000000, 13],
  ['GET', 'Getafe', 'ESP', 'ESP_GETA', 50500000, 10],
  ['LEV', 'Levante', 'ESP', 'ESP_ORRI', 63000000, 9],
  ['MAL', 'Málaga', 'ESP', 'ESP_MALA', 10000000, 2],
  ['OSA', 'Osasuna', 'ESP', 'ESP_NAVA', 54000000, 8],
  ['RAC', 'Racing Santander', 'ESP', 'ESP_CANT', 25000000, 5],
  ['RAY', 'Rayo Vallecano', 'ESP', 'ESP_VALL', 63000000, 9],
  ['RMA', 'Real Madrid', 'ESP', 'ESP_CHAM', 1652000000, 33],
  ['RSO', 'Real Sociedad', 'ESP', 'ESP_GIPU', 246900000, 20],
  ['SEV', 'Sevilla', 'ESP', 'ESP_NERV', 86000000, 11],
  ['VAL', 'Valencia', 'ESP', 'ESP_MEST', 161900000, 19],
  ['VIL', 'Villarreal', 'ESP', 'ESP_CSTL', 288000000, 22],
  // Serie A
  ['ATA', 'Atalanta', 'ITA', 'ITA_BERG', 407000000, 21],
  ['BOL', 'Bologna', 'ITA', 'ITA_BOLO', 274000000, 24],
  ['CAG', 'Cagliari', 'ITA', 'ITA_SARD', 86400000, 16],
  ['COM', 'Como', 'ITA', 'ITA_COMO', 452000000, 23],
  ['FIO', 'Fiorentina', 'ITA', 'ITA_FLOR', 323000000, 21],
  ['FRO', 'Frosinone', 'ITA', 'ITA_FROS', 14000000, 4],
  ['GEN', 'Genoa', 'ITA', 'ITA_GENO', 136000000, 18],
  ['INT', 'Inter Milan', 'ITA', 'ITA_MILN', 730300000, 23],
  ['JUV', 'Juventus', 'ITA', 'ITA_TURN', 672700000, 27],
  ['LAZ', 'Lazio', 'ITA', 'ITA_ROMN', 202000000, 20],
  ['LEC', 'Lecce', 'ITA', 'ITA_LECC', 75000000, 14],
  ['MIL', 'AC Milan', 'ITA', 'ITA_MILS', 442000000, 19],
  ['MNZ', 'Monza', 'ITA', 'ITA_MONZ', 16900000, 6],
  ['NAP', 'Napoli', 'ITA', 'ITA_NAPL', 468800000, 23],
  ['PAR', 'Parma', 'ITA', 'ITA_PARM', 133000000, 17],
  ['ROM', 'Roma', 'ITA', 'ITA_ROMS', 506000000, 22],
  ['SAS', 'Sassuolo', 'ITA', 'ITA_SASS', 152700000, 19],
  ['TOR', 'Torino', 'ITA', 'ITA_TURI', 152700000, 23],
  ['UDI', 'Udinese', 'ITA', 'ITA_FRIU', 155000000, 23],
  ['VEN', 'Venezia', 'ITA', 'ITA_VENI', 42000000, 11],
  // Bundesliga
  ['AUG', 'Augsburg', 'GER', 'GER_AUGS', 153000000, 18],
  ['B04', 'Bayer Leverkusen', 'GER', 'GER_LEVE', 482000000, 25],
  ['BAY', 'Bayern Munich', 'GER', 'GER_MUNI', 953000000, 19],
  ['BVB', 'Borussia Dortmund', 'GER', 'GER_DORT', 587000000, 21],
  ['BMG', 'Gladbach', 'GER', 'GER_MGLA', 119000000, 15],
  ['SGE', 'Eintracht Frankfurt', 'GER', 'GER_FRAN', 253000000, 16],
  ['SCF', 'Freiburg', 'GER', 'GER_FREI', 117000000, 14],
  ['HSV', 'Hamburg', 'GER', 'GER_HAMB', 78000000, 13],
  ['TSG', 'Hoffenheim', 'GER', 'GER_SINS', 162000000, 17],
  ['KOE', 'Köln', 'GER', 'GER_COLO', 134000000, 16],
  ['M05', 'Mainz', 'GER', 'GER_MAIN', 100000000, 14],
  ['RBL', 'RB Leipzig', 'GER', 'GER_LEIP', 431000000, 25],
  ['S04', 'Schalke 04', 'GER', 'GER_GELS', 24100000, 9],
  ['ELV', 'Elversberg', 'GER', 'GER_SAAR', 7000000, 4],
  ['PAD', 'Paderborn', 'GER', 'GER_PADE', 24000000, 7],
  ['VFB', 'Stuttgart', 'GER', 'GER_STUT', 329200000, 21],
  ['FCU', 'Union Berlin', 'GER', 'GER_BERL', 90000000, 12],
  ['SVW', 'Werder Bremen', 'GER', 'GER_BREM', 151000000, 17],
  // Ligue 1
  ['ANG', 'Angers', 'FRA', 'FRA_ANGE', 81000000, 11],
  ['AJA', 'Auxerre', 'FRA', 'FRA_AUXE', 94000000, 14],
  ['BST', 'Brest', 'FRA', 'FRA_BRES', 76000000, 16],
  ['HAC', 'Le Havre', 'FRA', 'FRA_HAVR', 48000000, 11],
  ['LEM', 'Le Mans', 'FRA', 'FRA_MANS', 2000000, 1],
  ['RCL', 'Lens', 'FRA', 'FRA_LENS', 137000000, 16],
  ['LIL', 'Lille', 'FRA', 'FRA_LILL', 194000000, 15],
  ['LOR', 'Lorient', 'FRA', 'FRA_LORI', 93000000, 15],
  ['LYO', 'Lyon', 'FRA', 'FRA_LYON', 220000000, 19],
  ['MAR', 'Marseille', 'FRA', 'FRA_MARS', 218400000, 14],
  ['ASM', 'Monaco', 'FRA', 'FRA_MONA', 350000000, 24],
  ['NCE', 'Nice', 'FRA', 'FRA_NICE', 126300000, 17],
  ['PFC', 'Paris FC', 'FRA', 'FRA_PARS', 79000000, 14],
  ['PSG', 'PSG', 'FRA', 'FRA_PARW', 1159000000, 22],
  ['REN', 'Rennes', 'FRA', 'FRA_RENN', 230000000, 20],
  ['STR', 'Strasbourg', 'FRA', 'FRA_STRA', 221000000, 15],
  ['TFC', 'Toulouse', 'FRA', 'FRA_TOUL', 134000000, 15],
  ['TRO', 'Troyes', 'FRA', 'FRA_TROY', 21000000, 6],
];

/** Below this many 2026 rows the value is a fragment of the squad, not a measure of it. */
export const PARTIAL_ROWS = 8;
/** Values are read on a log curve between these two: the floor is where the table's coverage runs out. */
export const VALUE_FLOOR_USD = 20_000_000;
export const VALUE_CAP_USD = 1_700_000_000;
export const OVERALL_MIN = 55;
export const OVERALL_MAX = 95;

/** Squad market value to the 55 to 95 strength band, log curve, clamped. */
export function strengthFromValue(valueUsd: number): number {
  const v = Math.min(VALUE_CAP_USD, Math.max(VALUE_FLOOR_USD, valueUsd));
  const t = Math.log(v / VALUE_FLOOR_USD) / Math.log(VALUE_CAP_USD / VALUE_FLOOR_USD);
  return Math.round(OVERALL_MIN + (OVERALL_MAX - OVERALL_MIN) * t);
}

export function formatSquadValue(valueUsd: number): string {
  if (valueUsd >= 1_000_000_000) return `$${(valueUsd / 1_000_000_000).toFixed(2)}B`;
  return `$${Math.round(valueUsd / 1_000_000)}M`;
}

export interface SoccerClub {
  id: string;
  name: string;
  country: SoccerCountry;
  league: string;
  home: string;
  color: string;
  secondaryColor?: string;
  neutralColour: boolean;
  valueUsd: number;
  valueRows: number;
  partial: boolean;
  overall: number;
}

export const SOCCER_CLUBS: SoccerClub[] = CLUB_ROWS.map(([id, name, country, home, valueUsd, valueRows]) => {
  const colours = SOCCER_CLUB_COLOURS[id];
  const neutral = !colours || !!colours.neutral;
  return {
    id, name, country, league: SOCCER_LEAGUE_OF[country], home,
    color: neutral ? neutralTint(id) : colours.color,
    secondaryColor: neutral ? undefined : colours.secondaryColor,
    neutralColour: neutral,
    valueUsd, valueRows,
    partial: valueRows < PARTIAL_ROWS,
    overall: strengthFromValue(valueUsd),
  };
});

export const SOCCER_CLUB_MAP = new Map(SOCCER_CLUBS.map(c => [c.id, c]));

/** Clubs whose 2026 value rests on fewer than PARTIAL_ROWS rows: strength is the floor, the tile says so. */
export const SOCCER_CONQUEST_PARTIAL: string[] = SOCCER_CLUBS.filter(c => c.partial).map(c => c.id);

/* ------------------------------------------------------------------ */
/* The opening map: every region to the nearest club of its country     */
/* ------------------------------------------------------------------ */

export const INITIAL_TERRITORIES_SOCCER: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  const homes = new Map<string, SoccerRegion>();
  for (const r of SOCCER_REGIONS) if (r.club) homes.set(r.club, r);
  for (const r of SOCCER_REGIONS) {
    if (r.club) { out[r.id] = r.club; continue; }
    let best: string | null = null;
    let bd = Infinity;
    for (const club of SOCCER_CLUBS) {
      if (club.country !== r.country) continue;
      const home = homes.get(club.id);
      if (!home) continue;
      const d = hexDistance([r.col, r.row], [home.col, home.row]);
      if (d < bd) { bd = d; best = club.id; }
    }
    if (best) out[r.id] = best;
  }
  return out;
})();

/* ------------------------------------------------------------------ */
/* What the shared map and the shared engine read                       */
/* ------------------------------------------------------------------ */

const MAP_TEAMS: ConquestMapTeam[] = SOCCER_CLUBS.map(c => ({ id: c.id, name: c.name, color: c.color, secondaryColor: c.secondaryColor }));

export const SOCCER_CONQUEST_MAP: ConquestMapSport = {
  key: 'soccer',
  regions: SOCCER_REGIONS,
  adjacency: SOCCER_ADJACENCY,
  teams: MAP_TEAMS,
  viewBox: built.viewBox,
  regionNoun: 'region',
};

const IMP_TEAMS: ImperialismTeam[] = SOCCER_CLUBS.map(c => ({
  id: c.id,
  name: c.name,
  overall: c.overall,
  group: c.league,
  sub: `${formatSquadValue(c.valueUsd)} squad${c.partial ? ', partial data' : ''}`,
}));

export const SOCCER_REGULAR_ROUNDS = 10;

/** A decided match: the winner scores 1 to 4, the loser trails by 1 to 3. */
function soccerScorePair(rng: () => number): [number, number] {
  const winner = 1 + Math.floor(rng() * 4);
  const margin = 1 + Math.floor(rng() * Math.min(3, winner));
  return [winner, Math.max(0, winner - margin)];
}

export const SOCCER_IMPERIALISM: ImperialismSport = {
  key: 'soccer',
  teams: IMP_TEAMS,
  seed: () => ({ ...INITIAL_TERRITORIES_SOCCER }),
  regularRounds: SOCCER_REGULAR_ROUNDS,
  playoffLabels: ['Quarter-finals', 'Semi-finals', 'Imperial Final'],
  roundNoun: 'Matchday',
  regionNoun: 'region',
  homeEdge: 2,
  /* 28 rather than the NFL's 22: football is the lower scoring sport and the
     upset is its whole point, so a ten point gap is about 70/30 and the top
     of the table over the bottom is about 97/3 rather than 99/1. */
  gapScale: 28,
  tieBreakWindow: 0.045,
  score: {
    pair: soccerScorePair,
    /* Level after extra time, settled on penalties. */
    tieBreak: w => w,
    tieBreakLabel: 'pens',
  },
  copy: {
    eraseTail: 'in ninety minutes',
    quiet: '🧊 A quiet matchday: no empires changed hands in a big way.',
  },
};

/** The route, the name and the completion key, in one place for the board and the harnesses. */
export const SOCCER_CONQUEST_GAME = {
  name: 'Soccer Conquest',
  path: '/soccer-conquest',
  gameId: 'conquest-soccer-imperialism',
  pitch: 'Ninety six clubs from the top five leagues, one map of Europe. Every region opens in the hands of the nearest club of its own country. Every matchday the whole continent plays, and the winner takes the loser\'s ENTIRE empire. Wiped out clubs keep playing, and one win takes it all back. Strength is squad value, nothing typed: Real Madrid are the giants, the promoted clubs are the long shots. Pick a club, call its games, and see how much of Europe it can paint.',
};
