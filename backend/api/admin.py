from django.contrib import admin
from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    """Admin interface for Job model"""

    list_display = ['id', 'user', 'region', 'scenario', 'status', 'created_at']
    list_filter = ['status', 'region', 'scenario', 'created_at']
    search_fields = ['user__username', 'user__email', 'message']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Job Information', {
            'fields': ('user', 'region', 'scenario', 'status', 'message')
        }),
        ('Images', {
            'fields': ('original_image', 'simulation1_image', 'simulation2_image')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
