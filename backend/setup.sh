#!/bin/bash

# Getravio Backend Setup Script

echo "=== Getravio Backend Setup ==="
echo ""

# Create virtual environment
echo "Creating virtual environment..."
python -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update .env with your settings"
fi

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser
echo ""
echo "Create a superuser account:"
python manage.py createsuperuser

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To start the server:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Run server: python manage.py runserver"
echo ""
echo "Admin panel: http://127.0.0.1:8000/admin"
echo "API: http://127.0.0.1:8000/api"
