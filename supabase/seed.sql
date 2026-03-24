-- Change this UUID to match the owner auth user id you want to seed locally.
-- The schema is single-user by design, so every seeded row belongs to one owner.
select set_config('search_path', 'public', true);

insert into public.profiles (id, email, display_name)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'owner@life-os.local',
  'Life OS Owner'
)
on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      updated_at = now();

insert into public.app_settings (user_id, currency_code, timezone, week_starts_on, dashboard_horizon_days, low_balance_warning_threshold, compact_mode)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'USD',
  'America/Chicago',
  1,
  7,
  150,
  false
)
on conflict (user_id) do update
  set currency_code = excluded.currency_code,
      timezone = excluded.timezone,
      week_starts_on = excluded.week_starts_on,
      dashboard_horizon_days = excluded.dashboard_horizon_days,
      low_balance_warning_threshold = excluded.low_balance_warning_threshold,
      compact_mode = excluded.compact_mode,
      updated_at = now();

insert into public.onboarding_state (user_id, is_completed, current_step, state)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  false,
  'baseline_setup',
  jsonb_build_object(
    'accounts', true,
    'debts', true,
    'bills', true,
    'income_sources', true,
    'targets', true
  )
)
on conflict (user_id) do update
  set is_completed = excluded.is_completed,
      current_step = excluded.current_step,
      state = excluded.state,
      updated_at = now();

insert into public.accounts (id, user_id, name, type, institution, opening_balance, current_balance, sort_order, is_active, notes)
values
  ('21111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Wells Fargo Checking', 'checking', 'Wells Fargo', 1200.00, 1450.00, 1, true, 'Primary spending account'),
  ('21111111-1111-1111-1111-111111111112'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Cash App Checking', 'checking', 'Cash App', 250.00, 320.50, 2, true, 'Secondary cash account'),
  ('21111111-1111-1111-1111-111111111113'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Cash App Savings', 'savings', 'Cash App', 1700.00, 1800.00, 3, true, 'Protected savings buffer'),
  ('21111111-1111-1111-1111-111111111114'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Capital One Credit Card', 'credit_card', 'Capital One', 590.12, 640.12, 4, true, 'Credit card balance stored as amount owed')
on conflict (id) do update
  set name = excluded.name,
      type = excluded.type,
      institution = excluded.institution,
      opening_balance = excluded.opening_balance,
      current_balance = excluded.current_balance,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = now();

insert into public.categories (id, user_id, name, kind, icon, color, sort_order, is_active, is_builtin, notes)
values
  ('31111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Housing', 'expense', 'home', '#64748b', 1, true, true, 'Rent and housing costs'),
  ('31111111-1111-1111-1111-111111111112'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Utilities', 'expense', 'zap', '#0f766e', 2, true, true, 'Internet, electricity, phone, and similar bills'),
  ('31111111-1111-1111-1111-111111111113'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Groceries', 'expense', 'shopping-cart', '#166534', 3, true, true, 'Food and household staples'),
  ('31111111-1111-1111-1111-111111111114'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Transportation', 'expense', 'car-front', '#1d4ed8', 4, true, true, 'Fuel, transit, rides, and parking'),
  ('31111111-1111-1111-1111-111111111115'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Dining Out', 'expense', 'utensils', '#c2410c', 5, true, true, 'Eating out and coffee'),
  ('31111111-1111-1111-1111-111111111116'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Health', 'expense', 'heart-pulse', '#be123c', 6, true, true, 'Medical, pharmacy, and wellness'),
  ('31111111-1111-1111-1111-111111111117'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Subscriptions', 'expense', 'repeat', '#7c3aed', 7, true, true, 'Recurring services'),
  ('31111111-1111-1111-1111-111111111118'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Debt Payment', 'expense', 'banknote', '#991b1b', 8, true, true, 'Debt and minimum payments'),
  ('31111111-1111-1111-1111-111111111119'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Income', 'income', 'badge-dollar-sign', '#047857', 1, true, true, 'Paychecks and income inflows'),
  ('31111111-1111-1111-1111-111111111120'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Savings', 'both', 'piggy-bank', '#0ea5e9', 2, true, true, 'Transfers into savings or goal funding')
on conflict (id) do update
  set name = excluded.name,
      kind = excluded.kind,
      icon = excluded.icon,
      color = excluded.color,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active,
      is_builtin = excluded.is_builtin,
      notes = excluded.notes,
      updated_at = now();

insert into public.merchants (id, user_id, name, usage_count, last_used_at, is_active, notes)
values
  ('41111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Walmart', 4, now() - interval '3 days', true, 'Common grocery and household store'),
  ('41111111-1111-1111-1111-111111111112'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Shell', 2, now() - interval '4 days', true, 'Fuel stop'),
  ('41111111-1111-1111-1111-111111111113'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Comcast', 1, now() - interval '9 days', true, 'Internet provider')
on conflict (id) do update
  set name = excluded.name,
      usage_count = excluded.usage_count,
      last_used_at = excluded.last_used_at,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = now();

insert into public.income_sources (id, user_id, name, usage_count, last_used_at, is_active, notes)
values
  ('51111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Employer Payroll', 6, now() - interval '5 days', true, 'Primary paycheck source'),
  ('51111111-1111-1111-1111-111111111112'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Cash App Deposits', 2, now() - interval '11 days', true, 'Side work and transfers'),
  ('51111111-1111-1111-1111-111111111113'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Refunds', 1, now() - interval '14 days', true, 'Refund and reimbursement inflows')
on conflict (id) do update
  set name = excluded.name,
      usage_count = excluded.usage_count,
      last_used_at = excluded.last_used_at,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = now();

insert into public.budget_targets (id, user_id, name, target_type, cadence, amount, effective_start, is_active, notes)
values
  ('61111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Protected Cash Buffer', 'protected_cash_buffer', 'one_time', 500.00, current_date, true, 'Minimum cash that should stay untouched'),
  ('61111111-1111-1111-1111-111111111112'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Essential Weekly Spend', 'essential_weekly_spend', 'weekly', 175.00, current_date, true, 'Food and essentials budget between paychecks'),
  ('61111111-1111-1111-1111-111111111113'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Savings Goal', 'savings_goal', 'monthly', 1000.00, current_date, true, 'Longer-term cushion and goals')
on conflict (id) do update
  set name = excluded.name,
      target_type = excluded.target_type,
      cadence = excluded.cadence,
      amount = excluded.amount,
      effective_start = excluded.effective_start,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = now();

insert into public.reserves (id, user_id, name, reserve_type, amount, is_active, notes)
values
  ('71111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Food Reserve', 'manual', 150.00, true, 'Money reserved for the current week'),
  ('71111111-1111-1111-1111-111111111112'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Emergency Buffer', 'savings_floor', 500.00, true, 'Protected cash floor')
on conflict (id) do update
  set name = excluded.name,
      reserve_type = excluded.reserve_type,
      amount = excluded.amount,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = now();

insert into public.debts (id, user_id, name, creditor_name, debt_type, status, current_balance, minimum_payment, due_date, linked_account_id, last_payment_date, last_payment_amount, priority, notes)
values (
  '81111111-1111-1111-1111-111111111111'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Capital One Credit Card',
  'Capital One',
  'credit_card',
  'active',
  640.12,
  35.00,
  current_date + 18,
  '21111111-1111-1111-1111-111111111114'::uuid,
  current_date - 8,
  120.00,
  1,
  'Track the card balance and minimum payment in one place'
)
on conflict (id) do update
  set name = excluded.name,
      creditor_name = excluded.creditor_name,
      debt_type = excluded.debt_type,
      status = excluded.status,
      current_balance = excluded.current_balance,
      minimum_payment = excluded.minimum_payment,
      due_date = excluded.due_date,
      linked_account_id = excluded.linked_account_id,
      last_payment_date = excluded.last_payment_date,
      last_payment_amount = excluded.last_payment_amount,
      priority = excluded.priority,
      notes = excluded.notes,
      updated_at = now();

insert into public.obligations (id, user_id, name, obligation_type, status, amount, next_due_date, frequency, frequency_interval, account_id, category_id, merchant_id, last_paid_date, last_paid_amount, grace_days, is_required, notes)
values
  (
    '91111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Rent',
    'rent',
    'active',
    1250.00,
    current_date + 9,
    'monthly',
    1,
    '21111111-1111-1111-1111-111111111111'::uuid,
    '31111111-1111-1111-1111-111111111111'::uuid,
    null,
    current_date - 22,
    1250.00,
    3,
    true,
    'Primary monthly housing obligation'
  ),
  (
    '91111111-1111-1111-1111-111111111112'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Internet',
    'utility',
    'active',
    84.00,
    current_date + 5,
    'monthly',
    1,
    '21111111-1111-1111-1111-111111111111'::uuid,
    '31111111-1111-1111-1111-111111111112'::uuid,
    '41111111-1111-1111-1111-111111111113'::uuid,
    current_date - 27,
    84.00,
    1,
    true,
    'Internet and phone bill'
  ),
  (
    '91111111-1111-1111-1111-111111111113'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Phone',
    'utility',
    'active',
    65.00,
    current_date + 12,
    'monthly',
    1,
    '21111111-1111-1111-1111-111111111111'::uuid,
    '31111111-1111-1111-1111-111111111112'::uuid,
    null,
    current_date - 18,
    65.00,
    1,
    true,
    'Monthly phone bill'
  )
on conflict (id) do update
  set name = excluded.name,
      obligation_type = excluded.obligation_type,
      status = excluded.status,
      amount = excluded.amount,
      next_due_date = excluded.next_due_date,
      frequency = excluded.frequency,
      frequency_interval = excluded.frequency_interval,
      account_id = excluded.account_id,
      category_id = excluded.category_id,
      merchant_id = excluded.merchant_id,
      last_paid_date = excluded.last_paid_date,
      last_paid_amount = excluded.last_paid_amount,
      grace_days = excluded.grace_days,
      is_required = excluded.is_required,
      notes = excluded.notes,
      updated_at = now();

insert into public.tasks (id, user_id, title, description, status, priority, due_date, category_id, linked_obligation_id, linked_debt_id, notes)
values
  (
    'a1111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Review upcoming bills',
    'Check rent, internet, and card payment timing before the end of the week.',
    'open',
    2,
    current_date + 2,
    '31111111-1111-1111-1111-111111111118'::uuid,
    '91111111-1111-1111-1111-111111111111'::uuid,
    '81111111-1111-1111-1111-111111111111'::uuid,
    'This should surface in the weekly review card'
  ),
  (
    'a1111111-1111-1111-1111-111111111112'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Confirm next paycheck date',
    'Verify the employer payroll date and update the expected income entry if needed.',
    'open',
    1,
    current_date + 3,
    '31111111-1111-1111-1111-111111111119'::uuid,
    null,
    null,
    'Useful for keeping available spend honest'
  ),
  (
    'a1111111-1111-1111-1111-111111111113'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'File taxes folder',
    'Gather tax docs and notes for the current filing cycle.',
    'open',
    1,
    current_date + 14,
    '31111111-1111-1111-1111-111111111118'::uuid,
    null,
    null,
    'Non-financial but still high priority'
  )
on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      priority = excluded.priority,
      due_date = excluded.due_date,
      category_id = excluded.category_id,
      linked_obligation_id = excluded.linked_obligation_id,
      linked_debt_id = excluded.linked_debt_id,
      notes = excluded.notes,
      updated_at = now();

insert into public.income_entries (id, user_id, income_source_id, account_id, category_id, expected_amount, received_amount, expected_date, received_date, status, description, notes)
values (
  'b1111111-1111-1111-1111-111111111111'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '51111111-1111-1111-1111-111111111111'::uuid,
  '21111111-1111-1111-1111-111111111111'::uuid,
  '31111111-1111-1111-1111-111111111119'::uuid,
  2400.00,
  0,
  current_date + 5,
  null,
  'expected',
  'Next paycheck',
  'Expected income used by available spend calculations'
)
on conflict (id) do update
  set income_source_id = excluded.income_source_id,
      account_id = excluded.account_id,
      category_id = excluded.category_id,
      expected_amount = excluded.expected_amount,
      received_amount = excluded.received_amount,
      expected_date = excluded.expected_date,
      received_date = excluded.received_date,
      status = excluded.status,
      description = excluded.description,
      notes = excluded.notes,
      updated_at = now();

insert into public.transactions (id, user_id, account_id, category_id, merchant_id, income_source_id, obligation_id, debt_id, direction, status, amount, transaction_date, description, counterparty_name, notes)
values
  (
    'c1111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '21111111-1111-1111-1111-111111111111'::uuid,
    '31111111-1111-1111-1111-111111111113'::uuid,
    '41111111-1111-1111-1111-111111111111'::uuid,
    null,
    null,
    null,
    'expense',
    'posted',
    72.48,
    current_date - 1,
    'Groceries',
    'Walmart',
    'Recent essentials trip'
  ),
  (
    'c1111111-1111-1111-1111-111111111112'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '21111111-1111-1111-1111-111111111112'::uuid,
    '31111111-1111-1111-1111-111111111114'::uuid,
    '41111111-1111-1111-1111-111111111112'::uuid,
    null,
    null,
    null,
    'expense',
    'posted',
    38.12,
    current_date - 2,
    'Fuel',
    'Shell',
    'Gas stop before errands'
  ),
  (
    'c1111111-1111-1111-1111-111111111113'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '21111111-1111-1111-1111-111111111111'::uuid,
    '31111111-1111-1111-1111-111111111119'::uuid,
    null,
    '51111111-1111-1111-1111-111111111111'::uuid,
    null,
    null,
    'income',
    'posted',
    2400.00,
    current_date - 9,
    'Payroll deposit',
    'Employer Payroll',
    'Most recent paycheck'
  )
on conflict (id) do update
  set account_id = excluded.account_id,
      category_id = excluded.category_id,
      merchant_id = excluded.merchant_id,
      income_source_id = excluded.income_source_id,
      obligation_id = excluded.obligation_id,
      debt_id = excluded.debt_id,
      direction = excluded.direction,
      status = excluded.status,
      amount = excluded.amount,
      transaction_date = excluded.transaction_date,
      description = excluded.description,
      counterparty_name = excluded.counterparty_name,
      notes = excluded.notes,
      updated_at = now();
