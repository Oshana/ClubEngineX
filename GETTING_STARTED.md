# 🏸 Badminton Club Manager - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Navigate to Project Directory
```bash
cd "/Users/oshana/Desktop/Path to Money/Badminton"
```

### Step 2: Create Environment File
```bash
cp .env.example .env
```

### Step 3: Start Docker Services
```bash
docker-compose up -d
```

Wait about 30 seconds for all services to start.

### Step 4: Setup Database
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Seed sample data
docker-compose exec backend python seed.py
```

### Step 5: Open Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs

### Step 6: Login

**Admin Account:**
- Email: `admin@club.test`
- Password: `Admin123!`

**Player Account (for testing):**
- Email: `player1@club.test`  
- Password: `Player123!`

---

## 🎯 What You Can Do

### As Admin:
1. **Manage Players**: Add/edit/delete players with rankings
2. **Create Sessions**: Set up badminton sessions with courts
3. **Set Attendance**: Mark which players are present
4. **Auto-Assign Courts**: Let the algorithm create fair matches
5. **Manual Adjustments**: Drag-and-drop players between courts
6. **Track Fairness**: View stats on matches, waiting times, and variety

### As Player:
1. **View Profile**: See your stats and rankings
2. **Match History**: Track all matches played
3. **Partners & Opponents**: See who you play with most
4. **Session History**: Review past sessions

---

## 📋 Common Tasks

### Start Fresh Session
1. Login as admin
2. Click "New Session" 
3. Enter session name and court count
4. Click "Set Attendance" to mark present players
5. Click "Auto-Assign Next Round"
6. Click "Start Round" to begin
7. After match duration, click "End Round"
8. Repeat steps 5-7 for more rounds

### View Player Stats
1. Login as player
2. Click "My Profile"
3. See all statistics and history

### Modify Court Assignment
1. During a round setup
2. Drag players between courts and waiting list
3. Lock courts to preserve specific assignments
4. Click "Regenerate" to reassign unlocked courts

---

## 🔧 Troubleshooting

### Services Won't Start
```bash
# Check Docker is running
docker --version

# View logs
docker-compose logs
```

### Database Issues
```bash
# Reset everything (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
docker-compose exec backend alembic upgrade head
docker-compose exec backend python seed.py
```

### Frontend Not Loading
```bash
# Rebuild frontend
docker-compose restart frontend

# Or check logs
docker-compose logs frontend
```

### Backend API Errors
```bash
# View backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

---

## 📊 Understanding the Algorithm

The auto-assignment algorithm optimizes for:

1. **Fairness**: Players who waited longer play first
2. **Balance**: Equal skill levels between teams
3. **Variety**: Avoid repeating partners/opponents
4. **Match Types**: Respects MM/MF/FF preferences

The algorithm is deterministic - same inputs always produce same outputs.

---

## 🧪 Running Tests

```bash
# Run all backend tests
docker-compose exec backend pytest tests/ -v

# Run specific test
docker-compose exec backend pytest tests/test_algorithm.py -v
```

---

## 📝 Next Steps

1. **Customize**: Edit player rankings to match your club's system
2. **Add Real Players**: Replace sample data with actual members
3. **Test Algorithm**: Create a session and try different scenarios
4. **Monitor Stats**: Track fairness metrics across sessions
5. **Production Deploy**: See README.md for deployment guide

---

## 💡 Tips

- **Lock Courts**: Use the lock feature to keep specific players together
- **Check Stats**: View fairness metrics to ensure equal play
- **Session History**: Players can track their progress over time
- **Bulk Actions**: Select multiple players for attendance quickly

---

## 🆘 Need Help?

- Check README.md for detailed documentation
- View API docs at http://localhost:8000/docs
- Run `docker-compose logs` to debug issues

---

## 🎉 You're Ready!

The system is now running. Login and start managing your badminton club!

**Admin Portal**: http://localhost:5173 (admin@club.test / Admin123!)
