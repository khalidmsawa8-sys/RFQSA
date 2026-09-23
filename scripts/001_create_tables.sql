-- Create profiles table for users (clients and vendors)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('client', 'vendor')),
  company_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Everyone can read all profiles (needed for seeing vendor names on quotes)
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Create RFQs table (Request for Quotation)
create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  car_make text not null,
  car_model text not null,
  car_year integer not null,
  vin text,
  parts_description text not null,
  status text not null default 'open' check (status in ('open', 'quoted', 'accepted', 'closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.rfqs enable row level security;

-- Clients can see their own RFQs, vendors can see all open RFQs
create policy "rfqs_select" on public.rfqs for select using (
  auth.uid() = client_id 
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'vendor')
);
create policy "rfqs_insert" on public.rfqs for insert with check (auth.uid() = client_id);
create policy "rfqs_update" on public.rfqs for update using (auth.uid() = client_id);

-- Create quotes table
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  total_price numeric(10,2) not null,
  delivery_days integer not null,
  notes text,
  parts_breakdown jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now()
);

alter table public.quotes enable row level security;

-- Vendors can see their own quotes, clients can see quotes on their RFQs
create policy "quotes_select" on public.quotes for select using (
  auth.uid() = vendor_id 
  or exists (select 1 from public.rfqs where rfqs.id = quotes.rfq_id and rfqs.client_id = auth.uid())
);
create policy "quotes_insert" on public.quotes for insert with check (auth.uid() = vendor_id);
create policy "quotes_update_vendor" on public.quotes for update using (auth.uid() = vendor_id);

-- Allow clients to update quote status (accept/reject)
create policy "quotes_update_client" on public.quotes for update using (
  exists (select 1 from public.rfqs where rfqs.id = quotes.rfq_id and rfqs.client_id = auth.uid())
);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, company_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', null),
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'company_name', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
