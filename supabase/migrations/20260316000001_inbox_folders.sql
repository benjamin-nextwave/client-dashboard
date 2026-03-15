-- Inbox folders: allow clients to organise leads into custom folders
-- ================================================================

-- 1. Folders table
create table if not exists inbox_folders (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_inbox_folders_client on inbox_folders(client_id);

-- 2. Add folder_id to synced_leads
alter table synced_leads
  add column if not exists folder_id uuid references inbox_folders(id) on delete set null;

create index idx_synced_leads_folder on synced_leads(folder_id);

-- 3. RLS
alter table inbox_folders enable row level security;

-- Operators: full access
create policy "Operators manage all folders"
  on inbox_folders for all
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.user_role = 'operator')
  );

-- Clients: view + create + update + delete own folders
create policy "Clients manage own folders"
  on inbox_folders for all
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.client_id = inbox_folders.client_id)
  );
