create table if not exists public.shirt_number_puzzles (
  id          uuid        primary key default gen_random_uuid(),
  player_name text        not null,
  club        text        not null,
  league      text        not null,
  nationality text        not null,
  kit_number  smallint    not null,
  fun_fact    text        not null,
  created_at  timestamptz not null default now()
);
alter table public.shirt_number_puzzles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shirt_number_puzzles' and policyname = 'Public read-only') then
    create policy "Public read-only" on public.shirt_number_puzzles for select to anon, authenticated using (true);
  end if;
end $$;
insert into public.shirt_number_puzzles (id, player_name, club, league, nationality, kit_number, fun_fact) values
('69b9097c-0b0e-4b6a-965c-27eaa03947db'::uuid, 'Alejandro Garnacho', 'Manchester United', 'Premier League', '🇦🇷', 17, '#17 — following in the footsteps of Nani at Old Trafford.'),
('c7f6ade7-16a6-4c41-baf3-7b3e23fb9115'::uuid, 'Alisson Becker', 'Liverpool', 'Premier League', '🇧🇷', 1, '#1 for the best goalkeeper in the Premier League.'),
('55a81fda-2856-4622-a932-f0cfdd3038f9'::uuid, 'Bruno Fernandes', 'Manchester United', 'Premier League', '🇵🇹', 8, 'Switched from #18 to the iconic #8 at Old Trafford.'),
('0bd1c27e-02d9-4a42-9dee-864ee4f06810'::uuid, 'Bukayo Saka', 'Arsenal', 'Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 7, 'Took the legendary #7 shirt at Arsenal aged just 21.'),
('575f706e-7ae5-40b1-b93c-377e669618bc'::uuid, 'Cole Palmer', 'Chelsea', 'Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 20, 'Cold Palmer wears #20 at Stamford Bridge.'),
('9e86e4d9-7f42-4429-b721-eee6c17621a8'::uuid, 'Cristiano Ronaldo', 'Al Nassr', 'Saudi Pro League', '🇵🇹', 7, 'CR7 — the brand built around a shirt number.'),
('0c523797-d336-480b-84f9-adfcfe9bfc9d'::uuid, 'Dani Olmo', 'Barcelona', 'La Liga', '🇪🇸', 20, 'Euro 2024 Golden Ball winner wearing #20 at Camp Nou.'),
('fa241d85-7a6b-464f-b8ac-e6f3a9bb4d04'::uuid, 'Declan Rice', 'Arsenal', 'Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 41, 'Chose #41 at Arsenal — his childhood house number.'),
('a873b106-6ff9-4635-a3ff-033c989d3445'::uuid, 'Erling Haaland', 'Manchester City', 'Premier League', '🇳🇴', 9, 'The classic centre-forward number for a goal machine.'),
('88d17d6c-b059-404b-acf4-f60b0406239a'::uuid, 'Federico Valverde', 'Real Madrid', 'La Liga', '🇺🇾', 8, 'The engine of Madrid''s midfield in the classic #8.'),
('22d186c1-0474-4a60-a12d-075d4b2aa2f7'::uuid, 'Florian Wirtz', 'Bayer Leverkusen', 'Bundesliga', '🇩🇪', 10, 'Germany''s next great #10 — leading the charge at Leverkusen.'),
('90a5d413-dc2a-4a33-8ed7-480e4627c8cd'::uuid, 'Gavi', 'Barcelona', 'La Liga', '🇪🇸', 6, '#6 — the number of Xavi Hernández, a fitting successor.'),
('44cf242a-97a0-4b5c-a8f6-cb82617276f7'::uuid, 'Jamal Musiala', 'Bayern Munich', 'Bundesliga', '🇩🇪', 42, 'Kept his academy #42 — the answer to everything, apparently.'),
('c35bede1-6895-4fc4-a39e-4d12f97f04a1'::uuid, 'Jude Bellingham', 'Real Madrid', 'La Liga', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 5, 'Chose #5 in honour of Zinedine Zidane at Real Madrid.'),
('df1abe35-1b7c-4c25-b295-e82d92c444ab'::uuid, 'Kevin De Bruyne', 'Manchester City', 'Premier League', '🇧🇪', 17, 'An unusual number for a star midfielder — KDB made it his own.'),
('529ba71c-9965-4305-a6d9-e458201149a9'::uuid, 'Khvicha Kvaratskhelia', 'PSG', 'Ligue 1', '🇬🇪', 7, 'Kvara took the prestigious #7 at Paris Saint-Germain.'),
('dbd0dc33-5d87-4423-9859-112469dae94f'::uuid, 'Kylian Mbappé', 'Real Madrid', 'La Liga', '🇫🇷', 9, 'Took #9 at Madrid — the number once worn by Ronaldo Nazário.'),
('236b35a6-2676-4b99-a739-d20fe7376743'::uuid, 'Lamine Yamal', 'Barcelona', 'La Liga', '🇪🇸', 19, 'The teenage wonderkid burst onto the scene wearing #19.'),
('34639fdc-a48f-472c-8dad-b6f2fe866936'::uuid, 'Lionel Messi', 'Inter Miami', 'MLS', '🇦🇷', 10, 'The iconic #10 — worn by Maradona, Pelé, and the GOAT himself.'),
('922b5c4d-6545-4ae1-b3ac-821e2dddff5c'::uuid, 'Martin Ødegaard', 'Arsenal', 'Premier League', '🇳🇴', 8, 'The Arsenal captain wears the classic #8 playmaker shirt.'),
('1f6ba9b5-0c8b-41c0-9961-340f1c2ae187'::uuid, 'Mohamed Salah', 'Liverpool', 'Premier League', '🇪🇬', 11, 'The Egyptian King has made #11 iconic at Anfield.'),
('00369581-0ea3-4336-a3b0-9b1e7c38e726'::uuid, 'Neymar Jr.', 'Santos', 'Brazilian Série A', '🇧🇷', 10, 'Back to where it all started, wearing the famous #10.'),
('e7938143-4b15-4511-aa0d-885f10efca5f'::uuid, 'Pedri', 'Barcelona', 'La Liga', '🇪🇸', 8, 'Wears the #8 previously held by Barça legend Andrés Iniesta.'),
('b6dd3315-2ed0-40c0-98e2-683a1595341a'::uuid, 'Phil Foden', 'Manchester City', 'Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 47, '#47 — kept his academy number as a tribute to his roots.'),
('f54db41f-9992-4e90-b5b6-e924b1d09971'::uuid, 'Robert Lewandowski', 'Barcelona', 'La Liga', '🇵🇱', 9, 'The prolific #9 — carried this number across Bayern and Barça.'),
('d8af5072-678e-470c-ab4b-71a7ebca7b32'::uuid, 'Rodri', 'Manchester City', 'Premier League', '🇪🇸', 16, 'The 2024 Ballon d''Or winner rocks #16 in midfield.'),
('cc30e3e3-6ba6-4d1f-9801-5a2053b99b7c'::uuid, 'Son Heung-min', 'Tottenham', 'Premier League', '🇰🇷', 7, 'The Spurs talisman proudly wears the captain''s #7.'),
('1364ceef-a969-4d3f-bc2f-f3d5a193aea1'::uuid, 'Thibaut Courtois', 'Real Madrid', 'La Liga', '🇧🇪', 1, 'The #1 goalkeeper — the ultimate number for a shot-stopper.'),
('1b56f2bd-48bc-47af-a73d-e4a3d64a81ea'::uuid, 'Trent Alexander-Arnold', 'Liverpool', 'Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 66, '#66 — kept his academy number and made it world-famous.'),
('68d2c996-8e65-4f3e-a365-87b94a0c0d13'::uuid, 'Vinicius Jr.', 'Real Madrid', 'La Liga', '🇧🇷', 7, 'Inherited the legendary #7 at the Bernabéu from Cristiano Ronaldo.'),
('1ab6b268-1745-48a0-a699-4db66a8ae609'::uuid, 'Virgil van Dijk', 'Liverpool', 'Premier League', '🇳🇱', 4, 'The commanding #4 — a classic centre-back number.'),
('95709d37-09bf-48f6-a011-a61e09d7b2ea'::uuid, 'William Saliba', 'Arsenal', 'Premier League', '🇫🇷', 2, '#2 — an unusual pick for a centre-back, but Saliba owns it.')
on conflict (id) do update set
  player_name = excluded.player_name, club = excluded.club, league = excluded.league,
  nationality = excluded.nationality, kit_number = excluded.kit_number, fun_fact = excluded.fun_fact;
