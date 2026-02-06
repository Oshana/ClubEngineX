#!/bin/bash

# Badminton Club Manager - Setup Script
# This script sets up and starts the entire application

echo "🏸 Badminton Club Manager - Setup & Start"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Navigate to project directory
cd "/Users/oshana/Desktop/Path to Money/Badminton"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

echo "🚀 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 30

echo ""
echo "📊 Running database migrations..."
docker-compose exec backend alembic upgrade head

echo ""
echo "🌱 Seeding sample data..."
docker-compose exec backend python seed.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "========================================"
echo "🎉 Application is ready!"
echo "========================================"
echo ""
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:8000"
echo "API Docs:  http://localhost:8000/docs"
echo ""
echo "Admin Login:"
echo "  Email:    admin@club.test"
echo "  Password: Admin123!"
echo ""
echo "Player Login:"
echo "  Email:    player1@club.test"
echo "  Password: Player123!"
echo ""
echo "To stop the application:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
