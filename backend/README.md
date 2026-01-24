# Getravio Backend - Phase 0

Simple Django REST API backend for body simulation processing.

## Features

- **Authentication**: User login via email/password
- **Job Management**: Create, list, and track simulation jobs
- **Image Upload**: Handle original image uploads
- **Job Status Tracking**: queued, processing, completed, failed
- **REST API**: Full RESTful API with Django REST Framework

## Tech Stack

- **Django 5.0** - Web framework
- **Django REST Framework** - REST API
- **SQLite** - Database (Phase 0)
- **Pillow** - Image processing
- **CORS Headers** - Frontend integration

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

### 4. Database Setup

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

### 6. Run Development Server

```bash
python manage.py runserver
```

Server will run at `http://127.0.0.1:8000`

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
  ```json
  {
    "email": "user@example.com",
    "password": "password"
  }
  ```

- `GET /api/auth/me` - Get current user (authenticated)

### Jobs

- `GET /api/jobs` - List all jobs (authenticated, user's jobs only)
- `POST /api/jobs` - Create new job (authenticated)
  ```json
  {
    "region": "gluteal",
    "scenario": "projection-level-1",
    "message": "Optional note",
    "original_image": "<file>"
  }
  ```
- `GET /api/jobs/:id` - Get job details (authenticated)
- `PATCH /api/jobs/:id` - Update job (authenticated)
- `DELETE /api/jobs/:id` - Delete job (authenticated)

## Project Structure

```
backend/
├── getravio/           # Django project settings
│   ├── __init__.py
│   ├── settings.py     # Project settings
│   ├── urls.py         # Main URL routing
│   ├── wsgi.py
│   └── asgi.py
├── api/                # Main API app
│   ├── __init__.py
│   ├── models.py       # Job model
│   ├── serializers.py  # DRF serializers
│   ├── views.py        # API views
│   ├── urls.py         # API routing
│   ├── admin.py        # Django admin
│   └── apps.py
├── manage.py           # Django management
├── requirements.txt    # Python dependencies
└── README.md
```

## Models

### Job Model

- `user` - ForeignKey to User
- `region` - CharField (gluteal)
- `scenario` - CharField (projection-level-1/2/3)
- `status` - CharField (queued/processing/completed/failed)
- `message` - TextField (optional notes)
- `original_image` - ImageField
- `simulation1_image` - ImageField (nullable)
- `simulation2_image` - ImageField (nullable)
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

## Admin Interface

Access Django admin at `http://127.0.0.1:8000/admin`

Use superuser credentials to:
- View all jobs
- Manage users
- Update job statuses
- View uploaded images

## Development Notes

### Phase 0 Limitations

- Simple authentication (no JWT tokens)
- SQLite database (not for production)
- No actual AI processing (placeholder)
- Basic file upload validation
- Session-based authentication

### Future Enhancements

- JWT authentication
- PostgreSQL database
- Celery task queue for processing
- AWS S3 for image storage
- Job processing workers
- Rate limiting
- API versioning
- Comprehensive error handling

## CORS Configuration

Frontend allowed origins configured in `settings.py`:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

## Testing

Create a test user and job via Django shell:

```bash
python manage.py shell
```

```python
from django.contrib.auth.models import User
from api.models import Job

# Create user
user = User.objects.create_user(
    username='testuser',
    email='test@example.com',
    password='testpass123'
)

# User can now login via API
```
