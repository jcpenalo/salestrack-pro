-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Enum for Roles
create type user_role as enum ('creator', 'admin', 'supervisor', 'representative', 'seguimiento');

-- 2. Create Profiles Table (Publicly accessible user data)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role user_role default 'representative',
  vicidial_id text,
  join_date timestamp with time zone default timezone('utc'::text, now()),
  
  constraint users_email_key unique (email)
);

-- 3. Enable RLS
alter table public.users enable row level security;

-- 4. Secure Helper for Roles (Prevents Infinite Recursion)
create or replace function public.get_user_role()
returns user_role as $$
begin
  return (select role from public.users where id = auth.uid());
end;
$$ language plpgsql security definer;

-- 5. Create Policies
-- Allow users to view their own profile (Safe, uses auth.uid)
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

-- Allow Creator and Admins to view all profiles (Safe, uses helper)
create policy "Admins and Creator can view all profiles" on public.users
  for select using (
    public.get_user_role() in ('creator', 'admin')
  );

-- Allow Creator to update anyone (Safe, uses helper)
create policy "Creator can update anyone" on public.users
  for update using (
    public.get_user_role() = 'creator'
  );

-- 5. Create Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'representative' -- Default role
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
