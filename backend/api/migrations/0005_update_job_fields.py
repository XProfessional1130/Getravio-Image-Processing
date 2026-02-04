# Generated manually - update Job model fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_job_view_type'),
    ]

    operations = [
        # Remove old simulation fields
        migrations.RemoveField(
            model_name='job',
            name='simulation1_image',
        ),
        migrations.RemoveField(
            model_name='job',
            name='simulation2_image',
        ),
        migrations.RemoveField(
            model_name='job',
            name='selected_simulation',
        ),
        # Add new simulation_image field
        migrations.AddField(
            model_name='job',
            name='simulation_image',
            field=models.ImageField(blank=True, null=True, upload_to='simulations/'),
        ),
    ]
