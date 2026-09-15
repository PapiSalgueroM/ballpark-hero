-- Round 521: the polls get their character back.
--
-- The owner, 2026-09-10: "your polls are extremely dull u should add more
-- character like u used to make them". Round 509 had rewritten every stocked
-- question to one of two strings (Who you got? / Who ranks higher all time?)
-- and the home page component was rewriting the database question to those
-- two strings as well, so even a topical row written by the polls routine
-- ("Niners vs Rams in Australia tonight. Who wins?") rendered as "Who ranks
-- higher all time?" over 49ers and Rams.
--
-- This migration gives every still-to-come canned row a real question for
-- its matchup. The choices stay exactly as they were (they are short names,
-- which is the owner's 2026-08-16 rule), so no vote is orphaned and no
-- matchup changes. Three routine-written rows also get their long choices
-- shortened to the three word rule. Every row is matched on its key AND its
-- current text before it is touched, and the block raises if any row is not
-- exactly where this file expects it, so a partial edit cannot land.
--
-- Rows on or before 2026-09-10 are left alone: they are either past or live
-- with votes already cast against their current text.

do $migration$
declare
  r record;
  n integer;
  touched integer := 0;
  leftover integer;
begin
  for r in
    select * from (values
      ('dp-2026-09-13-1', 'Randy Moss', 'Calvin Johnson', 'Moss or Megatron, who gets the jump ball with the game on the line?'),
      ('dp-2026-09-13-2', 'Maple Leafs', 'Canadiens', 'Leafs or Habs, a game seven with the whole country watching, who wins?'),
      ('dp-2026-09-14-1', 'Brady', 'Montana', 'Brady or Montana, two minutes left in a Super Bowl, who is your quarterback?'),
      ('dp-2026-09-14-2', 'Kaka', 'Ronaldinho', 'Kaka or Ronaldinho at their peak, who do you pay to watch?'),
      ('dp-2026-09-15-1', 'Hakeem Olajuwon', 'David Robinson', 'Hakeem or the Admiral, the best big man of the nineties?'),
      ('dp-2026-09-15-2', 'Tyson', 'Fury', 'Prime Tyson against prime Fury, who is left standing?'),
      ('dp-2026-09-16-1', 'Bayern', 'Dortmund', 'Der Klassiker with the title on the line, who do you back?'),
      ('dp-2026-09-16-2', 'Venus', 'Serena', 'Venus or Serena, a final between the sisters at their best, who wins?'),
      ('dp-2026-09-17-1', 'Deion Sanders', 'Darrelle Revis', 'Deion or Revis Island, whose side of the field do you never throw to?'),
      ('dp-2026-09-17-2', 'Ichiro', 'Tony Gwynn', 'Ichiro or Tony Gwynn, you need one single with two outs, who is up?'),
      ('dp-2026-09-18-1', 'Ali', 'Tyson', 'Ali or Tyson, both at their best, fifteen rounds, who wins?'),
      ('dp-2026-09-18-2', 'McDavid', 'Crosby', 'McDavid or Crosby, you get one for a whole career, who do you take?'),
      ('dp-2026-09-19-1', 'Thierry Henry', 'Dennis Bergkamp', 'Henry or Bergkamp, the better Arsenal Invincible?'),
      ('dp-2026-09-19-2', 'Durant', 'Dirk', 'Durant or Dirk, the best seven footer to ever shoot it?'),
      ('dp-2026-09-20-1', 'Ray Lewis', 'Troy Polamalu', 'Ray Lewis or Polamalu, who would you least want to see across the line?'),
      ('dp-2026-09-20-2', 'Messi', 'Ronaldo', 'Messi or Ronaldo, the argument that never ends, where do you land today?'),
      ('dp-2026-09-21-1', 'Ted Williams', 'Stan Musial', 'Ted Williams or Stan Musial, the purest hitter of them all?'),
      ('dp-2026-09-21-2', 'Prost', 'Senna', 'Prost or Senna, same car, one lap of Monaco, who is quicker?'),
      ('dp-2026-09-22-1', 'Senna', 'Schumacher', 'Senna or Schumacher, the greatest driver you ever saw?'),
      ('dp-2026-09-22-2', 'Steph Curry', 'Magic Johnson', 'Curry or Magic, who changed the point guard spot more?'),
      ('dp-2026-09-23-1', 'Boca Juniors', 'River Plate', 'Superclasico with everything on the line, who do you back?'),
      ('dp-2026-09-23-2', 'Rodgers', 'Brees', 'Rodgers or Brees, the better pure passer?'),
      ('dp-2026-09-24-1', 'Red Wings', 'Blackhawks', 'Red Wings or Blackhawks, whose run this century impressed you more?'),
      ('dp-2026-09-24-2', 'McEnroe', 'Borg', 'McEnroe or Borg, fire or ice, who do you take in a Wimbledon final?'),
      ('dp-2026-09-25-1', '1996 Bulls', '2017 Warriors', '96 Bulls or 17 Warriors, a best of seven, who takes it?'),
      ('dp-2026-09-25-2', 'Canelo', 'GGG', 'Canelo or GGG, who really won that trilogy?'),
      ('dp-2026-09-26-1', 'Babe Ruth', 'Willie Mays', 'Babe Ruth or Willie Mays, the greatest baseball player ever?'),
      ('dp-2026-09-26-2', 'Maldini', 'Ramos', 'Maldini or Ramos, one defender to protect a one goal lead, who?'),
      ('dp-2026-09-27-1', 'Gronk', 'Tony Gonzalez', 'Gronk or Tony Gonzalez, the best tight end ever?'),
      ('dp-2026-09-27-2', 'Real Madrid', 'Barcelona', 'El Clasico for the title on the last day, who do you back?'),
      ('dp-2026-09-28-1', 'T-Mac', 'Vince Carter', 'T-Mac or Vince Carter, the better prime?'),
      ('dp-2026-09-28-2', 'Bobby Orr', 'Nicklas Lidstrom', 'Bobby Orr or Lidstrom, the best defenseman to ever lace them up?'),
      ('dp-2026-09-29-1', 'R9 Ronaldo', 'Mbappe', 'R9 or Mbappe, one striker at full speed, who scares a defense more?'),
      ('dp-2026-09-29-2', 'Mariano Rivera', 'Trevor Hoffman', 'Rivera or Hoffman, ninth inning of a World Series game, who closes?'),
      ('dp-2026-09-30-1', 'Gretzky', 'Lemieux', 'Gretzky or Lemieux, the more talented player, rings aside?'),
      ('dp-2026-09-30-2', 'Adrian Peterson', 'Derrick Henry', 'AP or Derrick Henry, fourth and one, who gets the ball?'),
      ('dp-2026-10-01-1', 'Marciano', 'Mayweather', 'Marciano or Mayweather, both unbeaten, who stays that way?'),
      ('dp-2026-10-01-2', 'Jordan', 'Garnett', 'Jordan or Garnett, the most intense competitor you ever watched?'),
      ('dp-2026-10-02-1', 'Scholes', 'Pirlo', 'Scholes or Pirlo, who runs your midfield?'),
      ('dp-2026-10-02-2', 'Hamilton', 'Schumacher', 'Hamilton or Schumacher, seven titles each, who was better?'),
      ('dp-2026-10-03-1', 'Packers', 'Bears', 'Packers or Bears at Lambeau in December, who wins?'),
      ('dp-2026-10-03-2', 'Federer', 'Nadal', 'Federer or Nadal, a fifth set on a hard court, who wins?'),
      ('dp-2026-10-04-1', 'Drogba', 'Aguero', 'Drogba or Aguero, one striker for a cup final, who?'),
      ('dp-2026-10-04-2', 'Nolan Ryan', 'Sandy Koufax', 'Nolan Ryan or Koufax, one start to win game seven, who pitches?'),
      ('dp-2026-10-05-1', 'Shaq', 'Dwight Howard', 'Shaq or Dwight, the better Magic big man?'),
      ('dp-2026-10-05-2', 'Manny Pacquiao', 'Roberto Duran', 'Pacquiao or Duran, twelve rounds at their best, who wins?')
    ) as rows(poll_key, a, b, new_question)
  loop
    select count(*) into n
    from public.daily_polls p
    where p.poll_key = r.poll_key
      and p.option_a = r.a
      and p.option_b = r.b
      and p.question in ('Who you got?', 'Who ranks higher all time?')
      and p.poll_date >= date '2026-09-11';
    if n <> 1 then
      raise exception 'Expected one canned row for % (% v %), found %', r.poll_key, r.a, r.b, n;
    end if;
    if position(chr(8212) in r.new_question) > 0 or position(chr(8211) in r.new_question) > 0 then
      raise exception 'Long dash in the new question for %', r.poll_key;
    end if;
    update public.daily_polls set question = r.new_question where poll_key = r.poll_key;
    touched := touched + 1;
  end loop;

  if touched <> 46 then
    raise exception 'Expected to rewrite 46 canned rows, rewrote %', touched;
  end if;

  -- Three routine-written rows whose choices ran past the three word rule.
  for r in
    select * from (values
      ('dp-2026-09-11-2', 'Very, season hinges on him', 'That defense carries them', 'Very worried', 'Defense carries them'),
      ('dp-2026-09-11-3', 'Phillies take the East', 'Braves hold on', 'Phillies catch them', 'Braves hold on'),
      ('dp-2026-09-12-3', 'Yes, shake it up', 'No, keep it separate', 'Shake it up', 'Keep it separate')
    ) as rows(poll_key, old_a, old_b, new_a, new_b)
  loop
    select count(*) into n
    from public.daily_polls p
    where p.poll_key = r.poll_key and p.option_a = r.old_a and p.option_b = r.old_b;
    if n <> 1 then
      raise exception 'Expected one row for % with its long choices, found %', r.poll_key, n;
    end if;
    update public.daily_polls set option_a = r.new_a, option_b = r.new_b where poll_key = r.poll_key;
  end loop;

  select count(*) into leftover
  from public.daily_polls
  where poll_date >= date '2026-09-11'
    and question in ('Who you got?', 'Who ranks higher all time?');
  if leftover <> 0 then
    raise exception '% stocked rows still carry a canned question', leftover;
  end if;
end
$migration$;
