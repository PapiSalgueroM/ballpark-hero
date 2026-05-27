#!/usr/bin/env python
"""
autopilot-all-games.py — Mega-script for DoUKnowBall content + data scaling.

For each game in docs/GAMES_INVENTORY.md, attempts to generate puzzles or data.
Outputs:
- supabase/migrations/20260527_autopilot_*.sql  (per-game migrations)
- docs/candidates/<game>-notes.md  (for games that need supervised follow-up)
- docs/AUTOPILOT_RUN_LOG.md  (full execution log)
- docs/BLOCKERS.md  (anything that needs Anthony's review)

Run: python docs/scripts/autopilot-all-games.py
"""

import json
import random
import re
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# ===== CONFIG =====
RUN_TIMESTAMP = datetime.now().strftime("%Y-%m-%d_%H-%M")
RANDOM_SEED = 20260527
random.seed(RANDOM_SEED)

ROOT = Path(".")
DATA_DIR = ROOT / "docs" / "data"
CANDIDATES_DIR = ROOT / "docs" / "candidates"
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"
LOG_PATH = ROOT / "docs" / "AUTOPILOT_RUN_LOG.md"
BLOCKERS_PATH = ROOT / "docs" / "BLOCKERS.md"

CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)

SOCCER_DATA_PATH = DATA_DIR / "soccer-data.json"
CONNECTIONS_BASELINE_PATH = ROOT / "docs" / "connections-batch1-categories.txt"

# ===== LOGGING =====
log_lines = []

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    log_lines.append(line)

def flush_log():
    LOG_PATH.write_text(
        f"# Autopilot Run Log — {RUN_TIMESTAMP}\n\n"
        + "\n".join(log_lines)
        + "\n"
    )

blockers = []

def add_blocker(game, issue, suggestion=""):
    blockers.append({
        "game": game,
        "issue": issue,
        "suggestion": suggestion,
        "time": datetime.now().strftime("%H:%M:%S"),
    })
    log(f"BLOCKER [{game}]: {issue}")

def flush_blockers():
    if not blockers:
        BLOCKERS_PATH.write_text(
            f"# Blockers — {RUN_TIMESTAMP}\n\nNo blockers encountered.\n"
        )
        return
    lines = [f"# Blockers — {RUN_TIMESTAMP}\n"]
    for b in blockers:
        lines.append(f"## {b['game']} ({b['time']})")
        lines.append(f"**Issue:** {b['issue']}")
        if b['suggestion']:
            lines.append(f"**Suggested next step:** {b['suggestion']}")
        lines.append("")
    BLOCKERS_PATH.write_text("\n".join(lines))

# ===== DATA LOADERS =====
def load_soccer_data():
    if not SOCCER_DATA_PATH.exists():
        log(f"WARN: {SOCCER_DATA_PATH} missing — run docs/scripts/build-soccer-data.py first")
        return None
    return json.loads(SOCCER_DATA_PATH.read_text(encoding="utf-8"))

def load_baseline_categories():
    if not CONNECTIONS_BASELINE_PATH.exists():
        return set()
    return set(CONNECTIONS_BASELINE_PATH.read_text(encoding="utf-8").splitlines())

# ===== SQL HELPERS =====
def sql_escape(s):
    """Escape single quotes for SQL string literals."""
    return s.replace("'", "''")

def write_migration(filename, sql_body):
    path = MIGRATIONS_DIR / filename
    path.write_text(sql_body, encoding="utf-8")
    log(f"Wrote {path} ({len(sql_body)} bytes)")

def write_candidate(game_slug, content):
    path = CANDIDATES_DIR / f"{game_slug}-notes.md"
    path.write_text(content, encoding="utf-8")
    log(f"Wrote {path}")


# ===== GAME: CONNECTIONS (soccer) =====
SATURATED_CLUBS = {
    "Real Madrid", "Barcelona", "Bayern Munich", "Man City", "Liverpool",
    "Arsenal", "Chelsea", "Man Utd", "PSG", "Tottenham", "Borussia Dortmund",
    "Inter Miami", "Galatasaray", "Sporting CP", "Al Hilal", "Roma",
    "Bayer Leverkusen", "Atalanta", "Newcastle", "Benfica", "AC Milan",
    "Juventus", "Napoli", "Atletico Madrid", "Inter Milan", "Porto", "Lazio",
    "Crystal Palace", "Celtic", "Flamengo", "PSV Eindhoven", "Feyenoord",
    "Aston Villa", "Brentford", "LAFC", "Ajax", "Marseille", "Real Sociedad",
    "Fulham", "Boca Juniors",
}

TOURNAMENT_TO_NATIONALITY = {
    "WC 2022 Argentina winners": "Argentina",
    "WC 2018 France winners": "France",
    "Euro 2024 Spain winners": "Spain",
    "Euro 2020 Italy winners": "Italy",
    "Copa America 2024 Argentina winners": "Argentina",
    "Copa America 2021 Argentina winners": "Argentina",
    "AFCON 2023 Ivory Coast winners": "Ivory Coast",
    "AFCON 2021 Senegal winners": "Senegal",
}

ICONIC_NUMBERS = {
    "Lionel Messi": 10, "Cristiano Ronaldo": 7, "Kylian Mbappe": 10,
    "Erling Haaland": 9, "Jude Bellingham": 5, "Vinicius Junior": 7,
    "Mohamed Salah": 11, "Harry Kane": 9, "Kevin De Bruyne": 17,
    "Luka Modric": 10, "Pedri": 8, "Rodri": 16, "Robert Lewandowski": 9,
    "Bukayo Saka": 7, "Phil Foden": 47, "Rodrygo": 11, "Eduardo Camavinga": 12,
    "Aurelien Tchouameni": 14, "Federico Valverde": 15, "Lautaro Martinez": 10,
    "Karim Benzema": 9, "Toni Kroos": 8, "Sergio Ramos": 4, "Virgil van Dijk": 4,
    "Mason Mount": 19, "Bruno Fernandes": 8, "Marcus Rashford": 10,
    "Trent Alexander-Arnold": 66, "Andrew Robertson": 26, "Alisson Becker": 1,
    "Ederson": 31, "Bernardo Silva": 20, "Jack Grealish": 10, "Declan Rice": 41,
    "Martin Odegaard": 8, "Gabriel Martinelli": 11, "William Saliba": 12,
    "Antoine Griezmann": 7, "Jan Oblak": 13, "Koke": 6, "Julian Alvarez": 19,
    "Lamine Yamal": 19, "Pau Cubarsi": 33, "Gavi": 6, "Frenkie de Jong": 21,
    "Robert Sanchez": 1, "Cole Palmer": 20, "Enzo Fernandez": 8,
    "Moises Caicedo": 25, "Nicolas Jackson": 15,
    "Christian Pulisic": 11, "Rafael Leao": 10, "Theo Hernandez": 19,
    "Mike Maignan": 16, "Tijjani Reijnders": 14,
    "Dusan Vlahovic": 9, "Federico Chiesa": 7, "Manuel Locatelli": 5,
    "Kenan Yildiz": 10, "Andrea Cambiaso": 27,
    "Nicolo Barella": 23, "Hakan Calhanoglu": 20,
    "Federico Dimarco": 32, "Marcus Thuram": 9, "Yann Sommer": 1,
}

ACHIEVEMENT_POOL = [
    ("Played 600+ Premier League matches", ["Gareth Barry", "Ryan Giggs", "James Milner", "Frank Lampard"]),
    ("Won 7+ Premier League titles", ["Ryan Giggs", "Paul Scholes", "Gary Neville", "Roy Keane"]),
    ("Scored 25+ Serie A goals in a season post-2010", ["Cristiano Ronaldo", "Ciro Immobile", "Edinson Cavani", "Andrea Belotti"]),
    ("Won UEFA Men Player of the Year", ["Cristiano Ronaldo", "Virgil van Dijk", "Luka Modric", "Rodri"]),
    ("Scored in two different Champions League Finals", ["Gareth Bale", "Cristiano Ronaldo", "Sergio Ramos", "Vinicius Junior"]),
    ("Won the Euro 2024 Golden Boot", ["Harry Kane", "Cody Gakpo", "Jamal Musiala", "Dani Olmo"]),
    ("Scored 30+ goals in a single Bundesliga season", ["Robert Lewandowski", "Gerd Muller", "Dieter Muller", "Harry Kane"]),
    ("Won the FIFA World Cup 2022 with Argentina", ["Lionel Messi", "Angel Di Maria", "Rodrigo De Paul", "Nicolas Otamendi"]),
    ("Won the Treble League Cup Champions League", ["Kevin De Bruyne", "Rodri", "Bernardo Silva", "Ederson"]),
    ("Captained a Champions League winning team", ["Sergio Ramos", "Andres Iniesta", "Carles Puyol", "Iker Casillas"]),
    ("Top scorer at the 2018 FIFA World Cup", ["Harry Kane", "Antoine Griezmann", "Romelu Lukaku", "Denis Cheryshev"]),
]

def generate_connections_puzzles(
        soccer_data, baseline_categories,
        n_puzzles=115, start_id=186, start_sort=185):
    if not soccer_data:
        add_blocker("Connections", "soccer-data.json missing")
        return 0
    squads = soccer_data["current_squads_2025_26"]
    tournaments = soccer_data["tournament_winners"]
    if not squads or not tournaments:
        add_blocker("Connections", "no squad or tournament data")
        return 0
    used_clubs = set()
    used_tournaments = set()
    new_categories = []
    rows = []
    clubs = [c for c in squads.keys() if c not in SATURATED_CLUBS]
    if len(clubs) < 4:
        clubs = list(squads.keys())
    achievement_pool = list(ACHIEVEMENT_POOL)
    pid = start_id
    sort_order = start_sort
    max_iterations = n_puzzles * 10
    iterations = 0


    while len(rows) < n_puzzles and iterations < max_iterations:
        iterations += 1
        groups = []
        used_in_puzzle = set()

        candidates = [c for c in clubs if c not in used_clubs]
        if not candidates:
            used_clubs.clear()
            candidates = clubs
        club = random.choice(candidates)
        used_clubs.add(club)
        roster = [p for p in squads[club] if p not in used_in_puzzle]
        if len(roster) < 4:
            continue
        easy_players = random.sample(roster, 4)
        easy_cat = f"Current {club} stars (2025-26)"
        if easy_cat in baseline_categories:
            continue
        used_in_puzzle.update(easy_players)
        groups.append({"category": easy_cat, "players": easy_players, "difficulty": "easy"})

        tcandidates = [t for t in tournaments.keys() if t not in used_tournaments]
        if not tcandidates:
            used_tournaments.clear()
            tcandidates = list(tournaments.keys())
        tourn = random.choice(tcandidates)
        used_tournaments.add(tourn)
        nationality = TOURNAMENT_TO_NATIONALITY.get(tourn, "Unknown")
        med_pool = [p for p in tournaments[tourn] if p not in used_in_puzzle]
        if len(med_pool) < 4:
            continue
        med_players = random.sample(med_pool, 4)
        med_cat = f"Played for {nationality}"
        if med_cat in baseline_categories or med_cat == easy_cat:
            continue
        used_in_puzzle.update(med_players)
        groups.append({"category": med_cat, "players": med_players, "difficulty": "medium"})

        random.shuffle(achievement_pool)
        hard_picked = None
        for cat, players in achievement_pool:
            if cat in baseline_categories or cat in {easy_cat, med_cat}:
                continue
            if any(p in used_in_puzzle for p in players):
                continue
            hard_picked = (cat, players)
            break
        if not hard_picked:
            continue
        hard_cat, hard_players = hard_picked
        used_in_puzzle.update(hard_players)
        groups.append({"category": hard_cat, "players": hard_players, "difficulty": "hard"})

        insane_tcandidates = [t for t in tournaments.keys() if t != tourn]
        if not insane_tcandidates:
            continue
        insane_tourn = random.choice(insane_tcandidates)
        insane_pool = [p for p in tournaments[insane_tourn] if p not in used_in_puzzle]
        if len(insane_pool) < 4:
            continue
        insane_players = random.sample(insane_pool, 4)
        insane_cat = f"Won {insane_tourn.replace(' winners', '')}"
        if insane_cat in baseline_categories or insane_cat in {easy_cat, med_cat, hard_cat}:
            continue
        used_in_puzzle.update(insane_players)
        groups.append({"category": insane_cat, "players": insane_players, "difficulty": "insane"})

        groups_json = json.dumps({"groups": groups}, ensure_ascii=False)
        groups_json_sql = sql_escape(groups_json)
        rows.append(f"('puzzle-{pid}', {sort_order}, '{groups_json_sql}'::jsonb)")
        new_categories.extend([easy_cat, med_cat, hard_cat, insane_cat])
        pid += 1
        sort_order += 1

    if not rows:
        add_blocker("Connections", "could not assemble any puzzles after iterations")
        return 0

    sql = "INSERT INTO connections_puzzles (puzzle_id, sort_order, groups_json) VALUES\n"
    sql += ",\n".join(rows) + ";\n"
    write_migration("20260527_connections_batch_autopilot.sql", sql)

    with CONNECTIONS_BASELINE_PATH.open("a", encoding="utf-8") as f:
        for cat in new_categories:
            f.write(cat + "\n")

    log(f"Connections: generated {len(rows)} puzzles, {len(new_categories)} new categories")
    return len(rows)


def generate_shirt_number_puzzles(target_count=68):
    items = list(ICONIC_NUMBERS.items())
    random.shuffle(items)
    items = items[:target_count]
    if not items:
        add_blocker("Shirt Number", "no iconic numbers available")
        return 0
    rows = []
    for i, (player, number) in enumerate(items):
        player_sql = sql_escape(player)
        rows.append(f"('shirt-{600 + i}', '{player_sql}', {number})")
    sql = "INSERT INTO shirt_number_puzzles (puzzle_id, player_name, shirt_number) VALUES\n"
    sql += ",\n".join(rows) + ";\n"
    write_migration("20260527_shirt_number_batch_autopilot.sql", sql)
    log(f"Shirt Number: generated {len(rows)} puzzles")
    return len(rows)



# ===== GAMES: NFL family =====
NFL_TEAM_FACTS = {
    "Patriots": ["Won 6 Super Bowls in the Brady era", "Drafted Tom Brady in 2000 round 6", "Home stadium opened in 2002", "Coached by Bill Belichick 2000-2023"],
    "Chiefs": ["Won SB LIV LVII LVIII", "Patrick Mahomes drafted 10th overall 2017", "Arrowhead Stadium is one of the loudest in the NFL", "Coached by Andy Reid"],
    "Cowboys": ["Won 5 Super Bowls historically", "Owner Jerry Jones bought team in 1989", "Home games at ATT Stadium", "Last SB appearance 1995"],
    "49ers": ["Won 5 Super Bowls in the 80s and 90s", "Joe Montana led 4 SB wins", "Coached by Kyle Shanahan", "Levis Stadium opened 2014"],
    "Packers": ["Only publicly owned team in major US sports", "Won SB I and II under Lombardi", "Aaron Rodgers MVP 4 times", "Lambeau Field opened 1957"],
    "Steelers": ["Won 6 Super Bowls tied for most", "Steel Curtain defense of the 70s", "Mike Tomlin coach since 2007", "Heinz Field renamed Acrisure Stadium"],
    "Eagles": ["Won SB LII over Patriots", "Drafted Jalen Hurts 53rd overall 2020", "Lincoln Financial Field opened 2003", "First SB win 2018"],
    "Bills": ["Lost 4 consecutive Super Bowls 1991-1994", "Josh Allen drafted 7th overall 2018", "Home in Orchard Park", "Founded 1960 AFL"],
}

def generate_nfl_team_candidates():
    rows = []
    for team, facts in NFL_TEAM_FACTS.items():
        rows.append({"team": team, "clues": facts[:4]})
    out = {"generated": RUN_TIMESTAMP, "count": len(rows), "items": rows}
    path = CANDIDATES_DIR / "guess-nfl-team-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Guess NFL Team: {len(rows)} candidates written")
    return len(rows)


# ===== RED GAME NOTES HELPER =====
def write_red_game_notes(slug, title, current_count, target_notes, data_needs):
    lines = [
        f"# {title} -- autopilot notes",
        f"Generated: {RUN_TIMESTAMP}",
        "",
        "## Current state",
        f"- Current count: {current_count}",
        "- Inventory rating: see docs/GAMES_INVENTORY.md",
        "",
        "## Target work",
        target_notes,
        "",
        "## Data needed",
        data_needs,
        "",
        "## Suggested next step",
        "Supervised session: Anthony reviews this file, decides whether to scope a generator script or supplement existing data manually.",
    ]
    write_candidate(slug, "\n".join(lines) + "\n")


# ===== RED NOTES: NBA / baseball / hockey =====
def generate_nba_notes():
    write_red_game_notes("nba-chain", "NBA Chain", "Edge-function validated",
        "Redesign per Anthony spec P2-2: golf-style year selection requiring exact season overlap. Build roster-by-season Supabase table first.",
        "NBA team roster snapshots per season 2000-2026. ~30 teams x 26 seasons = 780 snapshots.")
    write_red_game_notes("nba-connect4", "NBA Connect 4", "Unknown hardcoded boards",
        "Expand to 50+ category combinations. Add Supabase Realtime for multiplayer. Validate pairs against actual NBA data.",
        "NBA player career stats with categorical flags. Currently in nba_players_extended_v2.")
    write_red_game_notes("nba-starting-5", "NBA Build Your Starting 5", "Dynamic hardcoded teams",
        "Fix evaluation error P0-5. Lock player positions to actual career positions. Add team-roster eligibility filter.",
        "Player career positions per franchise. Already in nba_players_extended_v2.")
    return 3

def generate_baseball_notes():
    write_red_game_notes("baseball-career", "Baseball Career", "~35 hardcoded",
        "Migrate to Supabase. Generate 50+ candidates using Lahman MLB tables.",
        "Lahman MLB tables already in Supabase 422K rows. Need ~50 notable players with season data.")
    write_red_game_notes("baseball-connections", "Baseball Connections", "~80 hardcoded",
        "Generate 50 candidates: 4 groups x 4 players. Categories: team, milestones, WS winners, born-in-X.",
        "Lahman MLB tables + curated achievement criteria.")
    return 2

def generate_hockey_notes():
    write_red_game_notes("hockey-career", "Hockey Career", "~38 hardcoded",
        "Migrate to Supabase. Generate candidates using nhl_draft table for notable picks.",
        "nhl_draft 26K rows plus career season data not yet sourced. Need ~40 notable players.")
    write_red_game_notes("hockey-hl", "Hockey Higher-Lower", "~45 hardcoded",
        "Expand to 200 player pool. Same Higher/Lower mechanic as soccer.",
        "NHL career stats. nhl_draft has draft picks. Need career goals/assists/games per player.")
    return 2

# ===== RED NOTES: F1 / UFC =====
def generate_f1_notes():
    write_red_game_notes("f1-driver", "F1 Driver", "~20 hardcoded",
        "Expand to 50 driver puzzles. Use Wikipedia or Ergast API for driver facts.",
        "Driver bio: birth year, nationality, teams, championships, debut, retirement, signature moments.")
    write_red_game_notes("f1-constructor", "F1 Constructor", "Unknown hardcoded",
        "Expand to 30 constructor puzzles. Championships, base, founders, famous drivers, era of dominance.",
        "Constructor history from Wikipedia. Founded year, championships, current and past drivers.")
    return 2

def generate_ufc_notes():
    write_red_game_notes("ufc-game", "UFC Game", "~112 hardcoded",
        "Expand fighter pool to 200+ using ufc_fights_v2 3917 rows. Wordle-style attribute guessing.",
        "Fighter attributes: nationality, division, stance, height, reach, age, win method profile.")
    write_red_game_notes("ufc-chain", "UFC Chain", "Unknown hardcoded",
        "Pre-generate chain start/end pairs from ufc_fights_v2 graph.",
        "Fight result graph via ufc_fights_v2 directed graph of who beat whom.")
    return 2


# ===== RED NOTES: remaining games =====
def generate_remaining_red_notes():
    games = [
        ("tennis-player", "Guess Tennis Player", "Unknown Supabase tennis_players",
         "Build ATP/WTA scraper - separate data pipeline needed.",
         "Tennis player bio + tournament wins. ATP API or Wikipedia."),
        ("tennis-chain", "Tennis Chain", "Edge function dynamic",
         "Edge function works. Could pre-generate seed pairs.", "Head-to-head match data."),
        ("nascar-driver", "Guess NASCAR Driver", "Unknown Supabase",
         "Build NASCAR scraper - separate data pipeline.", "Driver wins, manufacturer, era."),
        ("nascar-chain", "NASCAR Chain", "Edge function dynamic",
         "Edge function works. Could pre-generate seed pairs.", "Race result data."),
        ("guess-cbb-team", "Guess CBB Program", "Loading bug P0-4",
         "Fix loading state. Seed cbb_programs with 30+ D1 schools.",
         "D1 college basketball facts: conference, championships, famous alumni, arena."),
        ("guess-college", "Guess The College", "Unknown hardcoded",
         "P1-9: 15-30 facts per D1 school. Cover football and basketball powerhouses.",
         "Comprehensive D1 school facts: stadium, chant, alumni, history, conference."),
        ("olympics", "Olympics", "Unknown hardcoded",
         "Expand pool. Add more sports.", "Olympic athlete medals by Games."),
        ("conquest", "NFL Conquest", "Custom game mode",
         "Major redesign P1-7 P1-8: Voronoi state splits by city coords, side panel with standings.",
         "NFL team city coordinates, team primary colors, current team ratings."),
        ("hof-or-bust", "HOF or Bust", "~25 hardcoded",
         "Opinion game - not puzzle generation. Could expand player pool.",
         "Players debatable for HOF status across all sports."),
        ("score-predictor", "Score Predictor", "~35 hardcoded",
         "Source historical match scores from any sport. Add 50+ matches.",
         "Final scores from notable games. Could mine ESPN or sport-specific APIs."),
        ("guess-the-year", "Guess The Year", "~22 hardcoded",
         "Source 30 more famous sports events with year + 4 clues. Cover multiple sports.",
         "Notable sports events with date + identifying details."),
        ("higher-lower", "Higher or Lower Soccer", "~200 hardcoded",
         "Regenerate from top 500 of player_market_values. Could be a direct migration script.",
         "player_market_values table already has 176K rows ranked by year."),
        ("teammates", "Teammates", "~50 hardcoded pairs",
         "Generate 50+ pairs from career_seasons table where two players share a club-year.",
         "career_seasons table - find pairs where both players played for same team in same year."),
        ("football-connect4", "Football Connect 4 Soccer", "Edge function dynamic",
         "Edge function works. Pre-generate seed categories.", "Soccer player metadata."),
        ("world-cup", "World Cup", "~32 hardcoded",
         "Generate 28 candidates of WC fact puzzles.",
         "WC history: winners, top scorers, host countries, finals scores."),
        ("guess-nation", "Guess The Nation", "Unknown Supabase",
         "Expand to 80 countries. Use tournament rosters + curated facts.",
         "Country football history: famous players, captains, tournament results."),
        ("guess-soccer-club", "Guess Soccer Club", "82 in Supabase",
         "Add 68 more using docs/data/soccer-data.json clubs. 4 clues per club.",
         "Already have 38 club squads + club Wikipedia infoboxes."),
        ("footle", "Footle", "~150 active pool",
         "P2-4 expansion: top 150 by 2026 market value + iconic actives.",
         "player_market_values year=2026 rank<=150 + curated active legends list."),
        ("football-grid", "Football Grid NFL", "~105 hardcoded",
         "P0-1 P0-2 P0-3 fixes plus P1-3 rarity tiers and P1-12 unlimited mode. Migrate to Supabase.",
         "nflfastr_player_stats 134K rows + grid puzzle data."),
        ("college-grid", "College Grid", "~105 hardcoded",
         "Same retrofit pattern as football-grid.", "ncaa_player_stats 43K rows."),
        ("football-timeline", "Football Timeline", "~90 hardcoded",
         "P1-4 fix clearer instructions plus actual-draft-year display. Expand player pool.",
         "NFL player career milestones."),
        ("football-draft-guesser", "Football Draft Guesser", "~90 hardcoded",
         "P1-6 tiered scoring. Expand puzzle pool.", "NFL draft history."),
        ("nfl-career", "NFL Career", "~78 hardcoded",
         "Migrate to Supabase. Generate from nflfastr_player_stats.", "nflfastr_player_stats."),
        ("soccer-career", "Soccer Career", "Supabase backed",
         "Separate authoring track. Expand soccer_careers.", "Manual player research."),
        ("build-your-xi", "Build Your XI", "Tool",
         "Expansion: more team data, more historical squads.", "Soccer squad data by club and season."),
        ("fantasy-draft", "Fantasy Draft", "Supabase backed",
         "Expand player pool, add new sports.", "Player season stats across sports."),
        ("world-cup-bracket", "World Cup Bracket", "Supabase saved_brackets",
         "Tournament simulator - separate track.", "Tournament format, team rankings."),
        ("career", "Career Game", "151 players in Supabase",
         "Separate authoring track. Expand career_players + career_seasons rows.",
         "Player career season-by-season data. Manual research per player."),
    ]
    for slug, title, current, work, data in games:
        write_red_game_notes(slug, title, current, work, data)
    log(f"Red notes: wrote {len(games)} candidate note files")
    return len(games)



# ===== ORCHESTRATOR =====
def main():
    log(f"=== Autopilot run start {RUN_TIMESTAMP} ===")
    log(f"Seed: {RANDOM_SEED}")

    soccer_data = load_soccer_data()
    baseline_categories = load_baseline_categories()

    results = {}

    # GREEN games - real outputs
    log("--- GREEN GAMES ---")
    try:
        n = generate_connections_puzzles(soccer_data, baseline_categories, n_puzzles=115)
        results["Connections"] = f"{n} puzzles -> migration"
    except Exception as e:
        results["Connections"] = f"ERROR: {e}"
        add_blocker("Connections", f"unexpected error: {e}", "review traceback in log")
        log(f"Connections traceback:\n{traceback.format_exc()}")

    try:
        n = generate_shirt_number_puzzles(target_count=68)
        results["Shirt Number"] = f"{n} puzzles -> migration"
    except Exception as e:
        results["Shirt Number"] = f"ERROR: {e}"
        add_blocker("Shirt Number", f"unexpected error: {e}")
        log(f"Shirt Number traceback:\n{traceback.format_exc()}")

    # YELLOW games - candidates files
    log("--- YELLOW GAMES ---")
    try:
        n = generate_nfl_team_candidates()
        results["Guess NFL Team"] = f"{n} candidates"
    except Exception as e:
        results["Guess NFL Team"] = f"ERROR: {e}"

    # RED games - notes files
    log("--- RED GAMES ---")
    try:
        results["NBA Chain"] = "notes" if generate_nba_notes() else "skipped"
        results["Baseball"] = f"{generate_baseball_notes()} notes"
        results["Hockey"] = f"{generate_hockey_notes()} notes"
        results["F1"] = f"{generate_f1_notes()} notes"
        results["UFC"] = f"{generate_ufc_notes()} notes"
        results["Remaining RED"] = f"{generate_remaining_red_notes()} notes"
    except Exception as e:
        add_blocker("RED games", f"failure during notes generation: {e}")
        log(f"RED games traceback:\n{traceback.format_exc()}")


    # Real candidates generators added in MEGA5-9
    log("--- REAL CANDIDATES GENERATORS ---")
    try:
        n = generate_higher_lower_pool()
        results["Higher or Lower"] = str(n) + " players in pool"
    except Exception as e:
        results["Higher or Lower"] = "ERROR: " + str(e)
        add_blocker("Higher or Lower", "unexpected error: " + str(e))
        log("Higher or Lower traceback:" + traceback.format_exc())

    try:
        n = generate_teammates_candidates()
        results["Teammates"] = str(n) + " pairs"
    except Exception as e:
        results["Teammates"] = "ERROR: " + str(e)

    try:
        n = generate_guess_year_candidates()
        results["Guess The Year"] = str(n) + " candidates"
    except Exception as e:
        results["Guess The Year"] = "ERROR: " + str(e)

    try:
        n = generate_world_cup_candidates()
        results["World Cup"] = str(n) + " candidates"
    except Exception as e:
        results["World Cup"] = "ERROR: " + str(e)

    try:
        n = generate_nation_candidates()
        results["Guess The Nation"] = str(n) + " candidates"
    except Exception as e:
        results["Guess The Nation"] = "ERROR: " + str(e)

    try:
        n = generate_soccer_club_candidates()
        results["Guess Soccer Club"] = str(n) + " candidates"
    except Exception as e:
        results["Guess Soccer Club"] = "ERROR: " + str(e)

    try:
        n = generate_baseball_connections_candidates()
        results["Baseball Connections"] = str(n) + " candidates"
    except Exception as e:
        results["Baseball Connections"] = "ERROR: " + str(e)

    try:
        n = generate_baseball_career_candidates()
        results["Baseball Career"] = str(n) + " candidates"
    except Exception as e:
        results["Baseball Career"] = "ERROR: " + str(e)

    try:
        n = generate_hockey_career_candidates()
        results["Hockey Career"] = str(n) + " candidates"
    except Exception as e:
        results["Hockey Career"] = "ERROR: " + str(e)

    try:
        n = generate_hockey_hl_pool()
        results["Hockey HL"] = str(n) + " players"
    except Exception as e:
        results["Hockey HL"] = "ERROR: " + str(e)

    try:
        n = generate_f1_driver_candidates()
        results["F1 Driver"] = str(n) + " candidates"
    except Exception as e:
        results["F1 Driver"] = "ERROR: " + str(e)

    try:
        n = generate_ufc_fighter_candidates()
        results["UFC Fighter"] = str(n) + " candidates"
    except Exception as e:
        results["UFC Fighter"] = "ERROR: " + str(e)


    # MEGA11 + MEGA12 generators
    try:
        n = generate_extra_nfl_team_candidates()
        results["NFL Team EXTRA"] = str(n) + " more candidates"
    except Exception as e:
        results["NFL Team EXTRA"] = "ERROR: " + str(e)

    try:
        n = generate_f1_driver_candidates_extra()
        results["F1 Driver EXTRA"] = str(n) + " more candidates"
    except Exception as e:
        results["F1 Driver EXTRA"] = "ERROR: " + str(e)

    try:
        n = generate_soccer_club_candidates_extra()
        results["Soccer Club EXTRA"] = str(n) + " more candidates"
    except Exception as e:
        results["Soccer Club EXTRA"] = "ERROR: " + str(e)

    try:
        n = generate_score_predictor_candidates()
        results["Score Predictor"] = str(n) + " candidates"
    except Exception as e:
        results["Score Predictor"] = "ERROR: " + str(e)

    try:
        n = generate_college_candidates()
        results["Guess The College"] = str(n) + " candidates"
    except Exception as e:
        results["Guess The College"] = "ERROR: " + str(e)

    # Status summary
    log("=== Run summary ===")
    for game, outcome in results.items():
        log(f"  {game}: {outcome}")

    flush_log()
    flush_blockers()

    status_lines = [
        f"# Autopilot Run Status - {RUN_TIMESTAMP}",
        "",
        "Reason for halt: completion",
        f"Random seed: {RANDOM_SEED}",
        "",
        "## Games processed",
    ]
    for game, outcome in results.items():
        status_lines.append(f"- {game}: {outcome}")
    status_lines.extend([
        "",
        "## Migrations to apply (paste into Supabase in order)",
        "- supabase/migrations/20260527_connections_batch_autopilot.sql",
        "- supabase/migrations/20260527_shirt_number_batch_autopilot.sql",
        "",
        "## Candidates to review",
        "- docs/candidates/guess-nfl-team-candidates.json",
        "",
        "## Notes files to review",
        "- docs/candidates/*-notes.md (35+ files)",
        "",
        "## Blockers",
        f"See docs/BLOCKERS.md ({len(blockers)} items)",
        "",
        "## Next session priority",
        "Review candidates files, apply migrations, then tackle bug backlog (docs/BUG_AND_FEATURE_BACKLOG.md).",
        "",
    ])
    (ROOT / "docs" / "AUTOPILOT_STATUS.md").write_text("\n".join(status_lines), encoding="utf-8")
    log("Wrote docs/AUTOPILOT_STATUS.md")






# ===== REAL GENERATOR: Higher or Lower pool =====
HIGHER_LOWER_PLAYERS = [
    {"name": "Erling Haaland", "value": 200, "club": "Man City", "age": 25},
    {"name": "Kylian Mbappe", "value": 180, "club": "Real Madrid", "age": 27},
    {"name": "Jude Bellingham", "value": 180, "club": "Real Madrid", "age": 22},
    {"name": "Vinicius Junior", "value": 175, "club": "Real Madrid", "age": 25},
    {"name": "Lamine Yamal", "value": 160, "club": "Barcelona", "age": 18},
    {"name": "Bukayo Saka", "value": 140, "club": "Arsenal", "age": 24},
    {"name": "Florian Wirtz", "value": 140, "club": "Liverpool", "age": 22},
    {"name": "Phil Foden", "value": 135, "club": "Man City", "age": 25},
    {"name": "Pedri", "value": 130, "club": "Barcelona", "age": 22},
    {"name": "Rodri", "value": 130, "club": "Man City", "age": 29},
    {"name": "Cole Palmer", "value": 130, "club": "Chelsea", "age": 23},
    {"name": "Declan Rice", "value": 120, "club": "Arsenal", "age": 26},
    {"name": "Martin Odegaard", "value": 120, "club": "Arsenal", "age": 27},
    {"name": "Pau Cubarsi", "value": 110, "club": "Barcelona", "age": 18},
    {"name": "Gavi", "value": 110, "club": "Barcelona", "age": 21},
    {"name": "Federico Valverde", "value": 110, "club": "Real Madrid", "age": 27},
    {"name": "Mohamed Salah", "value": 50, "club": "Liverpool", "age": 33},
    {"name": "Harry Kane", "value": 90, "club": "Bayern Munich", "age": 32},
    {"name": "Kevin De Bruyne", "value": 45, "club": "Napoli", "age": 34},
    {"name": "Lionel Messi", "value": 30, "club": "Inter Miami", "age": 38},
    {"name": "Cristiano Ronaldo", "value": 15, "club": "Al Nassr", "age": 41},
    {"name": "Robert Lewandowski", "value": 25, "club": "Barcelona", "age": 37},
    {"name": "Neymar", "value": 30, "club": "Santos", "age": 33},
    {"name": "Luka Modric", "value": 8, "club": "AC Milan", "age": 40},
    {"name": "Jamal Musiala", "value": 140, "club": "Bayern Munich", "age": 22},
    {"name": "Alphonso Davies", "value": 70, "club": "Real Madrid", "age": 25},
    {"name": "Bruno Fernandes", "value": 65, "club": "Man Utd", "age": 31},
    {"name": "Son Heung-min", "value": 35, "club": "LAFC", "age": 33},
    {"name": "Antoine Griezmann", "value": 25, "club": "Atletico Madrid", "age": 34},
    {"name": "Dusan Vlahovic", "value": 50, "club": "Juventus", "age": 25},
    {"name": "Victor Osimhen", "value": 80, "club": "Galatasaray", "age": 26},
    {"name": "Khvicha Kvaratskhelia", "value": 100, "club": "PSG", "age": 25},
    {"name": "Rafael Leao", "value": 80, "club": "AC Milan", "age": 26},
    {"name": "Lautaro Martinez", "value": 90, "club": "Inter Milan", "age": 28},
    {"name": "Nicolo Barella", "value": 75, "club": "Inter Milan", "age": 28},
    {"name": "Marcus Rashford", "value": 50, "club": "Aston Villa", "age": 28},
    {"name": "Mason Mount", "value": 30, "club": "Man Utd", "age": 27},
    {"name": "Eduardo Camavinga", "value": 90, "club": "Real Madrid", "age": 22},
    {"name": "Aurelien Tchouameni", "value": 85, "club": "Real Madrid", "age": 25},
    {"name": "Rodrygo", "value": 110, "club": "Real Madrid", "age": 24},
    {"name": "Endrick", "value": 50, "club": "Real Madrid", "age": 19},
    {"name": "Arda Guler", "value": 70, "club": "Real Madrid", "age": 20},
    {"name": "Franco Mastantuono", "value": 50, "club": "Real Madrid", "age": 18},
    {"name": "Joao Neves", "value": 95, "club": "PSG", "age": 21},
    {"name": "Vitinha", "value": 100, "club": "PSG", "age": 25},
    {"name": "Achraf Hakimi", "value": 75, "club": "PSG", "age": 27},
    {"name": "Bradley Barcola", "value": 90, "club": "PSG", "age": 23},
    {"name": "Desire Doue", "value": 95, "club": "PSG", "age": 20},
    {"name": "Ousmane Dembele", "value": 65, "club": "PSG", "age": 28},
]

def generate_higher_lower_pool():
    ts_lines = ["// Auto-generated by autopilot-all-games.py"]
    ts_lines.append("export interface HLPlayer {")
    ts_lines.append("  name: string;")
    ts_lines.append("  value: number;")
    ts_lines.append("  club: string;")
    ts_lines.append("  age: number;")
    ts_lines.append("}")
    ts_lines.append("")
    ts_lines.append("export const higherLowerPlayers: HLPlayer[] = [")
    for p in HIGHER_LOWER_PLAYERS:
        ts_lines.append(f'  {{ name: "{p["name"]}", value: {p["value"]}, club: "{p["club"]}", age: {p["age"]} }},')
    ts_lines.append("];")
    content = "\n".join(ts_lines) + "\n"
    path = CANDIDATES_DIR / "higher-lower-pool.ts"
    path.write_text(content, encoding="utf-8")
    log(f"Higher or Lower: wrote {len(HIGHER_LOWER_PLAYERS)} players to {path}")
    return len(HIGHER_LOWER_PLAYERS)


# ===== REAL GENERATOR: Teammates pairs =====
TEAMMATE_PAIRS = [
    ("Lionel Messi", "Luis Suarez", "Barcelona", "2014-2020", True),
    ("Lionel Messi", "Neymar", "Barcelona", "2013-2017", True),
    ("Cristiano Ronaldo", "Karim Benzema", "Real Madrid", "2009-2018", True),
    ("Cristiano Ronaldo", "Gareth Bale", "Real Madrid", "2013-2018", True),
    ("Erling Haaland", "Jude Bellingham", "Borussia Dortmund", "2022-2023", True),
    ("Kevin De Bruyne", "Vincent Kompany", "Man City", "2015-2019", True),
    ("Mohamed Salah", "Sadio Mane", "Liverpool", "2017-2022", True),
    ("Mohamed Salah", "Roberto Firmino", "Liverpool", "2017-2023", True),
    ("Kylian Mbappe", "Neymar", "PSG", "2017-2023", True),
    ("Sergio Aguero", "Yaya Toure", "Man City", "2011-2018", True),
    ("Frank Lampard", "John Terry", "Chelsea", "2004-2014", True),
    ("Steven Gerrard", "Fernando Torres", "Liverpool", "2007-2011", True),
    ("Wayne Rooney", "Cristiano Ronaldo", "Man Utd", "2004-2009", True),
    ("Thierry Henry", "Patrick Vieira", "Arsenal", "1999-2005", True),
    ("Andres Iniesta", "Xavi Hernandez", "Barcelona", "2003-2015", True),
    ("Lionel Messi", "Cristiano Ronaldo", "any", "never", False),
    ("Erling Haaland", "Kylian Mbappe", "any", "never", False),
]

def generate_teammates_candidates():
    rows = []
    for a, b, club, era, played in TEAMMATE_PAIRS:
        rows.append({"player_a": a, "player_b": b, "club": club, "era": era, "were_teammates": played})
    out = {"generated": RUN_TIMESTAMP, "count": len(rows), "items": rows}
    path = CANDIDATES_DIR / "teammates-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Teammates: wrote {len(rows)} pairs to {path}")
    return len(rows)



# ===== REAL GENERATOR: Guess The Year =====
GUESS_YEAR_EVENTS = [
    {"year": 1986, "clues": ["Maradona Hand of God goal", "Argentina beat England 2-1 in quarterfinal", "Tournament in Mexico", "Argentina won the World Cup"]},
    {"year": 1999, "clues": ["Treble winners in Europe", "Solskjaer late goal in Barcelona", "Sir Alex Ferguson English club", "Man Utd beat Bayern in the final"]},
    {"year": 2005, "clues": ["3-0 down at half time", "Steven Gerrard captained Liverpool", "Comeback in Istanbul", "Liverpool beat AC Milan on penalties"]},
    {"year": 2012, "clues": ["Aguero scored the title goal", "Last minute winner against QPR", "Man City won the Premier League", "First PL title for City"]},
    {"year": 2014, "clues": ["7-1 semifinal scoreline", "Germany destroyed the hosts", "Tournament in Brazil", "Germany won the World Cup against Argentina"]},
    {"year": 2016, "clues": ["5000-1 odds at start of season", "Claudio Ranieri was the manager", "Jamie Vardy record run", "Leicester won the Premier League"]},
    {"year": 2018, "clues": ["VAR debuted at the World Cup", "Mbappe scored against Argentina", "Tournament in Russia", "France won the World Cup against Croatia"]},
    {"year": 2020, "clues": ["Tournament held in 2021 due to COVID", "Italy beat England on penalties", "Wembley hosted the final", "Italy won Euro 2020"]},
    {"year": 2022, "clues": ["Tournament in Qatar in November", "Mbappe hat-trick in the final", "Penalty shootout against France", "Argentina won the World Cup with Messi"]},
    {"year": 2024, "clues": ["Tournament in Germany", "Spain won 2-1 over England", "Yamal teenage star of the tournament", "Spain won Euro 2024"]},
    {"year": 2002, "clues": ["First WC in Asia", "Korea Japan co-hosted", "Ronaldo Nazario won Golden Boot", "Brazil won the World Cup 2-0 over Germany"]},
    {"year": 1994, "clues": ["WC in the United States", "Final settled on penalties", "Baggio missed the decisive kick", "Brazil won over Italy"]},
    {"year": 2010, "clues": ["First WC on African soil", "Iniesta scored in extra time", "Spain beat Netherlands 1-0", "Spain won their first World Cup"]},
    {"year": 2008, "clues": ["Spain ended 44-year trophy drought", "Tournament in Austria Switzerland", "Torres scored the winner vs Germany", "Spain won Euro 2008"]},
    {"year": 2017, "clues": ["Neymar transfer fee 222 million euros", "PSG-Barcelona historic deal", "Highest transfer fee in history", "Summer 2017"]},
    {"year": 2003, "clues": ["Beckham left Man Utd", "Joined Real Madrid Galacticos era", "Florentino Perez first stint", "Summer 2003"]},
    {"year": 2009, "clues": ["6-2 Real Madrid loss to Barcelona", "Guardiola first treble season", "Iniesta and Xavi midfield", "Barcelona won the treble"]},
    {"year": 2007, "clues": ["Kaka won the Ballon dOr", "AC Milan won Champions League", "Beat Liverpool 2-1 in Athens", "End of Brazilian number 10 era"]},
    {"year": 2013, "clues": ["All-German Champions League final", "Robben scored late winner", "Heynckes treble for Bayern", "Bayern beat Dortmund 2-1"]},
    {"year": 2015, "clues": ["Barcelona MSN front three", "Suarez first season at Barca", "Won the treble", "Beat Juventus in Berlin"]},
    {"year": 2019, "clues": ["Liverpool 4-0 second leg comeback", "Origi double vs Barcelona", "Klopp first major trophy", "Liverpool won Champions League"]},
    {"year": 2021, "clues": ["Messi to PSG", "First time leaving Barcelona", "Trio with Mbappe and Neymar", "August transfer of the decade"]},
    {"year": 2023, "clues": ["Man City finally won UCL", "Pep Guardiola treble", "Beat Inter 1-0 in Istanbul", "Rodri scored the winner"]},
    {"year": 2006, "clues": ["Zidane headbutt on Materazzi", "Tournament in Germany", "Italy won on penalties", "Cannavaro lifted the trophy"]},
    {"year": 1990, "clues": ["WC in Italy", "Gascoigne tears for England", "Germany beat Argentina 1-0", "Brehme penalty in the final"]},
    {"year": 1998, "clues": ["First French WC win", "Zidane two headers in final", "Brazil Ronaldo benched in final", "France beat Brazil 3-0"]},
    {"year": 2011, "clues": ["Barcelona 3-1 Man Utd at Wembley", "Pep second UCL trophy", "Messi tap-in in the final", "Best Barcelona team ever"]},
    {"year": 2025, "clues": ["Club World Cup new format", "32 teams in USA", "Chelsea won the title", "Cole Palmer star of the tournament"]},
]

def generate_guess_year_candidates():
    items = [{"year": ev["year"], "clues": ev["clues"]} for ev in GUESS_YEAR_EVENTS]
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "guess-year-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Guess The Year: wrote {len(items)} candidates to {path}")
    return len(items)


# ===== REAL GENERATOR: World Cup =====
WORLD_CUP_FACTS = [
    {"year": 1930, "host": "Uruguay", "winner": "Uruguay", "clues": ["First-ever World Cup", "Hosted in South America", "Final 4-2", "Hosts won the trophy"]},
    {"year": 1950, "host": "Brazil", "winner": "Uruguay", "clues": ["Maracanazo upset", "Brazil hosted but lost final", "Decided in final group game", "Uruguay shocked the world"]},
    {"year": 1958, "host": "Sweden", "winner": "Brazil", "clues": ["Pele debut WC at 17", "First Brazilian title", "Hosted in Scandinavia", "Brazil 5-2 Sweden"]},
    {"year": 1962, "host": "Chile", "winner": "Brazil", "clues": ["Brazil back-to-back champions", "Garrincha tournament star", "Pele injured early", "Hosted in South America"]},
    {"year": 1966, "host": "England", "winner": "England", "clues": ["Only English WC win", "Bobby Moore captained", "Hurst hat-trick in final", "3-2 over Germany"]},
    {"year": 1970, "host": "Mexico", "winner": "Brazil", "clues": ["Greatest WC team ever debated", "Pele third title", "First color TV broadcast", "Brazil 4-1 Italy"]},
    {"year": 1974, "host": "West Germany", "winner": "West Germany", "clues": ["Beckenbauer captained the hosts", "Cruyff led Netherlands", "Cruyff turn invented", "West Germany 2-1 Netherlands"]},
    {"year": 1978, "host": "Argentina", "winner": "Argentina", "clues": ["First Argentine title", "Kempes top scorer", "Hosted in Buenos Aires", "Argentina 3-1 Netherlands"]},
    {"year": 1982, "host": "Spain", "winner": "Italy", "clues": ["Paolo Rossi top scorer", "Italy third title", "Hosted in Iberia", "Italy 3-1 West Germany"]},
    {"year": 2026, "host": "USA Canada Mexico", "winner": "TBD", "clues": ["Three-nation hosting", "First 48-team World Cup", "Final at MetLife Stadium", "Largest WC ever"]},
]

def generate_world_cup_candidates():
    items = [{"year": f["year"], "host": f["host"], "winner": f["winner"], "clues": f["clues"]} for f in WORLD_CUP_FACTS]
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "world-cup-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"World Cup: wrote {len(items)} candidates to {path}")
    return len(items)



# ===== REAL GENERATOR: Guess The Nation =====
NATION_FACTS = [
    {"country": "Argentina", "clues": ["Won 3 World Cups 1978 1986 2022", "Home stadium is the Monumental in Buenos Aires", "Famous for Messi and Maradona", "South American national team"]},
    {"country": "Brazil", "clues": ["Won 5 World Cups most by any nation", "Yellow and green kit colors", "Maracana is their iconic stadium", "Pele Ronaldo Neymar all played for them"]},
    {"country": "France", "clues": ["Won World Cups in 1998 and 2018", "Mbappe and Zidane are their stars", "Hosted Euro 2016", "Les Bleus is their nickname"]},
    {"country": "Germany", "clues": ["Won 4 World Cups", "Reunified team after 1990", "Won 7-1 vs Brazil in 2014 semifinal", "Bayern Munich provides many players"]},
    {"country": "Spain", "clues": ["Won World Cup 2010 and Euros 2008 2012 2024", "Tiki-taka style associated with them", "Yamal star of Euro 2024", "Won 4 of last 5 European Championships"]},
    {"country": "Italy", "clues": ["Won 4 World Cups", "Azzurri is their nickname", "Won Euro 2020", "Famous for catenaccio defensive style"]},
    {"country": "England", "clues": ["Won only one World Cup in 1966", "Lost Euro 2020 final on penalties", "Three Lions on shirt", "Home of football"]},
    {"country": "Portugal", "clues": ["Won Euro 2016 and Nations League 2019", "Ronaldo is their all-time top scorer", "Lost only WC final in 1966", "Mediterranean country"]},
    {"country": "Netherlands", "clues": ["3-time WC runners-up never won", "Total Football pioneered by Cruyff", "Orange kit", "Lost 1974 1978 2010 finals"]},
    {"country": "Croatia", "clues": ["2018 WC finalists", "Population under 5 million", "Checkered red-and-white kit", "Modric and Rakitic generation"]},
    {"country": "Morocco", "clues": ["First African team in WC semifinal 2022", "Coached by Walid Regragui", "Atlas Lions nickname", "Hakimi at PSG"]},
    {"country": "Senegal", "clues": ["Won AFCON 2021", "Sadio Mane is their star", "Lions of Teranga nickname", "Reached 2002 WC quarterfinal"]},
    {"country": "Mexico", "clues": ["Hosted WC 1970 1986 2026", "Played in 17 World Cups total", "El Tri nickname", "Estadio Azteca legendary"]},
    {"country": "Japan", "clues": ["Beat Germany AND Spain in 2022 WC group", "Samurai Blue nickname", "Co-hosted 2002 WC", "Asian football powerhouse"]},
    {"country": "USA", "clues": ["Co-hosting 2026 WC", "Beat England 1-0 in 1950 upset", "Women team won 4 WCs", "Reyna Pulisic generation"]},
    {"country": "Belgium", "clues": ["3rd at 2018 WC", "Golden Generation Hazard De Bruyne Lukaku", "Red Devils nickname", "Beat Brazil 2-1 in 2018"]},
    {"country": "Uruguay", "clues": ["Won first WC in 1930", "Population 3 million", "La Celeste nickname", "Suarez and Cavani strikers"]},
    {"country": "Colombia", "clues": ["James Rodriguez emerged at 2014 WC", "Lost 2024 Copa final to Argentina", "Yellow kit with blue accents", "Falcao all-time top scorer"]},
    {"country": "Chile", "clues": ["Won back-to-back Copa Americas 2015 2016", "Vidal and Alexis generation", "Long thin South American country", "Hosted 1962 WC"]},
    {"country": "Switzerland", "clues": ["Eliminated France at Euro 2020", "Red kit with white cross", "Granit Xhaka captains", "Consistent WC qualifier"]},
    {"country": "Denmark", "clues": ["Won Euro 1992 as last-minute entrants", "Christian Eriksen cardiac arrest 2021", "Red and white Dannebrog", "Schmeichel goalkeeper legacy"]},
    {"country": "Poland", "clues": ["Robert Lewandowski all-time top scorer", "Eagles nickname", "Reached 1974 WC semifinal", "Bayern all-time top European scorer"]},
    {"country": "Serbia", "clues": ["Independent national team since 2006", "Vlahovic and Mitrovic strikers", "Eagles nickname", "Reached 2022 WC"]},
    {"country": "Czech Republic", "clues": ["Reached Euro 1996 final", "Pavel Nedved 2003 Ballon dOr", "Now called Czechia", "Reached Euro 2004 semifinal"]},
    {"country": "Ghana", "clues": ["Suarez handball at 2010 WC", "Black Stars nickname", "Reached WC quarterfinal 2010", "Asamoah Gyan all-time top scorer"]},
    {"country": "Nigeria", "clues": ["3-time AFCON champions", "Super Eagles nickname", "Olympic gold 1996", "Osimhen current star striker"]},
    {"country": "Egypt", "clues": ["7-time AFCON champions", "Mohamed Salah country", "Pharaohs nickname", "Lost 2017 AFCON final"]},
    {"country": "Algeria", "clues": ["AFCON 2019 winners", "Beat Germany 2-1 in 1982 WC", "Riyad Mahrez stars", "Desert Foxes nickname"]},
    {"country": "Australia", "clues": ["Reached 2022 WC round of 16", "Socceroos nickname", "Asian Football Confederation member", "Tim Cahill all-time top scorer"]},
    {"country": "Saudi Arabia", "clues": ["Beat Argentina 2-1 at 2022 WC", "Hosts the Saudi Pro League", "Green Falcons nickname", "Ronaldo plays for Al Nassr"]},
    {"country": "South Korea", "clues": ["Reached 2002 WC semifinal", "Son Heung-min plays for LAFC", "Co-hosted 2002 WC", "Red Devils nickname"]},
    {"country": "Wales", "clues": ["Reached Euro 2016 semifinal", "Gareth Bale led generation", "Red Dragons nickname", "Returned to WC in 2022"]},
    {"country": "Ecuador", "clues": ["Qualified for 2002 2006 2014 2022 WCs", "La Tri nickname", "Capital Quito at altitude", "Moises Caicedo at Chelsea"]},
]

def generate_nation_candidates():
    items = [{"country": n["country"], "clues": n["clues"]} for n in NATION_FACTS]
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "guess-nation-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Guess The Nation: wrote {len(items)} candidates to {path}")
    return len(items)



# ===== REAL GENERATOR: Guess Soccer Club =====
SOCCER_CLUB_FACTS = [
    {"club": "Real Madrid", "founded": 1902, "league": "La Liga", "colors": "White", "city": "Madrid", "famous": "Cristiano Ronaldo Bellingham Mbappe", "trophies": "15 UCL titles"},
    {"club": "Barcelona", "founded": 1899, "league": "La Liga", "colors": "Blue and red stripes", "city": "Barcelona", "famous": "Messi spent 21 years here", "trophies": "5 UCL titles"},
    {"club": "Bayern Munich", "founded": 1900, "league": "Bundesliga", "colors": "Red and white", "city": "Munich", "famous": "Robert Lewandowski 41 goals in a season", "trophies": "33 Bundesliga titles"},
    {"club": "Manchester United", "founded": 1878, "league": "Premier League", "colors": "Red and white", "city": "Manchester", "famous": "Sir Alex Ferguson 26 years as manager", "trophies": "20 league titles"},
    {"club": "Manchester City", "founded": 1880, "league": "Premier League", "colors": "Sky blue", "city": "Manchester", "famous": "Pep Guardiola era", "trophies": "Treble in 2023"},
    {"club": "Liverpool", "founded": 1892, "league": "Premier League", "colors": "Red", "city": "Liverpool", "famous": "Mohamed Salah Anfield", "trophies": "6 UCL titles"},
    {"club": "Arsenal", "founded": 1886, "league": "Premier League", "colors": "Red and white", "city": "London", "famous": "Invincibles 2003-04 unbeaten season", "trophies": "13 league titles"},
    {"club": "Chelsea", "founded": 1905, "league": "Premier League", "colors": "Blue", "city": "London", "famous": "Roman Abramovich era", "trophies": "2 UCL titles 2012 and 2021"},
    {"club": "Tottenham", "founded": 1882, "league": "Premier League", "colors": "White and navy", "city": "London", "famous": "Harry Kane all-time top scorer", "trophies": "Reached 2019 UCL final"},
    {"club": "PSG", "founded": 1970, "league": "Ligue 1", "colors": "Blue and red", "city": "Paris", "famous": "Mbappe Neymar Messi trio", "trophies": "11 Ligue 1 titles"},
    {"club": "Juventus", "founded": 1897, "league": "Serie A", "colors": "Black and white", "city": "Turin", "famous": "Stripes from Notts County", "trophies": "9 consecutive league titles 2012-2020"},
    {"club": "AC Milan", "founded": 1899, "league": "Serie A", "colors": "Red and black stripes", "city": "Milan", "famous": "7 UCL titles second most ever", "trophies": "Rossoneri nickname"},
    {"club": "Inter Milan", "founded": 1908, "league": "Serie A", "colors": "Blue and black stripes", "city": "Milan", "famous": "Nerazzurri nickname", "trophies": "20 Serie A titles"},
    {"club": "Atletico Madrid", "founded": 1903, "league": "La Liga", "colors": "Red and white stripes", "city": "Madrid", "famous": "Diego Simeone since 2011", "trophies": "Won La Liga 2014 and 2021"},
    {"club": "Borussia Dortmund", "founded": 1909, "league": "Bundesliga", "colors": "Yellow and black", "city": "Dortmund", "famous": "Yellow Wall fan section", "trophies": "Won UCL 1997"},
    {"club": "Ajax", "founded": 1900, "league": "Eredivisie", "colors": "Red and white", "city": "Amsterdam", "famous": "Cruyff developed Total Football here", "trophies": "4 UCL titles"},
    {"club": "Porto", "founded": 1893, "league": "Primeira Liga", "colors": "Blue and white", "city": "Porto", "famous": "Won UCL 2004 under Mourinho", "trophies": "2 UCL titles"},
    {"club": "Benfica", "founded": 1904, "league": "Primeira Liga", "colors": "Red and white", "city": "Lisbon", "famous": "Eusebio club legend", "trophies": "2 UCL titles in early 60s"},
    {"club": "Celtic", "founded": 1887, "league": "Scottish Premiership", "colors": "Green and white hoops", "city": "Glasgow", "famous": "Lisbon Lions won UCL 1967", "trophies": "First British UCL winners"},
    {"club": "Rangers", "founded": 1872, "league": "Scottish Premiership", "colors": "Blue", "city": "Glasgow", "famous": "Old Firm rivalry with Celtic", "trophies": "55 league titles"},
]

def generate_soccer_club_candidates():
    items = []
    for c in SOCCER_CLUB_FACTS:
        clues = [
            "Founded in " + str(c["founded"]),
            "Plays in " + c["league"],
            "Home colors: " + c["colors"],
            "Based in " + c["city"],
            "Famous for: " + c["famous"],
            "Notable: " + c["trophies"],
        ]
        items.append({"club": c["club"], "clues": clues})
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "soccer-club-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Guess Soccer Club: wrote {len(items)} candidates to {path}")
    return len(items)



# ===== REAL GENERATOR: Baseball Connections =====
BASEBALL_GROUPS = [
    {"category": "Yankees Hall of Famers", "players": ["Derek Jeter", "Mariano Rivera", "Babe Ruth", "Lou Gehrig"], "difficulty": "easy"},
    {"category": "Red Sox Hall of Famers", "players": ["David Ortiz", "Pedro Martinez", "Ted Williams", "Carl Yastrzemski"], "difficulty": "easy"},
    {"category": "Dodgers legends", "players": ["Clayton Kershaw", "Sandy Koufax", "Jackie Robinson", "Mookie Betts"], "difficulty": "easy"},
    {"category": "Giants legends", "players": ["Willie Mays", "Barry Bonds", "Buster Posey", "Willie McCovey"], "difficulty": "easy"},
    {"category": "Born in Dominican Republic", "players": ["David Ortiz", "Albert Pujols", "Pedro Martinez", "Manny Ramirez"], "difficulty": "medium"},
    {"category": "Born in Venezuela", "players": ["Miguel Cabrera", "Felix Hernandez", "Jose Altuve", "Ronald Acuna Jr"], "difficulty": "medium"},
    {"category": "Won the Cy Young 3+ times", "players": ["Roger Clemens", "Randy Johnson", "Greg Maddux", "Max Scherzer"], "difficulty": "hard"},
    {"category": "500+ career home runs", "players": ["Albert Pujols", "Alex Rodriguez", "Jim Thome", "David Ortiz"], "difficulty": "hard"},
    {"category": "Won an MVP and a World Series", "players": ["Mookie Betts", "Bryce Harper", "Aaron Judge", "Jose Altuve"], "difficulty": "hard"},
    {"category": "Threw a perfect game", "players": ["Sandy Koufax", "Felix Hernandez", "Roy Halladay", "Don Larsen"], "difficulty": "insane"},
    {"category": "Won the Triple Crown", "players": ["Miguel Cabrera", "Carl Yastrzemski", "Mickey Mantle", "Ted Williams"], "difficulty": "insane"},
    {"category": "Hit 4 home runs in a single game", "players": ["Mike Schmidt", "Lou Gehrig", "Mark Whiten", "Carlos Delgado"], "difficulty": "insane"},
]

def generate_baseball_connections_candidates():
    items = []
    random.shuffle(BASEBALL_GROUPS)
    chunks = [BASEBALL_GROUPS[i:i+4] for i in range(0, len(BASEBALL_GROUPS), 4) if i + 4 <= len(BASEBALL_GROUPS)]
    for puzzle_idx, group_set in enumerate(chunks):
        items.append({"puzzle_id": "bb-conn-" + str(81 + puzzle_idx), "groups": group_set})
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "baseball-connections-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Baseball Connections: wrote " + str(len(items)) + " candidate puzzles")
    return len(items)


# ===== REAL GENERATOR: Baseball Career =====
BASEBALL_CAREER_PLAYERS = [
    {"name": "Mike Trout", "teams": "Angels (2011-present)", "primary_position": "CF", "milestones": "3x MVP, 11x All-Star"},
    {"name": "Aaron Judge", "teams": "Yankees (2016-present)", "primary_position": "RF", "milestones": "62 HR in 2022 season"},
    {"name": "Shohei Ohtani", "teams": "Angels 2018-2023, Dodgers 2024-present", "primary_position": "DH/P", "milestones": "Won MVPs in both leagues"},
    {"name": "Mookie Betts", "teams": "Red Sox 2014-2019, Dodgers 2020-present", "primary_position": "RF/2B", "milestones": "2018 MVP, 2x WS champion"},
    {"name": "Freddie Freeman", "teams": "Braves 2010-2021, Dodgers 2022-present", "primary_position": "1B", "milestones": "2020 MVP, 2x WS champion"},
    {"name": "Jose Altuve", "teams": "Astros (2011-present)", "primary_position": "2B", "milestones": "2017 MVP, 2x WS champion"},
    {"name": "Ronald Acuna Jr", "teams": "Braves (2018-present)", "primary_position": "RF", "milestones": "2023 NL MVP, 40-70 season"},
    {"name": "Bryce Harper", "teams": "Nationals 2012-2018, Phillies 2019-present", "primary_position": "RF/1B", "milestones": "2x MVP"},
    {"name": "Juan Soto", "teams": "Nationals 2018-2022, Padres 2022-2023, Yankees 2024, Mets 2025-present", "primary_position": "RF", "milestones": "2019 WS champion at 20 years old"},
    {"name": "Fernando Tatis Jr", "teams": "Padres (2019-present)", "primary_position": "SS/RF", "milestones": "First in MLB to sign 14-year deal"},
    {"name": "Vladimir Guerrero Jr", "teams": "Blue Jays (2019-present)", "primary_position": "1B", "milestones": "2021 HR derby champion"},
    {"name": "Yordan Alvarez", "teams": "Astros (2019-present)", "primary_position": "LF/DH", "milestones": "2022 WS champion, ALCS MVP"},
    {"name": "Trea Turner", "teams": "Nationals 2015-2021, Dodgers 2021, Phillies 2023-present", "primary_position": "SS", "milestones": "Cycle hit and stolen base champ"},
    {"name": "Manny Machado", "teams": "Orioles 2012-2018, Dodgers 2018, Padres 2019-present", "primary_position": "3B", "milestones": "11-year $350M contract with Padres"},
    {"name": "Francisco Lindor", "teams": "Cleveland 2015-2020, Mets 2021-present", "primary_position": "SS", "milestones": "All-Star at multiple positions"},
]

def generate_baseball_career_candidates():
    items = list(BASEBALL_CAREER_PLAYERS)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "baseball-career-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Baseball Career: wrote " + str(len(items)) + " player candidates")
    return len(items)



# ===== REAL GENERATOR: Hockey Career =====
HOCKEY_CAREER_PLAYERS = [
    {"name": "Connor McDavid", "teams": "Edmonton Oilers (2015-present)", "position": "C", "milestones": "3x Hart Trophy, 5x Art Ross"},
    {"name": "Nathan MacKinnon", "teams": "Colorado Avalanche (2013-present)", "position": "C", "milestones": "2022 Stanley Cup, 2024 Hart"},
    {"name": "Auston Matthews", "teams": "Toronto Maple Leafs (2016-present)", "position": "C", "milestones": "60-goal season 2021-22"},
    {"name": "Sidney Crosby", "teams": "Pittsburgh Penguins (2005-present)", "position": "C", "milestones": "3x Stanley Cup, 2x Olympic gold"},
    {"name": "Alex Ovechkin", "teams": "Washington Capitals (2005-present)", "position": "LW", "milestones": "All-time goals leader 2025"},
    {"name": "Leon Draisaitl", "teams": "Edmonton Oilers (2014-present)", "position": "C", "milestones": "2020 Hart Trophy"},
    {"name": "David Pastrnak", "teams": "Boston Bruins (2014-present)", "position": "RW", "milestones": "60-goal scorer"},
    {"name": "Cale Makar", "teams": "Colorado Avalanche (2019-present)", "position": "D", "milestones": "Norris Trophy, Conn Smythe 2022"},
    {"name": "Igor Shesterkin", "teams": "New York Rangers (2019-present)", "position": "G", "milestones": "2022 Vezina Trophy"},
    {"name": "Patrick Kane", "teams": "Chicago Blackhawks 2007-2023, Detroit Red Wings 2023-present", "position": "RW", "milestones": "3x Stanley Cup"},
    {"name": "Jonathan Toews", "teams": "Chicago Blackhawks (2007-2023)", "position": "C", "milestones": "3x Stanley Cup captain"},
    {"name": "Mark Stone", "teams": "Senators 2012-2019, Golden Knights 2019-present", "position": "RW", "milestones": "2023 Stanley Cup captain"},
    {"name": "Mikko Rantanen", "teams": "Colorado 2015-2025, Carolina 2025, Dallas 2025-present", "position": "RW", "milestones": "2022 Stanley Cup"},
    {"name": "Mitch Marner", "teams": "Toronto Maple Leafs (2016-present)", "position": "RW", "milestones": "100-point seasons"},
    {"name": "Quinn Hughes", "teams": "Vancouver Canucks (2018-present)", "position": "D", "milestones": "2024 Norris Trophy"},
]

def generate_hockey_career_candidates():
    items = list(HOCKEY_CAREER_PLAYERS)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "hockey-career-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Hockey Career: wrote " + str(len(items)) + " player candidates")
    return len(items)


# ===== REAL GENERATOR: Hockey Higher or Lower =====
HOCKEY_HL_PLAYERS = [
    {"name": "Connor McDavid", "goals": 359, "assists": 638, "games": 660},
    {"name": "Sidney Crosby", "goals": 592, "assists": 1057, "games": 1278},
    {"name": "Alex Ovechkin", "goals": 875, "assists": 731, "games": 1466},
    {"name": "Nathan MacKinnon", "goals": 379, "assists": 595, "games": 850},
    {"name": "Auston Matthews", "goals": 401, "assists": 280, "games": 627},
    {"name": "Leon Draisaitl", "goals": 348, "assists": 569, "games": 749},
    {"name": "David Pastrnak", "goals": 354, "assists": 412, "games": 743},
    {"name": "Mitch Marner", "goals": 234, "assists": 535, "games": 681},
    {"name": "Mikko Rantanen", "goals": 295, "assists": 410, "games": 645},
    {"name": "Patrick Kane", "goals": 472, "assists": 819, "games": 1244},
    {"name": "Steven Stamkos", "goals": 568, "assists": 612, "games": 1182},
    {"name": "Evgeni Malkin", "goals": 481, "assists": 824, "games": 1239},
    {"name": "Jonathan Toews", "goals": 372, "assists": 511, "games": 1067},
    {"name": "John Tavares", "goals": 491, "assists": 614, "games": 1187},
    {"name": "Brad Marchand", "goals": 422, "assists": 547, "games": 1085},
    {"name": "Artemi Panarin", "goals": 271, "assists": 480, "games": 658},
    {"name": "Cale Makar", "goals": 92, "assists": 285, "games": 391},
    {"name": "Quinn Hughes", "goals": 71, "assists": 366, "games": 428},
    {"name": "Adam Fox", "goals": 64, "assists": 285, "games": 394},
    {"name": "Igor Shesterkin", "goals": 0, "assists": 12, "games": 252},
    {"name": "Andrei Vasilevskiy", "goals": 0, "assists": 16, "games": 568},
    {"name": "Connor Hellebuyck", "goals": 0, "assists": 14, "games": 593},
    {"name": "Linus Ullmark", "goals": 0, "assists": 9, "games": 322},
    {"name": "Jake Oettinger", "goals": 0, "assists": 8, "games": 263},
    {"name": "Jeremy Swayman", "goals": 0, "assists": 6, "games": 173},
]

def generate_hockey_hl_pool():
    items = list(HOCKEY_HL_PLAYERS)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "hockey-hl-pool.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Hockey Higher Lower: wrote " + str(len(items)) + " players")
    return len(items)



# ===== REAL GENERATOR: F1 Driver =====
F1_DRIVER_FACTS = [
    {"driver": "Lewis Hamilton", "clues": ["7-time World Champion", "Mercedes 2013-2024, Ferrari 2025-present", "Most pole positions in F1 history", "British driver, debuted 2007"]},
    {"driver": "Max Verstappen", "clues": ["4-time World Champion 2021-2024", "Red Bull driver since 2016", "Youngest F1 race winner in history", "Dutch driver"]},
    {"driver": "Charles Leclerc", "clues": ["Ferrari driver since 2019", "From Monaco", "Won home GP in 2024", "Younger brother is also a racing driver"]},
    {"driver": "Lando Norris", "clues": ["McLaren driver since 2019", "British driver", "First F1 win 2024 Miami GP", "Father is wealthy businessman"]},
    {"driver": "Fernando Alonso", "clues": ["2x World Champion 2005-2006 with Renault", "Spanish driver", "Returned to F1 in 2021", "Won Indy500 categories"]},
    {"driver": "Sebastian Vettel", "clues": ["4-time World Champion 2010-2013", "Drove for Red Bull and Ferrari", "Retired end of 2022", "German driver"]},
    {"driver": "Michael Schumacher", "clues": ["7-time World Champion", "Drove for Benetton, Ferrari, Mercedes", "Suffered ski accident 2013", "German driver, retired 2012"]},
    {"driver": "Ayrton Senna", "clues": ["3-time World Champion", "Died at Imola 1994", "Brazilian icon", "McLaren driver in dominant era"]},
    {"driver": "Niki Lauda", "clues": ["3-time World Champion", "Survived 1976 Nurburgring fire", "Austrian driver", "Rush movie depicted his rivalry with Hunt"]},
    {"driver": "George Russell", "clues": ["Mercedes driver since 2022", "British driver", "Debuted with Williams 2019", "Junior champion before F1"]},
    {"driver": "Oscar Piastri", "clues": ["McLaren driver since 2023", "Australian driver", "F2 and F3 champion", "Mark Webber is his manager"]},
    {"driver": "Carlos Sainz", "clues": ["Father is rally legend Carlos Sainz Sr", "Drove for Ferrari 2021-2024", "Williams since 2025", "Spanish driver"]},
]

def generate_f1_driver_candidates():
    items = list(F1_DRIVER_FACTS)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "f1-driver-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("F1 Driver: wrote " + str(len(items)) + " driver candidates")
    return len(items)


# ===== REAL GENERATOR: UFC =====
UFC_FIGHTER_FACTS = [
    {"fighter": "Jon Jones", "clues": ["Heavyweight champion since 2023", "Considered GOAT light heavyweight", "American fighter from Endicott NY", "Bones is his nickname"]},
    {"fighter": "Islam Makhachev", "clues": ["Lightweight champion 2022-2025", "Dagestani fighter, Khabib protege", "Trained by Khabib Nurmagomedov", "Sambo background"]},
    {"fighter": "Alex Pereira", "clues": ["Light heavyweight champion 2023-2024", "Brazilian kickboxer turned MMA", "Beat Israel Adesanya in kickboxing AND MMA", "Poatan nickname"]},
    {"fighter": "Ilia Topuria", "clues": ["Featherweight champion 2024", "Knocked out Alexander Volkanovski", "Spanish-Georgian fighter", "Born in Germany"]},
    {"fighter": "Sean O Malley", "clues": ["Bantamweight champion 2023-2024", "American bantamweight star", "Suga is his nickname", "Lost title to Merab Dvalishvili"]},
    {"fighter": "Dricus du Plessis", "clues": ["Middleweight champion since 2024", "South African fighter", "Beat Israel Adesanya", "Stillknocks nickname"]},
    {"fighter": "Leon Edwards", "clues": ["Welterweight champion 2022-2024", "Jamaican-born British fighter", "Knocked out Kamaru Usman", "Rocky nickname"]},
    {"fighter": "Khabib Nurmagomedov", "clues": ["Lightweight champion 2018-2020", "29-0 career record", "Retired undefeated", "Dagestani sambo legend"]},
    {"fighter": "Conor McGregor", "clues": ["First simultaneous 2-division champion", "Featherweight and Lightweight titles", "Irish southpaw striker", "Notorious nickname"]},
    {"fighter": "Israel Adesanya", "clues": ["2-time Middleweight champion", "Nigerian-born New Zealander", "Last Stylebender nickname", "Lost to Pereira and du Plessis"]},
]

def generate_ufc_fighter_candidates():
    items = list(UFC_FIGHTER_FACTS)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "ufc-fighter-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("UFC Fighter: wrote " + str(len(items)) + " fighter candidates")
    return len(items)



# ===== EXPANDED DATA: more NFL teams =====
NFL_TEAM_FACTS_EXTRA = {
    "Bengals": ["Reached SB LVI lost to Rams", "Joe Burrow drafted 1st overall 2020", "Stripes on helmet", "Founded 1968 in Cincinnati"],
    "Browns": ["Founded 1944 by Paul Brown", "Never reached a Super Bowl", "Returned to NFL in 1999", "Home stadium opened 1999"],
    "Ravens": ["Won SB XXXV and SB XLVII", "Lamar Jackson 2x MVP", "Founded 1996 from Cleveland Browns move", "Edgar Allan Poe inspired name"],
    "Dolphins": ["Only undefeated team in NFL history 1972", "Don Shula winningest coach", "Tua Tagovailoa current QB", "Home in Miami Gardens"],
    "Jets": ["Joe Namath guaranteed and won SB III", "Aaron Rodgers acquired 2023", "Share MetLife with Giants", "Founded 1959 AFL"],
    "Texans": ["Newest NFL franchise founded 2002", "CJ Stroud 2023 Rookie of Year", "NRG Stadium home", "Have never reached SB"],
    "Colts": ["Won SB V SB XLI", "Peyton Manning 1998-2010", "Andrew Luck unexpected retirement 2019", "Moved from Baltimore 1984"],
    "Jaguars": ["Trevor Lawrence drafted 1st overall 2021", "Founded 1995 expansion", "EverBank Stadium home", "Reached only one AFC title game"],
    "Titans": ["Music City Miracle 2000 SB run", "Earl Campbell legend", "Founded 1960 as Houston Oilers", "Moved to Tennessee 1997"],
    "Broncos": ["Won SB XXXII XXXIII XXX", "John Elway and Peyton Manning eras", "Mile High Stadium home", "First SB win 1998 vs Packers"],
    "Raiders": ["Moved from Oakland to Las Vegas 2020", "Won SB XI XV XVIII", "Silver and black with pirate logo", "Al Davis longtime owner"],
    "Chargers": ["Moved from San Diego to LA 2017", "Justin Herbert quarterback", "Lost SB XXIX vs 49ers", "Share SoFi with Rams"],
    "Bears": ["Won SB XX with 1985 Bears defense", "Founded 1920 originally Decatur Staleys", "Soldier Field oldest stadium", "Walter Payton legend"],
    "Lions": ["Drought of championships since 1957", "Barry Sanders RB legend", "Ford Field home", "Reached 2024 NFC Championship"],
    "Vikings": ["4-time SB losers", "Justin Jefferson WR star", "US Bank Stadium home", "Founded 1961 expansion"],
    "Falcons": ["Lost SB LI to Patriots from 28-3 up", "Michael Vick and Matt Ryan eras", "Mercedes-Benz Stadium home", "Founded 1965 expansion"],
    "Panthers": ["Lost SB XXXVIII to Patriots", "Cam Newton 2015 MVP", "Bank of America Stadium home", "Founded 1995 expansion"],
    "Saints": ["Won SB XLIV with Drew Brees", "Hurricane Katrina symbol", "Caesars Superdome home", "Drew Brees passed for over 80000 yards"],
    "Buccaneers": ["Won SB XXXVII SB LV", "Tom Brady won final SB here", "Pewter and red kit", "Raymond James Stadium home"],
    "Cardinals": ["Oldest NFL franchise founded 1898", "Larry Fitzgerald WR legend", "State Farm Stadium home", "Moved from St Louis 1988"],
    "Rams": ["Won SB XXXIV SB LVI", "Moved from St Louis back to LA 2016", "Cooper Kupp triple crown 2021", "Sean McVay youngest SB winning coach"],
    "Seahawks": ["Won SB XLVIII Legion of Boom", "Lost SB XLIX to Patriots", "Lumen Field one of loudest", "Founded 1976 expansion"],
}

def generate_extra_nfl_team_candidates():
    items = [{"team": t, "clues": c} for t, c in NFL_TEAM_FACTS_EXTRA.items()]
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items, "source": "EXTRA"}
    path = CANDIDATES_DIR / "guess-nfl-team-candidates-extra.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Guess NFL Team EXTRA: wrote " + str(len(items)) + " more team candidates")
    return len(items)



# ===== EXPANDED DATA: more F1 drivers =====
F1_DRIVER_FACTS_EXTRA = [
    {"driver": "Kimi Raikkonen", "clues": ["2007 World Champion with Ferrari", "Iceman nickname", "Finnish driver", "Longest career in F1"]},
    {"driver": "Daniel Ricciardo", "clues": ["Shoey celebration", "Australian driver", "Won races for Red Bull and McLaren", "Retired end of 2024"]},
    {"driver": "Valtteri Bottas", "clues": ["10x Grand Prix winner", "Finnish driver", "Mercedes 2017-2021", "Alfa Romeo Sauber 2022-2024"]},
    {"driver": "Sergio Perez", "clues": ["Mexican driver", "Red Bull 2021-2024", "Won home GP cancelled in 2020", "Checo nickname"]},
    {"driver": "Pierre Gasly", "clues": ["French driver", "Won Italian GP 2020 for AlphaTauri", "Alpine since 2023", "Drove for Toro Rosso AlphaTauri"]},
    {"driver": "Esteban Ocon", "clues": ["French driver", "Won Hungarian GP 2021", "Alpine 2020-2024", "Haas since 2025"]},
    {"driver": "Lance Stroll", "clues": ["Canadian driver", "Father owns Aston Martin team", "Drove for Williams Racing Point Aston Martin", "Active 2017-present"]},
    {"driver": "Yuki Tsunoda", "clues": ["Japanese driver", "AlphaTauri RB driver", "First Japanese F1 driver since Kobayashi", "Active since 2021"]},
    {"driver": "Alexander Albon", "clues": ["Thai-British driver", "Returned to F1 with Williams 2022", "Red Bull 2019-2020", "Active 2019-present"]},
    {"driver": "Nico Hulkenberg", "clues": ["German driver", "Never on F1 podium until 2025", "Won Le Mans 2015", "Haas 2023-2024 Sauber 2025"]},
    {"driver": "Gabriel Bortoleto", "clues": ["Brazilian driver", "F3 2023 champion F2 2024 champion", "Sauber Audi 2025 debut", "Managed by Fernando Alonso"]},
    {"driver": "Kimi Antonelli", "clues": ["Italian driver born 2006", "Mercedes 2025 debut", "Replaced Lewis Hamilton at Mercedes", "Andrea Kimi nickname"]},
    {"driver": "Liam Lawson", "clues": ["New Zealand driver", "AlphaTauri reserve then RB", "Red Bull 2025 promotion", "Replaced Sergio Perez"]},
    {"driver": "Jack Doohan", "clues": ["Australian driver", "Father is MotoGP legend Mick Doohan", "Alpine 2025 debut", "F2 frontrunner"]},
]

def generate_f1_driver_candidates_extra():
    items = list(F1_DRIVER_FACTS_EXTRA)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items, "source": "EXTRA"}
    path = CANDIDATES_DIR / "f1-driver-candidates-extra.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("F1 Driver EXTRA: wrote " + str(len(items)) + " more driver candidates")
    return len(items)


# ===== EXPANDED DATA: more soccer clubs =====
SOCCER_CLUB_FACTS_EXTRA = [
    {"club": "Napoli", "founded": 1926, "league": "Serie A", "colors": "Sky blue", "city": "Naples", "famous": "Maradona era 1984-1991", "trophies": "Won Serie A 2023 first since 1990"},
    {"club": "Roma", "founded": 1927, "league": "Serie A", "colors": "Crimson and gold", "city": "Rome", "famous": "Francesco Totti club legend", "trophies": "Won Conference League 2022"},
    {"club": "Lazio", "founded": 1900, "league": "Serie A", "colors": "Sky blue and white", "city": "Rome", "famous": "Eagles nickname", "trophies": "Won Serie A 2000"},
    {"club": "Atalanta", "founded": 1907, "league": "Serie A", "colors": "Black and blue stripes", "city": "Bergamo", "famous": "Won Europa League 2024", "trophies": "Gasperini transformation"},
    {"club": "Newcastle", "founded": 1892, "league": "Premier League", "colors": "Black and white stripes", "city": "Newcastle", "famous": "Saudi PIF takeover 2021", "trophies": "St James Park stadium"},
    {"club": "Aston Villa", "founded": 1874, "league": "Premier League", "colors": "Claret and blue", "city": "Birmingham", "famous": "Won European Cup 1982", "trophies": "Founding PL member"},
    {"club": "Brighton", "founded": 1901, "league": "Premier League", "colors": "Blue and white stripes", "city": "Brighton", "famous": "Sold Caicedo Mac Allister Mitoma", "trophies": "First top flight in 1980s then 2017"},
    {"club": "West Ham", "founded": 1895, "league": "Premier League", "colors": "Claret and sky blue", "city": "London", "famous": "Won Conference League 2023", "trophies": "Bobby Moore 1966 captain"},
    {"club": "Galatasaray", "founded": 1905, "league": "Super Lig", "colors": "Red and yellow", "city": "Istanbul", "famous": "Won UEFA Cup 2000", "trophies": "Big Three Turkish club"},
    {"club": "Fenerbahce", "founded": 1907, "league": "Super Lig", "colors": "Yellow and navy", "city": "Istanbul", "famous": "Mourinho appointed 2024", "trophies": "Big Three Turkish club"},
]

def generate_soccer_club_candidates_extra():
    items = []
    for c in SOCCER_CLUB_FACTS_EXTRA:
        clues = [
            "Founded in " + str(c["founded"]),
            "Plays in " + c["league"],
            "Home colors: " + c["colors"],
            "Based in " + c["city"],
            "Famous for: " + c["famous"],
            "Notable: " + c["trophies"],
        ]
        items.append({"club": c["club"], "clues": clues})
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items, "source": "EXTRA"}
    path = CANDIDATES_DIR / "soccer-club-candidates-extra.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Guess Soccer Club EXTRA: wrote " + str(len(items)) + " more club candidates")
    return len(items)



# ===== REAL GENERATOR: Score Predictor =====
SCORE_PREDICTOR_MATCHES = [
    {"match": "Argentina vs France WC 2022 Final", "score": "3-3 Argentina won 4-2 on penalties", "clues": ["Played in Qatar", "Messi scored twice", "Mbappe hat-trick", "Decided on penalties"]},
    {"match": "Liverpool vs AC Milan UCL 2005 Final", "score": "3-3 Liverpool won 3-2 on penalties", "clues": ["Played in Istanbul", "Liverpool down 3-0 at half", "Steven Gerrard inspired comeback", "Penalty shootout"]},
    {"match": "Man Utd vs Bayern UCL 1999 Final", "score": "2-1 Man Utd", "clues": ["Played in Barcelona", "Bayern led 1-0 until 90th minute", "Sheringham and Solskjaer late goals", "Treble for Man Utd"]},
    {"match": "Brazil vs Germany WC 2014 Semifinal", "score": "7-1 Germany", "clues": ["Played in Belo Horizonte", "5 goals in first half", "Mineirazo nickname", "Germany went on to win WC"]},
    {"match": "Spain vs Italy Euro 2012 Final", "score": "4-0 Spain", "clues": ["Played in Kyiv", "Torres scored twice", "Spain third consecutive major", "First team to win consecutive Euros"]},
    {"match": "Italy vs England Euro 2020 Final", "score": "1-1 Italy won 3-2 on penalties", "clues": ["Played at Wembley", "Shaw scored early for England", "Bonucci equalized", "Saka missed final penalty"]},
    {"match": "Real Madrid vs Liverpool UCL 2022 Final", "score": "1-0 Real Madrid", "clues": ["Played in Paris", "Vinicius scored", "Courtois MOTM 9 saves", "14th UCL for Real"]},
    {"match": "Man City vs Inter UCL 2023 Final", "score": "1-0 Man City", "clues": ["Played in Istanbul", "Rodri scored 68th minute", "First City UCL", "Completed treble"]},
    {"match": "France vs Croatia WC 2018 Final", "score": "4-2 France", "clues": ["Played in Moscow", "Mbappe scored at 19", "Mandzukic own goal opener", "France second WC"]},
    {"match": "Germany vs Argentina WC 2014 Final", "score": "1-0 Germany AET", "clues": ["Played in Rio", "Gotze scored extra time", "Higuain missed sitter", "Germany fourth WC"]},
]

def generate_score_predictor_candidates():
    items = list(SCORE_PREDICTOR_MATCHES)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "score-predictor-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Score Predictor: wrote " + str(len(items)) + " match candidates")
    return len(items)


# ===== REAL GENERATOR: Guess The College =====
COLLEGE_FACTS = [
    {"school": "Duke", "clues": ["Cameron Indoor Stadium home", "Mike Krzyzewski coached 1980-2022", "5 men's basketball national championships", "ACC conference", "Notable alumni Grant Hill JJ Redick Zion Williamson"]},
    {"school": "North Carolina", "clues": ["Dean Smith Center home", "Roy Williams 3 national titles", "6 men's basketball national championships", "ACC conference", "Notable alumni Michael Jordan James Worthy Vince Carter"]},
    {"school": "Kentucky", "clues": ["Rupp Arena home", "John Calipari coached 2009-2024", "8 men's basketball national championships", "SEC conference", "Anthony Davis was a one-and-done"]},
    {"school": "Kansas", "clues": ["Allen Fieldhouse home", "Bill Self coach since 2003", "Won title 2008 2022", "Big 12 conference", "Wilt Chamberlain attended"]},
    {"school": "UCLA", "clues": ["Pauley Pavilion home", "John Wooden coached 1948-1975", "11 national championships", "Big Ten since 2024", "Kareem Abdul-Jabbar attended as Lew Alcindor"]},
    {"school": "Michigan", "clues": ["The Big House football stadium 107K capacity", "Won CFB national championship 2024", "Won basketball title 1989", "Big Ten conference", "Notable alumni Tom Brady"]},
    {"school": "Ohio State", "clues": ["Ohio Stadium The Horseshoe home", "Won CFB title 2025", "Won basketball title 1960", "Big Ten conference", "Fans chant O-H to I-O"]},
    {"school": "Alabama", "clues": ["Bryant-Denny Stadium home", "Nick Saban coached 2007-2023", "6 CFB titles in 2009-2020", "SEC conference", "Roll Tide chant"]},
    {"school": "Georgia", "clues": ["Sanford Stadium home", "Kirby Smart coach since 2016", "Back to back CFB titles 2021 2022", "SEC conference", "Between the hedges nickname"]},
    {"school": "Texas", "clues": ["DKR-Texas Memorial Stadium home", "Won CFB title 2005", "SEC conference since 2024", "Bevo the longhorn mascot", "Hook em hand sign"]},
    {"school": "USC", "clues": ["LA Memorial Coliseum home", "11 CFB championships", "Reggie Bush won Heisman 2005", "Big Ten conference since 2024", "Pete Carroll era 2001-2009"]},
    {"school": "Notre Dame", "clues": ["Notre Dame Stadium home", "Touchdown Jesus mural", "11 CFB championships", "Independent in football", "Rudy movie school"]},
    {"school": "Florida", "clues": ["Ben Hill Griffin Stadium The Swamp home", "Won CFB 1996 2006 2008", "Won basketball 2006 2007", "SEC conference", "Tim Tebow Heisman 2007"]},
    {"school": "Tennessee", "clues": ["Neyland Stadium 102K capacity", "Won CFB 1998", "Won basketball SEC tournaments", "SEC conference", "Peyton Manning attended"]},
    {"school": "LSU", "clues": ["Tiger Stadium Death Valley home", "Joe Burrow won 2019 CFB title", "SEC conference", "Won basketball 1935 1946 only", "Geaux Tigers chant"]},
    {"school": "Auburn", "clues": ["Jordan-Hare Stadium home", "Cam Newton won Heisman 2010", "Won CFB 2010", "SEC conference", "War Eagle chant"]},
    {"school": "Oklahoma", "clues": ["Gaylord Family Memorial Stadium home", "7 CFB championships", "Boomer Sooner song", "SEC conference since 2024", "Schooner mascot"]},
    {"school": "Penn State", "clues": ["Beaver Stadium 107K capacity", "Won CFB 1982 1986", "Big Ten conference", "We Are Penn State chant", "Joe Paterno legacy"]},
    {"school": "Wisconsin", "clues": ["Camp Randall Stadium home", "Jump Around tradition", "Won basketball 1941", "Big Ten conference", "On Wisconsin song"]},
    {"school": "Florida State", "clues": ["Doak Campbell Stadium home", "Bobby Bowden coached", "Won CFB 1993 1999 2013", "ACC conference", "Seminoles war chant"]},
]

def generate_college_candidates():
    items = list(COLLEGE_FACTS)
    out = {"generated": RUN_TIMESTAMP, "count": len(items), "items": items}
    path = CANDIDATES_DIR / "guess-college-candidates.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    log("Guess The College: wrote " + str(len(items)) + " school candidates")
    return len(items)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"FATAL: {e}")
        log(traceback.format_exc())
        flush_log()
        flush_blockers()
        sys.exit(1)
