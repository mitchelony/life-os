create extension if not exists pgcrypto;

create type public.account_type as enum (
  'checking',
  'savings',
  'cash',
  'credit_card',
  'loan',
  'other'
);

create type public.category_kind as enum (
  'expense',
  'income',
  'both'
);

create type public.transaction_direction as enum (
  'income',
  'expense'
);

create type public.transaction_status as enum (
  'pending',
  'posted',
  'voided'
);

create type public.obligation_type as enum (
  'bill',
  'rent',
  'utility',
  'subscription',
  'tax',
  'insurance',
  'debt_payment',
  'other'
);

create type public.obligation_status as enum (
  'active',
  'paused',
  'completed',
  'cancelled'
);

create type public.schedule_frequency as enum (
  'one_time',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly'
);

create type public.income_entry_status as enum (
  'expected',
  'received',
  'missed',
  'cancelled'
);

create type public.debt_type as enum (
  'credit_card',
  'loan',
  'tax',
  'medical',
  'personal',
  'other'
);

create type public.debt_status as enum (
  'active',
  'paused',
  'paid_off',
  'cancelled'
);

create type public.task_status as enum (
  'open',
  'in_progress',
  'done',
  'snoozed',
  'cancelled'
);

create type public.reserve_type as enum (
  'manual',
  'bill_buffer',
  'debt_buffer',
  'savings_floor',
  'emergency',
  'sinking',
  'custom'
);

create type public.budget_target_type as enum (
  'protected_cash_buffer',
  'essential_weekly_spend',
  'savings_goal',
  'debt_payment',
  'custom'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_display_name text;
begin
  resolved_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, resolved_display_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now();

  insert into public.app_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.onboarding_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  currency_code text not null default 'USD',
  timezone text not null default 'America/Chicago',
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  dashboard_horizon_days smallint not null default 7 check (dashboard_horizon_days between 1 and 31),
  low_balance_warning_threshold numeric(12,2) not null default 100,
  compact_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.onboarding_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  is_completed boolean not null default false,
  current_step text not null default 'welcome',
  completed_at timestamptz,
  started_at timestamptz not null default now(),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type public.account_type not null,
  institution text,
  opening_balance numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  credit_limit numeric(12,2),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  kind public.category_kind not null default 'expense',
  icon text,
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_builtin boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  target_type public.budget_target_type not null,
  cadence public.schedule_frequency not null default 'one_time',
  amount numeric(12,2) not null check (amount >= 0),
  effective_start date not null default current_date,
  effective_end date,
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reserves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  reserve_type public.reserve_type not null default 'manual',
  amount numeric(12,2) not null check (amount >= 0),
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  creditor_name text,
  debt_type public.debt_type not null default 'other',
  status public.debt_status not null default 'active',
  current_balance numeric(12,2) not null default 0 check (current_balance >= 0),
  minimum_payment numeric(12,2) not null default 0 check (minimum_payment >= 0),
  due_date date,
  interest_rate numeric(6,3),
  linked_account_id uuid references public.accounts (id) on delete set null,
  last_payment_date date,
  last_payment_amount numeric(12,2),
  priority smallint not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  obligation_type public.obligation_type not null default 'bill',
  status public.obligation_status not null default 'active',
  amount numeric(12,2) not null check (amount >= 0),
  next_due_date date not null,
  frequency public.schedule_frequency not null default 'one_time',
  frequency_interval integer not null default 1 check (frequency_interval > 0),
  account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  merchant_id uuid references public.merchants (id) on delete set null,
  last_paid_date date,
  last_paid_amount numeric(12,2),
  grace_days integer not null default 0 check (grace_days >= 0),
  is_required boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'open',
  priority smallint not null default 0,
  due_date date,
  snoozed_until date,
  category_id uuid references public.categories (id) on delete set null,
  linked_obligation_id uuid references public.obligations (id) on delete set null,
  linked_debt_id uuid references public.debts (id) on delete set null,
  completed_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  merchant_id uuid references public.merchants (id) on delete set null,
  income_source_id uuid references public.income_sources (id) on delete set null,
  obligation_id uuid references public.obligations (id) on delete set null,
  debt_id uuid references public.debts (id) on delete set null,
  direction public.transaction_direction not null,
  status public.transaction_status not null default 'posted',
  amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  description text not null,
  counterparty_name text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  income_source_id uuid references public.income_sources (id) on delete set null,
  account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  expected_amount numeric(12,2) not null check (expected_amount > 0),
  received_amount numeric(12,2) not null default 0 check (received_amount >= 0),
  expected_date date not null,
  received_date date,
  status public.income_entry_status not null default 'expected',
  received_transaction_id uuid unique references public.transactions (id) on delete set null,
  description text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));
create unique index accounts_user_name_lower_idx on public.accounts (user_id, lower(name));
create unique index categories_user_kind_name_lower_idx on public.categories (user_id, kind, lower(name));
create unique index merchants_user_name_lower_idx on public.merchants (user_id, lower(name));
create unique index income_sources_user_name_lower_idx on public.income_sources (user_id, lower(name));
create unique index budget_targets_user_type_name_lower_idx on public.budget_targets (user_id, target_type, lower(name));
create unique index reserves_user_name_lower_idx on public.reserves (user_id, lower(name));

create index accounts_user_active_type_idx on public.accounts (user_id, is_active, type);
create index categories_user_active_kind_idx on public.categories (user_id, is_active, kind);
create index merchants_user_last_used_idx on public.merchants (user_id, last_used_at desc nulls last);
create index income_sources_user_last_used_idx on public.income_sources (user_id, last_used_at desc nulls last);
create index budget_targets_user_active_type_idx on public.budget_targets (user_id, is_active, target_type);
create index reserves_user_active_idx on public.reserves (user_id, is_active);
create index debts_user_status_due_idx on public.debts (user_id, status, due_date);
create index obligations_user_status_due_idx on public.obligations (user_id, status, next_due_date);
create index tasks_user_status_due_idx on public.tasks (user_id, status, due_date);
create index income_entries_user_status_expected_idx on public.income_entries (user_id, status, expected_date);
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc, created_at desc);
create index transactions_user_account_date_idx on public.transactions (user_id, account_id, transaction_date desc);
create index transactions_user_merchant_idx on public.transactions (user_id, merchant_id, transaction_date desc);
create index transactions_user_income_source_idx on public.transactions (user_id, income_source_id, transaction_date desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_settings',
    'onboarding_state',
    'accounts',
    'categories',
    'merchants',
    'income_sources',
    'budget_targets',
    'reserves',
    'debts',
    'obligations',
    'tasks',
    'income_entries',
    'transactions'
  ] loop
    execute format('alter table public.%I enable row level security;', table_name);
    execute format('alter table public.%I force row level security;', table_name);

    execute format(
      'create policy %s_select_own on public.%I for select using (auth.uid() = user_id);',
      table_name,
      table_name
    );
    execute format(
      'create policy %s_insert_own on public.%I for insert with check (auth.uid() = user_id);',
      table_name,
      table_name
    );
    execute format(
      'create policy %s_update_own on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      table_name,
      table_name
    );
    execute format(
      'create policy %s_delete_own on public.%I for delete using (auth.uid() = user_id);',
      table_name,
      table_name
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_select_own on public.profiles
  for select
  using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert
  with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_delete_own on public.profiles
  for delete
  using (auth.uid() = id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

create trigger set_onboarding_state_updated_at
before update on public.onboarding_state
for each row
execute function public.set_updated_at();

create trigger set_accounts_updated_at
before update on public.accounts
for each row
execute function public.set_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger set_merchants_updated_at
before update on public.merchants
for each row
execute function public.set_updated_at();

create trigger set_income_sources_updated_at
before update on public.income_sources
for each row
execute function public.set_updated_at();

create trigger set_budget_targets_updated_at
before update on public.budget_targets
for each row
execute function public.set_updated_at();

create trigger set_reserves_updated_at
before update on public.reserves
for each row
execute function public.set_updated_at();

create trigger set_debts_updated_at
before update on public.debts
for each row
execute function public.set_updated_at();

create trigger set_obligations_updated_at
before update on public.obligations
for each row
execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create trigger set_income_entries_updated_at
before update on public.income_entries
for each row
execute function public.set_updated_at();

create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
