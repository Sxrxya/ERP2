# Build Instructions - Internship ERP

## 🚨 Important: PowerShell Limitation

PowerShell on your system has script execution disabled. **Use Command Prompt instead**.

---

## ✅ Complete Build Process

### Step 1: Open Command Prompt
1. Press `Win + R`
2. Type: `cmd`
3. Press Enter

### Step 2: Navigate to Project
```cmd
cd C:\Users\welcome\Downloads\curry-works
```

### Step 3: Install Dependencies (If Not Done)
```cmd
npm install
```

This installs all packages including:
- googleapis
- nodemailer
- bcrypt
- jsonwebtoken
- helmet
- express-rate-limit

### Step 4: Build for Production
```cmd
npm run build
```

**What this does**:
- Builds client (React app) → `dist/spa`
- Builds server (Express API) → `dist`
- Optimizes and minifies code
- Prepares for deployment

**Expected output**:
```
✓ Built in XX.XXs
✓ Client bundle: dist/spa
✓ Server bundle: dist/index.js
```

### Step 5: Test Production Build
```cmd
npm start
```

This runs the production server on port 8080.

---

## 🔄 Development Mode

For development with hot reload:

```cmd
npm run dev
```

---

## 📦 What Gets Built

### Client (Frontend)
```
dist/spa/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── ...
``

`

### Server (Backend)
```
dist/
├── index.js
└── (bundled dependencies)
```

---

## 🚀 Deployment Files

After build, you have everything needed for:

### Netlify
- Upload `dist/spa` folder
- Configure redirects (already in `netlify.toml`)
- Set environment variables

### Docker
```cmd
docker build -t internship-erp .
docker run -p 8080:8080 internship-erp
```

### VPS/Cloud
```cmd
# On server
npm install --production
npm run build
npm start
# Or use PM2:
pm2 start dist/index.js --name internship-erp
```

---

## ⚠️ Build Troubleshooting

### Issue: PowerShell execution policy
**Error**: "cannot be loaded because running scripts is disabled"
**Fix**: Use Command Prompt (cmd.exe) instead

### Issue: Module not found during build
**Error**: "Cannot find module 'googleapis'"
**Fix**:
```cmd
npm install
npm run build
```

### Issue: Port already in use
**Error**: "Port 8080 is already in use"
**Fix**:
```cmd
# Find and kill process
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Issue: Out of memory
**Error**: "JavaScript heap out of memory"
**Fix**:
```cmd
set NODE_OPTIONS=--max_old_space_size=4096
npm run build
```

---

## ✅ Verify Build Success

After `npm run build`, check:

1. **Client bundle exists**:
   ```cmd
   dir dist\spa\index.html
   ```

2. **Server bundle exists**:
   ```cmd
   dir dist\index.js
   ```

3. **Test production**:
   ```cmd
   npm start
   ```
   Then visit: http://localhost:8080

---

##To Build Right Now

**Run these commands in Command Prompt**:

```cmd
cd C:\Users\welcome\Downloads\curry-works
npm run build
npm start
```

Then visit: http://localhost:8080

**Your production build is ready!** 🎉
