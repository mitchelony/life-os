select set_config('search_path', 'public', true);

do $$
declare
  owner_id constant text := '11111111-1111-1111-1111-111111111111';
  owner_email constant text := 'owner@life-os.local';
  owner_password constant text := 'life-os-local-dev';
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    owner_id::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    owner_email,
    crypt(owner_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Life OS Owner"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update
    set email = excluded.email,
        encrypted_password = excluded.encrypted_password,
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now();

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    owner_id::uuid,
    format('{"sub":"%s","email":"%s"}', owner_id, owner_email)::jsonb,
    'email',
    owner_email,
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update
    set identity_data = excluded.identity_data,
        last_sign_in_at = excluded.last_sign_in_at,
        updated_at = now();
end $$;

insert into public.categories (id, owner_id, name, "group", is_active)
values
  ('30000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Housing', 'needs', true),
  ('30000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Utilities', 'needs', true),
  ('30000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Debt', 'needs', true),
  ('30000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Income', 'income', true)
on conflict (id) do update
  set name = excluded.name,
      "group" = excluded."group",
      is_active = excluded.is_active,
      updated_at = now();

insert into public.accounts (id, owner_id, name, type, institution, balance, is_active, notes)
values
  ('20000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Checking', 'checking', 'Wells Fargo', 425.13, true, 'Main spending account'),
  ('20000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Savings', 'savings', 'Cash App', 180.00, true, 'Small protected buffer'),
  ('20000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Capital One Credit Card', 'credit_card', 'Capital One', 498.28, true, 'Balance stored as amount owed')
on conflict (id) do update
  set name = excluded.name,
      type = excluded.type,
      institution = excluded.institution,
      balance = excluded.balance,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = now();

insert into public.merchants (id, owner_id, name, kind, is_active)
values
  ('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Roommate', 'merchant', true),
  ('40000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Landlord', 'merchant', true)
on conflict (id) do update
  set name = excluded.name,
      kind = excluded.kind,
      is_active = excluded.is_active,
      updated_at = now();

insert into public.income_sources (id, owner_id, name, kind, is_active)
values
  ('50000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tutoring', 'income', true),
  ('50000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Photoshoots', 'income', true)
on conflict (id) do update
  set name = excluded.name,
      kind = excluded.kind,
      is_active = excluded.is_active,
      updated_at = now();

insert into public.app_settings (owner_id, key, value)
values
  ('11111111-1111-1111-1111-111111111111', 'protected_cash_buffer', '100'),
  ('11111111-1111-1111-1111-111111111111', 'essential_spend_target', '25'),
  ('11111111-1111-1111-1111-111111111111', 'savings_floor', '100'),
  ('11111111-1111-1111-1111-111111111111', 'owner_notes', 'Keep the dashboard calm and focused.')
on conflict (owner_id, key) do update
  set value = excluded.value,
      updated_at = now();

update public.onboarding_state
set is_complete = true,
    current_step = 'complete',
    completed_at = current_date,
    updated_at = now()
where owner_id = '11111111-1111-1111-1111-111111111111';

insert into public.obligations (id, owner_id, name, amount, due_on, frequency, is_paid, is_recurring, notes)
values
  ('90000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Rent', 950.00, current_date + 6, 'monthly', false, true, 'Main monthly rent'),
  ('90000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Utilities', 442.70, current_date - 2, 'one_time', false, false, 'Overdue balance owed through roommate')
on conflict (id) do update
  set name = excluded.name,
      amount = excluded.amount,
      due_on = excluded.due_on,
      frequency = excluded.frequency,
      is_paid = excluded.is_paid,
      is_recurring = excluded.is_recurring,
      notes = excluded.notes,
      updated_at = now();

insert into public.debts (id, owner_id, name, balance, minimum_payment, due_on, status, notes)
values
  ('80000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Capital One Credit Card', 498.28, 10.00, current_date + 4, 'active', 'Do not add new spending to this card')
on conflict (id) do update
  set name = excluded.name,
      balance = excluded.balance,
      minimum_payment = excluded.minimum_payment,
      due_on = excluded.due_on,
      status = excluded.status,
      notes = excluded.notes,
      updated_at = now();

insert into public.income_entries (id, owner_id, source_name, amount, status, expected_on, account_id, notes)
values
  ('60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Photoshoot payment', 100.00, 'expected', current_date + 7, '20000000-0000-0000-0000-000000000001', 'Confirmed'),
  ('60000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Tutoring paycheck', 390.00, 'expected', current_date + 14, '20000000-0000-0000-0000-000000000001', 'Confirmed')
on conflict (id) do update
  set source_name = excluded.source_name,
      amount = excluded.amount,
      status = excluded.status,
      expected_on = excluded.expected_on,
      account_id = excluded.account_id,
      notes = excluded.notes,
      updated_at = now();

insert into public.reserves (id, owner_id, name, amount, kind, is_active, notes)
values
  ('70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Savings floor', 100.00, 'manual', true, 'Money to leave alone')
on conflict (id) do update
  set name = excluded.name,
      amount = excluded.amount,
      kind = excluded.kind,
      is_active = excluded.is_active,
      notes = excluded.notes,
      updated_at = now();

insert into public.tasks (id, owner_id, title, status, due_on, linked_type, linked_id, notes)
values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'File taxes', 'todo', current_date + 2, 'admin', null, 'Finish filing this week')
on conflict (id) do update
  set title = excluded.title,
      status = excluded.status,
      due_on = excluded.due_on,
      linked_type = excluded.linked_type,
      linked_id = excluded.linked_id,
      notes = excluded.notes,
      updated_at = now();

insert into public.transactions (id, owner_id, kind, amount, account_id, category_id, merchant_id, income_source_id, occurred_on, notes, is_planned, is_cleared)
values
  ('t0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'expense', 24.87, '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', null, current_date - 1, 'Utilities partial payment', false, true),
  ('t0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'income', 130.00, '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', null, '50000000-0000-0000-0000-000000000001', current_date - 5, 'Recent tutoring payout', false, true)
on conflict (id) do update
  set kind = excluded.kind,
      amount = excluded.amount,
      account_id = excluded.account_id,
      category_id = excluded.category_id,
      merchant_id = excluded.merchant_id,
      income_source_id = excluded.income_source_id,
      occurred_on = excluded.occurred_on,
      notes = excluded.notes,
      is_planned = excluded.is_planned,
      is_cleared = excluded.is_cleared,
      updated_at = now();

insert into public.roadmap_items (
  id,
  owner_id,
  title,
  description,
  category,
  status,
  priority,
  target_date,
  timeframe_label,
  progress_mode,
  progress_value,
  steps,
  dependency_ids,
  notes,
  linked_strategy_goal_id,
  strategy_backed
)
values
  (
    'r0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Catch up on utilities',
    'Use the next income to reduce the overdue utilities balance first.',
    'finances',
    'active',
    'critical',
    current_date + 14,
    'Next two weeks',
    'steps',
    0,
    '[{"id":"step-utilities-1","title":"Send first utilities payment","completed":false}]'::jsonb,
    '[]'::jsonb,
    'This should come before extra debt payoff.',
    'goal-utilities-catchup',
    true
  )
on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      category = excluded.category,
      status = excluded.status,
      priority = excluded.priority,
      target_date = excluded.target_date,
      timeframe_label = excluded.timeframe_label,
      progress_mode = excluded.progress_mode,
      progress_value = excluded.progress_value,
      steps = excluded.steps,
      dependency_ids = excluded.dependency_ids,
      notes = excluded.notes,
      linked_strategy_goal_id = excluded.linked_strategy_goal_id,
      strategy_backed = excluded.strategy_backed,
      updated_at = now();

insert into public.strategy_documents (id, owner_id, version, name, is_active, document)
values
  (
    's0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    2,
    'Next paycheck recovery plan',
    true,
    '{
      "version": 2,
      "name": "Next paycheck recovery plan",
      "summary": "Use the next incoming money in a strict order: protect a small buffer, cover essentials, reduce utilities, and push down the credit card balance without adding new debt.",
      "effectiveDate": "2026-03-24",
      "currency": "USD",
      "planningHorizonDays": 30,
      "strategyMode": "cash_flow_first",
      "goals": [
        {
          "id": "goal-utilities-catchup",
          "title": "Catch up on utilities",
          "category": "finances",
          "status": "active",
          "priority": "critical",
          "targetDate": "2026-04-30"
        }
      ],
      "cashFlowPlan": {
        "defaultFlowOrder": ["minimum_required_payments", "weekly_essentials", "protected_buffer", "overdue_utilities", "credit_card_extra"],
        "weeklyEssentialsCap": 25,
        "noNewCreditCardSpending": true,
        "bufferTarget": 100
      },
      "expectedIncome": [
        {
          "id": "income-photoshoot",
          "label": "Photoshoot payment",
          "amount": 100,
          "timing": "next_week",
          "certainty": "confirmed"
        },
        {
          "id": "income-tutoring",
          "label": "Tutoring paycheck",
          "amount": 390,
          "timing": "in_2_weeks",
          "certainty": "confirmed"
        }
      ],
      "nextIncomePlans": [
        {
          "id": "plan-paycheck",
          "incomeId": "income-tutoring",
          "label": "When the tutoring paycheck lands",
          "amount": 390,
          "allocations": [
            { "id": "buffer", "label": "Emergency buffer", "amount": 50, "type": "buffer", "priority": 1 },
            { "id": "utilities", "label": "Utilities catch-up payment", "amount": 170, "type": "obligation_payment", "priority": 2 },
            { "id": "card", "label": "Capital One payment", "amount": 170, "type": "debt_payment", "priority": 3 }
          ],
          "recommendedStep": "Finish the first $100 buffer, then split the rest between utilities and Capital One."
        }
      ],
      "debtPlan": [
        {
          "debtName": "Capital One Credit Card",
          "currentBalance": 498.28,
          "mode": "minimum_plus",
          "minimumPayment": 10,
          "minimumSource": "existing",
          "extraPaymentRule": { "type": "follow_next_income_plan" },
          "priority": "critical"
        }
      ],
      "obligationPlan": [
        {
          "obligationName": "Utilities",
          "currentBalance": 442.70,
          "handling": "pay_over_time",
          "priority": "critical"
        }
      ],
      "guidance": {
        "focusOrder": ["next_income_plan", "minimum_required_payments", "overdue_obligations", "critical_debt", "buffer", "admin_deadlines"],
        "recommendedStepStyle": "next_planned_allocation",
        "primaryUXMode": "next_payments_to_make"
      }
    }'::jsonb
  )
on conflict (id) do update
  set version = excluded.version,
      name = excluded.name,
      is_active = excluded.is_active,
      document = excluded.document,
      updated_at = now();
