create table if not exists public.transfer_path_puzzles (
  id         uuid        primary key default gen_random_uuid(),
  puzzle_id  text        not null unique,
  player_a   text        not null,
  player_b   text        not null,
  min_steps  smallint    not null,
  hint       text        not null,
  sort_order smallint    not null,
  created_at timestamptz not null default now()
);
alter table public.transfer_path_puzzles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transfer_path_puzzles' and policyname = 'Public read-only') then
    create policy "Public read-only" on public.transfer_path_puzzles for select to anon, authenticated using (true);
  end if;
end $$;
insert into public.transfer_path_puzzles (puzzle_id, player_a, player_b, min_steps, hint, sort_order) values
('tp-1', 'Zlatan Ibrahimović', 'Wayne Rooney', 1, 'They were teammates at a huge English club.', 0),
('tp-2', 'Lionel Messi', 'Neymar', 1, 'They played together at two different clubs.', 1),
('tp-3', 'Andrea Pirlo', 'Cristiano Ronaldo', 1, 'Both played for the Old Lady.', 2),
('tp-4', 'Fernando Torres', 'Didier Drogba', 1, 'Think London blues.', 3),
('tp-5', 'Steven Gerrard', 'Cristiano Ronaldo', 2, 'A Spanish striker connects them via Liverpool and a Madrid club.', 4),
('tp-6', 'Frank Lampard', 'Lionel Messi', 2, 'A Spanish midfielder played in both London and Catalonia.', 5),
('tp-7', 'Gareth Bale', 'Robert Lewandowski', 2, 'A Croatian maestro connects them through Madrid.', 6),
('tp-8', 'Wayne Rooney', 'Kylian Mbappé', 2, 'An Argentine winger links Manchester to Paris.', 7),
('tp-9', 'Samuel Eto''o', 'Sergio Ramos', 2, 'The GOAT connects them — Barcelona then Paris.', 8),
('tp-10', 'Didier Drogba', 'Neymar', 2, 'A Cameroonian legend bridges Chelsea to Barcelona.', 9),
('tp-11', 'Luis Suárez', 'Eden Hazard', 2, 'An Atlético/Barça connection — via a French striker.', 10),
('tp-12', 'Arjen Robben', 'Paul Pogba', 2, 'A Chilean midfielder links Bayern to Juventus.', 11),
('tp-13', 'Son Heung-min', 'Karim Benzema', 2, 'A Welsh speedster connects North London to the Bernabéu.', 12),
('tp-14', 'Mohamed Salah', 'Zlatan Ibrahimović', 2, 'Think about who else played at Liverpool and then crossed paths with the Swede.', 13),
('tp-15', 'Steven Gerrard', 'Erling Haaland', 3, 'Liverpool → Barcelona → Bayern/Dortmund route.', 14),
('tp-16', 'Frank Lampard', 'Vinícius Júnior', 3, 'Chelsea → Real Madrid → the current generation.', 15),
('tp-17', 'Gianluigi Buffon', 'Mohamed Salah', 3, 'Juventus → Manchester United → Inter/Chelsea → Liverpool route.', 16),
('tp-18', 'Didier Drogba', 'Jude Bellingham', 3, 'Chelsea → Real Madrid, through a German and Belgian.', 17),
('tp-19', 'Yaya Touré', 'Lamine Yamal', 3, 'Manchester City → Barcelona via an Argentine legend.', 18),
('tp-20', 'Franck Ribéry', 'Harry Kane', 3, 'Bayern Munich connects them across generations.', 19)
on conflict (puzzle_id) do update set
  player_a = excluded.player_a, player_b = excluded.player_b, min_steps = excluded.min_steps,
  hint = excluded.hint, sort_order = excluded.sort_order;
