# Badminton Club Manager

A production-ready MVP web application for badminton clubs to manage sessions and assign players to courts with automatic and manual assignment capabilities.

## Features

### Admin Portal
- **Player Management**: Register and manage player profiles with rankings and skill tiers
- **Session Management**: Create and manage badminton sessions
- **Court Assignment**: 
  - Auto-assignment algorithm with fairness metrics
  - Manual drag-and-drop editing
  - Lock courts to preserve specific assignments
- **Fairness Tracking**: 
  - Equal play opportunity
  - Waiting time tracking
  - Match-type distribution (MM/MF/FF)
  - Partner and opponent variety

### Player Portal
- View personal profile and statistics
- Track matches played across sessions
- See frequent partners and opponents
- Session history with match counts

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, React Router, @dnd-kit/core
- **Backend**: FastAPI (Python 3.9) with Pydantic models
- **Database**: PostgreSQL with SQLAlchemy ORM + Alembic migrations
- **Auth**: JWT access tokens with bcrypt password hashing
- **Containerization**: Docker Compose for local development

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.9+ (for local backend development)

## Quick Start with Docker

### 1. Clone and Setup Environment

```bash
cd "Path to Money/Badminton"

# Copy environment variables
cp .env.example .env
```

### 2. Start All Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Backend API on http://localhost:8000
- Frontend app on http://localhost:5173

### 3. Run Database Migrations

```bash
# Run migrations
docker-compose exec backend alembic upgrade head
```

### 4. Seed Sample Data

```bash
# Seed database with admin user and 20 sample players
docker-compose exec backend python seed.py
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **Admin Login**: 
  - Email: `admin@club.test`
  - Password: `Admin123!`
- **Player Login** (examples):
  - Email: `player1@club.test`
  - Password: `Player123!`

## Local Development (Without Docker)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
export DATABASE_URL="postgresql://badminton_user:badminton_pass@localhost:5432/badminton_db"
export SECRET_KEY="your-secret-key-change-in-production"
export ALGORITHM="HS256"
export ACCESS_TOKEN_EXPIRE_MINUTES="60"

# Run migrations
alembic upgrade head

# Seed database
python seed.py

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
echo "VITE_API_URL=http://localhost:8000" > .env

# Start development server
npm run dev
```

## Project Structure

```
.
├── backend/
│   ├── alembic/                 # Database migrations
│   │   └── versions/
│   ├── app/
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── players.py
│   │   │   ├── sessions.py
│   │   │   └── player_portal.py
│   │   ├── algorithm.py         # Auto-assignment logic
│   │   ├── auth.py              # JWT authentication
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # Database connection
│   │   ├── dependencies.py      # Auth dependencies
│   │   ├── main.py              # FastAPI app
│   │   ├── models.py            # SQLAlchemy models
│   │   └── schemas.py           # Pydantic schemas
│   ├── tests/
│   │   └── test_algorithm.py    # Algorithm tests
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── seed.py                  # Data seeding script
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts        # API client
│   │   ├── components/
│   │   │   ├── CourtCard.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── WaitingList.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Players.tsx
│   │   │   ├── Sessions.tsx
│   │   │   ├── SessionDetail.tsx
│   │   │   └── PlayerProfile.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Register new user

### Players (Admin Only)
- `GET /players` - List all players
- `GET /players/{id}` - Get player by ID
- `POST /players` - Create new player
- `PATCH /players/{id}` - Update player
- `DELETE /players/{id}` - Soft delete player

### Sessions
- `GET /sessions` - List all sessions
- `GET /sessions/{id}` - Get session details
- `POST /sessions` - Create new session
- `PATCH /sessions/{id}` - Update session
- `POST /sessions/{id}/attendance` - Set present players
- `GET /sessions/{id}/rounds` - Get session rounds
- `POST /sessions/{id}/rounds/auto_assign` - Auto-assign next round
- `GET /sessions/{id}/stats` - Get fairness statistics

### Rounds (Admin Only)
- `POST /sessions/rounds/{id}/start` - Start a round
- `POST /sessions/rounds/{id}/end` - End a round
- `PATCH /sessions/rounds/{id}/courts/{court_number}` - Update court assignment

### Player Portal
- `GET /me` - Get current user profile
- `GET /me/stats` - Get player statistics
- `GET /me/sessions` - Get player's sessions

## Auto-Assignment Algorithm

The algorithm creates fair court assignments by:

1. **Priority Scoring**: Players who have waited longer or played fewer matches get higher priority
2. **Team Balance**: Balances skill levels between opposing teams
3. **Partner/Opponent Variety**: Avoids repeating recent partners and opponents
4. **Match Type Preferences**: Respects desired match type ratios (MM/MF/FF)
5. **Locked Courts**: Preserves specific court assignments when regenerating

### Algorithm Parameters

```typescript
{
  desired_mm: number,              // Desired male-male matches
  desired_mf: number,              // Desired mixed matches
  desired_ff: number,              // Desired female-female matches
  prioritize_waiting: number,      // Weight for waiting time (default: 1.0)
  prioritize_equal_matches: number,// Weight for equal matches (default: 1.0)
  avoid_repeat_partners: number,   // Weight to avoid partners (default: 0.5)
  avoid_repeat_opponents: number,  // Weight to avoid opponents (default: 0.3)
  balance_skill: number            // Weight for skill balance (default: 0.5)
}
```

## Test Scenario: Auto-Assignment Fairness Validation

This scenario validates that the auto-assignment algorithm distributes play opportunities fairly, balances skill levels, and provides variety in partners/opponents over multiple rounds.

### Test Setup

**Session Configuration:**
- 2 courts available
- 8 rounds (15-minute matches)
- 9 players with varying skills and genders

**Test Players:**

| # | Name | Gender | Skill Level | Numeric Rank |
|---|------|--------|-------------|--------------|
| 1 | Alice | Female | Advanced | 7.0 |
| 2 | Bob | Male | Advanced | 6.5 |
| 3 | Carol | Female | Intermediate | 5.5 |
| 4 | David | Male | Intermediate | 6.0 |
| 5 | Emma | Female | Intermediate | 5.0 |
| 6 | Frank | Male | Intermediate | 5.5 |
| 7 | Grace | Female | Beginner+ | 4.5 |
| 8 | Henry | Male | Beginner+ | 4.0 |
| 9 | Iris | Female | Advanced | 6.5 |

**Algorithm Settings:**
```json
{
  "desired_mm": 1,
  "desired_mf": 1,
  "desired_ff": 1,
  "prioritize_waiting": 1.0,
  "prioritize_equal_matches": 1.0,
  "avoid_repeat_partners": 0.5,
  "avoid_repeat_opponents": 0.3,
  "balance_skill": 0.5
}
```

### Running the Test

1. **Create test session:**
   ```bash
   # Login as admin
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@club.test","password":"Admin123!"}'
   ```

2. **Create players** with the skill levels above

3. **Create session:**
   ```bash
   # Use the access token from login
   curl -X POST http://localhost:8000/sessions \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Fairness Test Session",
       "date": "2026-02-12",
       "match_duration_minutes": 15,
       "number_of_courts": 2
     }'
   ```

4. **Set all 9 players as present**

5. **Run 8 rounds:**
   - Click "Auto Assign Round" for each round
   - Start the round
   - Wait/fast-forward through match duration
   - End the round
   - Repeat

### Expected Results After 8 Rounds

**✅ Fair Play Distribution:**
- Each player should have played 7-8 matches (target: ~7.11 matches per player)
- With 2 courts and 9 players, 1 player waits each round (8 play, 1 sits)
- Maximum variance: ±1 match between any two players
- Each player should wait exactly 1 round (fair rotation)

**Example distribution:**
```
Player          | Matches Played | Waiting Rounds
----------------|----------------|---------------
Alice (F, 7.0)  | 7              | 1
Bob (M, 6.5)    | 7              | 1
Carol (F, 5.5)  | 7              | 1
David (M, 6.0)  | 7              | 1
Emma (F, 5.0)   | 8              | 0
Frank (M, 5.5)  | 7              | 1
Grace (F, 4.5)  | 7              | 1
Henry (M, 4.0)  | 8              | 0
Iris (F, 6.5)   | 8              | 0
```

**✅ Match Type Distribution:**
- MM (Male-Male): 2-3 matches (varies based on rotation)
- MF (Mixed): 3-4 matches (varies based on rotation)
- FF (Female-Female): 2-3 matches (varies based on rotation)
- OTHER: 0 matches (guaranteed by algorithm)
- Total: 16 matches across 8 rounds (2 courts × 8 rounds)

**✅ Skill Balance:**
- Average team skill difference per match: <1.0 points
- No match should have >2.0 points skill difference between teams
- Example balanced matches:
  - (Alice 7.0 + Henry 4.0 = 11.0) vs (Bob 6.5 + Grace 4.5 = 11.0) = 0.0 diff ✓
  - (Iris 6.5 + Emma 5.0 = 11.5) vs (David 6.0 + Carol 5.5 = 11.5) = 0.0 diff ✓
  - (Bob 6.5 + Emma 5.0 = 11.5) vs (Alice 7.0 + Frank 5.5 = 12.5) = 1.0 diff ✓

**✅ Partner Variety:**
- Each player should have 5-7 different partners across 7-8 matches
- No player should partner with the same person more than 2 times
- Average partners per player: ~6 unique partners

**✅ Opponent Variety:**
- Each player should face 6-8 different opponents
- No player should face the same opponent more than 2 times
- Average opponents per player: ~7 unique opponents

**✅ Court Variety:**
- Each player should play on both courts
- Distribution: 3-5 times per court
- Balanced usage: ~50% Court 1, ~50% Court 2

### Validation Metrics

Check the session statistics dashboard to verify:

1. **Fairness Score** (calculated from variance in matches played):
   - Excellent: <0.5 variance
   - Good: 0.5-1.0 variance
   - Acceptable: 1.0-1.5 variance

2. **Average Wait Time**:
   - Should be exactly 1 round per player (with 9 players and 2 courts)
   - Perfect rotation: each player sits out once

3. **Skill Balance Score**:
   - Average team difference: <1.0 points
   - 95% of matches should have <1.5 points difference

4. **Variety Metrics**:
   - Partner repetition rate: <30% (no more than 30% repeated partners)
   - Opponent repetition rate: <30%

### Success Criteria

The test passes if:
- ✅ Match count variance ≤1.0
- ✅ No OTHER match types created
- ✅ All match types represented (MM, MF, FF)
- ✅ Average skill difference <1.0 points
- ✅ Each player waits exactly 1 round (fair rotation)
- ✅ Each player plays on both courts (3-5 times each)
- ✅ Partner variety >70% unique
- ✅ Opponent variety >70% unique
- ✅ No player partners/faces same person >2 times

## Running Tests

```bash
# Backend tests
cd backend
pytest tests/

# Run specific test file
pytest tests/test_algorithm.py -v
```

## Database Migrations

### Create a New Migration

```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations

```bash
alembic upgrade head
```

### Rollback Migration

```bash
alembic downgrade -1
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://badminton_user:badminton_pass@localhost:5432/badminton_db
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## Production Deployment

### Security Checklist
- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Update database credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS origins
- [ ] Set secure cookie flags
- [ ] Use environment-specific configs
- [ ] Enable rate limiting
- [ ] Setup logging and monitoring

### Build for Production

```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run build
# Serve dist/ folder with nginx or similar
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Frontend Not Connecting to Backend
- Verify `VITE_API_URL` in frontend/.env
- Check CORS settings in backend/app/main.py
- Ensure backend is running on expected port

### Migration Errors
```bash
# Reset database (WARNING: destroys all data)
docker-compose down -v
docker-compose up -d
docker-compose exec backend alembic upgrade head
docker-compose exec backend python seed.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: admin@club.test

---

Built with ❤️ for badminton clubs
