# Duty Manager Application

A web-based scheduling application for managing worship service duties. Generates conflict-free schedules using constraint satisfaction algorithms, ensuring fair rotation across multiple roles and personnel.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-blue.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-3.x-blue.svg)

---

## 📋 Overview

**Duty Manager** is an admin-only application designed for scheduling worship service duties across multiple roles and people. It automatically generates fair, conflict-free schedules while respecting availability constraints, role grouping preferences, and special meeting requirements.

### Key Capabilities
- **Automated Scheduling**: CSP algorithm generates optimal duty assignments
- **Fair Distribution**: Balances workload across all qualified personnel
- **Role Grouping**: Allows same person for Thursday→Sunday assignments (configurable)
- **Availability Management**: Tracks individual unavailability with date ranges
- **Special Meetings**: Handle unique events (Circuit Overseer visits, Memorial, etc.)
- **Omitted Meetings**: Skip dates or show placeholders for cancelled services
- **Flexible Exports**: CSV and PDF exports with customizable column ordering

---

## ✨ Features

### Core Functionality
- ✅ **Smart Scheduling Algorithm**
  - Constraint Satisfaction Problem (CSP) with backtracking
  - Fair rotation across 40+ people and 7 roles
  - Respects availability, qualifications, and grouping constraints
  - Generates 4-week schedules in seconds

- ✅ **Role Management**
  - Define roles with configurable grouping (e.g., Zoom Host + Sound)
  - Track qualified people per role
  - Customizable column ordering for display and exports

- ✅ **Availability Tracking**
  - Individual unavailability periods with date ranges
  - Optional reason/notes
  - CSV import for bulk availability updates

- ✅ **Meeting Customization**
  - Omitted meetings (skip dates or show placeholders)
  - Special meetings with custom comments
  - Configurable meeting days (e.g., Thursday/Sunday)

- ✅ **Schedule Management**
  - Extend existing schedules (4-week increments)
  - Delete last X meetings for rebuilding
  - Clear historic meetings (preserves statistics)
  - Manual assignment override capability

- ✅ **Data Import/Export**
  - CSV import for roles and availability
  - JSON export/import for complete data portability
  - CSV export with customizable column order
  - PDF export with professional formatting

- ✅ **Statistics & Reporting**
  - Per-person assignment counts and last assigned dates
  - Per-role distribution metrics
  - Schedule health indicators
  - Fairness scoring

---

## 🛠️ Tech Stack

- **Frontend Framework**: React 18.x (functional components with Hooks)
- **Styling**: Tailwind CSS (dark theme, responsive design)
- **Data Handling**:
  - PapaParse (CSV parsing)
  - jsPDF + jsPDF-AutoTable (PDF generation)
  - Native JavaScript Date objects
- **State Management**: React Context API
- **Data Persistence**:
  - Flask backend API with JSON file storage
  - localStorage fallback for offline resilience
  - Automatic backup system
- **Deployment**: Docker with nginx + supervisor

---

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose (for production deployment)
- Node.js 20.x or higher (for local development)
- Python 3.11+ (for backend development)

### Production Deployment (Docker)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/duty-manager.git
   cd duty-manager
   ```

2. **Build and start containers**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

3. **Access the application**
   - Direct: `http://your-server:8081/duty/`
   - Via proxy: `http://your-server:8082/duty/`

4. **Check health**
   ```bash
   docker ps  # Should show "healthy" status
   curl http://localhost:8081/api/health
   ```

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/duty-manager.git
   cd duty-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip install -r backend/requirements.txt
   ```

3. **Start backend**
   ```bash
   cd backend
   python app.py
   ```

4. **Start frontend (in new terminal)**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173/duty/
   ```

### Build for Production
```bash
npm run build
```

The optimized production build will be in the `dist/` directory.

---

## 📖 Usage Guide

### Initial Setup

1. **Import Roles**
   - Navigate to **Roles** page
   - Click **Import CSV**
   - Upload roles file (see format below)
   - Review and confirm imported data

2. **Import Availability** (Optional)
   - Navigate to **Availability** page
   - Click **Import CSV**
   - Upload availability file

3. **Configure Settings**
   - Navigate to **Settings** page
   - Set meeting days (e.g., Thursday/Sunday)
   - Configure role column order
   - Lock settings after first schedule generation

4. **Generate Schedule**
   - Navigate to **Schedule** page
   - Click **Generate Schedule**
   - Review generated assignments
   - Export to CSV/PDF as needed

### CSV Import Formats

#### Roles Import (Person-Centric)
```csv
Name,Roles
"John Smith","Attendant Foyer, Microphones"
"Jane Doe","Zoom Host, Sound, Platform"
```

#### Availability Import
```csv
Name,Start Date,End Date,Reason
"John Smith","2025-12-01","2025-12-15","Holiday"
"Jane Doe","2026-01-10","2026-01-20","Work trip"
```

### Workflow

1. **Generate Initial Schedule**: 4 weeks from today
2. **Review Assignments**: Check for any conflicts or issues
3. **Add Special Meetings**: Circuit Overseer visits, Memorial, etc.
4. **Mark Omitted Dates**: Regional conventions, circuit assemblies
5. **Export**: Download CSV for distribution or PDF for printing
6. **Extend Schedule**: Generate next 4 weeks when needed

---

## 📊 Scheduling Algorithm

### Constraint Types

**Hard Constraints** (must be satisfied):
- No person assigned to multiple roles in same meeting
- Person not assigned when unavailable
- Person only assigned to roles they're qualified for
- Role grouping respected (Thursday→Sunday for grouped roles)

**Soft Constraints** (optimized):
- Fair distribution: Minimize assignment count variance per role
- Spacing: Maximize time between assignments
- Recent memory: Consider last 4 weeks of assignments
- Load balancing: Prioritize people with fewer total assignments

### Algorithm Features
- **Variable Ordering**: Most-constrained roles first (e.g., roles with fewest qualified people)
- **Value Ordering**: Least-recently-assigned people first
- **Backtracking**: Tries alternative assignments if conflicts arise
- **Forward Checking**: Validates future assignments early

---

## 🗂️ Project Structure

```
duty-manager/
├── src/
│   ├── components/       # Reusable UI components
│   │   └── Navigation.jsx
│   ├── context/          # React Context providers
│   │   ├── ScheduleContext.jsx
│   │   ├── PeopleContext.jsx
│   │   ├── RolesContext.jsx
│   │   ├── AvailabilityContext.jsx
│   │   └── SettingsContext.jsx
│   ├── pages/            # Main application pages
│   │   ├── Dashboard.jsx
│   │   ├── Schedule.jsx
│   │   ├── RolesPage.jsx
│   │   ├── AvailabilityPage.jsx
│   │   ├── OmittedMeetingsPage.jsx
│   │   ├── SpecialMeetingsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── utils/            # Helper functions and algorithms
│   │   ├── schedulingAlgorithm.js
│   │   ├── csvExport.js
│   │   └── pdfExport.js
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles (Tailwind)
├── public/               # Static assets
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## 💾 Data Management

### Data Persistence
- **Backend Storage**: Flask API saves data to `/data/schedule.json`
- **localStorage Fallback**: Browser storage for offline resilience
- **Automatic Backups**: Created before each save in `/data/backups/`
- **JSON Export/Import**: Download/upload for data portability

### Load Strategy
1. Try to load from backend API
2. If backend returns empty, fall back to localStorage
3. If both empty, start with fresh state

### Save Strategy
- Save to backend (debounced 1 second) and localStorage (immediate)
- Backend saves trigger automatic backup creation
- Graceful degradation if backend unavailable

### Data Security
- No authentication required (single admin use)
- All data stays on your server
- No external API calls
- User maintains control via JSON exports

### Backup Recommendations
1. Container data persists in `./data` volume
2. Export JSON regularly for off-server backups
3. Automatic backups in `/data/backups/` directory
4. Export CSV/PDF for external records

---

## 🎨 Customization

### Role Configuration
- Add/remove roles as needed
- Configure grouping preferences per role
- Set qualified people per role

### Meeting Days
- Configure midweek and weekend meeting days
- Settings lock after first schedule generation (prevents data inconsistencies)

### Column Ordering
- Reorder role columns via Settings page
- Use up/down arrows for easy reorganization
- Order applies to schedule display and all exports

### Styling
- Dark theme by default
- Tailwind CSS for easy customization
- Modify `tailwind.config.js` for color scheme changes

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Import roles CSV (both formats)
- [ ] Import availability CSV
- [ ] Generate schedule with various constraints
- [ ] Test role grouping (Thursday→Sunday assignments)
- [ ] Add special meetings
- [ ] Add omitted meetings (with/without placeholders)
- [ ] Extend existing schedule
- [ ] Delete last X meetings
- [ ] Clear historic meetings
- [ ] Export CSV (verify column order)
- [ ] Export PDF (verify formatting)
- [ ] JSON export/import (full data cycle)

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: Schedule generation takes too long
- **Solution**: Reduce complexity (fewer roles, more qualified people per role)

**Issue**: Many conflicts in generated schedule
- **Solution**: Review availability constraints, ensure enough qualified people per role

**Issue**: CSV import fails
- **Solution**: Verify CSV format matches specification, check for special characters

**Issue**: PDF export shows "autoTable is not a function"
- **Solution**: Verify jspdf-autotable is installed: `npm install jspdf-autotable`

**Issue**: Role grouping not working
- **Solution**: Ensure `allowGrouping: true` is set for roles and meeting days are configured correctly

---

## 🔮 Future Enhancements

Potential features for future development:
- [ ] Drag-and-drop manual assignment interface
- [ ] Advanced conflict resolution UI
- [ ] Assignment swap functionality
- [ ] Email notifications for upcoming duties
- [ ] Mobile app version
- [ ] Multi-congregation support
- [ ] Historical analytics and trends
- [ ] Undo/redo functionality

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Use functional React components with Hooks
- Follow existing code style and patterns
- Comment complex algorithm logic
- Test thoroughly before submitting PR
- Update documentation as needed

---

## 💬 Support

For questions, issues, or suggestions:
- **GitHub Issues**: [Create an issue](https://github.com/yourusername/duty-manager/issues)
- **Email**: your.email@example.com

---

## 🙏 Acknowledgments

- Built with React and Tailwind CSS
- Constraint satisfaction algorithm inspired by classical CSP approaches
- PDF generation powered by jsPDF and jsPDF-AutoTable
- CSV parsing by PapaParse

---

## 📝 Changelog

### Version 2.0.0 (2025-10-09) - Backend Integration
- ✅ Flask backend API for persistent storage
- ✅ Dual-storage strategy (backend + localStorage)
- ✅ Automatic backup system
- ✅ Debounced API saves (1 second)
- ✅ Multi-stage Docker build
- ✅ Nginx + supervisor process management
- ✅ Graceful degradation on backend failure
- ✅ Docker Compose deployment
- ✅ Health check endpoints

### Version 1.0.0 (2025-10-05) - Initial Release
- ✅ Core scheduling algorithm (CSP)
- ✅ Role and people management
- ✅ Availability tracking
- ✅ Special and omitted meetings
- ✅ CSV/PDF/JSON import/export
- ✅ Schedule management (extend, delete, clear)
- ✅ Statistics and reporting
- ✅ Dark theme UI
- ✅ Responsive design

---

**Made with ❤️ for worship service coordination**
