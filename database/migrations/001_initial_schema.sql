-- Initial schema for the portfolio platform.
-- See database/schema.sql for the full baseline design.

create table if not exists portfolio_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
