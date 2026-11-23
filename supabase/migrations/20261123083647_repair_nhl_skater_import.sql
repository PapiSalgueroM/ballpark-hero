-- Correct 69 shifted NHL imports at their existing regular-season cutoffs.
-- The first source is https://api-web.nhle.com/v1/player/<nhlId>/landing.
-- The ledger records the independent source and audited ID. The natural identity resolves the current ID.
-- To roll back, run this same transaction with reverse_repair set to true.
-- Either direction refuses an unexpected row and rolls back the entire transaction.

do $repair$
declare
  reverse_repair constant boolean := false;
  records constant jsonb := $rows$
[
  {"id":5710,"name":"Jake Livingstone","team":"NSH","position":"D","season":"2022-23","nhlId":8484256,"source":"https://www.eliteprospects.com/team/65/nashville-predators/stats/2022-2023","old":["5",5,0,1,1],"fixed":["2022-23",5,0,1,1]},
  {"id":5765,"name":"William Bitten","team":"STL","position":"C","season":"2022-23","nhlId":8479375,"source":"https://www.eliteprospects.com/player/245965/william-bitten","old":["4",24,4,0,1],"fixed":["2022-23",4,0,1,1]},
  {"id":5886,"name":"Tommy Cross","team":"BOS","position":"D","season":"2015-16","nhlId":8474019,"source":"https://www.eliteprospects.com/player/11457/tommy-cross","old":["3",26,3,0,1],"fixed":["2015-16",3,0,1,1]},
  {"id":5900,"name":"Kris Fredheim","team":"MIN","position":"D","season":"2011-12","nhlId":8471846,"source":"https://www.hockey-reference.com/players/f/fredhkr01.html","old":["3",24,3,0,0],"fixed":["2011-12",3,0,0,0]},
  {"id":5907,"name":"Tyson Gross","team":"CGY","position":"F","season":"2025-26","nhlId":8486056,"source":"https://www.hockey-reference.com/players/g/grossty01.html","old":["2025-26",1,0,1,-2],"fixed":["2025-26",6,1,0,1]},
  {"id":5917,"name":"Mikulas Hovorka","team":"FLA","position":"D","season":"2025-26","nhlId":8484933,"source":"https://www.quanthockey.com/game-logs/en/game-log.php?player=152424&season=all&st=r","old":["3",24,3,0,0],"fixed":["2025-26",4,0,1,1]},
  {"id":5929,"name":"Dmitry Korobov","team":"TBL","position":"D","season":"2013-14","nhlId":8477082,"source":"https://www.eliteprospects.com/player/28547/dmitri-korobov","old":["3",24,3,0,1],"fixed":["2013-14",3,0,1,1]},
  {"id":5974,"name":"Bobby Robins","team":"BOS","position":"C","season":"2014-15","nhlId":8472365,"source":"https://www.eliteprospects.com/player/10502/bobby-robins","old":["3",33,3,0,0],"fixed":["2014-15",3,0,0,0]},
  {"id":5991,"name":"Dillon Simpson","team":"EDM","position":"D","season":"2016-17","nhlId":8476416,"source":"https://www.eliteprospects.com/player/44487/dillon-simpson","old":["3",3,0,0,0],"fixed":["2016-17",3,0,0,0]},
  {"id":6021,"name":"Matt Anderson","team":"NJD","position":"RW","season":"2012-13","nhlId":8473944,"source":"https://www.quanthockey.com/hockey-stats/en/profile.php?player=13149","old":["2",30,2,0,1],"fixed":["2012-13",2,0,1,1]},
  {"id":6027,"name":"Carter Bancks","team":"CGY","position":"LW","season":"2012-13","nhlId":8474844,"source":"https://www.eliteprospects.com/player/15740/carter-bancks","old":["2",23,2,0,0],"fixed":["2012-13",2,0,0,0]},
  {"id":6035,"name":"Chase Bradley","team":"COL","position":"LW","season":"2024-25","nhlId":8482507,"source":"https://insidetherink.com/stats/nhl/players/chase-bradley-8482507/","old":["2",23,2,0,0],"fixed":["2024-25",2,0,0,0]},
  {"id":6041,"name":"Michael Caruso","team":"FLA","position":"D","season":"2012-13","nhlId":8473416,"source":"https://www.eliteprospects.com/player/11235/michael-caruso","old":["2",24,2,0,0],"fixed":["2012-13",2,0,0,0]},
  {"id":6051,"name":"Philippe Cornet","team":"EDM","position":"LW","season":"2011-12","nhlId":8474691,"source":"https://www.eliteprospects.com/player/19051/philippe-cornet","old":["2",21,2,0,1],"fixed":["2011-12",2,0,1,1]},
  {"id":6061,"name":"Hunter Drew","team":"ANA","position":"D","season":"2021-22","nhlId":8481003,"source":"https://www.eliteprospects.com/player/267823/hunter-drew","old":["2",23,2,0,0],"fixed":["2021-22",2,0,0,0]},
  {"id":6076,"name":"Danny Irmen","team":"MIN","position":"C","season":"2009-10","nhlId":8470671,"source":"https://www.eliteprospects.com/player/11773/danny-irmen","old":["2",25,2,0,0],"fixed":["2009-10",2,0,0,0]},
  {"id":6080,"name":"Justin Johnson","team":"NYI","position":"RW","season":"2013-14","nhlId":8476086,"source":"https://www.eliteprospects.com/player/24335/justin-johnson","old":["2",32,2,0,0],"fixed":["2013-14",2,0,0,0]},
  {"id":6087,"name":"Samuel Kňažko","team":"CBJ","position":"D","season":"2022-23","nhlId":8482448,"source":"https://dobberprospects.com/player/Samuel-Knazko/","old":["2",20,2,0,0],"fixed":["2022-23",2,0,0,0]},
  {"id":6092,"name":"Samuel Laberge","team":"NJD","position":"W","season":"2023-24","nhlId":8478956,"source":"https://www.eliteprospects.com/player/231410/samuel-laberge","old":["2",26,2,0,0],"fixed":["2023-24",2,0,0,0]},
  {"id":6105,"name":"Olli Malmivaara","team":"NJD","position":"D","season":"2007-08","nhlId":8468597,"source":"https://www.eliteprospects.com/player/3185/olli-malmivaara","old":["2",25,2,0,0],"fixed":["2007-08",2,0,0,0]},
  {"id":6126,"name":"Joonas Rask","team":"NSH","position":"C","season":"2012-13","nhlId":8475893,"source":"https://www.eliteprospects.com/player/16049/joonas-rask","old":["2",22,2,0,1],"fixed":["2012-13",2,0,1,1]},
  {"id":6140,"name":"David Spacek","team":"MIN","position":"D","season":"2025-26","nhlId":8483766,"source":"https://pucksandstats.com/players/david-spacek/game-log/","old":["2",22,2,0,0],"fixed":["2025-26",2,0,0,0]},
  {"id":6151,"name":"Maksim Sushko","team":"PHI","position":"RW","season":"2020-21","nhlId":8480201,"source":"https://www.eliteprospects.com/player/313615/maxim-sushko","old":["2",21,2,0,0],"fixed":["2020-21",2,0,0,0]},
  {"id":6161,"name":"Dominik Uher","team":"PIT","position":"C","season":"2014-15","nhlId":8476339,"source":"https://www.eliteprospects.com/player/41098/dominik-uher","old":["2",22,2,0,0],"fixed":["2014-15",2,0,0,0]},
  {"id":6162,"name":"Peter Vandermeer","team":"PHX","position":"LW","season":"2007-08","nhlId":8467137,"source":"https://insidetherink.com/stats/nhl/players/pete-vandermeer-8467137/","old":["2",32,2,0,0],"fixed":["2007-08",2,0,0,0]},
  {"id":6175,"name":"Brandon Baddock","team":"MTL","position":"LW","season":"2021-22","nhlId":8477631,"source":"https://www.eliteprospects.com/player/83627/brandon-baddock","old":["1",26,1,0,0],"fixed":["2021-22",1,0,0,0]},
  {"id":6178,"name":"Jesse Blacker","team":"ANA","position":"D","season":"2014-15","nhlId":8475203,"source":"https://www.eliteprospects.com/team/1580/anaheim-ducks/stats/all-time/total?nation=CAN&page=3","old":["1",23,1,0,0],"fixed":["2014-15",1,0,0,0]},
  {"id":6185,"name":"Cameron Butler","team":"CBJ","position":"F","season":"2023-24","nhlId":8483045,"source":"https://www.eliteprospects.com/player/342193/cameron-butler","old":["1",21,1,0,0],"fixed":["2023-24",1,0,0,0]},
  {"id":6186,"name":"Matt Campanale","team":"NYI","position":"D","season":"2010-11","nhlId":8476208,"source":"https://www.hockey-reference.com/players/c/campama01.html","old":["1",22,1,0,0],"fixed":["2010-11",1,0,0,0]},
  {"id":6191,"name":"Tyler Cuma","team":"MIN","position":"D","season":"2011-12","nhlId":8474585,"source":"https://www.eliteprospects.com/team/63/minnesota-wild/experience/2011-2012/team","old":["1",22,1,0,0],"fixed":["2011-12",1,0,0,0]},
  {"id":6194,"name":"Semyon Der-Arguchintsev","team":"TOR","position":"C","season":"2022-23","nhlId":8480977,"source":"https://www.eliteprospects.com/team/76/toronto-maple-leafs/experience/2022-2023/team","old":["1",22,1,0,0],"fixed":["2022-23",1,0,0,0]},
  {"id":6201,"name":"Giovanni Fiore","team":"ANA","position":"LW","season":"2017-18","nhlId":8479613,"source":"https://www.eliteprospects.com/team/1580/anaheim-ducks/stats/all-time/total?nation=CAN&page=3","old":["1",21,1,0,0],"fixed":["2017-18",1,0,0,0]},
  {"id":6206,"name":"Jamie Fraser","team":"NYI","position":"D","season":"2008-09","nhlId":8473827,"source":"https://www.eliteprospects.com/player/11493/jamie-fraser","old":["1",23,1,0,0],"fixed":["2008-09",1,0,0,0]},
  {"id":6208,"name":"Jamie Fritsch","team":"PHI","position":"D","season":"2008-09","nhlId":8475115,"source":"https://www.eliteprospects.com/team/70/philadelphia-flyers/stats/2008-2009","old":["1",23,1,0,0],"fixed":["2008-09",1,0,0,0]},
  {"id":6213,"name":"Scott Glennie","team":"DAL","position":"RW","season":"2011-12","nhlId":8475173,"source":"https://www.eliteprospects.com/player/13799/scott-glennie","old":["1",20,1,0,0],"fixed":["2011-12",1,0,0,0]},
  {"id":6216,"name":"Curtis Hamilton","team":"EDM","position":"LW","season":"2014-15","nhlId":8475734,"source":"https://www.eliteprospects.com/player/31288/curtis-hamilton","old":["1",23,1,0,0],"fixed":["2014-15",1,0,0,0]},
  {"id":6226,"name":"Philip Holm","team":"VAN","position":"D","season":"2017-18","nhlId":8480163,"source":"https://www.eliteprospects.com/player/11070/philip-holm?total-stats-tab=teams","old":["1",26,1,0,0],"fixed":["2017-18",1,0,0,0]},
  {"id":6228,"name":"Raman Hrabarenka","team":"NJD","position":"D","season":"2014-15","nhlId":8477127,"source":"https://www.hockey-reference.com/teams/NJD/2015.html","old":["1",22,1,0,0],"fixed":["2014-15",1,0,0,0]},
  {"id":6233,"name":"Scott Jackson","team":"TBL","position":"D","season":"2009-10","nhlId":8471711,"source":"https://www.eliteprospects.com/player/11619/scott-jackson","old":["1",22,1,0,0],"fixed":["2009-10",1,0,0,0]},
  {"id":6242,"name":"Devin Kaplan","team":"PHI","position":"RW","season":"2024-25","nhlId":8483461,"source":"https://www.eliteprospects.com/player/526063/devin-kaplan","old":["1",21,1,0,0],"fixed":["2024-25",1,0,0,0]},
  {"id":6245,"name":"Philip Kemp","team":"EDM","position":"D","season":"2023-24","nhlId":8480274,"source":"https://www.eliteprospects.com/player/311901/phil-kemp","old":["1",24,1,0,0],"fixed":["2023-24",1,0,0,0]},
  {"id":6246,"name":"Michael Keränen","team":"MIN","position":"C","season":"2015-16","nhlId":8477923,"source":"https://www.eliteprospects.com/player/16456/michael-keranen","old":["1",26,1,0,0],"fixed":["2015-16",1,0,0,0]},
  {"id":6250,"name":"Anton Klementyev","team":"NYI","position":"D","season":"2009-10","nhlId":8475270,"source":"https://www.eliteprospects.com/player/17575/anton-klementyev","old":["1",19,1,0,0],"fixed":["2009-10",1,0,0,0]},
  {"id":6251,"name":"Morgan Klimchuk","team":"CGY","position":"LW","season":"2017-18","nhlId":8477449,"source":"https://www.eliteprospects.com/player/62209/morgan-klimchuk","old":["1",22,1,0,0],"fixed":["2017-18",1,0,0,0]},
  {"id":6256,"name":"Trevor Kuntar","team":"BUF","position":"C","season":"2025-26","nhlId":8482479,"source":"https://www.eliteprospects.com/player/290309/trevor-kuntar","old":["1",24,1,0,0],"fixed":["2025-26",1,0,0,0]},
  {"id":6261,"name":"Shawn Lalonde","team":"CHI","position":"D","season":"2012-13","nhlId":8474629,"source":"https://www.eliteprospects.com/team/56/chicago-blackhawks/stats/2012-2013","old":["1",22,1,0,0],"fixed":["2012-13",1,0,0,0]},
  {"id":6264,"name":"Peter LeBlanc","team":"WSH","position":"C","season":"2013-14","nhlId":8473505,"source":"https://www.eliteprospects.com/player/12260/peter-leblanc","old":["1",25,1,0,0],"fixed":["2013-14",1,0,0,0]},
  {"id":6265,"name":"Scott Lehman","team":"ATL","position":"D","season":"2008-09","nhlId":8471288,"source":"https://www.statscrew.com/hockey/stats/p-lehmasc01","old":["1",23,1,0,0],"fixed":["2008-09",1,0,0,0]},
  {"id":6279,"name":"Michael Milne","team":"MIN","position":"LW","season":"2024-25","nhlId":8482829,"source":"https://www.eliteprospects.com/player/477344/michael-milne","old":["1",22,1,0,0],"fixed":["2024-25",1,0,0,0]},
  {"id":6280,"name":"Daniil Misyul","team":"NJD","position":"D","season":"2024-25","nhlId":8481536,"source":"https://www.eliteprospects.com/player/395127/daniil-misyul","old":["1",24,1,0,0],"fixed":["2024-25",1,0,0,0]},
  {"id":6285,"name":"Johan Motin","team":"EDM","position":"D","season":"2009-10","nhlId":8474662,"source":"https://www.eliteprospects.com/player/6953/johan-motin","old":["1",20,1,0,0],"fixed":["2009-10",1,0,0,0]},
  {"id":6292,"name":"Jacob Perreault","team":"ANA","position":"RW","season":"2021-22","nhlId":8482150,"source":"https://www.eliteprospects.com/team/1580/anaheim-ducks/stats/all-time/total?nation=CAN&page=3","old":["1",19,1,0,0],"fixed":["2021-22",1,0,0,0]},
  {"id":6293,"name":"Andre Petersson","team":"OTT","position":"RW","season":"2011-12","nhlId":8474670,"source":"https://www.eliteprospects.com/player/7039/andre-petersson","old":["1",21,1,0,0],"fixed":["2011-12",1,0,0,0]},
  {"id":6294,"name":"Nicholas Petrecki","team":"SJS","position":"D","season":"2012-13","nhlId":8474032,"source":"https://www.hockey-reference.com/teams/SJS/2013.html","old":["1",23,1,0,0],"fixed":["2012-13",1,0,0,0]},
  {"id":6298,"name":"Jonathan Racine","team":"FLA","position":"D","season":"2013-14","nhlId":8476411,"source":"https://www.eliteprospects.com/player/45270/jonathan-racine","old":["1",20,1,0,0],"fixed":["2013-14",1,0,0,0]},
  {"id":6302,"name":"Brendan Ranford","team":"DAL","position":"LW","season":"2014-15","nhlId":8475896,"source":"https://www.eliteprospects.com/player/24082/brendan-ranford","old":["1",22,1,0,0],"fixed":["2014-15",1,0,0,0]},
  {"id":6304,"name":"Aku Raty","team":"ARI","position":"RW","season":"2023-24","nhlId":8481699,"source":"https://www.quanthockey.com/hockey-stats/en/profile.php?player=92226","old":["1",22,1,0,1],"fixed":["2023-24",1,0,1,1]},
  {"id":6307,"name":"Drake Rymsha","team":"LAK","position":"C","season":"2020-21","nhlId":8480221,"source":"https://www.eliteprospects.com/player/268925/drake-rymsha","old":["1",22,1,0,0],"fixed":["2020-21",1,0,0,0]},
  {"id":6309,"name":"Max Sauve","team":"BOS","position":"C","season":"2011-12","nhlId":8474607,"source":"https://www.statscrew.com/hockey/stats/p-sauvema01","old":["1",22,1,0,0],"fixed":["2011-12",1,0,0,0]},
  {"id":6310,"name":"Brandon Scanlin","team":"NYR","position":"D","season":"2023-24","nhlId":8483407,"source":"https://www.eliteprospects.com/player/283287/brandon-scanlin","old":["1",24,1,0,0],"fixed":["2023-24",1,0,0,0]},
  {"id":6316,"name":"Shane Sims","team":"NYI","position":"D","season":"2010-11","nhlId":8473611,"source":"https://www.eliteprospects.com/player/12278/shane-sims","old":["1",22,1,0,0],"fixed":["2010-11",1,0,0,0]},
  {"id":6318,"name":"Hunter Skinner","team":"STL","position":"D","season":"2025-26","nhlId":8481715,"source":"https://www.eliteprospects.com/player/359531/hunter-skinner","old":["1",24,1,0,0],"fixed":["2025-26",1,0,0,0]},
  {"id":6320,"name":"David Sloane","team":"PHI","position":"RW","season":"2008-09","nhlId":8475068,"source":"https://www.hockey-reference.com/players/s/sloanda01.html","old":["1",23,1,0,0],"fixed":["2008-09",1,0,0,0]},
  {"id":6322,"name":"Dalton Smith","team":"BUF","position":"LW","season":"2019-20","nhlId":8475748,"source":"https://www.eliteprospects.com/player/30923/dalton-smith","old":["1",27,1,0,0],"fixed":["2019-20",1,0,0,0]},
  {"id":6323,"name":"Carl Sneep","team":"PIT","position":"D","season":"2011-12","nhlId":8473539,"source":"https://www.eliteprospects.com/player/11431/carl-sneep","old":["1",24,1,0,1],"fixed":["2011-12",1,0,1,1]},
  {"id":6327,"name":"Nick Swaney","team":"MIN","position":"RW","season":"2022-23","nhlId":8480275,"source":"https://www.eliteprospects.com/player/274245/nick-swaney","old":["1",25,1,0,0],"fixed":["2022-23",1,0,0,0]},
  {"id":6331,"name":"Josh Teves","team":"VAN","position":"D","season":"2018-19","nhlId":8481425,"source":"https://www.eliteprospects.com/player/197849/josh-teves","old":["1",23,1,0,0],"fixed":["2018-19",1,0,0,0]},
  {"id":6332,"name":"Ryan Thang","team":"NSH","position":"LW","season":"2011-12","nhlId":8474143,"source":"https://www.eliteprospects.com/player/11420/ryan-thang","old":["1",24,1,0,0],"fixed":["2011-12",1,0,0,0]},
  {"id":6349,"name":"Jack Williams","team":"CBJ","position":"F","season":"2024-25","nhlId":8485469,"source":"https://www.eliteprospects.com/player/498800/jack-williams","old":["1",1,0,0,0],"fixed":["2024-25",1,0,0,0]}
]
$rows$::jsonb;
  entry jsonb;
  original jsonb;
  desired jsonb;
  observed jsonb;
  row_id integer;
begin
  perform set_config('lock_timeout', '5s', true);

  for entry in select value from jsonb_array_elements(records) loop
    original := entry->(case when reverse_repair then 'fixed' else 'old' end);
    desired := entry->(case when reverse_repair then 'old' else 'fixed' end);

    begin
      select id, jsonb_build_array(year_from, games, goals, assists, points)
        into strict row_id, observed
        from public.nhl_player_stats
        where player_name = entry->>'name'
          and teams = entry->>'team'
          and position = entry->>'position'
          and year_to = entry->>'season'
        for update;
    exception
      when no_data_found or too_many_rows then
        raise exception 'NHL import repair: source identity mismatch for %', entry->>'name';
    end;

    if observed = desired then
      continue;
    end if;
    if observed is distinct from original then
      raise exception 'NHL import repair: source mismatch at row %', row_id;
    end if;

    update public.nhl_player_stats
      set year_from = desired->>0, games = (desired->>1)::integer,
          goals = (desired->>2)::integer, assists = (desired->>3)::integer,
          points = (desired->>4)::integer
      where id = row_id
      returning jsonb_build_array(year_from, games, goals, assists, points) into observed;

    if observed is distinct from desired then
      raise exception 'NHL import repair: write mismatch at row %', row_id;
    end if;
  end loop;
end;
$repair$;
