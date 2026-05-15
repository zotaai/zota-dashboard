-- ============================================================
-- ZOTA AI — Supabase Schema v2
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Tablas ───────────────────────────────────────────────────

create table if not exists public.users (
  id          text primary key,
  name        text not null,
  created_at  timestamptz default now()
);

create table if not exists public.periods (
  id            text primary key,
  name          text not null,
  start_date    text not null,
  end_date      text not null,
  working_days  integer default null, -- null = auto-calculated; set manually to override holidays
  created_at    timestamptz default now()
);

create table if not exists public.clients (
  name  text primary key
);

create table if not exists public.projects (
  name         text not null,
  client_name  text not null references public.clients(name) on delete cascade,
  primary key (name, client_name)
);

create table if not exists public.reports (
  id              text primary key,
  user_id         text references public.users(id) on delete set null,
  period_id       text references public.periods(id) on delete set null,
  submitted_at    timestamptz not null default now(),
  total_days      numeric not null default 0,
  total_expenses  numeric not null default 0,
  created_at      timestamptz default now()
);

create table if not exists public.activities (
  id           text primary key,
  report_id    text not null references public.reports(id) on delete cascade,
  description  text not null,
  client       text not null default '',
  project      text not null default '',
  days         numeric not null
);

create table if not exists public.expenses (
  id           text primary key,
  report_id    text not null references public.reports(id) on delete cascade,
  description  text not null,
  amount       numeric not null default 0,
  file_name    text,
  file_data    text
);

-- ── Row Level Security ────────────────────────────────────────
-- App pública sin auth → anon puede leer y escribir.
-- Cuando agregues autenticación, reemplaza estas políticas.

alter table public.users       enable row level security;
alter table public.periods      enable row level security;
alter table public.clients      enable row level security;
alter table public.projects     enable row level security;
alter table public.reports      enable row level security;
alter table public.activities   enable row level security;
alter table public.expenses     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['users','periods','clients','projects','reports','activities','expenses'] loop
    execute format(
      'create policy "anon_all" on public.%I for all to anon using (true) with check (true)', t
    );
  end loop;
end;
$$;

-- ── Índices ───────────────────────────────────────────────────

create index if not exists idx_reports_user_id    on public.reports(user_id);
create index if not exists idx_reports_period_id  on public.reports(period_id);
create index if not exists idx_activities_report  on public.activities(report_id);
create index if not exists idx_expenses_report    on public.expenses(report_id);
create index if not exists idx_projects_client    on public.projects(client_name);

-- ── Realtime ──────────────────────────────────────────────────

alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.periods;
alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.expenses;

-- ── Seed: datos iniciales ─────────────────────────────────────

insert into public.users (id, name) values
  ('1', 'Juan García'),
  ('2', 'María López'),
  ('3', 'Carlos Rodríguez')
on conflict (id) do nothing;

insert into public.periods (id, name, start_date, end_date) values
  ('1', '1ra Quincena Mayo 2026', '2026-05-01', '2026-05-15'),
  ('2', '2da Quincena Mayo 2026', '2026-05-16', '2026-05-31'),
  ('3', '1ra Quincena Junio 2026', '2026-06-01', '2026-06-15')
on conflict (id) do nothing;

insert into public.clients (name) values
  ('Zota AI'),
  ('Cliente Externo 1'),
  ('Cliente Externo 2')
on conflict (name) do nothing;

insert into public.projects (name, client_name) values
  ('Proyecto Alpha', 'Zota AI'),
  ('Proyecto Beta',  'Zota AI'),
  ('Proyecto Gamma', 'Cliente Externo 1')
on conflict (name, client_name) do nothing;
