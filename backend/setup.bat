@echo off

echo === Getravio Backend Setup ===
echo.

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create .env file
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo Please update .env with your settings
)

REM Run migrations
echo Running database migrations...
python manage.py makemigrations
python manage.py migrate

REM Create superuser
echo.
echo Create a superuser account:
python manage.py createsuperuser

echo.
echo === Setup Complete! ===
echo.
echo To start the server:
echo   1. Activate virtual environment: venv\Scripts\activate
echo   2. Run server: python manage.py runserver
echo.
echo Admin panel: http://127.0.0.1:8000/admin
echo API: http://127.0.0.1:8000/api
echo.
pause
