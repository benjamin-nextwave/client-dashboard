-- Add column_mappings to csv_uploads for explicit column mapping during upload
ALTER TABLE public.csv_uploads ADD COLUMN column_mappings JSONB;
