# Duty Manager - Server Deployment & Ngrok Access

## Current Status
- Application: Fully functional React SPA (Single Page Application)
- Development: Running on Vite dev server (localhost:5173)
- Data: Client-side only, no backend required

---

## Deployment Discussion Topics

### 1. Server Hosting Options

**Option A: Simple Static Hosting**
- Build production bundle
- Serve via nginx/Apache
- No backend needed (current design)
- Users access via browser

**Option B: Docker Container**
- Containerize application
- Easy deployment and updates
- Consistent environment

**Option C: Cloud Hosting**
- Netlify, Vercel, GitHub Pages
- Free tier available
- CI/CD integration

### 2. Ngrok Integration

**Purpose**: Expose local server to internet temporarily

**Use Cases**:
- Remote access during development
- Share with team for testing
- Temporary production access
- No need for public server setup

**Current Project Path**:
`/Users/richardmacbook/local-software/duty-manager`

**Questions to Discuss**:
1. Will this be permanent hosting or temporary access?
2. How many users need concurrent access?
3. Is authentication/multi-user needed? (Currently single admin)
4. Should data be shared across users or separate instances?
5. Security requirements for church/congregation data?

### 3. Data Persistence Considerations

**Current Model**: JSON file download/upload per user
- Works for single admin
- Data controlled by user
- No synchronization between users

**If Multiple Users Need Access**:
- Consider shared storage (backend required)
- Or: Multiple admins work on separate schedules then merge
- Or: Single admin shares exported files with read-only users

### 4. Production Build Checklist

Before deployment:
- [ ] Run production build (`npm run build`)
- [ ] Test production bundle locally
- [ ] Verify all imports/exports work
- [ ] Check routing (ensure client-side routing works)
- [ ] Test on different browsers
- [ ] Prepare documentation for users
- [ ] Set up backup procedures

### 5. Ngrok Setup Steps (Brief)

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from ngrok.com

# Authenticate
ngrok authtoken YOUR_TOKEN

# Serve production build
cd /Users/richardmacbook/local-software/duty-manager
npm run build
npx serve dist -l 3000

# Expose with ngrok
ngrok http 3000

# Share the generated URL (e.g., https://abc123.ngrok.io)
```

### 6. Security Considerations

**Current State**: No authentication
- Anyone with link can access
- Suitable for trusted environment only

**If Public Access Needed**:
- Add basic authentication
- Implement user roles
- Consider data encryption
- Audit logging

### 7. Questions to Answer

1. **Hosting Duration**: Temporary (ngrok) or permanent (server)?
2. **User Count**: Single admin or multiple users?
3. **Data Sharing**: Individual files or shared database?
4. **Access Control**: Open or password-protected?
5. **Budget**: Free tier or paid hosting?
6. **Domain**: Custom domain or random ngrok URL?
7. **SSL**: HTTPS required? (ngrok provides this automatically)
8. **Uptime**: 24/7 or on-demand access?

---

## Next Steps

Discuss the questions above to determine:
- Best hosting approach for your needs
- Whether ngrok is suitable or if permanent hosting needed
- Any architectural changes required
- Security and access control requirements

---

## Project Information for New Chat

**Application**: Duty Manager - Worship service scheduling app
**Tech Stack**: React 18, Vite, Tailwind CSS, client-side only
**Current State**: Fully functional, all features complete
**Project Location**: `/Users/richardmacbook/local-software/duty-manager`
**Dev Server**: `npm run dev` (localhost:5173)
**Production Build**: `npm run build` (outputs to `dist/`)

**Key Features**:
- Automated scheduling algorithm (CSP)
- 40 people, 7 roles, fair rotation
- CSV/PDF/JSON import/export
- No backend required (pure client-side)
- Dark theme UI

**Documentation Available**:
- README.md (comprehensive)
- Session summaries (development history)
- CLAUDE.md (original specification)
