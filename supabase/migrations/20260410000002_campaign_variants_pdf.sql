-- Mail variants PDF upload: new bucket + column on clients

ALTER TABLE public.clients ADD COLUMN campaign_variants_pdf_url TEXT;

-- =============================================================================
-- STORAGE BUCKET: campaign-pdfs
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-pdfs',
  'campaign-pdfs',
  TRUE,
  20971520, -- 20 MB
  ARRAY['application/pdf']
);

-- Operators can upload
CREATE POLICY "Operators can upload campaign pdfs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-pdfs'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Operators can update
CREATE POLICY "Operators can update campaign pdfs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'campaign-pdfs'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Operators can delete
CREATE POLICY "Operators can delete campaign pdfs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'campaign-pdfs'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Authenticated users can view (clients need to view their own PDF)
CREATE POLICY "Authenticated users can view campaign pdfs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-pdfs');
