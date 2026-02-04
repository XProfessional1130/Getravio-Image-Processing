# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_create_missing_profiles'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='view_type',
            field=models.CharField(choices=[('rear', 'Rear View'), ('side', 'Side View')], default='rear', max_length=20),
        ),
    ]
