-- Run once in Supabase Dashboard > SQL Editor.
-- Every authenticated account shares the same investment portfolio.
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 40),
  category text not null check (category in ('부동산', 'SOC', '선박·항공기', '유동화', '상품·파생', '기타')),
  region text not null check (region in ('국내', '북미', '중남미', '아시아', '유럽', '오세아니아', '중동')),
  amount numeric not null check (amount >= 0),
  opb numeric not null check (opb >= 0 and opb <= amount),
  return_rate numeric not null,
  maturity_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists investments_user_name_unique
  on public.investments (lower(trim(name)));

alter table public.investments enable row level security;
revoke all on public.investments from anon;
grant select, insert, update, delete on public.investments to authenticated;

drop policy if exists "Users can read their investments" on public.investments;
drop policy if exists "Authenticated users can read investments" on public.investments;
create policy "Authenticated users can read investments" on public.investments
  for select to authenticated using (true);

drop policy if exists "Users can add their investments" on public.investments;
drop policy if exists "Authenticated users can add investments" on public.investments;
create policy "Authenticated users can add investments" on public.investments
  for insert to authenticated with check (true);

drop policy if exists "Users can update their investments" on public.investments;
drop policy if exists "Authenticated users can update investments" on public.investments;
create policy "Authenticated users can update investments" on public.investments
  for update to authenticated using (true) with check (true);

drop policy if exists "Users can delete their investments" on public.investments;
drop policy if exists "Authenticated users can delete investments" on public.investments;
create policy "Authenticated users can delete investments" on public.investments
  for delete to authenticated using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'investments'
  ) then
    alter publication supabase_realtime add table public.investments;
  end if;
end $$;
