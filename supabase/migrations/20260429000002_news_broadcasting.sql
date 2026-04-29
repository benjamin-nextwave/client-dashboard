-- Phase 9: News Broadcasting — news_items + news_dismissals + news-images bucket
-- Depends on: 20260215000001_initial_schema.sql (profiles), 20260429000001_profile_language.sql
-- Schema groundwork for v1.1 News Broadcasting milestone (operator authoring + Phase 10 client delivery).

-- =============================================================================
-- NEWS_ITEMS TABLE (multilingual content + status lifecycle)
-- =============================================================================

CREATE TABLE public.news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_nl VARCHAR(200) NOT NULL DEFAULT '',
  title_en VARCHAR(200) NOT NULL DEFAULT '',
  title_hi VARCHAR(200) NOT NULL DEFAULT '',
  body_nl TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_hi TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ
);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_news_items_status ON public.news_items(status);
CREATE INDEX idx_news_items_published_at ON public.news_items(published_at DESC) WHERE status = 'published';

-- =============================================================================
-- RLS POLICIES: news_items
-- =============================================================================

-- Operators have full CRUD
CREATE POLICY "Operators full access on news_items" ON public.news_items
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Clients can read only published news (no client_id check — global broadcast)
CREATE POLICY "Clients read published news_items" ON public.news_items
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'user_role') = 'client'
    AND status = 'published'
  );

-- =============================================================================
-- NEWS_DISMISSALS TABLE (per-user dismissal tracking — schema only in Phase 9)
-- =============================================================================

CREATE TABLE public.news_dismissals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  news_item_id UUID NOT NULL REFERENCES public.news_items(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, news_item_id)
);

ALTER TABLE public.news_dismissals ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_news_dismissals_user_id ON public.news_dismissals(user_id);

-- Users can read their own dismissals
CREATE POLICY "Users read own news_dismissals" ON public.news_dismissals
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users can insert dismissals only for themselves (defends against forging another user's dismissal)
CREATE POLICY "Users insert own news_dismissals" ON public.news_dismissals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Operators can read all dismissals (for support/debugging — no Phase 9 UI surfaces this)
CREATE POLICY "Operators read all news_dismissals" ON public.news_dismissals
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- =============================================================================
-- STORAGE BUCKET: news-images
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  TRUE,
  2097152,  -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Operators can upload news images
CREATE POLICY "Operators can upload news images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'news-images'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Operators can update news images
CREATE POLICY "Operators can update news images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'news-images'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Operators can delete news images
CREATE POLICY "Operators can delete news images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'news-images'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Authenticated users can read news images (clients need to render them)
CREATE POLICY "Authenticated users can view news images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'news-images');
