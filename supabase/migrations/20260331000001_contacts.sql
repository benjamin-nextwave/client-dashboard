-- Contact columns: dynamic column definitions per client
CREATE TABLE contact_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);

-- Contacts: stores contact rows with JSONB data keyed by column ID
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_contacts_data_gin ON contacts USING GIN(data);
CREATE INDEX idx_contact_columns_client_id ON contact_columns(client_id);

-- RLS: contact_columns
ALTER TABLE contact_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can manage contact_columns"
  ON contact_columns FOR ALL
  USING (
    (SELECT raw_app_meta_data->>'user_role' FROM auth.users WHERE id = auth.uid()) = 'operator'
  );

CREATE POLICY "Clients can view own contact_columns"
  ON contact_columns FOR SELECT
  USING (
    client_id = (
      (SELECT raw_app_meta_data->>'client_id' FROM auth.users WHERE id = auth.uid())::uuid
    )
  );

-- RLS: contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can manage contacts"
  ON contacts FOR ALL
  USING (
    (SELECT raw_app_meta_data->>'user_role' FROM auth.users WHERE id = auth.uid()) = 'operator'
  );

CREATE POLICY "Clients can view own contacts"
  ON contacts FOR SELECT
  USING (
    client_id = (
      (SELECT raw_app_meta_data->>'client_id' FROM auth.users WHERE id = auth.uid())::uuid
    )
  );

-- Search function for contacts (searches across all JSONB text values)
CREATE OR REPLACE FUNCTION search_contacts(
  p_client_id UUID,
  p_search TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  client_id UUID,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.client_id,
    c.data,
    c.created_at,
    c.updated_at,
    COUNT(*) OVER() AS total_count
  FROM contacts c
  WHERE c.client_id = p_client_id
    AND (
      p_search = ''
      OR EXISTS (
        SELECT 1 FROM jsonb_each_text(c.data) AS kv
        WHERE kv.value ILIKE '%' || p_search || '%'
      )
    )
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
