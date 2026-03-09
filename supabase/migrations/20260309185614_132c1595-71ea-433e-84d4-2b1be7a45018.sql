
-- Update France to reflect Paris 2024 home Games success
UPDATE guess_nation_countries 
SET 
  total_medals_hint = 'Has won over 850 total medals, boosted by a record-breaking Paris 2024 home Games',
  gold_medal_hint = 'Has won over 270 gold medals, including 16 golds at Paris 2024',
  famous_moment_hint = 'Hosted the 2024 Summer Games in Paris to massive acclaim; Léon Marchand won 4 individual swimming golds',
  iconic_moment = 'Léon Marchand electrified Paris 2024 with 4 individual gold medals in swimming, becoming a national hero'
WHERE country_name = 'France';

-- Update Italy to reflect Milan-Cortina 2026 hosting
UPDATE guess_nation_countries 
SET 
  total_medals_hint = 'Has won over 750 total medals, with strong showing as host of Milan-Cortina 2026',
  famous_moment_hint = 'Hosted the 2026 Winter Olympics at Milan-Cortina; Federica Brignone starred in Alpine skiing on home snow',
  iconic_moment = 'Italy hosted the 2026 Winter Olympics at Milan-Cortina, with Federica Brignone winning Alpine skiing gold on home soil'
WHERE country_name = 'Italy';

-- Update USA to reflect Paris 2024 and Milan-Cortina 2026
UPDATE guess_nation_countries 
SET 
  total_medals_hint = 'Has won over 2,700 total medals — the most of any nation in history',
  gold_medal_hint = 'Has won over 1,100 gold medals — more than any other country',
  famous_moment_hint = 'Noah Lyles won the 100m gold by 5 thousandths of a second at Paris 2024; Simone Biles returned to win 3 golds'
WHERE country_name = 'United States';

-- Update Norway with Milan-Cortina 2026
UPDATE guess_nation_countries 
SET 
  total_medals_hint = 'Has won over 500 total medals, dominated by winter events',
  winter_history_hint = 'The most dominant Winter nation of all time — topped the medal table again at Milan-Cortina 2026',
  famous_moment_hint = 'Johannes Thingnes Bø led Norway atop the 2026 Winter Games medal table; dominant in biathlon and cross-country'
WHERE country_name = 'Norway';

-- Update Japan with Tokyo 2020 and Paris 2024 context
UPDATE guess_nation_countries 
SET 
  famous_moment_hint = 'Hosted the delayed 2020 Games in Tokyo; won a record 27 golds at home and continued strong at Paris 2024'
WHERE country_name = 'Japan';

-- Update China with Paris 2024
UPDATE guess_nation_countries 
SET 
  total_medals_hint = 'Has won over 650 total medals, rivaling the USA for gold medal count at Paris 2024',
  famous_moment_hint = 'Tied the USA for most golds at Paris 2024 with 40; dominant in diving, shooting, and weightlifting'
WHERE country_name = 'China';

-- Update Australia with Paris 2024
UPDATE guess_nation_countries 
SET 
  famous_moment_hint = 'Excelled at Paris 2024 with strong performances in swimming, led by Kaylee McKeown and Ariarne Titmus'
WHERE country_name = 'Australia';
