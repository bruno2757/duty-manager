# Duty Manager - Unraid Docker Deployment with Ngrok

## Files Included

1. **Dockerfile** - Multi-stage build (React build + nginx serve)
2. **docker-compose.yml** - Orchestrates duty-manager app + ngrok tunnel
3. **nginx.conf** - Production-ready nginx config for React SPA
4. **ngrok.yml** - Ngrok tunnel configuration
5. **.dockerignore** - Excludes unnecessary files from Docker image

## Prerequisites

✅ Docker and Docker Compose installed on Unraid
✅ Ngrok account with authtoken (already configured in files)
✅ Internet connection for ngrok tunnel

## Deployment Steps

### Step 1: Copy Files to Your Project

Copy these 5 files to your project directory:
```bash
cd /Users/richardmacbook/local-software/duty-manager

# Copy deployment files (adjust source path as needed)
cp /path/to/Dockerfile .
cp /path/to/docker-compose.yml .
cp /path/to/nginx.conf .
cp /path/to/ngrok.yml .
cp /path/to/.dockerignore .
```

### Step 2: Transfer to Unraid Server

Transfer your entire project directory to your Unraid server. You can use:

**Option A: SCP (from Mac)**
```bash
cd /Users/richardmacbook/local-software
scp -r duty-manager/ root@YOUR_UNRAID_IP:/mnt/user/appdata/duty-manager/
```

**Option B: Unraid Shares**
- Copy folder to Unraid via SMB/network share
- Place in `/mnt/user/appdata/duty-manager/`

### Step 3: Build and Start Containers

SSH into your Unraid server:
```bash
ssh root@YOUR_UNRAID_IP
cd /mnt/user/appdata/duty-manager
```

Build and start containers:
```bash
docker-compose up -d --build
```

This will:
1. Build the React app (takes 2-5 minutes first time)
2. Create nginx container serving the app
3. Start ngrok tunnel pointing to the app
4. Expose ngrok web UI on port 4041

### Step 4: Get Your Public URL

**Option A: Check ngrok web interface**
```
http://YOUR_UNRAID_IP:4041
```

**Option B: Check container logs**
```bash
docker logs duty-manager-ngrok
```

Look for a line like:
```
started tunnel: https://abc123xyz.ngrok.io
```

### Step 5: Access Your App

Visit the ngrok URL (e.g., `https://abc123xyz.ngrok.io`) from any device with internet access.

## Container Management

### View logs
```bash
# App logs
docker logs duty-manager-app

# Ngrok logs
docker logs duty-manager-ngrok

# Follow logs in real-time
docker logs -f duty-manager-app
```

### Stop containers
```bash
docker-compose down
```

### Restart containers
```bash
docker-compose restart
```

### Rebuild after code changes
```bash
docker-compose down
docker-compose up -d --build
```

### Remove everything (including volumes)
```bash
docker-compose down -v
```

## Verification Checklist

After deployment, verify:

- [ ] Containers running: `docker ps | grep duty-manager`
- [ ] App healthy: Visit `http://YOUR_UNRAID_IP:INTERNAL_PORT/health`
- [ ] Ngrok UI accessible: `http://YOUR_UNRAID_IP:4041`
- [ ] Public URL works: Visit ngrok URL from phone/external device
- [ ] App loads correctly in browser
- [ ] Can import CSV files
- [ ] Can generate schedule
- [ ] Can export CSV/PDF

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs duty-manager-app
docker logs duty-manager-ngrok

# Check build output
docker-compose up --build
```

### Can't access ngrok URL
1. Check ngrok container is running: `docker ps | grep ngrok`
2. Check ngrok web UI: `http://YOUR_UNRAID_IP:4041`
3. Verify authtoken is correct in `ngrok.yml`
4. Check firewall/internet connection

### App shows 404 errors on refresh
- This indicates nginx SPA routing issue
- Should be fixed by the provided nginx.conf
- Verify `nginx.conf` was copied correctly

### Build fails
```bash
# Check Node/npm versions in Dockerfile match your local setup
# Look for error in build logs
docker-compose build --no-cache
```

### Port conflicts
If 4041 is already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "4042:4040"  # Change 4041 to any available port
```

## Ngrok Configuration Options

### Custom Domain (if you have ngrok paid plan)
Edit `ngrok.yml`:
```yaml
tunnels:
  duty-manager:
    proto: http
    addr: duty-manager:80
    domain: your-custom-domain.ngrok.io  # Uncomment and set
```

### Change Region
Edit `ngrok.yml`:
```yaml
region: eu  # Options: us, eu, ap, au, sa, jp, in
```

### Basic Auth (password protect)
Edit `ngrok.yml`:
```yaml
tunnels:
  duty-manager:
    proto: http
    addr: duty-manager:80
    auth: "username:password"
```

## Updating the App

When you make changes to the React code:

1. **On your Mac** - Test changes locally first
2. **Transfer updated files** to Unraid
3. **Rebuild and restart**:
   ```bash
   cd /mnt/user/appdata/duty-manager
   docker-compose down
   docker-compose up -d --build
   ```

## Performance Notes

- **First build**: 2-5 minutes (downloads Node, installs dependencies)
- **Subsequent builds**: 30-60 seconds (uses Docker cache)
- **Container size**: ~50-70 MB (nginx-alpine is very lightweight)
- **Memory usage**: ~10-20 MB per container
- **Startup time**: 5-10 seconds

## Security Considerations

⚠️ **Important**: This app has NO authentication by default.

**Current setup**: Anyone with the ngrok URL can access the app.

**For production use**, consider:
1. Adding basic auth in ngrok.yml (see above)
2. Using ngrok IP restrictions (paid feature)
3. Implementing authentication in the React app
4. Using ngrok's OAuth or webhook verification

**For church/private use**: 
- Share URL only with trusted individuals
- Ngrok URLs are cryptographically random (hard to guess)
- Monitor access via ngrok web UI (port 4041)

## Backup Recommendations

The app uses client-side JSON files, so ensure users:
1. Download JSON backups regularly
2. Store in safe location (Google Drive, etc.)
3. Keep multiple versions with dates

**Container data is ephemeral** - no persistent volumes needed for app data.

## Useful Commands

```bash
# View all containers
docker ps -a

# View container resource usage
docker stats

# Access container shell (for debugging)
docker exec -it duty-manager-app sh

# View nginx error logs
docker exec duty-manager-app cat /var/log/nginx/error.log

# Prune unused Docker resources
docker system prune -a
```

## Support

If issues persist:
1. Check container logs first
2. Verify ngrok.yml configuration
3. Test app locally before containerizing
4. Check Unraid Docker networking settings

---

**Deployment Date**: 2025-10-05  
**Ngrok Web UI**: http://YOUR_UNRAID_IP:4041  
**App Container**: duty-manager-app  
**Ngrok Container**: duty-manager-ngrok  
**Network**: duty-manager-network (bridge)
