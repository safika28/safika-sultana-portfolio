create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'viewer' check (role in ('super_admin', 'editor', 'viewer')),
  full_name text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text,
  published boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'closed')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table projects enable row level security;
alter table blog_posts enable row level security;
alter table inquiries enable row level security;

create policy "public read published content" on projects for select using (published = true);
create policy "public read published posts" on blog_posts for select using (published = true);
create policy "admin manage all" on profiles for all using (auth.role() = 'authenticated');
