# 📱 PWA Installation Instructions - SkyLite Family Manager

## ✅ Container Status

Your SkyLite containers are **RUNNING** and ready!

- **Database:** `homelab-docker_skylite-ux-db_1` - HEALTHY ✅
- **Application:** `homelab-docker_skylite-ux_1` - RUNNING ✅
- **Port:** 3002 (accessible on your network)
- **Image:** skylite-ux:pwa (with PWA support)

---

## 🌐 Access URLs

### Local Access (from the server):
```
http://localhost:3002
```

### Network Access (from any device on your network):
```
http://192.168.5.143:3002
```

---

## 📱 Install as PWA on iPad/iPhone

### Step 1: Open Safari
Open Safari browser on your iPad/iPhone (must be Safari, not Chrome)

### Step 2: Navigate to the App
Go to: `http://192.168.5.143:3002`

### Step 3: Add to Home Screen
1. Tap the **Share** button (square with arrow pointing up)
2. Scroll down and tap **"Add to Home Screen"**
3. Name it **"SkyLite"** (or whatever you prefer)
4. Tap **"Add"** in the top right

### Step 4: Launch the App
1. Go to your iPad home screen
2. Find the SkyLite icon
3. Tap it to launch in full-screen mode!

---

## 📱 Install as PWA on Android Tablet

### Step 1: Open Chrome
Open Chrome browser on your Android tablet

### Step 2: Navigate to the App
Go to: `http://192.168.5.143:3002`

### Step 3: Install the App
**Option A - Install Banner:**
- Look for "Add SkyLite to Home screen" banner at the bottom
- Tap **"Install"**

**Option B - Menu:**
1. Tap the **three-dot menu** (⋮) in top right
2. Tap **"Install app"** or **"Add to Home screen"**
3. Confirm by tapping **"Install"**

### Step 4: Launch the App
1. Find the SkyLite icon in your app drawer or home screen
2. Tap it to launch in full-screen mode!

---

## 💻 Install as PWA on Desktop

### Chrome/Edge:
1. Open `http://192.168.5.143:3002`
2. Look for the **install icon** (⊕) in the address bar
3. Click it and choose **"Install"**
4. The app will open in its own window

### Firefox:
Firefox doesn't support PWA installation, but you can:
- Bookmark the page
- Create a desktop shortcut

---

## 🎯 What You Get with PWA

### Full-Screen Experience
- ✅ No browser UI (address bar, tabs, etc.)
- ✅ Looks and feels like a native app
- ✅ Perfect for kids - no distractions!

### Offline Support
- ✅ Cached pages work offline
- ✅ Service worker keeps things fast
- ✅ Graceful handling of network issues

### Auto-Updates
- ✅ Updates automatically when you deploy new code
- ✅ No need to reinstall from app store
- ✅ Seamless version upgrades

### Home Screen Icon
- ✅ Launch like any other app
- ✅ Custom icon (sun logo)
- ✅ Easy access for kids

---

## 🔧 Verifying PWA Installation

### On iOS:
- Icon appears on home screen
- Launches without Safari UI
- Stays full-screen (no browser controls)

### On Android:
- Icon appears in app drawer and home screen
- Can see it in Settings → Apps
- Launches as standalone app

### On Desktop:
- Opens in its own window (not browser tab)
- Can pin to taskbar/dock
- Acts like desktop application

---

## 🧪 Testing PWA Features

### 1. Check Service Worker
1. Open the app
2. Open DevTools (F12)
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Look for **Service Workers** section
5. Should see "sw.js" registered and activated ✅

### 2. Check Manifest
1. In DevTools **Application** tab
2. Click **Manifest** in left sidebar
3. Should see:
   - Name: "SkyLite Family Manager"
   - Theme Color: #06b6d4 (cyan)
   - Display: standalone
   - Icons: 4 icons (192x192, 512x512, maskable) ✅

### 3. Test Offline
1. Open the app
2. Visit all pages (Calendar, Todos, Rewards, Leaderboard)
3. Turn off WiFi
4. Try navigating - cached pages should still work ✅

---

## 🎨 PWA App Settings

### App Details:
- **Name:** SkyLite Family Manager
- **Short Name:** SkyLite
- **Theme Color:** Cyan (#06b6d4)
- **Background:** White (#ffffff)
- **Display Mode:** Standalone (full-screen)
- **Orientation:** Portrait (but works in landscape too)
- **Icons:** 4 variations (regular + maskable for Android)

### Service Worker:
- **Cache Strategy:** NetworkFirst for API calls
- **Cache Duration:** 24 hours
- **Precached Files:** 31 files (~1.5 MB)
- **Auto-Update:** Enabled

---

## 🔍 Troubleshooting

### "Add to Home Screen" Not Showing (iOS)

**Solution:**
- Must use Safari (not Chrome/Firefox)
- Use Share button → Add to Home Screen
- It's always available in Safari's share menu

### "Install" Button Not Showing (Android)

**Possible Causes:**
1. **Already installed** - Check app drawer
2. **Not using Chrome** - Use Chrome browser
3. **Wait a moment** - Installation prompt may take 5-10 seconds

**Solution:**
- Use Chrome menu (⋮) → "Install app" or "Add to Home screen"

### App Not Working Offline

**Solution:**
1. Visit all pages while online first (to cache them)
2. Check if service worker is registered (DevTools)
3. Clear cache and reload if needed

### App Not Updating

**Solution:**
1. Close the app completely
2. Open it again - updates apply automatically
3. Or clear cache: Settings → App → Clear Data

### Can't Access from Tablet

**Possible Causes:**
1. **Wrong IP** - Server IP may have changed
2. **Firewall** - Port 3002 might be blocked
3. **Different network** - Must be on same WiFi

**Solution:**
```bash
# On server, check current IP:
hostname -I

# Check if port is accessible:
curl http://localhost:3002

# Check firewall:
sudo ufw status
```

---

## 📊 Container Management

### View Container Status:
```bash
cd /home/deshmukh/homelab-docker
docker-compose ps skylite-ux skylite-ux-db
```

### View Logs:
```bash
# App logs
docker logs -f homelab-docker_skylite-ux_1

# Database logs
docker logs -f homelab-docker_skylite-ux-db_1
```

### Restart Containers:
```bash
cd /home/deshmukh/homelab-docker
docker-compose restart skylite-ux skylite-ux-db
```

### Stop Containers:
```bash
cd /home/deshmukh/homelab-docker
docker-compose stop skylite-ux skylite-ux-db
```

### Start Containers:
```bash
cd /home/deshmukh/homelab-docker
docker-compose start skylite-ux skylite-ux-db
```

### Update to New Version:
```bash
# Build new image in SkyLite-UX directory
cd /home/deshmukh/SkyLite-UX
docker build -f Dockerfile.simple -t skylite-ux:pwa .

# Restart containers to use new image
cd /home/deshmukh/homelab-docker
docker-compose up -d skylite-ux
```

---

## 🚀 Next Steps for Your Family

### 1. Initial Setup (First Time):
1. Access `http://192.168.5.143:3002` from your computer
2. **Create user profiles** for each family member
3. **Set parental PIN** (change from default 1111)
   - Edit: `/home/deshmukh/SkyLite-UX/app/composables/useAdminMode.ts`
   - Change `PARENTAL_PIN = "1111"` to your preferred PIN
   - Rebuild Docker image
4. **Add chore templates** from Settings
5. **Configure rewards** from Settings → Rewards Management

### 2. Install on Family Tablet:
1. Open Safari (iOS) or Chrome (Android)
2. Go to `http://192.168.5.143:3002`
3. Install as PWA (follow steps above)
4. Place icon on home screen where kids can reach it

### 3. Set Up Tablet for Kids:
- **Enable Guided Access** (iOS) or **Screen Pinning** (Android) to lock them into SkyLite
- **Disable tablet sleep** or extend timeout to 10+ minutes
- **Position tablet** in accessible location (kitchen counter, hallway, etc.)
- **Show kids** how to complete tasks and redeem rewards

### 4. Daily Use:
**For Kids:**
- Tap SkyLite icon
- See their tasks for the day
- Check off completed chores
- Watch celebration animations! 🎉
- Check leaderboard to see rankings
- Browse rewards catalog
- Redeem rewards when they have enough points

**For Parents:**
- Access from any device on network
- **Triple-tap logo** to enter admin mode
- Enter PIN (default: 1111)
- Manage users, tasks, rewards
- Approve reward redemptions
- View activity logs
- Track family progress

---

## 🎉 You're All Set!

Your SkyLite Family Manager is now:
- ✅ Running on your network
- ✅ Accessible from any device
- ✅ Ready to install as PWA
- ✅ Optimized for tablets
- ✅ Full-featured with all enhancements

### Quick Access:
- **Your Server:** `http://192.168.5.143:3002`
- **From Anywhere:** Same URL (while on home network)
- **Container Status:** `docker ps --filter "name=skylite"`

### Need Help?
- Check logs: `docker logs homelab-docker_skylite-ux_1`
- Restart: `cd /home/deshmukh/homelab-docker && docker-compose restart skylite-ux`
- Update: Rebuild image and restart container

---

**Happy Parenting! 👨‍👩‍👧‍👦 🎮 ⭐**

