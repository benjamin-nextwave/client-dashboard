-- Allow multiple decision-maker contacts per lead.
--
-- Until now a lead_admin_contacts row held exactly one contact (the
-- contact_* columns). We move to a JSONB array `contacts` so an operator can
-- list several people. The lead-level `contact_none` flag stays as-is.
--
-- Each array element looks like:
--   { "name": "...", "email": "...", "linkedinUrl": "...", "jobTitle": "..." }
-- (any field may be absent).

alter table lead_admin_contacts
  add column if not exists contacts jsonb not null default '[]'::jsonb;

-- Backfill: fold any existing single contact into the new array.
update lead_admin_contacts
set contacts = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'name', contact_name,
    'email', contact_email,
    'linkedinUrl', contact_linkedin_url,
    'jobTitle', contact_job_title
  ))
)
where contact_none = false
  and contacts = '[]'::jsonb
  and (
    contact_name is not null
    or contact_email is not null
    or contact_linkedin_url is not null
    or contact_job_title is not null
  );

-- The legacy contact_* columns are now unused; left in place (nullable) and
-- can be dropped later.
