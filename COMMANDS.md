# Badminton Club Manager - Development Scripts

## Quick Commands

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build

# Run backend migrations
docker-compose exec backend alembic upgrade head

# Seed database
docker-compose exec backend python seed.py

# Run backend tests
docker-compose exec backend pytest tests/ -v

# Access backend shell
docker-compose exec backend python

# Access database
docker-compose exec db psql -U badminton_user -d badminton_db

# Reset database (WARNING: destroys all data)
docker-compose down -v
docker-compose up -d
docker-compose exec backend alembic upgrade head
docker-compose exec backend python seed.py
