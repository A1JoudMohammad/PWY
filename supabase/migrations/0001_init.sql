-- Pay With You: initial schema.
-- DEMO NOTE: bank linking and biometric enrolment are simulated. No real bank
-- data or biometric data is collected: only a random mock "print id".

create table public.pwy_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  age_range text not null check (age_range in ('16-25','26-40','41+')),
  created_at timestamptz not null default now()
);

create table public.pwy_bank_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bank text not null check (bank in ('NBK','KFH','Gulf Bank','Boubyan','Burgan','CBK')),
  balance numeric(12,3) not null check (balance >= 0),
  created_at timestamptz not null default now()
);

create table public.pwy_biometric_enrollments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  method text not null check (method in ('face','finger','palm')),
  print_id text not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.pwy_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant text not null,
  amount numeric(12,3) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index pwy_payments_user_idx on public.pwy_payments (user_id, created_at desc);

-- Row Level Security: users can only READ their own rows. All writes go through the functions below.
alter table public.pwy_profiles enable row level security;
alter table public.pwy_bank_links enable row level security;
alter table public.pwy_biometric_enrollments enable row level security;
alter table public.pwy_payments enable row level security;

create policy "pwy own profile" on public.pwy_profiles for select to authenticated using (id = (select auth.uid()));
create policy "pwy own bank" on public.pwy_bank_links for select to authenticated using (user_id = (select auth.uid()));
create policy "pwy own biometric" on public.pwy_biometric_enrollments for select to authenticated using (user_id = (select auth.uid()));
create policy "pwy own payments" on public.pwy_payments for select to authenticated using (user_id = (select auth.uid()));

-- Create the profile when someone signs up through Pay With You (sign-up metadata app = pwy).
-- Other apps sharing this Supabase project are left alone.
create function public.pwy_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.raw_user_meta_data->>'app', '') <> 'pwy' then return new; end if;
  insert into public.pwy_profiles (id, name, age_range)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Friend'), 80),
    case when new.raw_user_meta_data->>'age_range' in ('16-25','26-40','41+')
         then new.raw_user_meta_data->>'age_range' else '16-25' end
  );
  return new;
end $$;
create trigger pwy_on_auth_user_created after insert on auth.users
  for each row execute function public.pwy_handle_new_user();

-- Demo bank link: mock balance between 200 and 900 KWD.
create function public.pwy_link_bank(p_bank text) returns numeric
language plpgsql security definer set search_path = '' as $$
declare v_balance numeric(12,3);
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  v_balance := round((200 + random() * 700)::numeric, 3);
  insert into public.pwy_bank_links (user_id, bank, balance) values (auth.uid(), p_bank, v_balance)
  on conflict (user_id) do update set bank = excluded.bank;
  return (select balance from public.pwy_bank_links where user_id = auth.uid());
end $$;

-- Demo enrolment: generates a random mock id, starts inactive.
create function public.pwy_enroll_biometric(p_method text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  v_id := 'PWY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.pwy_biometric_enrollments (user_id, method, print_id, active)
  values (auth.uid(), p_method, v_id, false)
  on conflict (user_id) do update set method = excluded.method, print_id = excluded.print_id, active = false;
  return v_id;
end $$;

create function public.pwy_activate_biometric() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.pwy_biometric_enrollments set active = true where user_id = auth.uid();
  if not found then raise exception 'no biometric enrolled'; end if;
  if not exists (select 1 from public.pwy_bank_links where user_id = auth.uid()) then
    raise exception 'no bank linked';
  end if;
end $$;

-- Atomic payment: locks the balance row, checks activation + funds, records the payment.
create function public.pwy_make_payment(p_merchant text, p_amount numeric) returns numeric
language plpgsql security definer set search_path = '' as $$
declare v_balance numeric(12,3);
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000 then raise exception 'invalid amount'; end if;
  if not exists (select 1 from public.pwy_biometric_enrollments where user_id = auth.uid() and active) then
    raise exception 'not activated';
  end if;
  select balance into v_balance from public.pwy_bank_links where user_id = auth.uid() for update;
  if v_balance is null then raise exception 'no bank linked'; end if;
  if v_balance < p_amount then raise exception 'not enough balance'; end if;
  update public.pwy_bank_links set balance = balance - p_amount where user_id = auth.uid()
    returning balance into v_balance;
  insert into public.pwy_payments (user_id, merchant, amount) values (auth.uid(), left(p_merchant, 80), p_amount);
  return v_balance;
end $$;

-- Only signed-in users may call the functions.
revoke execute on function public.pwy_link_bank(text), public.pwy_enroll_biometric(text),
  public.pwy_activate_biometric(), public.pwy_make_payment(text, numeric) from public, anon;
grant execute on function public.pwy_link_bank(text), public.pwy_enroll_biometric(text),
  public.pwy_activate_biometric(), public.pwy_make_payment(text, numeric) to authenticated;
revoke execute on function public.pwy_handle_new_user() from public, anon, authenticated;
