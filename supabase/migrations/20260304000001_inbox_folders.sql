-- Create inbox_folders table for custom folder management
CREATE TABLE public.inbox_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: clients can only see their own folders
ALTER TABLE public.inbox_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own folders"
  ON public.inbox_folders FOR SELECT
  USING (client_id = (current_setting('request.jwt.claims', true)::json->>'client_id')::uuid);

CREATE POLICY "Clients can insert own folders"
  ON public.inbox_folders FOR INSERT
  WITH CHECK (client_id = (current_setting('request.jwt.claims', true)::json->>'client_id')::uuid);

CREATE POLICY "Clients can update own folders"
  ON public.inbox_folders FOR UPDATE
  USING (client_id = (current_setting('request.jwt.claims', true)::json->>'client_id')::uuid);

CREATE POLICY "Clients can delete own folders"
  ON public.inbox_folders FOR DELETE
  USING (client_id = (current_setting('request.jwt.claims', true)::json->>'client_id')::uuid);

-- Service role bypass
CREATE POLICY "Service role full access on inbox_folders"
  ON public.inbox_folders FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- Add folder_id column to synced_leads
ALTER TABLE public.synced_leads ADD COLUMN folder_id UUID REFERENCES public.inbox_folders(id) ON DELETE SET NULL;

-- Add reply_received_at to store actual reply timestamp (not updated_at which gets overwritten on sync)
ALTER TABLE public.synced_leads ADD COLUMN reply_received_at TIMESTAMPTZ;
