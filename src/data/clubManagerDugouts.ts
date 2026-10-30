/**
 * Round 1606: Club Manager's real dugouts. Round 1607 filled the 2026-27 big five ('now', 96 chairs, read
 * 2026-10-30); every row's two reads are in scripts/data/cmDugouts.receipt.json and simClubManagerDugouts fences it.
 *
 * One row per chair: the man in charge for the club's first league match of the season an era describes, plus
 * the month he was appointed to that stint ('YYYY-MM', dropped where two sources disagree on the month). Keys are
 * the era ids of src/lib/clubManagerEras.ts ('now', 'era2020', 'era2015', 'era2010', 'era2005') and the club
 * names exactly as the game's league tables spell them.
 *
 * Every row needs two independent sources, neither a wiki. The URLs live in scripts/data/cmDugouts.receipt.json
 * and never in this file, which ships in the bundle. A chair in a covered league that could not be two sourced
 * goes on CM_DUGOUTS_PARTIAL for its era (the CM_PARTIAL shape) and keeps a made up name that says so.
 *
 * A row carries a name and a month and nothing else: no rating, style, value or record on a real person. How the
 * game may use a name is the rule in src/lib/realDugouts.ts (a display slot only, never a sentence).
 */
import type { RealDugoutPartial, RealDugoutRow, RealDugoutTable } from '@/lib/realDugouts';

/** The row type, named for this game: `{ name: string; appointed?: string }`. */
export type CMDugoutRow = RealDugoutRow;

/** Era id, then club, then the opening day chair. */
export const CM_DUGOUTS: RealDugoutTable = {
  now: {
    // Premier League
    "Arsenal": { name: "Mikel Arteta" },
    "Aston Villa": { name: "Unai Emery" },
    "Bournemouth": { name: "Marco Rose" },
    "Brentford": { name: "Keith Andrews" },
    "Brighton": { name: "Fabian Hürzeler" },
    "Chelsea": { name: "Xabi Alonso" },
    "Coventry City": { name: "Frank Lampard" },
    "Crystal Palace": { name: "Pierre Sage" },
    "Everton": { name: "David Moyes" },
    "Fulham": { name: "Álvaro Arbeloa" },
    "Hull City": { name: "Sergej Jakirović" },
    "Ipswich Town": { name: "Gary O'Neil" },
    "Leeds United": { name: "Daniel Farke" },
    "Liverpool": { name: "Andoni Iraola" },
    "Manchester City": { name: "Enzo Maresca" },
    "Manchester United": { name: "Michael Carrick", appointed: "2026-01" },
    "Newcastle": { name: "Matthias Jaissle", appointed: "2026-08" },
    "Nottingham Forest": { name: "Oliver Glasner" },
    "Sunderland": { name: "Régis Le Bris" },
    "Tottenham": { name: "Roberto De Zerbi" },
    // La Liga
    "Alavés": { name: "Quique Sánchez Flores" },
    "Athletic Club": { name: "Edin Terzić" },
    "Atlético Madrid": { name: "Diego Simeone" },
    "Barcelona": { name: "Hansi Flick" },
    "Real Betis": { name: "Manuel Pellegrini" },
    "Celta Vigo": { name: "Claudio Giráldez" },
    "Deportivo La Coruña": { name: "Antonio Hidalgo" },
    "Elche": { name: "Martín Anselmi" },
    "Espanyol": { name: "Manolo González" },
    "Getafe": { name: "José Bordalás" },
    "Levante": { name: "Luís Castro" },
    "Málaga": { name: "Juanfran Funes" },
    "Osasuna": { name: "Luis Miguel Ramis" },
    "Racing Santander": { name: "José Alberto López" },
    "Rayo Vallecano": { name: "Beñat San José" },
    "Real Madrid": { name: "José Mourinho" },
    "Real Sociedad": { name: "Pellegrino Matarazzo", appointed: "2025-12" },
    "Sevilla": { name: "Luis García Plaza" },
    "Valencia": { name: "Carlos Corberán" },
    "Villarreal": { name: "Iñigo Pérez" },
    // Serie A
    "Atalanta": { name: "Maurizio Sarri" },
    "Bologna": { name: "Domenico Tedesco" },
    "Cagliari": { name: "Fabio Pisacane" },
    "Como": { name: "Cesc Fàbregas" },
    "Fiorentina": { name: "Fabio Grosso" },
    "Frosinone": { name: "Massimiliano Alvini" },
    "Genoa": { name: "Daniele De Rossi" },
    "Inter Milan": { name: "Cristian Chivu" },
    "Juventus": { name: "Luciano Spalletti" },
    "Lazio": { name: "Gennaro Gattuso" },
    "Lecce": { name: "Eusebio Di Francesco" },
    "AC Milan": { name: "Rúben Amorim" },
    "Monza": { name: "Ivan Jurić" },
    "Napoli": { name: "Massimiliano Allegri" },
    "Parma": { name: "Carlos Cuesta" },
    "Roma": { name: "Gian Piero Gasperini" },
    "Sassuolo": { name: "Alberto Aquilani" },
    "Torino": { name: "Ignazio Abate" },
    "Udinese": { name: "Kosta Runjaić" },
    "Venezia": { name: "Giovanni Stroppa" },
    // Bundesliga
    "Augsburg": { name: "Manuel Baum" },
    "Bayer Leverkusen": { name: "Carles Martínez" },
    "Bayern Munich": { name: "Vincent Kompany" },
    "Borussia Dortmund": { name: "Niko Kovač", appointed: "2025-02" },
    "Gladbach": { name: "Eugen Polanski" },
    "Eintracht Frankfurt": { name: "Adi Hütter" },
    "Freiburg": { name: "Julian Schuster" },
    "Hamburg": { name: "Merlin Polzin" },
    "Hoffenheim": { name: "Christian Ilzer" },
    "Köln": { name: "René Wagner" },
    "Mainz": { name: "Urs Fischer" },
    "RB Leipzig": { name: "Martín Demichelis" },
    "Schalke 04": { name: "Miron Muslić" },
    "Elversberg": { name: "Vincent Wagner" },
    "Paderborn": { name: "Ralf Kettemann" },
    "Stuttgart": { name: "Sebastian Hoeneß" },
    "Union Berlin": { name: "Mauro Lustrinelli" },
    "Werder Bremen": { name: "Daniel Thioune" },
    // Ligue 1
    "Angers": { name: "Stéphane Gilli" },
    "Auxerre": { name: "Will Still" },
    "Brest": { name: "Julien Lachuer" },
    "Le Havre": { name: "Didier Digard" },
    "Le Mans": { name: "Patrick Videira" },
    "Lens": { name: "Dino Toppmöller" },
    "Lille": { name: "Davide Ancelotti" },
    "Lorient": { name: "Alexandre Dujeux", appointed: "2026-06" },
    "Lyon": { name: "Paulo Fonseca" },
    "Marseille": { name: "Bruno Genesio" },
    "Monaco": { name: "Filipe Luís" },
    "Nice": { name: "Olivier Pantaloni" },
    "Paris FC": { name: "Liam Rosenior" },
    "PSG": { name: "Luis Enrique" },
    "Rennes": { name: "Franck Haise" },
    "Strasbourg": { name: "Hugo Oliveira" },
    "Toulouse": { name: "Jens Berthel Askou", appointed: "2026-05" },
    "Troyes": { name: "Stéphane Dumont" },
  },
};

/** Era id, then the covered clubs whose chair could not be two sourced. */
export const CM_DUGOUTS_PARTIAL: RealDugoutPartial = {
  now: [],
};
