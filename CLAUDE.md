# Duty Manager Application

## Project Overview

Admin-only web application for scheduling worship service duties. Generates conflict-free schedules using Constraint Satisfaction Problem (CSP) algorithm for 6 roles across 41 people, with 61% performing multiple roles.

**Not** a member-facing app - purely for administrative schedule generation and export.

## Tech Stack

- **Framework**: React (functional components with Hooks only)
- **Styling**: Tailwind CSS (core utilities only)
- **Data Persistence**: JSON file download/upload (primary) + localStorage (backup)
- **CSV Parsing**: PapaParse
- **PDF Export**: jsPDF or similar
- **Date Handling**: Native JavaScript Date
- **No Backend**: Pure client-side application

## Core Terminology

- **Role**: Position needing filling at each meeting (e.g., "Zoom Host", "Sound")
- **Duty**: Specific assignment of a person to a role on a specific date
- **Meeting**: Worship service occurring every Thursday and Sunday
- **Person**: Individual who can perform one or more roles

## Data Models

### Person
```javascript
{
  id: string,                    // UUID
  name: string,
  roles: string[],               // Array of role IDs they can perform
  availability: [                // Dates they are NOT available
    {
      startDate: Date,
      endDate: Date,
      reason: string             // Optional note
    }
  ],
  lastAssigned: {
    [roleId]: Date               // Last date assigned to each role
  },
  assignmentCount: {
    [roleId]: number             // Total assignments per role
  }
}
```

### Role
```javascript
{
  id: string,                    // UUID
  name: string,
  allowGrouping: boolean,        // Default: false
  groupingWindow: 'weekly',      // Group Thu→Sun same week only
  peopleIds: string[]            // People qualified for this role
}
```

**Initial 6 Roles** (from data):
1. Attendant Foyer (21 people, grouping: false)
2. Auditorium Attendant (7 people, grouping: false)
3. Zoom Host (5 people, grouping: **true**)
4. Microphones (25 people, grouping: false)
5. Sound (5 people, grouping: **true**)
6. Platform (8 people, grouping: false)

### Meeting
```javascript
{
  id: string,
  date: Date,
  day: 'Thursday' | 'Sunday',
  type: 'regular' | 'special' | 'cancelled',
  duties: {
    [roleId]: {
      personId: string | null,
      manuallyAssigned: boolean,   // True if admin override
      hasConflict: boolean          // Warning flag
    }
  }
}
```

### Schedule
```javascript
{
  id: string,
  generatedDate: Date,
  startDate: Date,               // First meeting date
  endDate: Date,                 // Last meeting date
  meetings: Meeting[],
  cancelledDates: Date[],        // Dates with no meeting
  conflicts: ConflictWarning[],
  statistics: ScheduleStats
}
```

## Scheduling Algorithm - CSP Requirements

### Algorithm Type
Constraint Satisfaction Problem with backtracking and forward checking.

### Hard Constraints (MUST satisfy)
1. **No person on multiple roles in same meeting**
2. **Person not assigned when marked unavailable**
3. **Person only assigned to roles they're qualified for**
4. **Role grouping respected** (if `allowGrouping: true`):
   - If person assigned to grouped role on Thursday, **strongly prefer** same person for Sunday same week
   - Only applies to consecutive Thu→Sun pairs within same week
   - If person unavailable Sunday, assign next best person

### Soft Constraints (Optimize for)
1. **Fair distribution**: Minimize variance in assignment count per person per role
2. **Spacing**: Maximize time between same person's assignments to same role
3. **Recent memory**: Consider last 4 weeks from previous schedule
4. **Load balancing**: People with fewer total assignments get priority

### Scheduling Process
1. Load existing schedule (if extending)
2. Identify last scheduled meeting date
3. Generate meeting dates for next 4 weeks (Thu/Sun pattern, skip cancelled dates)
4. For each meeting, for each role:
   - Get eligible people (qualified + available)
   - Score based on soft constraints
   - Assign highest-scoring person
   - If conflict, backtrack and try next option
5. If no solution found, generate best-effort with conflict warnings

### Variable Ordering Heuristic
Assign most-constrained roles first (e.g., Sound/Zoom Host with only 5 people each).

### Value Ordering Heuristic
Try least-recently-assigned people first.

## Business Rules

### Meeting Schedule
- **Regular Pattern**: Every Thursday and Sunday
- **Generation Window**: 4 weeks from last scheduled meeting
- **Extension Mode**: Always continue from existing schedule's last meeting
- **Lookback**: Last 4 weeks for fair rotation (use `lastAssigned` data)

### Role Grouping
- **Enabled for**: Zoom Host, Sound (5 people each)
- **Reason**: Allows user focus on role for a week, increases time between duties
- **Behavior**: Same person Thu→Sun same week when possible
- **Boundary**: Does NOT span across week boundaries

### Conflict Handling

**Manual assignment creates conflict**:
- Show warning dialog with details
- Allow override (mark with conflict flag)
- Do NOT prevent assignment

**Algorithm can't find solution**:
- Generate best-effort schedule
- Flag problematic assignments
- Display report with warnings

**Unavailable person assignment**:
- Show warning with reason
- Allow override with flag

### Manual Editing Rules
- Admin can override any assignment (show warnings but allow)
- Manual edits marked with `manuallyAssigned: true`
- Delete meetings: Clear all assignments, remove from schedule
- Cancelled meetings: Clear assignments, keep as placeholder

## CSV Import Formats

### Roles Import (Support 2 formats)

**Format A - Person-centric** (Recommended):
```csv
Name, Roles
"Vince Bartley", "Attendant Foyer, Microphones"
"Joseph Larson Jnr", "Zoom Host, Microphones, Sound, Platform"
```

**Format B - Column-per-role** (Legacy):
```csv
Attendant Foyer, Auditorium Attendant, Zoom Host, Microphones, Sound, Platform
Vince Bartley, Mark Davies, Richard Brooks, Cliff Bartley, Keith Gallant, Lucas Booth
Clive Bernard, Terry Eleftheriou, Keith Gallant, Vince Bartley, Daniel Horne, Deuel Donkor
```

### Availability Import
```csv
Name, Start Date, End Date, Reason
"John Smith", "2025-12-01", "2025-12-15", "Holiday"
"John Smith", "2026-01-10", "2026-01-20", "Work trip"
```

## Export Formats

### CSV Export
Match example spreadsheet structure:
```csv
Meeting No., Date, Day, Attendant Foyer, Auditorium Attendant, Zoom Host, Microphones, Sound, Platform
1, 2025-09-11, Thursday, Vince Bartley, Mark Davies, Richard Brooks, Cliff Bartley, Keith Gallant, Lucas Booth
```

### PDF Export
- Table format matching CSV
- Include: Date range, all meetings/assignments, statistics, conflict warnings

## UI Navigation Structure

Main sections:
1. **Dashboard** - Statistics, quick actions, schedule health
2. **Schedule** - View/edit schedule, generate new
3. **Roles** - Manage roles & people assignments
4. **Availability** - Manage person availability blocks
5. **Cancelled Meetings** - Define dates with no meeting
6. **Import/Export** - CSV import, JSON save/load, CSV/PDF export

## Key Implementation Notes

### Data Persistence Strategy
- **Primary**: User downloads/uploads JSON files (manually managed)
- **Backup**: Auto-save to localStorage (with clear warnings)
- **Warning to user**: "localStorage is backup only. Download JSON for permanent storage."

### State Management
- Use React Context for global state (schedule, people, roles)
- Separate contexts for different concerns
- Keep localStorage sync logic isolated

### Component Architecture
- Functional components only (no classes)
- Custom hooks for complex logic (scheduling algorithm, conflict detection)
- Keep components focused and small
- PropTypes for type safety

### Error Handling
- Validate all user inputs
- Clear error messages
- Confirmation dialogs for destructive actions
- Undo capability for major operations

### Date Handling
- Store as ISO strings in JSON
- Convert to Date objects for calculations
- Display in locale-appropriate format
- Handle timezone considerations (meetings in local timezone)

## Statistics to Display

### Per-Person Stats
- Total assignments across all roles
- Assignments per role
- Last assigned date per role
- Availability blocks

### Per-Role Stats
- Total meetings scheduled
- Assignments per person
- Distribution variance (fairness metric)
- Average time between assignments

### Schedule Health
- Number of conflicts
- Number of unfilled roles
- Warning messages list
- Fairness score (0-100)

## Critical Constraints

### Must Support
- CSV import (both role formats)
- JSON save/load (portable between computers)
- 4-week generation window
- Manual override with warnings
- Role grouping for Zoom/Sound
- Extension from existing schedule

### Must NOT
- Require authentication (single admin use)
- Use external database
- Prevent admin overrides (always allow with warnings)
- Lose data on browser refresh (localStorage backup)

## Code Style Preferences

- Use clear, descriptive variable names
- Comment complex algorithm logic
- Extract magic numbers to constants
- Use PropTypes for components
- Handle edge cases explicitly
- Test with real data (41 people, 6 roles)

## Initial Data for Testing

Use the provided spreadsheet data:
- 6 roles with varying pool sizes (5-25 people)
- 41 unique people total
- 25 people (61%) can perform multiple roles
- Example person with 4 roles: Joseph Larson Jnr (Zoom Host, Microphones, Sound, Platform)

## Success Criteria

1. Generates 4-week conflict-free schedule in <5 seconds
2. Handles multi-role personnel without conflicts
3. Exports professional CSV/PDF
4. Fair rotation with configurable spacing
5. Role grouping works correctly
6. Easy schedule extension without full regeneration
7. Clear conflict warnings when needed
8. Intuitive UI for non-technical admin user
