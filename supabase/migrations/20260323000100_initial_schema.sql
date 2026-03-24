create extension if not exists pgcrypto;

create type public.account_type as enum ('checking', 'savings', 'cash', 'credit_card', 'debt');
create type public.transaction_kind as enum ('expense', 'income', 'transfer');
create type public.income_status as enum ('expected', 'received', 'missed');
create type public.obligation_frequency as enum ('one_time', 'weekly', 'biweekly', 'monthly', 'yearly');
create type public.debt_status as enum ('active', 'paused', 'paid_off');
create type public.task_status as enum ('todo', 'doing', 'done', 'blocked');
create type public.reserve_kind as enum ('manual', 'automatic');

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

create table public.profiles (
  id text primary key,
  owner_id text not null unique,
  display_name text,
  email text,
  currency varchar(3) not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_id_not_blank check (length(trim(id)) > 0),
  constraint profiles_owner_id_not_blank check (length(trim(owner_id)) > 0)
);

create table public.app_settings (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  key varchar(120) not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_settings_owner_key_unique unique (owner_id, key)
);

create table public.onboarding_state (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null unique references public.profiles (owner_id) on delete cascade,
  is_complete boolean not null default false,
  current_step varchar(80) not null default 'start',
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(120) not null,
  "group" varchar(40) not null default 'general',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_owner_name_unique unique (owner_id, name)
);

create table public.accounts (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(120) not null,
  type public.account_type not null,
  institution varchar(120),
  balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(160) not null,
  kind varchar(24) not null default 'merchant',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchants_owner_name_unique unique (owner_id, name)
);

create table public.income_sources (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(160) not null,
  kind varchar(24) not null default 'income',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_sources_owner_name_unique unique (owner_id, name)
);

create table public.transactions (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  kind public.transaction_kind not null,
  amount numeric(14,2) not null,
  account_id text references public.accounts (id) on delete set null,
  category_id text references public.categories (id) on delete set null,
  merchant_id text references public.merchants (id) on delete set null,
  income_source_id text references public.income_sources (id) on delete set null,
  occurred_on date not null,
  notes text,
  is_planned boolean not null default false,
  is_cleared boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_entries (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  source_name varchar(160) not null,
  amount numeric(14,2) not null,
  status public.income_status not null default 'expected',
  expected_on date,
  received_on date,
  account_id text references public.accounts (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.obligations (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(160) not null,
  amount numeric(14,2) not null,
  due_on date not null,
  frequency public.obligation_frequency not null default 'one_time',
  is_paid boolean not null default false,
  is_recurring boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(160) not null,
  balance numeric(14,2) not null,
  minimum_payment numeric(14,2) not null default 0,
  due_on date,
  status public.debt_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  title varchar(200) not null,
  status public.task_status not null default 'todo',
  due_on date,
  linked_type varchar(40),
  linked_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reserves (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  name varchar(160) not null,
  amount numeric(14,2) not null,
  kind public.reserve_kind not null default 'manual',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_items (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  title varchar(200) not null,
  description text not null default '',
  category varchar(40) not null default 'finances',
  status varchar(24) not null default 'planned',
  priority varchar(24) not null default 'medium',
  target_date date,
  timeframe_label varchar(120),
  progress_mode varchar(16) not null default 'steps',
  progress_value numeric(5,2) not null default 0,
  steps jsonb not null default '[]'::jsonb,
  dependency_ids jsonb not null default '[]'::jsonb,
  notes text,
  linked_strategy_goal_id varchar(120),
  strategy_backed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.strategy_documents (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles (owner_id) on delete cascade,
  version integer not null default 1,
  name varchar(200) not null,
  is_active boolean not null default true,
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index strategy_documents_one_active_per_owner
  on public.strategy_documents (owner_id)
  where is_active = true;

create index accounts_owner_idx on public.accounts (owner_id);
create index transactions_owner_occurred_on_idx on public.transactions (owner_id, occurred_on desc);
create index obligations_owner_due_on_idx on public.obligations (owner_id, due_on);
create index debts_owner_due_on_idx on public.debts (owner_id, due_on);
create index income_entries_owner_expected_on_idx on public.income_entries (owner_id, expected_on);
create index tasks_owner_due_on_idx on public.tasks (owner_id, due_on);
create index roadmap_items_owner_target_date_idx on public.roadmap_items (owner_id, target_date);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_owner_id text := new.id::text;
  resolved_display_name text;
begin
  resolved_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Life owner'
  );

  insert into public.profiles (id, owner_id, email, display_name, currency, is_active)
  values (next_owner_id, next_owner_id, new.email, resolved_display_name, 'USD', true)
  on conflict (id) do update
    set owner_id = excluded.owner_id,
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now();

  insert into public.onboarding_state (owner_id, is_complete, current_step)
  values (next_owner_id, false, 'start')
  on conflict (owner_id) do nothing;

  insert into public.app_settings (owner_id, key, value)
  values
    (next_owner_id, 'protected_cash_buffer', '0'),
    (next_owner_id, 'essential_spend_target', '0'),
    (next_owner_id, 'savings_floor', '0'),
    (next_owner_id, 'owner_notes', '')
  on conflict (owner_id, key) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

select public.enable_owner_rls('profiles');
select public.enable_owner_rls('app_settings');
select public.enable_owner_rls('onboarding_state');
select public.enable_owner_rls('categories');
select public.enable_owner_rls('accounts');
select public.enable_owner_rls('merchants');
select public.enable_owner_rls('income_sources');
select public.enable_owner_rls('transactions');
select public.enable_owner_rls('income_entries');
select public.enable_owner_rls('obligations');
select public.enable_owner_rls('debts');
select public.enable_owner_rls('tasks');
select public.enable_owner_rls('reserves');
select public.enable_owner_rls('roadmap_items');
select public.enable_owner_rls('strategy_documents');

drop function public.enable_owner_rls(text);

create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger set_app_settings_updated_at before update on public.app_settings for each row execute procedure public.set_updated_at();
create trigger set_onboarding_state_updated_at before update on public.onboarding_state for each row execute procedure public.set_updated_at();
create trigger set_categories_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger set_accounts_updated_at before update on public.accounts for each row execute procedure public.set_updated_at();
create trigger set_merchants_updated_at before update on public.merchants for each row execute procedure public.set_updated_at();
create trigger set_income_sources_updated_at before update on public.income_sources for each row execute procedure public.set_updated_at();
create trigger set_transactions_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();
create trigger set_income_entries_updated_at before update on public.income_entries for each row execute procedure public.set_updated_at();
create trigger set_obligations_updated_at before update on public.obligations for each row execute procedure public.set_updated_at();
create trigger set_debts_updated_at before update on public.debts for each row execute procedure public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
create trigger set_reserves_updated_at before update on public.reserves for each row execute procedure public.set_updated_at();
create trigger set_roadmap_items_updated_at before update on public.roadmap_items for each row execute procedure public.set_updated_at();
create trigger set_strategy_documents_updated_at before update on public.strategy_documents for each row execute procedure public.set_updated_at();
