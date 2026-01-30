"""
ASGI config for getravio project.
Configures both HTTP and WebSocket protocols using Django Channels.
"""

import os
from django.core.asgi import get_asgi_application

# Must set Django settings before importing Channels
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'getravio.settings')
django_asgi_app = get_asgi_application()

# Now import Channels components
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from api.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
