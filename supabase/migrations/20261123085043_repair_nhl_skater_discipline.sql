-- Correct plus-minus and penalty minutes on the already repaired NHL imports.
-- The NHL summary and player pages (https://www.nhl.com/player/<nhlId>)
-- identify the official regular-season row. The second source is in each entry.
-- Tuples below are [plus_minus, pim]. Run with reverse_repair true to roll back.

do $repair$
declare
  reverse_repair constant boolean := false;
  records constant jsonb := $rows$
[
  {"id":5765,"name":"William Bitten","team":"STL","position":"C","season":"2022-23","games":4,"nhlId":8479375,"source":"https://www.eliteprospects.com/player/245965/william-bitten","old":[1,1],"fixed":[1,0]},
  {"id":5886,"name":"Tommy Cross","team":"BOS","position":"D","season":"2015-16","games":3,"nhlId":8474019,"source":"https://www.eliteprospects.com/player/11457/tommy-cross","old":[1,-1],"fixed":[-1,0]},
  {"id":5900,"name":"Kris Fredheim","team":"MIN","position":"D","season":"2011-12","games":3,"nhlId":8471846,"source":"https://www.eliteprospects.com/player/14864/kris-fredheim","old":[0,-2],"fixed":[-2,2]},
  {"id":5907,"name":"Tyson Gross","team":"CGY","position":"F","season":"2025-26","games":6,"nhlId":8486056,"source":"https://www.hockey-reference.com/players/g/grossty01.html","old":[2,1],"fixed":[-2,2]},
  {"id":5917,"name":"Mikulas Hovorka","team":"FLA","position":"D","season":"2025-26","games":4,"nhlId":8484933,"source":"https://www.eliteprospects.com/player/425297/mikulas-hovorka","old":[0,-3],"fixed":[-1,0]},
  {"id":5929,"name":"Dmitry Korobov","team":"TBL","position":"D","season":"2013-14","games":3,"nhlId":8477082,"source":"https://www.eliteprospects.com/player/28547/dmitri-korobov","old":[1,0],"fixed":[0,2]},
  {"id":5974,"name":"Bobby Robins","team":"BOS","position":"C","season":"2014-15","games":3,"nhlId":8472365,"source":"https://www.eliteprospects.com/player/10502/bobby-robins","old":[0,0],"fixed":[0,14]},
  {"id":6021,"name":"Matt Anderson","team":"NJD","position":"RW","season":"2012-13","games":2,"nhlId":8473944,"source":"https://www.eliteprospects.com/team/66/new-jersey-devils/stats/2012-2013","old":[1,1],"fixed":[1,0]},
  {"id":6041,"name":"Michael Caruso","team":"FLA","position":"D","season":"2012-13","games":2,"nhlId":8473416,"source":"https://www.eliteprospects.com/player/11235/michael-caruso","old":[0,-1],"fixed":[-1,0]},
  {"id":6051,"name":"Philippe Cornet","team":"EDM","position":"LW","season":"2011-12","games":2,"nhlId":8474691,"source":"https://www.eliteprospects.com/player/19051/philippe-cornet","old":[1,0],"fixed":[0,0]},
  {"id":6061,"name":"Hunter Drew","team":"ANA","position":"D","season":"2021-22","games":2,"nhlId":8481003,"source":"https://www.eliteprospects.com/player/267823/hunter-drew","old":[0,0],"fixed":[0,5]},
  {"id":6076,"name":"Danny Irmen","team":"MIN","position":"C","season":"2009-10","games":2,"nhlId":8470671,"source":"https://www.eliteprospects.com/player/11773/danny-irmen","old":[0,-1],"fixed":[-1,0]},
  {"id":6080,"name":"Justin Johnson","team":"NYI","position":"RW","season":"2013-14","games":2,"nhlId":8476086,"source":"https://www.eliteprospects.com/player/24335/justin-johnson","old":[0,-1],"fixed":[-1,7]},
  {"id":6105,"name":"Olli Malmivaara","team":"NJD","position":"D","season":"2007-08","games":2,"nhlId":8468597,"source":"https://www.eliteprospects.com/player/3185/olli-malmivaara","old":[0,2],"fixed":[2,0]},
  {"id":6126,"name":"Joonas Rask","team":"NSH","position":"C","season":"2012-13","games":2,"nhlId":8475893,"source":"https://www.eliteprospects.com/player/16049/joonas-rask","old":[1,-1],"fixed":[-1,0]},
  {"id":6140,"name":"David Spacek","team":"MIN","position":"D","season":"2025-26","games":2,"nhlId":8483766,"source":"https://www.eliteprospects.com/league/nhl/stats/2025-2026?nation=cze&position=d","old":[0,-1],"fixed":[-1,0]},
  {"id":6151,"name":"Maksim Sushko","team":"PHI","position":"RW","season":"2020-21","games":2,"nhlId":8480201,"source":"https://www.eliteprospects.com/player/313615/maxim-sushko","old":[0,-1],"fixed":[-1,0]},
  {"id":6161,"name":"Dominik Uher","team":"PIT","position":"C","season":"2014-15","games":2,"nhlId":8476339,"source":"https://www.eliteprospects.com/player/41098/dominik-uher","old":[0,-1],"fixed":[-1,0]},
  {"id":6178,"name":"Jesse Blacker","team":"ANA","position":"D","season":"2014-15","games":1,"nhlId":8475203,"source":"https://www.eliteprospects.com/player/33754/jesse-blacker","old":[0,-2],"fixed":[-2,0]},
  {"id":6186,"name":"Matt Campanale","team":"NYI","position":"D","season":"2010-11","games":1,"nhlId":8476208,"source":"https://www.eliteprospects.com/team/67/new-york-islanders/stats/2010-2011/total","old":[0,0],"fixed":[0,2]},
  {"id":6191,"name":"Tyler Cuma","team":"MIN","position":"D","season":"2011-12","games":1,"nhlId":8474585,"source":"https://www.eliteprospects.com/player/15385/tyler-cuma","old":[0,0],"fixed":[0,2]},
  {"id":6194,"name":"Semyon Der-Arguchintsev","team":"TOR","position":"C","season":"2022-23","games":1,"nhlId":8480977,"source":"https://www.eliteprospects.com/player/315260/semyon-der-arguchintsev","old":[0,1],"fixed":[1,0]},
  {"id":6201,"name":"Giovanni Fiore","team":"ANA","position":"LW","season":"2017-18","games":1,"nhlId":8479613,"source":"https://www.eliteprospects.com/player/156093/giovanni-fiore","old":[0,-1],"fixed":[-1,0]},
  {"id":6208,"name":"Jamie Fritsch","team":"PHI","position":"D","season":"2008-09","games":1,"nhlId":8475115,"source":"https://www.eliteprospects.com/team/70/philadelphia-flyers/stats/2008-2009","old":[0,1],"fixed":[1,0]},
  {"id":6213,"name":"Scott Glennie","team":"DAL","position":"RW","season":"2011-12","games":1,"nhlId":8475173,"source":"https://www.eliteprospects.com/player/13799/scott-glennie","old":[0,0],"fixed":[0,2]},
  {"id":6216,"name":"Curtis Hamilton","team":"EDM","position":"LW","season":"2014-15","games":1,"nhlId":8475734,"source":"https://www.eliteprospects.com/player/31288/curtis-hamilton","old":[0,0],"fixed":[0,5]},
  {"id":6226,"name":"Philip Holm","team":"VAN","position":"D","season":"2017-18","games":1,"nhlId":8480163,"source":"https://www.eliteprospects.com/player/11070/philip-holm?total-stats-tab=teams","old":[0,-2],"fixed":[-2,0]},
  {"id":6228,"name":"Raman Hrabarenka","team":"NJD","position":"D","season":"2014-15","games":1,"nhlId":8477127,"source":"https://www.statmuse.com/nhl/player/raman-hrabarenka-3006/career-stats","old":[0,1],"fixed":[1,0]},
  {"id":6242,"name":"Devin Kaplan","team":"PHI","position":"RW","season":"2024-25","games":1,"nhlId":8483461,"source":"https://www.eliteprospects.com/player/526063/devin-kaplan","old":[0,-1],"fixed":[-1,0]},
  {"id":6246,"name":"Michael Keränen","team":"MIN","position":"C","season":"2015-16","games":1,"nhlId":8477923,"source":"https://www.eliteprospects.com/player/16456/michael-keranen","old":[0,-1],"fixed":[-1,0]},
  {"id":6256,"name":"Trevor Kuntar","team":"BUF","position":"C","season":"2025-26","games":1,"nhlId":8482479,"source":"https://www.eliteprospects.com/player/290309/trevor-kuntar","old":[0,-1],"fixed":[-1,0]},
  {"id":6261,"name":"Shawn Lalonde","team":"CHI","position":"D","season":"2012-13","games":1,"nhlId":8474629,"source":"https://www.eliteprospects.com/team/56/chicago-blackhawks/stats/2012-2013","old":[0,1],"fixed":[1,0]},
  {"id":6280,"name":"Daniil Misyul","team":"NJD","position":"D","season":"2024-25","games":1,"nhlId":8481536,"source":"https://www.eliteprospects.com/player/395127/daniil-misyul","old":[0,-1],"fixed":[-1,0]},
  {"id":6285,"name":"Johan Motin","team":"EDM","position":"D","season":"2009-10","games":1,"nhlId":8474662,"source":"https://www.eliteprospects.com/player/6953/johan-motin","old":[0,-1],"fixed":[-1,0]},
  {"id":6292,"name":"Jacob Perreault","team":"ANA","position":"RW","season":"2021-22","games":1,"nhlId":8482150,"source":"https://www.eliteprospects.com/player/418243/jacob-perreault","old":[0,-1],"fixed":[-1,0]},
  {"id":6298,"name":"Jonathan Racine","team":"FLA","position":"D","season":"2013-14","games":1,"nhlId":8476411,"source":"https://www.eliteprospects.com/player/45270/jonathan-racine","old":[0,-1],"fixed":[-1,2]},
  {"id":6304,"name":"Aku Raty","team":"ARI","position":"RW","season":"2023-24","games":1,"nhlId":8481699,"source":"https://www.statmuse.com/nhl/player/aku-raty-9948/game-log?seasonYear=2024","old":[1,0],"fixed":[0,0]},
  {"id":6307,"name":"Drake Rymsha","team":"LAK","position":"C","season":"2020-21","games":1,"nhlId":8480221,"source":"https://www.eliteprospects.com/player/268925/drake-rymsha","old":[0,1],"fixed":[1,0]},
  {"id":6318,"name":"Hunter Skinner","team":"STL","position":"D","season":"2025-26","games":1,"nhlId":8481715,"source":"https://www.eliteprospects.com/player/359531/hunter-skinner","old":[0,1],"fixed":[1,0]},
  {"id":6322,"name":"Dalton Smith","team":"BUF","position":"LW","season":"2019-20","games":1,"nhlId":8475748,"source":"https://www.eliteprospects.com/player/30923/dalton-smith","old":[0,1],"fixed":[1,2]},
  {"id":6323,"name":"Carl Sneep","team":"PIT","position":"D","season":"2011-12","games":1,"nhlId":8473539,"source":"https://www.eliteprospects.com/player/11431/carl-sneep","old":[1,1],"fixed":[1,0]},
  {"id":6331,"name":"Josh Teves","team":"VAN","position":"D","season":"2018-19","games":1,"nhlId":8481425,"source":"https://www.eliteprospects.com/player/197849/josh-teves","old":[0,-1],"fixed":[-1,2]}
]
$rows$::jsonb;
  entry jsonb;
  original jsonb;
  desired jsonb;
  observed jsonb;
  observed_first_season text;
  observed_games integer;
  row_id integer;
begin
  perform set_config('lock_timeout', '5s', true);

  for entry in select value from jsonb_array_elements(records) loop
    original := entry->(case when reverse_repair then 'fixed' else 'old' end);
    desired := entry->(case when reverse_repair then 'old' else 'fixed' end);

    begin
      select id, year_from, games, jsonb_build_array(plus_minus, pim)
        into strict row_id, observed_first_season, observed_games, observed
        from public.nhl_player_stats
        where player_name = entry->>'name'
          and teams = entry->>'team'
          and position = entry->>'position'
          and year_to = entry->>'season'
        for update;
    exception
      when no_data_found or too_many_rows then
        raise exception 'NHL discipline repair: source identity mismatch for %', entry->>'name';
    end;

    if observed_first_season is distinct from entry->>'season'
      or observed_games is distinct from (entry->>'games')::integer then
      raise exception 'NHL discipline repair: core repair mismatch at row %', row_id;
    end if;
    if observed = desired then
      continue;
    end if;
    if observed is distinct from original then
      raise exception 'NHL discipline repair: source mismatch at row %', row_id;
    end if;

    update public.nhl_player_stats
      set plus_minus = (desired->>0)::integer, pim = (desired->>1)::integer
      where id = row_id
      returning jsonb_build_array(plus_minus, pim) into observed;

    if observed is distinct from desired then
      raise exception 'NHL discipline repair: write mismatch at row %', row_id;
    end if;
  end loop;
end;
$repair$;
