"""
Create test data for development
Run: python manage.py shell < create_test_data.py
Or: python manage.py shell
     >>> exec(open('create_test_data.py').read())
"""

from django.contrib.auth.models import User
from api.models import Job

# Create test user
print("Creating test user...")
user, created = User.objects.get_or_create(
    username='testuser',
    email='test@example.com',
    defaults={'first_name': 'Test', 'last_name': 'User'}
)

if created:
    user.set_password('testpass123')
    user.save()
    print(f"✓ Created user: {user.username} (test@example.com)")
    print(f"  Password: testpass123")
else:
    print(f"✓ User already exists: {user.username}")

# Create admin user
print("\nCreating admin user...")
admin, created = User.objects.get_or_create(
    username='admin',
    email='admin@example.com',
    defaults={'first_name': 'Admin', 'last_name': 'User', 'is_staff': True, 'is_superuser': True}
)

if created:
    admin.set_password('admin123')
    admin.save()
    print(f"✓ Created admin: {admin.username} (admin@example.com)")
    print(f"  Password: admin123")
else:
    print(f"✓ Admin already exists: {admin.username}")

print("\n" + "="*50)
print("Test Data Created!")
print("="*50)
print("\nTest User Credentials:")
print("  Email: test@example.com")
print("  Password: testpass123")
print("\nAdmin Credentials:")
print("  Username: admin")
print("  Email: admin@example.com")
print("  Password: admin123")
print("\nYou can now login via:")
print("  - Frontend: http://localhost:5173")
print("  - Admin: http://127.0.0.1:8000/admin")
print("="*50)
