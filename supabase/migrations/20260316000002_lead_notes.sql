-- Lead note labels (reusable per client, with color)
create table if not exists lead_note_labels (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  color       text not null default '#6b7280',
  created_at  timestamptz not null default now(),

  unique (client_id, name)
);

alter table lead_note_labels enable row level security;

create policy "Clients can manage own labels"
  on lead_note_labels
  for all
  using  ((auth.jwt() ->> 'client_id')::uuid = client_id)
  with check ((auth.jwt() ->> 'client_id')::uuid = client_id);

-- Lead notes (one per lead + label combination possible, or standalone)
create table if not exists lead_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  lead_id     uuid not null references synced_leads(id) on delete cascade,
  label_id    uuid references lead_note_labels(id) on delete set null,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table lead_notes enable row level security;

create policy "Clients can manage own notes"
  on lead_notes
  for all
  using  ((auth.jwt() ->> 'client_id')::uuid = client_id)
  with check ((auth.jwt() ->> 'client_id')::uuid = client_id);

create index idx_lead_notes_lead_id on lead_notes(lead_id);
create index idx_lead_note_labels_client_id on lead_note_labels(client_id);
