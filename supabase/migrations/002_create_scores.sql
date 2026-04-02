-- Create scores table for game round results
create table public.scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  grade text not null check (grade in ('K','1','2','3','4','5','6','7','8','9','10','11','12')),
  score integer not null default 0 check (score >= 0 and score <= 100000),
  streak integer not null default 0 check (streak >= 0),
  problems_correct integer not null default 0 check (problems_correct >= 0),
  problems_total integer not null default 0 check (problems_total >= 0 and problems_total >= problems_correct),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.scores enable row level security;

-- Policy: Users can insert their own scores
create policy "Users can insert own scores"
  on public.scores
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: All authenticated users can read scores (for leaderboard)
create policy "Scores are viewable by authenticated users"
  on public.scores
  for select
  to authenticated
  using (true);

-- Indexes for leaderboard performance
create index idx_scores_grade on public.scores (grade);
create index idx_scores_user_id on public.scores (user_id);
create index idx_scores_grade_score on public.scores (grade, score desc);
create index idx_scores_user_grade on public.scores (user_id, grade);

-- View: Leaderboard aggregated by user and grade
create or replace view public.leaderboard as
select
  s.user_id,
  s.grade,
  p.display_name,
  p.avatar_url,
  sum(s.score) as total_score,
  sum(s.problems_correct) as total_correct,
  sum(s.problems_total) as total_problems,
  max(s.streak) as best_streak,
  count(*) as games_played,
  rank() over (partition by s.grade order by sum(s.score) desc) as rank
from public.scores s
join public.profiles p on p.id = s.user_id
group by s.user_id, s.grade, p.display_name, p.avatar_url;

-- Grant access to leaderboard view only for authenticated users
grant select on public.leaderboard to authenticated;
revoke all on public.leaderboard from anon;
