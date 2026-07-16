# TODO - Objective Overview Dashboard status sync fix

- [x] Update frontend objective status derivation to use refreshed `activitiesMap` instead of potentially stale `objective.activities`.
- [x] Ensure objective status recomputation happens after activity create/update/delete and after the `lantaw:activities-updated` event.
- [x] Verify dashboard displays correct objective status for NOT_STARTED -> IN_PROGRESS -> COMPLETED workflow.

# TODO - History Logs soft-delete + archive workflow
- [x] Backend: add HistoryLog archive endpoint (POST /api/history-log/{id}/archive/)
- [x] Backend: add ArchivedHistoryLog permanent delete endpoint (DELETE /api/history-log/archive/{id}/permanent-delete/)
- [x] Frontend: add History Logs row Delete button (archives + refreshes list)
- [ ] Archive Dashboard: add Restore + Permanently Delete buttons with confirmation + refresh



