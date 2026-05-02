#!/bin/bash

# Flipstar Deployment Script for Ethiopia Telecom Server
# This script deploys the full-stack application using Docker

set -e

echo "=== Flipstar Deployment Script ==="
echo "Deploying to Ethiopia Telecom Server..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found. Please create it from env.production.example"
    exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Pull latest code (if using git)
# git pull origin main

# Build and start containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec backend python manage.py migrate

# Collect static files
echo "Collecting static files..."
docker-compose exec backend python manage.py collectstatic --noinput

# Create superuser if doesn't exist
echo "Creating superuser if not exists..."
docker-compose exec backend python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@flipstar.com', '${ADMIN_PASSWORD:-admin123}')
    print('Superuser created')
else:
    print('Superuser already exists')
"

echo "=== Deployment Complete ==="
echo "Application is running at:"
echo "  - Frontend: http://localhost"
echo "  - Backend: http://localhost:8000"
echo "  - WebSocket: ws://localhost:8000/ws/"
