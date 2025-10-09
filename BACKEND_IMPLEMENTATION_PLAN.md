# Backend Implementation Plan for Duty Manager

**Status**: Frontend working perfectly at `/duty/` path
**Date**: 2025-10-08
**Current Version**: Client-side only with localStorage

---

## ⚠️ CRITICAL LESSONS LEARNED

### What Broke During Previous Attempt

1. **Modified working files without backup** - Lost critical `App.jsx` and `index.css`
2. **Changed container name** from `duty-manager` to `duty-manager-app` breaking nginx routing
3. **Forgot React Router basename** - BrowserRouter needs `basename="/duty"` for subpath routing
4. **Wrong nginx file structure** - Files must be in `/usr/share/nginx/html/duty/` not root
5. **Missing Vite base config** - `vite.config.js` must have `base: '/duty/'`

### What's Currently Working

✅ **Container**: `duty-manager` (correct name for nginx upstream)
✅ **Network**: `shared-network` at IP `10.0.4.4`
✅ **Ports**: 8081 (direct), 8082 (via nginx), ngrok tunnel
✅ **Paths**: All assets load correctly at `/duty/`
✅ **Routing**: React Router working with `basename="/duty"`
✅ **Storage**: localStorage-based (client-side only)
✅ **Nginx Router**: `/mnt/cache/docker/shared/nginx.conf` routing `/duty` → `duty-manager:80`

---

## 📋 Pre-Implementation Checklist

Before starting backend implementation:

- [ ] Verify current app works: `http://192.168.178.3:8082/duty/`
- [ ] Verify ngrok works: `https://[your-url].ngrok-free.app/duty/`
- [ ] Create full backup: `docker commit duty-manager duty-manager-backup-$(date +%Y%m%d)`
- [ ] Backup data directory: `cp -r /mnt/cache/docker/duty-manager/data /mnt/cache/docker/duty-manager-data-backup-$(date +%Y%m%d)`
- [ ] Export current localStorage data from browser (via Import/Export page)
- [ ] Tag GitHub with current working version: `git tag -a working-frontend-v1 -m "Working frontend before backend"`
- [ ] Push tag to GitHub: `git push origin working-frontend-v1`

---

## 🎯 Backend Implementation Strategy

### Phase 1: Create Backend (Separate from Frontend)

**Goal**: Build and test backend independently without touching working frontend

```bash
# 1. Create backend directory structure
mkdir -p /mnt/cache/docker/duty-manager/backend
cd /mnt/cache/docker/duty-manager/backend

# 2. Create backend files
# - app.py (Flask API)
# - requirements.txt
# - test_backend.py (standalone tests)

# 3. Test backend standalone (NOT in Docker yet)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py  # Test on port 5001

# 4. Verify endpoints work:
curl http://localhost:5001/api/health
curl http://localhost:5001/api/load
curl -X POST http://localhost:5001/api/save -H "Content-Type: application/json" -d '{"test":"data"}'

# 5. Only proceed if all tests pass
```

### Phase 2: Create API Service Layer (Frontend Change Only)

**Goal**: Add API abstraction WITHOUT changing existing localStorage functionality

```javascript
// File: /mnt/cache/docker/duty-manager/src/services/api.js

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Debounced save function
export async function saveData(data) {
  // Implementation here
}

export async function loadData() {
  // Implementation here
}

export async function healthCheck() {
  // Implementation here
}
```

**DO NOT modify `AppContext.jsx` yet!** Just create the file.

### Phase 3: Test API Service Independently

```bash
# 1. Add API service to build
# (File already created, will be bundled)

# 2. Rebuild frontend only
docker stop duty-manager
docker rm duty-manager
docker build -t duty-manager-duty-manager /mnt/cache/docker/duty-manager
docker run -d --name duty-manager --network shared-network -p 8081:80 --restart unless-stopped duty-manager-duty-manager

# 3. Verify frontend still works with localStorage
# Should have NO changes in behavior yet
```

### Phase 4: Create Multi-Stage Dockerfile

**Goal**: Single container with both frontend and backend

**IMPORTANT**: Do this ONLY after Phase 3 succeeds!

```dockerfile
# /mnt/cache/docker/duty-manager/Dockerfile

# ============================================
# Stage 1: Build React Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ============================================
# Stage 2: Python Backend + Nginx
# ============================================
FROM python:3.11-slim

# Install nginx and supervisor
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY backend/ /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy built frontend to nginx under /duty/ path
COPY --from=frontend-builder /app/dist /usr/share/nginx/html/duty

# Copy configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create data directory
RUN mkdir -p /data/backups && chmod 777 /data

EXPOSE 80 5001

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

### Phase 5: Create nginx.conf (Inside Container)

**Critical**: This is DIFFERENT from the nginx-shared-router config!

```nginx
# /mnt/cache/docker/duty-manager/nginx.conf

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;

        # Frontend - React SPA at /duty/
        location /duty/ {
            try_files $uri $uri/ /duty/index.html;
        }

        # Backend API - Proxy to Flask
        location /api/ {
            proxy_pass http://localhost:5001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health check
        location /health {
            proxy_pass http://localhost:5001/api/health;
        }

        # Redirect root to /duty/
        location = / {
            return 301 /duty/;
        }

        location = /duty {
            return 301 /duty/;
        }
    }
}
```

### Phase 6: Create supervisord.conf

```ini
# /mnt/cache/docker/duty-manager/supervisord.conf

[supervisord]
nodaemon=true
user=root

[program:flask]
command=python /app/backend/app.py
directory=/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/flask.err.log
stdout_logfile=/var/log/flask.out.log

[program:nginx]
command=nginx -g 'daemon off;'
autostart=true
autorestart=true
stderr_logfile=/var/log/nginx.err.log
stdout_logfile=/var/log/nginx.out.log
```

### Phase 7: Update docker-compose.yml

```yaml
# /mnt/cache/docker/duty-manager/docker-compose.yml

services:
  duty-manager:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: duty-manager  # MUST be this name for nginx routing!
    restart: unless-stopped
    ports:
      - "8081:80"
    volumes:
      - ./data:/data  # Persistent data storage
    networks:
      - shared-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    environment:
      - PYTHONUNBUFFERED=1

networks:
  shared-network:
    external: true
```

### Phase 8: Modify AppContext.jsx (CAREFULLY)

**CRITICAL**: This is where it broke before!

**BEFORE MODIFYING**:
1. Backup current file: `cp src/contexts/AppContext.jsx src/contexts/AppContext.jsx.backup`
2. Test that frontend still builds and works

**Changes needed**:

```javascript
// OLD: localStorage only
useEffect(() => {
  const savedData = localStorage.getItem('dutyManagerData');
  // ... load from localStorage
}, []);

// NEW: Try backend first, fallback to localStorage
useEffect(() => {
  async function loadFromBackend() {
    try {
      const backendData = await loadData();  // from api.js
      if (backendData && Object.keys(backendData).length > 0) {
        // Use backend data
        const migrated = migrateData(backendData);
        setPeople(migrated.people || []);
        // ... set other state
      } else {
        // Fallback to localStorage
        const savedData = localStorage.getItem('dutyManagerData');
        // ... existing localStorage logic
      }
    } catch (error) {
      console.error('Backend failed, using localStorage');
      // Fallback to localStorage
    }
  }
  loadFromBackend();
}, []);

// Update auto-save to use backend
useEffect(() => {
  if (people.length > 0 || roles.length > 0) {
    const dataToSave = { /* ... */ };
    // Save to backend
    saveData(dataToSave).catch(err => {
      console.error('Backend save failed:', err);
      // Keep localStorage as backup
      localStorage.setItem('dutyManagerData', JSON.stringify(dataToSave));
    });
  }
}, [people, roles, schedule, ...]);
```

### Phase 9: Build and Test with Backend

```bash
# 1. Stop current container
docker stop duty-manager
docker rm duty-manager

# 2. Build new image with backend
cd /mnt/cache/docker/duty-manager
docker compose build --no-cache

# 3. Start container
docker compose up -d

# 4. Check logs
docker compose logs -f

# 5. Test endpoints
curl http://localhost:8081/health
curl http://localhost:8081/api/health
curl http://localhost:8081/duty/

# 6. Test in browser
# Open: http://192.168.178.3:8081/duty/
# Check browser console for errors
# Verify data saves and loads from backend
```

### Phase 10: Test Through Nginx Router

```bash
# 1. Restart nginx-shared-router (to refresh DNS)
docker restart nginx-shared-router

# 2. Test routing
curl http://192.168.178.3:8082/duty/
curl http://192.168.178.3:8082/duty/assets/index-[hash].js

# 3. Test ngrok
curl https://[your-url].ngrok-free.app/duty/

# 4. Verify in browser
# All three URLs should work identically
```

---

## 🚨 Rollback Plan (If Things Break)

### Quick Rollback to Working Frontend

```bash
# 1. Stop broken container
docker stop duty-manager
docker rm duty-manager

# 2. Restore from backup image
docker tag duty-manager-backup-[date] duty-manager-duty-manager

# 3. Start working version
docker run -d --name duty-manager --network shared-network -p 8081:80 --restart unless-stopped duty-manager-duty-manager

# 4. Verify
curl http://192.168.178.3:8081/duty/
```

### Restore Files from GitHub

```bash
cd /mnt/cache/docker/duty-manager
git stash  # Save any changes
git checkout working-frontend-v1  # Go back to tagged version
docker build -t duty-manager-duty-manager .
docker run -d --name duty-manager --network shared-network -p 8081:80 --restart unless-stopped duty-manager-duty-manager
```

---

## 📁 Critical Files Reference

### Current Working Configuration

```
/mnt/cache/docker/duty-manager/
├── Dockerfile                    # Frontend-only, copies to /duty/ subdir
├── docker-compose.yml           # Uses external shared-network
├── vite.config.js               # base: '/duty/'
├── src/
│   ├── App.jsx                  # BrowserRouter basename="/duty"
│   ├── index.css               # @tailwind directives
│   └── contexts/
│       └── AppContext.jsx      # Currently uses localStorage only
└── data/                       # Will be created for backend storage

/mnt/cache/docker/shared/
└── nginx.conf                  # Routes /duty → duty-manager:80
```

### Key Settings That Must Not Change

1. **Container name**: `duty-manager` (not `duty-manager-app`)
2. **Network**: `shared-network` (external)
3. **Vite base**: `base: '/duty/'`
4. **React Router**: `basename="/duty"`
5. **Nginx upstream**: `server duty-manager:80;`
6. **Port mapping**: `8081:80`

---

## 🔍 Testing Checklist

After each phase, verify:

- [ ] Frontend loads at `http://192.168.178.3:8081/duty/`
- [ ] Assets load (check Network tab, should see `.js` and `.css`)
- [ ] No console errors in browser
- [ ] Navigation works (Dashboard, Schedule, Roles, etc.)
- [ ] Can add/edit data (people, roles, schedule)
- [ ] Nginx routing works: `http://192.168.178.3:8082/duty/`
- [ ] Ngrok works: `https://[url].ngrok-free.app/duty/`
- [ ] Container is healthy: `docker ps` shows "healthy" status
- [ ] Backend health check works: `curl http://localhost:8081/health`

---

## 🎓 Key Learnings

1. **Never modify working files directly** - Always create backups first
2. **Test each layer independently** - Backend standalone, then API service, then integration
3. **One change at a time** - Don't combine frontend changes with backend deployment
4. **Container naming matters** - Nginx upstream depends on exact container name
5. **React Router needs basename** - When serving under subpath, must set basename prop
6. **Vite needs base config** - Asset paths won't work without it
7. **File structure matters** - Files must be in `/duty/` subdirectory to match routes
8. **Always test through all access points** - Direct, nginx proxy, and ngrok
9. **Keep fallbacks** - localStorage backup ensures data isn't lost if backend fails
10. **Document as you go** - This file exists because we learned the hard way!

---

## 📞 Support Information

**GitHub Repository**: https://github.com/bruno2757/duty-manager
**Ngrok URL**: Check `curl http://localhost:4040/api/tunnels`
**Container Name**: `duty-manager`
**Network**: `shared-network` (IP: typically 10.0.4.4)

**Current State**: ✅ Working frontend with localStorage
**Next Step**: Phase 1 - Create standalone backend

---

## 🎯 Success Criteria

Backend implementation is successful when:

1. ✅ Frontend still works exactly as before
2. ✅ Data persists across container restarts (not just browser refresh)
3. ✅ Multiple users can access same data
4. ✅ Browser localStorage serves as offline backup
5. ✅ Health check returns healthy status
6. ✅ All three access methods work (direct, nginx, ngrok)
7. ✅ No white screens or console errors
8. ✅ Auto-save and auto-load work seamlessly

**DO NOT** proceed to next phase until ALL criteria for current phase are met!

---

*Last Updated: 2025-10-08*
*Session: Recovery from broken backend attempt*
*Status: Frontend working, ready for careful backend implementation*
