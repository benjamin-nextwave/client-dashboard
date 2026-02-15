-- CSV Import/Export and DNC Management tables with RLS policies
-- Part of Phase 6: CSV Import/Export & DNC Management

-- =============================================================================
-- CSV_UPLOADS TABLE (tracks uploaded CSV files)
-- =============================================================================

CREATE TABLE public.csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  headers JSONB NOT NULL,
  total_rows INTEGER NOT NULL,
  email_column TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'ready', 'filtered', 'exported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_csv_uploads_client_id ON public.csv_uploads(client_id);

-- =============================================================================
-- CSV_ROWS TABLE (individual rows from uploaded CSVs)
-- =============================================================================

CREATE TABLE public.csv_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.csv_uploads(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,
  is_filtered BOOLEAN NOT NULL DEFAULT FALSE,
  filter_reason TEXT,
  UNIQUE(upload_id, row_index)
);

ALTER TABLE public.csv_rows ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_csv_rows_upload_id ON public.csv_rows(upload_id);
CREATE INDEX idx_csv_rows_data_gin ON public.csv_rows USING GIN (data);

-- =============================================================================
-- DNC_ENTRIES TABLE (Do Not Contact list per client)
-- =============================================================================

CREATE TABLE public.dnc_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('email', 'domain')),
  value TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, entry_type, value)
);

ALTER TABLE public.dnc_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_dnc_entries_client_id ON public.dnc_entries(client_id);
CREATE INDEX idx_dnc_entries_lookup ON public.dnc_entries(client_id, entry_type, value);

-- =============================================================================
-- RLS POLICIES: csv_uploads table (operators only)
-- =============================================================================

CREATE POLICY "Operators can do everything with csv_uploads" ON public.csv_uploads
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- =============================================================================
-- RLS POLICIES: csv_rows table (operators only)
-- =============================================================================

CREATE POLICY "Operators can do everything with csv_rows" ON public.csv_rows
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- =============================================================================
-- RLS POLICIES: dnc_entries table (client-scoped + operator read)
-- =============================================================================

-- Clients can manage their own DNC entries
CREATE POLICY "Clients can manage own dnc_entries" ON public.dnc_entries
  FOR ALL TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'))
  WITH CHECK (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Operators can view all DNC entries
CREATE POLICY "Operators can view all dnc_entries" ON public.dnc_entries
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');
