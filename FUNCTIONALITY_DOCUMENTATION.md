# Badminton Session Management System - Functionality Documentation

## Overview
This document details all the features and functionality implemented in the Badminton Session Management System.

---

## 1. Player Display & UI Improvements

### 1.1 Level Badge Positioning
- **Feature**: Player level/division badges moved to after player names
- **Icon**: Trophy emoji (🏆) added to indicate division
- **Location**: Visible in session attendance, player panels, court assignments, and waiting lists
- **Purpose**: Better visual organization and consistent layout across all views

### 1.2 Waiting List Enhancements
- **Compact Display**: Player stats shown inline with badges on a single line
- **Stats Shown**:
  - Level/Division (🏆)
  - Matches Played (P:)
  - Waiting Rounds (W:)
  - Match Type Counts (MM/MF/FF)
- **Fixed Height**: 600px container with scrollable content
- **Alignment**: Division badges vertically aligned on the right side

### 1.3 Players in Session Panel
- **Fixed Height**: 600px container for consistent layout
- **Search Functionality**: Filter players by name
- **Remove Players**: ✕ button to remove players from session
- **Badge Alignment**: Division badges aligned on the right
- **Player Count**: Dynamic display of total players in session

---

## 2. Court Assignment System

### 2.1 Drag-and-Drop Functionality
- **Feature**: Drag players between courts using @dnd-kit library
- **Capability**: Swap players between different courts and teams
- **Disabled State**: Dragging disabled once round starts
- **Visual Feedback**: Hover effects and cursor changes
- **Backend Sync**: Court assignments automatically updated via API

### 2.2 Manual Assignment Modal
- **Three-Column Layout**:
  1. **Left Panel**: Available players (sorted and searchable)
  2. **Right Panels**: Court grid for drag-drop assignment
  
#### Player Panel Features:
- **Search**: Filter players by name
- **Comprehensive Sorting**: Sort by multiple criteria:
  - Waiting rounds (W) - Default, descending
  - Played matches (P)
  - Player name
  - Gender (M/F/O)
  - Division
  - Match types (MM/MF/FF)
- **Sort Direction**: Toggle ascending/descending with arrow indicators
- **Color-Coded Sorting Buttons**: Active sort highlighted with relevant color
- **Player Information Display**:
  - Name
  - Gender badge (M/F/O with color coding)
  - Division badge
  - Played count badge
  - Waiting count badge
- **Visual States**: Assigned players grayed out and non-draggable

#### Court Assignment:
- **HTML5 Drag-Drop**: Native drag-and-drop API
- **Court Slots**: Team A and Team B with 2 positions each
- **Remove Function**: ✕ button on each assigned player
- **Submit**: Save all manual assignments to backend

---

## 3. Round Management & Timer System

### 3.1 Round Indicator
- **Display**: Purple circular badge showing current round number
- **Position**: Left side of timer tile
- **Dynamic**: Updates automatically as rounds progress

### 3.2 Countdown Timer
- **Format**: MM:SS display
- **Duration**: Based on session's match_duration_minutes setting
- **Auto-Start**: Timer starts when "Start Round" is clicked
- **Persistence**: 
  - Calculates remaining time based on round start timestamp
  - Survives page refreshes
  - Resumes correct time on reload
- **Controls**:
  - Starts automatically with round
  - Resets on "Cancel Round"
  - Stops on "End Round"

### 3.3 Time's Up Notification
- **Auto-Detection**: Detects when timer reaches 0
- **Sound Alert**: 
  - Pleasant notification sound (3 beeps at 800Hz)
  - Repeats every 2 seconds until acknowledged
  - Stops immediately when popup dismissed
- **Visual Popup**:
  - Large alarm clock emoji (⏰)
  - "Time's Up!" heading
  - "End Round" button
  - Modal overlay prevents interaction until acknowledged
- **Auto-End**: Round can be ended directly from popup

### 3.4 Next Round Preview
- **Display**: Green badge showing next round number
- **Position**: Right side of timer tile
- **Purpose**: Help organizers prepare for upcoming round

---

## 4. Player Management System

### 4.1 Simplified Player Fields
**Current Fields**:
- First Name (required)
- Last Name (required)
- Gender (required)
- Division/Level (required)
- Contact Number (optional)
- Address (optional)
- Emergency Contact Name (optional)
- Emergency Contact Number (optional)

**Removed Fields**:
- Rank System
- Rank Value
- Numeric Rank
- Skill Tier

### 4.2 Player Table
- **Columns**: Name, Gender, Division, Actions
- **Actions**: Edit, Delete
- **Name Display**: Full name (first + last combined)

### 4.3 Terminology Update
- **Changed**: "Rank" → "Division" throughout application
- **Locations Updated**:
  - Players page
  - Settings page
  - All player displays
  - Backend models and schemas

---

## 5. Session Attendance Management

### 5.1 Attendance Workflow
1. **Set Attendance**: Check/uncheck players in modal
2. **Temporary State**: Changes not reflected in session until confirmed
3. **Finish Assignment**: Confirms selected players into session
4. **Player Addition**: Only confirmed players appear in waiting list and court assignments

### 5.2 Attendance Features
- **Search Players**: Filter available players
- **Checkbox Selection**: Multi-select interface
- **Reset**: Revert to last confirmed state
- **Player Count**: Shows selected count
- **Remove After Confirmation**: Can remove players from "Players in Session" panel

---

## 6. Statistics & Match Information

### 6.1 Player Statistics Popup
**Trigger**: Click on "P" (Played) badge in manual assignment

**Display Layout**:
- **Horizontal Match Type Cards**:
  - Men's Double (MM)
  - Mixed Double (MF)
  - Female's Double (FF)
  - Count for each type
  - Color-coded (blue/purple/pink)

- **Opponents Section**:
  - List of all opponents faced
  - Count of matches against each opponent
  - Format: "Name (count)"
  - Sorted by frequency (most played against first)

### 6.2 Session Statistics
- **Total Rounds**: Count of completed and current rounds
- **Player Stats**: Tracked per session
  - Matches played
  - Rounds sitting out
  - Waiting time
  - Partners played with
  - Opponents faced
  - Match type distribution
- **Fairness Metrics**: 
  - Average matches per player
  - Average waiting time
  - Fairness score (variance-based)

---

## 7. Settings & Configuration

### 7.1 Division System Settings
- **System Types**:
  - Integer Range (1, 2, 3...)
  - Letter Range (A, B, C...)
  - Custom Labels
- **Configuration**: Set up division system for club
- **Active Indicator**: Shows currently active system

### 7.2 Session Settings
- **Match Duration**: Configurable per session (in minutes)
- **Court Count**: Number of available courts
- **Date & Time**: Session scheduling

---

## 8. Backend & Database

### 8.1 Database Schema Updates
**New Player Table Columns**:
```sql
contact_number VARCHAR (nullable)
address VARCHAR (nullable)
emergency_contact_name VARCHAR (nullable)
emergency_contact_number VARCHAR (nullable)
```

**Migration**: 
- Auto-generated with Alembic
- Applied via: `alembic upgrade head`
- File: `6e1c049f7419_add_player_contact_and_emergency_fields.py`

### 8.2 API Endpoints
**New/Updated**:
- `PATCH /sessions/court-assignments/{court_assignment_id}` - Update court assignment
- `GET /club-settings/levels` - Get available levels with recent_sessions
- Session stats endpoint enhanced with opponents_count

### 8.3 Schemas
**PlayerBase/PlayerUpdate** - Added optional fields:
- contact_number
- address
- emergency_contact_name
- emergency_contact_number

**PlayerSessionStats** - Added:
- opponents_count: Dict[str, int]

**AvailableLevelsResponse** - Fixed:
- Added recent_sessions field requirement

---

## 9. Technical Implementation

### 9.1 Frontend Technologies
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **@dnd-kit/core** for drag-and-drop
- **React Router** for navigation
- **Axios** for API calls

### 9.2 State Management
- **React Hooks**: useState, useEffect, useRef
- **Local Storage**: Authentication token persistence
- **Timer Persistence**: Calculated from backend timestamps
- **Refs for Audio**: Proper cleanup of AudioContext and intervals

### 9.3 Key Components
- **SessionDetail.tsx**: Main session management (1100+ lines)
- **CourtCard.tsx**: Individual court display with drag-drop
- **WaitingList.tsx**: Waiting players panel
- **Players.tsx**: Player CRUD operations

---

## 10. User Experience Improvements

### 10.1 Visual Feedback
- **Color Coding**:
  - Green: Played/Active players
  - Orange: Waiting players
  - Blue: Men's matches
  - Purple: Mixed matches
  - Pink: Women's matches
  - Gray: Disabled/Assigned states

### 10.2 Responsive Design
- **Grid Layouts**: Adaptive column structures
- **Fixed Heights**: Consistent panel sizing (600px)
- **Scroll Areas**: Overflow handling for long lists
- **Modal Overlays**: Centered popups with backdrop

### 10.3 Accessibility
- **Hover States**: Visual feedback on interactive elements
- **Button Labels**: Clear action descriptions
- **Title Attributes**: Tooltips for context
- **Disabled States**: Clear visual indication when actions unavailable

---

## 11. Data Flow & Synchronization

### 11.1 Real-time Updates
1. User action triggers state change
2. Optimistic UI update for instant feedback
3. Backend API call
4. Data reload to confirm sync
5. Error handling with notifications

### 11.2 Session Lifecycle
1. **Draft**: Session created, players can be added
2. **Active**: Rounds can be started
3. **Round Started**: Timer running, assignments locked
4. **Round Ended**: Stats updated, new round can begin
5. **Session Ended**: Final statistics available

---

## 12. Error Handling & Notifications

### 12.1 Notification System
- **Success Messages**: Green notifications for completed actions
- **Error Messages**: Red notifications with error details
- **Auto-dismiss**: Notifications fade after set duration
- **User Actions**: Can manually dismiss

### 12.2 Error Scenarios Handled
- Failed API calls
- Invalid player assignments
- Attendance update failures
- Round management errors
- Database migration issues
- Authentication token expiration

---

## 13. Performance Optimizations

### 13.1 Efficient Rendering
- **Filtered Lists**: Client-side filtering for instant search
- **Sorted Data**: Pre-sorted before rendering
- **Memoization**: Preventing unnecessary re-renders
- **Parallel API Calls**: Promise.all for simultaneous data fetching

### 13.2 State Management
- **useRef for Audio**: Prevents re-render on audio state changes
- **Controlled Inputs**: Debounced search where needed
- **Optimistic Updates**: UI updates before backend confirmation

---

## 14. Future Considerations

### 14.1 Potential Enhancements
- Player statistics dashboard
- Historical session analytics
- Partner/opponent preference system
- Advanced auto-assignment algorithms
- Mobile-responsive improvements
- Print-friendly court assignments
- Export session data (CSV/PDF)

### 14.2 Scalability
- Current design supports multiple concurrent sessions
- Player database can scale indefinitely
- Session history maintained
- Settings configurable per club

---

## Version Information
- **Last Updated**: February 2, 2026
- **Backend**: Python 3.9, FastAPI, PostgreSQL 15
- **Frontend**: React 18, TypeScript, Vite
- **Deployment**: Docker Compose

---

## Summary

This Badminton Session Management System provides a comprehensive solution for managing badminton sessions, tracking player participation, ensuring fair play distribution, and streamlining court assignments. The system balances automation (auto-assignment) with manual control (drag-drop assignments), while providing detailed statistics and an intuitive user interface.

Key strengths:
- ✅ Intuitive drag-and-drop court assignments
- ✅ Comprehensive player statistics tracking
- ✅ Fair play distribution monitoring
- ✅ Flexible manual and automatic assignment options
- ✅ Real-time timer with notifications
- ✅ Simplified player management
- ✅ Responsive and accessible UI design
