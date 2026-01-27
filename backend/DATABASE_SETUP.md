# Database Setup Guide - PostgreSQL

## Prerequisites

Make sure PostgreSQL is installed and running on your system.

### Check if PostgreSQL is installed:
```bash
psql --version
```

### Check if PostgreSQL service is running:

**Windows:**
```bash
# Check service status
sc query postgresql-x64-17

# Start service if not running
net start postgresql-x64-17
```

**Linux:**
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Mac:**
```bash
brew services list
brew services start postgresql
```

## Database Creation

### Option 1: Using psql command line

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Inside psql, run:
CREATE DATABASE getravio;

# Verify database was created
\l

# Exit psql
\q
```

### Option 2: Using SQL script

```bash
psql -U postgres -f create_database.sql
```

### Option 3: Using pgAdmin

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases"
4. Select "Create" → "Database"
5. Enter database name: `getravio`
6. Click "Save"

## Environment Configuration

Update your `.env` file with PostgreSQL credentials:

```env
DB_NAME=getravio
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
```

## Run Migrations

After creating the database, run Django migrations:

```bash
# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Run migrations
python manage.py migrate

# Create test users
python manage.py shell < create_test_data.py
```

## Verify Database Connection

Test the database connection:

```bash
python manage.py dbshell
```

This should connect you to the PostgreSQL database. Type `\dt` to see tables, `\q` to quit.

## Troubleshooting

### Connection Refused Error

If you get "connection refused" error:
1. Make sure PostgreSQL service is running
2. Check if PostgreSQL is listening on localhost:5432
3. Verify firewall settings

### Authentication Failed

If you get authentication error:
1. Check your .env file has correct password
2. Update postgres user password if needed:
   ```sql
   ALTER USER postgres WITH PASSWORD 'new_password';
   ```

### Database Already Exists

If database already exists:
```bash
# Drop and recreate (WARNING: This deletes all data!)
psql -U postgres -c "DROP DATABASE getravio;"
psql -U postgres -c "CREATE DATABASE getravio;"
```

## PostgreSQL Default Credentials

Default PostgreSQL credentials (change in production):
- **Username:** postgres
- **Password:** postgres (or the password you set during PostgreSQL installation)
- **Host:** localhost
- **Port:** 5432
