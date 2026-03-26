alter table public.income_entries
  add column if not exists is_reliable boolean not null default true,
  add column if not exists category varchar(40),
  add column if not exists linked_obligation_id text,
  add column if not exists linked_debt_id text,
  add column if not exists is_partial boolean not null default false,
  add column if not exists parent_income_entry_id text;

alter table public.obligations
  add column if not exists is_externally_covered boolean not null default false,
  add column if not exists coverage_source_label varchar(160),
  add column if not exists minimum_due numeric(14,2),
  add column if not exists past_due_amount numeric(14,2) not null default 0,
  add column if not exists target_payoff_date date;

alter table public.debts
  add column if not exists apr numeric(8,4),
  add column if not exists statement_balance numeric(14,2),
  add column if not exists minimum_met boolean not null default false,
  add column if not exists minimum_met_on date,
  add column if not exists available_credit numeric(14,2),
  add column if not exists no_new_spend_mode boolean not null default false;

alter table public.reserves
  add column if not exists purpose_type varchar(40),
  add column if not exists linked_type varchar(40),
  add column if not exists linked_id text,
  add column if not exists account_id text references public.accounts (id) on delete set null,
  add column if not exists created_on date;

alter table public.roadmap_goals
  add column if not exists category varchar(40) not null default 'finances',
  add column if not exists target_amount numeric(14,2),
  add column if not exists current_amount numeric(14,2),
  add column if not exists blocked_reason text,
  add column if not exists recommended_next_step text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists depends_on_goal_ids jsonb not null default '[]'::jsonb,
  add column if not exists notes text;

alter table public.roadmap_steps
  add column if not exists amount numeric(14,2),
  add column if not exists recommended_action text,
  add column if not exists depends_on_step_ids jsonb not null default '[]'::jsonb,
  add column if not exists is_financial_step boolean not null default false,
  add column if not exists completed_at timestamptz;

alter table public.income_plans
  add column if not exists priority varchar(24) not null default 'medium',
  add column if not exists rolls_up_to_goal_id text,
  add column if not exists recommended_step text,
  add column if not exists is_partial boolean not null default false,
  add column if not exists parent_income_plan_id text,
  add column if not exists source_income_entry_id text;

alter table public.income_plan_allocations
  add column if not exists percent_of_income numeric(7,4),
  add column if not exists is_required boolean not null default false,
  add column if not exists goal_id text,
  add column if not exists account_source_id text,
  add column if not exists account_destination_id text,
  add column if not exists status varchar(24) not null default 'planned',
  add column if not exists executed_amount numeric(14,2),
  add column if not exists executed_on timestamptz;

create index if not exists roadmap_goals_owner_sort_idx on public.roadmap_goals (owner_id, sort_order, target_date);
create index if not exists income_plan_allocations_owner_status_idx on public.income_plan_allocations (owner_id, status, sort_order);
