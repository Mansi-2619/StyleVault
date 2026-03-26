-- Run this in your Supabase SQL editor (one time setup)

create table users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique not null,
  password text not null,
  created_at timestamp default now()
);

create table wardrobe_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  color text,
  cat text not null,
  style text,
  tags text[],
  emoji text,
  image_url text,
  created_at timestamp default now()
);

create table saved_outfits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  pieces jsonb not null,
  note text,
  occasion text,
  created_at timestamp default now()
);

-- Enable row level security
alter table users enable row level security;
alter table wardrobe_items enable row level security;
alter table saved_outfits enable row level security;
