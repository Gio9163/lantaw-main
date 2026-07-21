-- Free Supabase pg_cron schedule for Lantaw history-log retention.
-- Active logs move to the archive after 7 days. Archived logs are permanently
-- deleted 30 days after archived_at. The scheduled transaction is atomic.

create extension if not exists pg_cron;

do $setup$
begin
    if exists (
        select 1
        from cron.job
        where jobname = 'lantaw-history-retention'
    ) then
        perform cron.unschedule('lantaw-history-retention');
    end if;
end
$setup$;

select cron.schedule(
    'lantaw-history-retention',
    '17 2 * * *',
    $job$
    with moved_logs as (
        delete from public.history_log_historylog
        where "timestamp" <= now() - interval '7 days'
        returning
            "timestamp",
            user_id,
            action,
            change_type,
            module,
            description,
            project_id,
            object_name,
            entity_id,
            old_state,
            new_state,
            user_role,
            related_change_request_id
    ),
    archived_logs as (
        insert into public.history_log_archivedhistorylog (
            "timestamp",
            user_id,
            action,
            change_type,
            module,
            description,
            project_id,
            object_name,
            entity_id,
            old_state,
            new_state,
            user_role,
            related_change_request_id,
            archived_at
        )
        select
            "timestamp",
            user_id,
            action,
            change_type,
            module,
            description,
            project_id,
            object_name,
            entity_id,
            old_state,
            new_state,
            user_role,
            related_change_request_id,
            now()
        from moved_logs
        returning id
    ),
    purged_logs as (
        delete from public.history_log_archivedhistorylog
        where archived_at <= now() - interval '30 days'
        returning id
    )
    select
        (select count(*) from archived_logs) as archived_count,
        (select count(*) from purged_logs) as purged_count;
    $job$
);
