import json
import time
import re
import pandas as pd
import requests
from io import StringIO
from pathlib import Path

OUTPUT_PATH = Path("docs/data/soccer-data.json")
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

CURRENT_SQUAD_URLS = {
    "Real Madrid": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Real_Madrid_CF_season",
    "Barcelona": "https://en.wikipedia.org/wiki/2025%E2%80%9326_FC_Barcelona_season",
    "Bayern Munich": "https://en.wikipedia.org/wiki/2025%E2%80%9326_FC_Bayern_Munich_season",
    "Man City": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Manchester_City_F.C._season",
    "Liverpool": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Liverpool_F.C._season",
    "Arsenal": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Arsenal_F.C._season",
    "Chelsea": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Chelsea_F.C._season",
    "Man Utd": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Manchester_United_F.C._season",
    "PSG": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Paris_Saint-Germain_FC_season",
    "Tottenham": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Tottenham_Hotspur_F.C._season",
    "Inter Milan": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Inter_Milan_season",
    "AC Milan": "https://en.wikipedia.org/wiki/2025%E2%80%9326_A.C._Milan_season",
    "Juventus": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Juventus_FC_season",
    "Napoli": "https://en.wikipedia.org/wiki/2025%E2%80%9326_SSC_Napoli_season",
    "Atletico Madrid": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Atl%C3%A9tico_Madrid_season",
    "Borussia Dortmund": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Borussia_Dortmund_season",
    "Bayer Leverkusen": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Bayer_04_Leverkusen_season",
    "Marseille": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Olympique_de_Marseille_season",
    "Lyon": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Olympique_Lyonnais_season",
    "Newcastle": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Newcastle_United_F.C._season",
    "Aston Villa": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Aston_Villa_F.C._season",
    "Benfica": "https://en.wikipedia.org/wiki/2025%E2%80%9326_S.L._Benfica_season",
    "Porto": "https://en.wikipedia.org/wiki/2025%E2%80%9326_FC_Porto_season",
    "Sporting CP": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Sporting_CP_season",
    "Ajax": "https://en.wikipedia.org/wiki/2025%E2%80%9326_AFC_Ajax_season",
    "PSV Eindhoven": "https://en.wikipedia.org/wiki/2025%E2%80%9326_PSV_Eindhoven_season",
    "Galatasaray": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Galatasaray_S.K._season",
    "Fenerbahce": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Fenerbah%C3%A7e_S.K._season",
    "Inter Miami": "https://en.wikipedia.org/wiki/2025_Inter_Miami_CF_season",
    "Al Hilal": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Al_Hilal_SFC_season",
    "Al Nassr": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Al-Nassr_FC_season",
    "Al Ittihad": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Ittihad_Club_(Jeddah)_season",
    "Roma": "https://en.wikipedia.org/wiki/2025%E2%80%9326_AS_Roma_season",
    "Lazio": "https://en.wikipedia.org/wiki/2025%E2%80%9326_SS_Lazio_season",
    "Atalanta": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Atalanta_BC_season",
    "Real Sociedad": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Real_Sociedad_season",
    "Villarreal": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Villarreal_CF_season",
    "Athletic Bilbao": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Athletic_Bilbao_season",
    "Brighton": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Brighton_%26_Hove_Albion_F.C._season",
    "Brentford": "https://en.wikipedia.org/wiki/2025%E2%80%9326_Brentford_F.C._season",
}

def extract_squad_from_wiki(url, club_name):
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; DoUKnowBall/1.0)"}, timeout=20)
        r.raise_for_status()
        html = r.content.decode("utf-8", errors="replace")
        tables = pd.read_html(StringIO(html), header=0)
    except Exception as e:
        print(f"  FAIL {club_name}: {e}")
        return []
    candidates = []
    for tbl in tables:
        cols = [str(c).strip() for c in tbl.columns]
        if "Player" in cols or "Name" in cols:
            col = "Player" if "Player" in cols else "Name"
            names = tbl[col].dropna().astype(str).tolist()
            names = [re.sub(r"\[.*?\]", "", n).strip() for n in names]
            BAD = {"Player", "Name", "Total", "nan", ""}
            names = [n for n in names if n and n not in BAD and not n.startswith("Total") and not n.isdigit()]
            if 15 <= len(names) <= 50:
                candidates.append(names)
    if candidates:
        return max(candidates, key=len)
    return []

def scrape_current_squads():
    out = {}
    for club, url in CURRENT_SQUAD_URLS.items():
        print(f"Squad: {club}")
        names = extract_squad_from_wiki(url, club)
        if names:
            out[club] = names
            print(f"  -> {len(names)} players")
        else:
            print(f"  -> NO DATA")
        time.sleep(0.5)
    return out

TOURNAMENT_URLS = {
    "WC 2022 Argentina winners": "https://en.wikipedia.org/wiki/2022_FIFA_World_Cup_squads",
    "WC 2018 France winners": "https://en.wikipedia.org/wiki/2018_FIFA_World_Cup_squads",
    "Euro 2024 Spain winners": "https://en.wikipedia.org/wiki/UEFA_Euro_2024_squads",
    "Euro 2020 Italy winners": "https://en.wikipedia.org/wiki/UEFA_Euro_2020_squads",
    "Copa America 2024 Argentina winners": "https://en.wikipedia.org/wiki/2024_Copa_Am%C3%A9rica_squads",
    "Copa America 2021 Argentina winners": "https://en.wikipedia.org/wiki/2021_Copa_Am%C3%A9rica_squads",
    "AFCON 2023 Ivory Coast winners": "https://en.wikipedia.org/wiki/2023_Africa_Cup_of_Nations_squads",
    "AFCON 2021 Senegal winners": "https://en.wikipedia.org/wiki/2021_Africa_Cup_of_Nations_squads",
}

def extract_tournament_squad(url, label):
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; DoUKnowBall/1.0)"}, timeout=20)
        r.raise_for_status()
        html = r.content.decode("utf-8", errors="replace")
        tables = pd.read_html(StringIO(html), header=0)
    except Exception as e:
        print(f"  FAIL {label}: {e}")
        return []
    candidates = []
    for tbl in tables:
        cols = [str(c).strip() for c in tbl.columns]
        if "Player" in cols:
            names = tbl["Player"].dropna().astype(str).tolist()
            names = [re.sub(r"\[.*?\]", "", n).strip() for n in names]
            BAD = {"Player", "Name", "Total", "nan", ""}
            names = [n for n in names if n and n not in BAD and len(n) > 2 and not n.isdigit()]
            if 20 <= len(names) <= 30:
                candidates.append(names)
    if candidates:
        return max(candidates, key=len)
    return []

def scrape_tournament_squads():
    out = {}
    for label, url in TOURNAMENT_URLS.items():
        print(f"Tournament: {label}")
        names = extract_tournament_squad(url, label)
        if names:
            out[label] = names
            print(f"  -> {len(names)} players")
        else:
            print(f"  -> NO DATA")
        time.sleep(0.5)
    return out

def main():
    data = {
        "current_squads_2025_26": scrape_current_squads(),
        "tournament_winners": scrape_tournament_squads(),
        "_meta": {
            "source": "Wikipedia",
            "generated_for": "DoUKnowBall Connections puzzle generation",
        }
    }
    OUTPUT_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUTPUT_PATH}")
    print(f"Squads collected: {len(data['current_squads_2025_26'])}")
    print(f"Tournament squads collected: {len(data['tournament_winners'])}")

if __name__ == "__main__":
    main()
