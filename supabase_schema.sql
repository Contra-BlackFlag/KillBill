-- ============================================================
--  ShopSathi — Supabase / PostgreSQL Schema  (v2)
--  Paste this entire file into Supabase → SQL Editor → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  shop_name   text not null default 'My Shop',
  owner_name  text,
  phone       text,
  address     text,
  gst_number  text,
  role        text not null default 'admin' check (role in ('admin','staff')),
  language    text not null default 'en',
  created_at  timestamptz default now()
);

-- ─── Products ────────────────────────────────────────────────
create table if not exists products (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  name            text not null,
  category        text,
  barcode         text,
  purchase_price  numeric(12,2) not null default 0,
  selling_price   numeric(12,2) not null default 0,
  quantity        integer not null default 0,
  low_stock_alert integer not null default 5,
  unit            text default 'pcs',
  gst_rate        numeric(5,2) default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Customers ───────────────────────────────────────────────
create table if not exists customers (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  name         text not null,
  phone        text,
  address      text,
  total_credit numeric(12,2) not null default 0,
  created_at   timestamptz default now()
);

-- ─── Bills ───────────────────────────────────────────────────
create table if not exists bills (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  customer_name   text,
  bill_number     text not null,
  subtotal        numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  gst_amount      numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  payment_mode    text not null default 'cash'
                    check (payment_mode in ('cash','upi','card','credit')),
  payment_status  text not null default 'paid'
                    check (payment_status in ('paid','pending')),
  notes           text,
  created_at      timestamptz default now()
);

-- ─── Bill Items ──────────────────────────────────────────────
create table if not exists bill_items (
  id           uuid primary key default uuid_generate_v4(),
  bill_id      uuid not null references bills(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  product_name text not null,
  quantity     integer not null default 1,
  unit_price   numeric(12,2) not null,
  gst_rate     numeric(5,2) default 0,
  total        numeric(12,2) not null
);

-- ─── Credits (Udhar) ─────────────────────────────────────────
create table if not exists credits (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  bill_id     uuid references bills(id) on delete set null,
  amount      numeric(12,2) not null,
  due_date    date,
  paid_amount numeric(12,2) not null default 0,
  status      text not null default 'pending'
                check (status in ('pending','partial','paid')),
  notes       text,
  created_at  timestamptz default now()
);

-- ─── Credit Payments ─────────────────────────────────────────
create table if not exists credit_payments (
  id           uuid primary key default uuid_generate_v4(),
  credit_id    uuid not null references credits(id) on delete cascade,
  amount       numeric(12,2) not null,
  payment_mode text default 'cash',
  paid_at      timestamptz default now()
);

-- ─── Expenses ────────────────────────────────────────────────
create table if not exists expenses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  category     text not null,
  description  text,
  amount       numeric(12,2) not null,
  expense_date date not null default current_date,
  payment_mode text default 'cash',
  created_at   timestamptz default now()
);

-- ─── Daily Closings ──────────────────────────────────────────
create table if not exists daily_closings (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles(id) on delete cascade,
  closing_date        date not null,
  total_sales_cash    numeric(12,2) default 0,
  total_sales_upi     numeric(12,2) default 0,
  total_sales_card    numeric(12,2) default 0,
  total_sales_credit  numeric(12,2) default 0,
  total_sales         numeric(12,2) default 0,
  total_expenses      numeric(12,2) default 0,
  total_purchases     numeric(12,2) default 0,
  net_profit          numeric(12,2) default 0,
  expected_cash       numeric(12,2) default 0,
  actual_cash         numeric(12,2) default 0,
  cash_mismatch       numeric(12,2) default 0,
  notes               text,
  created_at          timestamptz default now(),
  unique (user_id, closing_date)
);

-- ─── Notifications ───────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  type         text not null,
  title        text not null,
  message      text,
  is_read      boolean default false,
  reference_id uuid,
  created_at   timestamptz default now(),
  unique (user_id, type, reference_id)
);

-- ─── Row-Level Security ──────────────────────────────────────
alter table profiles        enable row level security;
alter table products        enable row level security;
alter table customers       enable row level security;
alter table bills           enable row level security;
alter table bill_items      enable row level security;
alter table credits         enable row level security;
alter table credit_payments enable row level security;
alter table expenses        enable row level security;
alter table daily_closings  enable row level security;
alter table notifications   enable row level security;

-- Drop any existing policies first (safe re-run)
do $$ declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- Profiles: own row
create policy "profiles_own" on profiles
  for all using (auth.uid() = id);

-- Products
create policy "products_own" on products
  for all using (auth.uid() = user_id);

-- Customers
create policy "customers_own" on customers
  for all using (auth.uid() = user_id);

-- Bills
create policy "bills_own" on bills
  for all using (auth.uid() = user_id);

-- Bill items (via bills)
create policy "bill_items_own" on bill_items
  for all using (
    bill_id in (select id from bills where user_id = auth.uid())
  );

-- Credits
create policy "credits_own" on credits
  for all using (auth.uid() = user_id);

-- Credit payments (via credits)
create policy "credit_payments_own" on credit_payments
  for all using (
    credit_id in (select id from credits where user_id = auth.uid())
  );

-- Expenses
create policy "expenses_own" on expenses
  for all using (auth.uid() = user_id);

-- Daily closings
create policy "closings_own" on daily_closings
  for all using (auth.uid() = user_id);

-- Notifications
create policy "notifications_own" on notifications
  for all using (auth.uid() = user_id);

-- ─── Trigger: auto-create profile on signup ──────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, shop_name, owner_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'shop_name', 'My Shop'),
    coalesce(new.raw_user_meta_data->>'owner_name', ''),
    'admin'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Trigger: decrement stock on bill item insert ────────────
create or replace function decrement_stock()
returns trigger language plpgsql as $$
begin
  if new.product_id is not null then
    update products
    set quantity = greatest(0, quantity - new.quantity),
        updated_at = now()
    where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_bill_item_insert on bill_items;
create trigger on_bill_item_insert
  after insert on bill_items
  for each row execute procedure decrement_stock();

-- ─── Trigger: update customer total_credit on credit insert ──
create or replace function update_customer_credit_on_add()
returns trigger language plpgsql as $$
begin
  update customers
  set total_credit = total_credit + new.amount
  where id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists on_credit_insert on credits;
create trigger on_credit_insert
  after insert on credits
  for each row execute procedure update_customer_credit_on_add();

-- ─── Trigger: update credit record + customer on payment ─────
create or replace function handle_credit_payment()
returns trigger language plpgsql as $$
declare
  v_credit credits%rowtype;
begin
  -- update the credit row
  update credits
  set
    paid_amount = paid_amount + new.amount,
    status = case
      when (paid_amount + new.amount) >= amount then 'paid'
      when (paid_amount + new.amount) > 0       then 'partial'
      else 'pending'
    end
  where id = new.credit_id
  returning * into v_credit;

  -- reduce customer total_credit
  update customers
  set total_credit = greatest(0, total_credit - new.amount)
  where id = v_credit.customer_id;

  return new;
end;
$$;

drop trigger if exists on_credit_payment_insert on credit_payments;
create trigger on_credit_payment_insert
  after insert on credit_payments
  for each row execute procedure handle_credit_payment();
