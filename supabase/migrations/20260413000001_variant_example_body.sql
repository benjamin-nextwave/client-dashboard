-- Add example body to mail variants: the "filled in" version of the
-- template that shows what the mail looks like with real data.
ALTER TABLE public.mail_variants
  ADD COLUMN example_body TEXT NOT NULL DEFAULT '';
