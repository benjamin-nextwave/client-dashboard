-- Add inbox_url column to clients table for Instantly inbox embed
ALTER TABLE clients ADD COLUMN inbox_url TEXT;

-- Allow operators to update inbox_url via existing RLS policies (no new policy needed)
COMMENT ON COLUMN clients.inbox_url IS 'External Instantly inbox URL to embed in the client dashboard';
