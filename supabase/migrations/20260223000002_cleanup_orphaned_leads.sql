-- One-time cleanup: fix synced_leads rows where campaign_id does not match
-- client_campaigns for that client_id (data leaked to wrong clients).
-- Also cleans up cached_emails for affected clients.

DO $$
DECLARE
  v_orphan_count      INTEGER;
  v_reassigned_count  INTEGER := 0;
  v_deleted_count     INTEGER := 0;
  v_emails_deleted    INTEGER := 0;
  rec                 RECORD;
BEGIN
  -- Count orphaned synced_leads: campaign_id not in client_campaigns for that client_id
  SELECT COUNT(*) INTO v_orphan_count
  FROM synced_leads sl
  LEFT JOIN client_campaigns cc
    ON sl.client_id = cc.client_id AND sl.campaign_id = cc.campaign_id
  WHERE cc.id IS NULL;

  RAISE NOTICE '=== Orphaned synced_leads cleanup ===';
  RAISE NOTICE 'Found % orphaned synced_leads rows', v_orphan_count;

  IF v_orphan_count = 0 THEN
    RAISE NOTICE 'No orphaned rows found. Nothing to do.';
    RETURN;
  END IF;

  -- For each orphaned lead, try to reassign to the correct client
  FOR rec IN
    SELECT
      sl.id AS lead_id,
      sl.client_id AS wrong_client_id,
      sl.campaign_id,
      sl.email,
      sl.instantly_lead_id,
      -- Find the correct client_id for this campaign_id
      cc_correct.client_id AS correct_client_id
    FROM synced_leads sl
    LEFT JOIN client_campaigns cc
      ON sl.client_id = cc.client_id AND sl.campaign_id = cc.campaign_id
    LEFT JOIN client_campaigns cc_correct
      ON sl.campaign_id = cc_correct.campaign_id
    WHERE cc.id IS NULL
  LOOP
    IF rec.correct_client_id IS NOT NULL THEN
      -- A correct client exists for this campaign — try to reassign.
      -- But first check if the correct (client_id, instantly_lead_id, campaign_id) already exists
      -- to avoid unique constraint violation.
      IF NOT EXISTS (
        SELECT 1 FROM synced_leads
        WHERE client_id = rec.correct_client_id
          AND instantly_lead_id = rec.instantly_lead_id
          AND campaign_id = rec.campaign_id
      ) THEN
        UPDATE synced_leads
        SET client_id = rec.correct_client_id,
            updated_at = NOW()
        WHERE id = rec.lead_id;

        v_reassigned_count := v_reassigned_count + 1;

        RAISE NOTICE 'REASSIGNED: lead % (%) from client % → client % (campaign %)',
          rec.lead_id, rec.email, rec.wrong_client_id, rec.correct_client_id, rec.campaign_id;
      ELSE
        -- Correct version already exists, delete the orphan
        DELETE FROM synced_leads WHERE id = rec.lead_id;
        v_deleted_count := v_deleted_count + 1;

        RAISE NOTICE 'DELETED (duplicate): lead % (%) from client % — correct version exists in client % (campaign %)',
          rec.lead_id, rec.email, rec.wrong_client_id, rec.correct_client_id, rec.campaign_id;
      END IF;
    ELSE
      -- No client owns this campaign at all — delete the orphan
      DELETE FROM synced_leads WHERE id = rec.lead_id;
      v_deleted_count := v_deleted_count + 1;

      RAISE NOTICE 'DELETED (no owner): lead % (%) from client % — campaign % has no client_campaigns entry',
        rec.lead_id, rec.email, rec.wrong_client_id, rec.campaign_id;
    END IF;
  END LOOP;

  RAISE NOTICE '---';
  RAISE NOTICE 'synced_leads: % reassigned, % deleted (of % orphans)', v_reassigned_count, v_deleted_count, v_orphan_count;

  -- Clean up cached_emails: delete emails where client_id has no matching
  -- synced_leads entry for that (client_id, lead_email) combination.
  -- This removes emails that were cached for the wrong client.
  DELETE FROM cached_emails ce
  WHERE NOT EXISTS (
    SELECT 1 FROM synced_leads sl
    WHERE sl.client_id = ce.client_id
      AND sl.email = ce.lead_email
  );

  GET DIAGNOSTICS v_emails_deleted = ROW_COUNT;

  RAISE NOTICE 'cached_emails: % orphaned rows deleted', v_emails_deleted;
  RAISE NOTICE '=== Cleanup complete ===';
END $$;
