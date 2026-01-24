-- Create database for Getravio application
-- Run this script as postgres superuser:
-- psql -U postgres -f create_database.sql

-- Create database
CREATE DATABASE getravio;

-- Create user (optional, if not using default postgres user)
-- CREATE USER getravio_user WITH PASSWORD 'your_password';
-- GRANT ALL PRIVILEGES ON DATABASE getravio TO getravio_user;

-- Connect to database
\c getravio;

-- Show connection info
SELECT current_database(), current_user;
