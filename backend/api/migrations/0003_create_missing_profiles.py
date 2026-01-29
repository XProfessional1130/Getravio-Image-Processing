# Generated manually to create profiles for existing users

from django.db import migrations


def create_missing_profiles(apps, schema_editor):
    """Create UserProfile for any User that doesn't have one"""
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('api', 'UserProfile')

    for user in User.objects.all():
        UserProfile.objects.get_or_create(user=user)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_job_is_favorite_job_selected_simulation_userprofile'),
    ]

    operations = [
        migrations.RunPython(create_missing_profiles),
    ]
