"""History log signals are intentionally lightweight.

The project uses the shared history_log.services.log_history helper in views so
that audit entries are created consistently and without duplication.
"""

