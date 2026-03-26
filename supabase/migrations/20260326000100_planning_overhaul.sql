create table public.action_items (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  title varchar(200) not null,
  detail text,
  status varchar(24) not null default 'todo',
  lane varchar(40) not null default 'this_week',
  source varchar(40) not null default 'system',
  due_on date,
  linked_type varchar(40),
  linked_id text,
  planner_source varchar(40),
  completed_at timestamptz,
  skipped_at timestamptz,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_goals (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  title varchar(200) not null,
  description text not null default '',
  status varchar(24) not null default 'active',
  priority varchar(24) not null default 'medium',
  target_date date,
  linked_type varchar(40),
  linked_id text,
  metric_kind varchar(40),
  metric_start_value numeric(14,2),
  metric_current_value numeric(14,2),
  metric_target_value numeric(14,2),
  planner_source varchar(40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_steps (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  goal_id text not null references public.roadmap_goals (id) on delete cascade,
  title varchar(200) not null,
  status varchar(24) not null default 'todo',
  due_on date,
  sort_order integer not null default 0,
  linked_type varchar(40),
  linked_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_plans (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  label varchar(200) not null,
  amount numeric(14,2) not null,
  expected_on date,
  is_reliable boolean not null default true,
  status varchar(24) not null default 'planned',
  notes text,
  planner_source varchar(40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_plan_allocations (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  income_plan_id text not null references public.income_plans (id) on delete cascade,
  label varchar(200) not null,
  allocation_type varchar(40) not null,
  amount numeric(14,2) not null,
  sort_order integer not null default 0,
  linked_type varchar(40),
  linked_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_events (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  event_type varchar(40) not null,
  title varchar(200) not null,
  detail text,
  occurred_at timestamptz not null default now(),
  amount numeric(14,2),
  linked_type varchar(40),
  linked_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.progress_snapshots (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  snapshot_date date not null,
  free_now numeric(14,2) not null default 0,
  free_after_planned_income numeric(14,2) not null default 0,
  total_debt numeric(14,2) not null default 0,
  overdue_count integer not null default 0,
  completed_actions integer not null default 0,
  goal_completion_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint progress_snapshots_owner_date_unique unique (owner_id, snapshot_date)
);

create table public.planner_drafts (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(200) not null,
  status varchar(24) not null default 'draft',
  draft jsonb not null default '{}'::jsonb,
  planner_source varchar(40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index action_items_owner_lane_due_idx on public.action_items (owner_id, lane, due_on);
create index roadmap_goals_owner_status_idx on public.roadmap_goals (owner_id, status, priority);
create index roadmap_steps_owner_goal_idx on public.roadmap_steps (owner_id, goal_id, sort_order);
create index income_plans_owner_expected_idx on public.income_plans (owner_id, expected_on);
create index income_plan_allocations_owner_plan_idx on public.income_plan_allocations (owner_id, income_plan_id, sort_order);
create index activity_events_owner_occurred_idx on public.activity_events (owner_id, occurred_at desc);
create index progress_snapshots_owner_date_idx on public.progress_snapshots (owner_id, snapshot_date desc);
create index planner_drafts_owner_status_idx on public.planner_drafts (owner_id, status);

create or replace function public.enable_owner_rls(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('alter table public.%I enable row level security', table_name);
  execute format('create policy %I_select on public.%I for select using ((owner_id)::uuid = auth.uid())', table_name || '_owner', table_name);
  execute format('create policy %I_insert on public.%I for insert with check ((owner_id)::uuid = auth.uid())', table_name || '_owner', table_name);
  execute format('create policy %I_update on public.%I for update using ((owner_id)::uuid = auth.uid()) with check ((owner_id)::uuid = auth.uid())', table_name || '_owner', table_name);
  execute format('create policy %I_delete on public.%I for delete using ((owner_id)::uuid = auth.uid())', table_name || '_owner', table_name);
end;
$$;

select public.enable_owner_rls('action_items');
select public.enable_owner_rls('roadmap_goals');
select public.enable_owner_rls('roadmap_steps');
select public.enable_owner_rls('income_plans');
select public.enable_owner_rls('income_plan_allocations');
select public.enable_owner_rls('activity_events');
select public.enable_owner_rls('progress_snapshots');
select public.enable_owner_rls('planner_drafts');

drop function public.enable_owner_rls(text);

create trigger set_action_items_updated_at before update on public.action_items for each row execute procedure public.set_updated_at();
create trigger set_roadmap_goals_updated_at before update on public.roadmap_goals for each row execute procedure public.set_updated_at();
create trigger set_roadmap_steps_updated_at before update on public.roadmap_steps for each row execute procedure public.set_updated_at();
create trigger set_income_plans_updated_at before update on public.income_plans for each row execute procedure public.set_updated_at();
create trigger set_income_plan_allocations_updated_at before update on public.income_plan_allocations for each row execute procedure public.set_updated_at();
create trigger set_activity_events_updated_at before update on public.activity_events for each row execute procedure public.set_updated_at();
create trigger set_progress_snapshots_updated_at before update on public.progress_snapshots for each row execute procedure public.set_updated_at();
create trigger set_planner_drafts_updated_at before update on public.planner_drafts for each row execute procedure public.set_updated_at();

delete from public.tasks;
delete from public.roadmap_items;
delete from public.strategy_documents;
delete from public.transactions;
delete from public.income_entries;
delete from public.merchants;
delete from public.income_sources;
delete from public.reserves;
