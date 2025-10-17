# 📱 PWA Setup Guide for SkyLite Family Manager

## ✅ What's Already Done

Your Nuxt config has been updated with PWA support! The following is configured:

- ✅ PWA module installed (`@vite-pwa/nuxt`)
- ✅ Manifest configuration added to `nuxt.config.ts`
- ✅ Service worker setup for offline support
- ✅ Auto-update functionality
- ✅ Caching strategies configured

## 🎨 Step 1: Generate PWA Icons

You need to create 4 icon files from your existing `public/skylite.svg`:

### Option A: Use Online Tool (Easiest) ⭐

1. Go to: **https://www.pwabuilder.com/imageGenerator**
2. Upload `public/skylite.svg`
3. Download the generated icons
4. Extract and copy these 4 files to your `public/` directory:
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-192.png`
   - `icon-maskable-512.png`

### Option B: Use ImageMagick (If Available)

If you have sudo access, install ImageMagick and run the script:

```bash
sudo apt install imagemagick
./generate-pwa-icons.sh
```

### Option C: Manual Creation

Use any image editor (GIMP, Photoshop, Figma, etc.):

**Regular Icons:**
- `icon-192.png`: 192x192px, transparent background
- `icon-512.png`: 512x512px, transparent background

**Maskable Icons** (with safe area padding):
- `icon-maskable-192.png`: 192x192px, cyan background (#06b6d4), icon centered with 20% padding
- `icon-maskable-512.png`: 512x512px, cyan background (#06b6d4), icon centered with 20% padding

> **Note:** Maskable icons ensure your icon looks good on all devices, especially Android 13+ which uses adaptive icons.

---

## 🚀 Step 2: Test the PWA

### Start Development Server

```bash
npm run dev
```

The PWA will be available at `http://localhost:3000`

### Check PWA Installation

1. **Open DevTools** (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Look for:
   - ✅ Service Worker registered and running
   - ✅ Manifest file loaded
   - ✅ Icons showing correctly

### Test "Add to Home Screen"

**On Desktop (Chrome/Edge):**
- Look for the install icon (⊕) in the address bar
- Click it to install as an app

**On Mobile:**
- Open the page in your mobile browser
- Tap the menu (⋮) → "Add to Home Screen" or "Install App"

---

## 🏠 Step 3: Deploy for Home Use

### Option 1: Docker on Home Network

1. **Build and run the Docker container:**

```bash
docker-compose up -d
```

2. **Find your server's IP address:**

```bash
hostname -I
```

3. **Access from tablet:**
   - Open browser on tablet
   - Navigate to: `http://192.168.x.x:3000` (your server's IP)
   - Tap "Add to Home Screen"

### Option 2: Raspberry Pi Setup

1. **On your Pi, clone the repo:**

```bash
git clone https://github.com/ade5hmukh/SkyLite-UX.git
cd SkyLite-UX
```

2. **Create `.env` file:**

```bash
DATABASE_URL="postgresql://skylite:password@db:5432/skylite"
NUXT_PUBLIC_TZ="America/Chicago"
```

3. **Start with Docker:**

```bash
docker-compose up -d
```

4. **Access from any device on your network:**

```
http://raspberrypi.local:3000
# or
http://192.168.x.x:3000
```

---

## 📱 Step 4: Install on Tablets

### iOS (iPad/iPhone)

1. Open Safari and navigate to your app URL
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "SkyLite" and tap **Add**
5. The icon will appear on your home screen!

**Features on iOS:**
- ✅ Full-screen mode (no browser UI)
- ✅ App-like experience
- ✅ Splash screen on launch
- ✅ Works in portrait/landscape

### Android (Tablets/Phones)

1. Open Chrome and navigate to your app URL
2. Tap the **Menu** (⋮) button
3. Tap **"Add to Home screen"** or **"Install app"**
4. Confirm the installation
5. The icon will appear on your home screen!

**Features on Android:**
- ✅ Full-screen mode (no browser UI)
- ✅ App-like experience
- ✅ Splash screen on launch
- ✅ Can be set as default app for certain actions

---

## 🔧 PWA Configuration Details

### What's Configured:

**Manifest (`nuxt.config.ts`):**
- **App Name:** "SkyLite Family Manager"
- **Short Name:** "SkyLite"
- **Theme Color:** Cyan (#06b6d4)
- **Display Mode:** Standalone (full-screen, no browser UI)
- **Orientation:** Portrait (works for tablets)
- **Start URL:** "/" (opens to home page)

**Service Worker (Workbox):**
- **Caching Strategy:** NetworkFirst for API calls
- **Offline Support:** Caches assets for offline use
- **Auto-Update:** Automatically updates when new version deployed
- **Cache Duration:** 24 hours for API responses

**Dev Options:**
- PWA works in development mode for testing
- Auto-reloads on changes

---

## ✨ PWA Features Your App Will Have

### ✅ After Installation:

1. **Home Screen Icon**
   - Launches like a native app
   - No browser UI visible
   - Full-screen experience

2. **Offline Support**
   - Basic UI works offline
   - Cached data available
   - Graceful degradation when offline

3. **Fast Loading**
   - Cached assets load instantly
   - Service worker speeds up repeat visits

4. **Auto-Updates**
   - Users automatically get updates
   - No need to reinstall from App Store

5. **Push Notifications** (optional, needs more setup)
   - Can be added later if needed

6. **Standalone App Experience**
   - Feels like a native app
   - No address bar or browser controls
   - Immersive experience for kids

---

## 🧪 Testing Checklist

Before deploying to your family:

- [ ] Icons generated and placed in `public/` directory
- [ ] App opens at `http://localhost:3000`
- [ ] Service worker registered (check DevTools)
- [ ] Manifest loads correctly (check DevTools > Application)
- [ ] "Add to Home Screen" prompt appears
- [ ] Installed app opens in standalone mode
- [ ] App works on your home network (`http://IP:3000`)
- [ ] Tablet can access and install the app
- [ ] All features work after installation (todos, rewards, etc.)

---

## 🎯 Final Setup for Your Family Tablet

### Recommended Configuration:

1. **Keep tablet on home WiFi** at all times
2. **Install app to home screen** - one tap to launch
3. **Enable auto-brightness** for better battery life
4. **Disable tablet sleep** or extend timeout to 10+ minutes
5. **Pin the app** (on Android, use app pinning for kiosk mode)

### For Parents:

- Access the same URL from your phone/computer
- Triple-tap logo + enter PIN (1111) for admin mode
- Manage rewards, users, and settings from any device
- All changes sync in real-time

### For Kids:

- Just tap the SkyLite icon on the home screen
- Complete tasks to earn points
- Check the leaderboard
- Browse and redeem rewards
- No login required!

---

## 🐛 Troubleshooting

### "Add to Home Screen" Not Showing

**Chrome/Edge:**
- Must be HTTPS or localhost
- Manifest must be valid
- Icons must be properly configured

**Safari:**
- Always available via Share button
- Doesn't require HTTPS on local network

### Service Worker Not Registering

1. Clear browser cache
2. Check DevTools console for errors
3. Ensure icons exist in `public/` directory
4. Restart dev server

### App Not Working Offline

- Service worker needs time to cache assets
- Visit all pages once while online
- Check "Cache Storage" in DevTools

### Can't Access from Other Devices

1. Check firewall settings
2. Ensure devices are on same WiFi network
3. Try IP address instead of hostname
4. Port 3000 must be accessible

---

## 📚 Additional Resources

- **PWA Builder:** https://www.pwabuilder.com/
- **Web.dev PWA Guide:** https://web.dev/progressive-web-apps/
- **Nuxt PWA Module Docs:** https://vite-pwa-org.netlify.app/frameworks/nuxt.html
- **Icon Guidelines:** https://web.dev/add-manifest/#icons

---

## 🎉 Success!

Once icons are generated and the app is running:

1. Access from your tablet: `http://YOUR_SERVER_IP:3000`
2. Tap "Add to Home Screen"
3. Launch from home screen
4. Enjoy your family task manager! 🚀

---

## 💡 Next Steps (Optional)

Want to take it further?

- [ ] Set up HTTPS for secure remote access
- [ ] Configure push notifications for reminders
- [ ] Add more offline functionality
- [ ] Create custom splash screen
- [ ] Set up automatic backups
- [ ] Deploy to cloud for remote access

Need help? Check the documentation or open an issue!

