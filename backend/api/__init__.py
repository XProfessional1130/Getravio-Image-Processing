"""
API app initialization.
Import task modules to ensure Celery discovers them.
"""
default_app_config = 'api.apps.ApiConfig'

# Import tasks to ensure Celery registers them
try:
    from . import tasks
except ImportError:
    pass
