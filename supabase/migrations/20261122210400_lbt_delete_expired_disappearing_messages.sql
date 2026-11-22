DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  FOR existing_job_id IN
    SELECT jobid FROM cron.job
    WHERE jobname = 'lbt-expire-disappearing-messages'
  LOOP
    PERFORM cron.unschedule(existing_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'lbt-expire-disappearing-messages',
    '*/15 * * * *',
    $job$DELETE FROM public.messages
         WHERE expires_at IS NOT NULL
           AND expires_at <= now();$job$
  );
END;
$$;

DELETE FROM public.messages
WHERE expires_at IS NOT NULL
  AND expires_at <= now();