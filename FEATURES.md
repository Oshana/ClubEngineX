# 🏸 Badminton Club Manager - Feature Documentation

## Table of Contents
- [Session Management](#session-management)
- [Player Management](#player-management)
- [Court Assignment System](#court-assignment-system)
- [Fairness & Statistics](#fairness--statistics)
- [Round Management](#round-management)
- [UI/UX Enhancements](#uiux-enhancements)

---

## Session Management

### Core Session Features
- **Create Sessions**: Set up sessions with custom name, date, duration, and number of courts
- **Session Status**: Track sessions through states (Draft → Active → Ended)
- **Attendance Management**: Mark players as present/absent for each session
- **Mid-Session Player Join**: Players can join mid-session with preserved stats
  - New players start with 0 played/waiting counts
  - Existing players retain their historical stats
  - Timestamp tracking (`check_in_time`) ensures accurate round filtering

### Guest Player Support
- **Add Temporary Players**: Add guest players on the fly during attendance
- **Guest Player Form**: Simple form with name, gender, and level selection
- **Automatic Integration**: Guest players automatically added to waiting list
- **Session-Specific**: Temporary players marked with `is_temp=true` flag

### Session Actions
- **End Session**: Clears all rounds and court assignments, resets to clean state
- **Set Attendance**: Modal interface to select present players
- **View Statistics**: Real-time fairness metrics and player performance

---

## Player Management

### Player Database
- **Player Registry**: Maintain permanent player database
- **Player Attributes**:
  - Full name
  - Gender (Male/Female/Other/Unspecified)
  - Skill level/division
  - Numeric rank (1.0 - 10.0 for algorithm)
- **Search & Filter**: Quick player lookup in attendance and assignment views

### Player Display
- **Gender Badges**: Visual M/F badges displayed in:
  - Court assignments (before division level)
  - Waiting list (before division level)
  - Court Display View modal
- **Division Badges**: Blue badges showing player skill level
- **Color Coding**: Gender-specific colors (Blue for Male, Pink for Female)

---

## Court Assignment System

### Auto-Assignment Algorithm
- **Intelligent Matching**: Advanced algorithm considering:
  - **Waiting Time Priority**: Players who waited longer get priority
  - **Equal Match Distribution**: Balance matches played across all players
  - **Partner Variety**: Avoid repeating recent partners
  - **Opponent Variety**: Avoid repeating recent opponents
  - **Skill Balance**: Balance teams by player skill levels
  - **Court Rotation**: Track and vary which courts players use
  
- **Match Type Control**:
  - MM (Men's Doubles): 4 male players
  - FF (Women's Doubles): 4 female players
  - MF (Mixed Doubles): 2 male + 2 female players
  - OTHER: Invalid/incomplete combinations
  - **Auto-calculate Match Type**: Match type updates automatically when players are moved

### Manual Assignment
- **Full Manual Mode**: Drag-and-drop interface for complete control
- **Hybrid Mode**: Manual assignment with auto-fill remaining courts
  - Toggle "Auto assign remaining courts" switch
  - Manually assign key courts
  - Algorithm fills remaining courts with available players
- **Player Panel**: Searchable list of all available players
- **Drag & Drop**: Intuitive player placement

### Enhanced Drag & Drop
- **Court to Court**: Swap players between different court positions
- **Waiting to Court**: Drag players from waiting list to courts
- **Court to Waiting**: 
  - **Auto-fill**: Automatically fills empty slot with first waiting player
  - **Confirmation**: If no waiting players, prompts to confirm clearing entire court
- **Visual Feedback**: Overlay shows which players are being swapped
- **Match Type Updates**: Automatic recalculation after every player move

### Court Management
- **Reset Courts**: Clear all court assignments and start fresh
- **Lock Courts**: Preserve specific court assignments during regeneration
- **Court Display View**: Full-screen modal showing all courts for player visibility
  - Optimized 4-column grid layout
  - Fits 8 courts without scrolling
  - Gradient backgrounds for visual appeal
  - Team A (blue) and Team B (red) color coding
  - Match type badges (MM/MF/FF/OTHER)

---

## Fairness & Statistics

### Session Statistics
- **Matches Played**: Count of matches per player
- **Rounds Waiting**: Count of rounds sitting out
- **Waiting Time**: Calculated in minutes
- **Match Type Distribution**: MM/MF/FF counts per player
- **Partner History**: List of all partners played with
- **Opponent History**: List of all opponents faced
  - Clickable opponents to see detailed breakdown
- **Courts Used**: Track which courts each player has played on
- **Fairness Score**: Overall session balance metric

### Round-by-Round History
- **Visual Icon Pattern**: P/W/- for each round
  - **P (Green)**: Player played in this round
  - **W (Orange)**: Player was waiting/sitting out
  - **- (Gray)**: Round occurred before player joined session
- **Text Summary**: "Played: X, Waiting: Y" below icons
- **Filtering Logic**: Only shows rounds after player's `check_in_time`

### Statistical Views
- **Matches Played Tab**: Sortable table with search
- **Rounds Waiting Tab**: Sortable table with search  
- **Player Details Popup**: Comprehensive stats when clicking player name
  - Total matches and rounds
  - Match type breakdown
  - Partners list
  - Opponents list with frequency counts

### Sorting & Filtering
- **Multi-Column Sort**: Sort by:
  - Name (alphabetical)
  - Gender (M/F grouping)
  - Division (skill level)
  - Waiting rounds (fairness)
  - Matches played (activity)
  - Match types (MM/MF/FF counts)
- **Ascending/Descending**: Toggle sort direction
- **Search Functionality**: Real-time filtering in all player lists

---

## Round Management

### Round Lifecycle
1. **Create Round**: Auto-assign or manual assignment
2. **Start Round**: Begin timer countdown
3. **Active Round**: Track elapsed time
4. **End Round**: Stop timer, finalize stats
5. **Next Round**: Repeat process

### Timer System
- **Countdown Display**: Shows remaining time in MM:SS format
- **Visual Indicator**: Time remaining badge in header
- **Alarm System**: Alert when round time expires
  - Visual popup notification
  - Persistent alarm until dismissed
  - "End Round" action button in popup

### Round Actions
- **Start Round**: Begin timer for current assignments
- **Cancel Round**: Delete unstarted round and restart assignment
- **End Round**: Stop timer and mark round as complete
- **View History**: See all past rounds with assignments

---

## UI/UX Enhancements

### Search Functionality
- **Waiting List Search**: Filter players in waiting list panel
- **Attendance Search**: Quick player lookup when setting attendance
- **Manual Assignment Search**: Filter available players during manual assignment
- **Stats Search**: Filter players in statistics tables

### Visual Design
- **Court Display Modal**: 
  - Dark gradient background (gray-900 to gray-800)
  - Gradient header (indigo-600 to purple-600)
  - Card-based layout with shadows
  - Responsive grid system
  - Clean typography and spacing

- **Match Type Colors**:
  - MM: Blue gradient (blue-500 to blue-600)
  - FF: Pink gradient (pink-500 to pink-600)
  - MF: Purple gradient (purple-500 to purple-600)
  - OTHER: Gray gradient

- **Gender Badges**:
  - Male: Blue background (`bg-blue-200 text-blue-900`)
  - Female: Pink background (`bg-pink-200 text-pink-900`)

### Notification System
- **Success Messages**: Green toasts for successful actions
- **Error Messages**: Red toasts for failures
- **Informative Feedback**: Clear messaging for all user actions

### Confirmation Dialogs
- **End Session**: Warns about data deletion
- **Reset Courts**: Confirms clearing all assignments
- **Cancel Round**: Confirms round deletion
- **End Round**: Confirms timer stop
- **Clear Court**: Warns when no waiting players available

### Responsive Layout
- **Grid System**: Adaptive court layout
- **Scrollable Areas**: Overflow handling for large player lists
- **Modal System**: Full-screen and standard modals
- **Tab Navigation**: Courts view vs Statistics view

### Accessibility
- **Drag Disabled States**: Prevent dragging during active rounds
- **Visual Feedback**: Opacity changes during drag operations
- **Clear Labels**: Descriptive button and action text
- **Status Indicators**: Clear round state communication

---

## Recent Enhancements (Latest Features)

### Automatic Match Type Calculation
- **Dynamic Updates**: Match type recalculates when players are moved
- **All Scenarios Covered**:
  - Waiting → Court: Updates match type when player added
  - Court → Waiting: Updates match type when player removed
  - Court ↔ Court: Updates both courts when players swapped
- **Case-Insensitive**: Fixed gender comparison to use lowercase values

### Enhanced Drag-to-Waiting
- **Smart Auto-fill**: When dragging player to waiting list:
  - If waiting players exist: First waiting player fills the empty slot
  - If no waiting players: Confirmation dialog to clear entire court
- **Droppable Zone**: Waiting list area now accepts drops
- **Clear Messaging**: Notifications show player names correctly

### Mid-Session Join Tracking
- **Timestamp Tracking**: `check_in_time` field tracks when players join
- **Historical Stats**: Players only counted for rounds after joining
- **Visual Indicators**: Gray "-" icons show rounds before player joined
- **Preserved Records**: Existing players' stats not reset when adding new players

---

## Technical Highlights

### Backend Features
- **SQLAlchemy ORM**: Robust database models and relationships
- **Pydantic Schemas**: Type-safe API request/response validation
- **FastAPI Framework**: High-performance async API
- **PostgreSQL Database**: Reliable data persistence
- **Alembic Migrations**: Version-controlled schema changes

### Frontend Features
- **React 18**: Modern component-based UI
- **TypeScript**: Type-safe development
- **@dnd-kit**: Smooth drag-and-drop interactions
- **TailwindCSS**: Utility-first styling
- **Axios**: HTTP client for API calls

### Algorithm Features
- **Multi-factor Optimization**: Balances multiple fairness criteria
- **Locked Court Support**: Preserves manual assignments during auto-fill
- **Court Rotation**: Ensures players experience different courts
- **Partner/Opponent Tracking**: Maintains relationship history
- **Skill Balancing**: Creates competitive matches

---

## Future Enhancement Opportunities

### Potential Features
- [ ] Email notifications for session invites
- [ ] Mobile app for players
- [ ] QR code check-in system
- [ ] Advanced analytics and reports
- [ ] Tournament mode
- [ ] Player ratings/ELO system
- [ ] Court availability calendar
- [ ] Equipment tracking
- [ ] Payment integration for session fees
- [ ] Multi-club support

---

**Last Updated**: February 13, 2026
**Version**: 1.0
**Maintained By**: Development Team
