"""
WebSocket consumers for real-time job status updates.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class JobStatusConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for job status updates.
    Each user connects to their own channel to receive job updates.
    """

    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope['user']

        # Reject anonymous users
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close()
            return

        # Create a unique channel for this user
        self.user_channel_name = f'job_updates_{self.user.id}'

        # Join user's personal channel group
        await self.channel_layer.group_add(
            self.user_channel_name,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to job updates'
        }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'user_channel_name'):
            # Leave user's channel group
            await self.channel_layer.group_discard(
                self.user_channel_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle messages from WebSocket client (optional)"""
        try:
            data = json.dumps(text_data)
            # Could handle ping/pong or other client messages here
        except json.JSONDecodeError:
            pass

    async def job_status_update(self, event):
        """
        Handle job status update events from channel layer.
        This is called when a job status changes.
        """
        # Send job update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'job_update',
            'job': event['job']
        }))
