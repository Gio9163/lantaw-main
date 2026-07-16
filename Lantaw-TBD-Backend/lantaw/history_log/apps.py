from django.apps import AppConfig


class HistoryLogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'history_log'
    
    def ready(self):
        import history_log.signals  # noqa

