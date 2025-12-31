# Production Deployment Guide

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Build Instructions](#build-instructions)
- [Deployment Options](#deployment-options)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] Updated all environment variables in `.env.production`
- [ ] Changed default JWT secret keys to secure random strings (minimum 32 characters)
- [ ] Configured CORS to allow only your production domain(s)
- [ ] Set up a database (if not using mock data)
- [ ] Tested the production build locally
- [ ] Reviewed and updated API rate limits
- [ ] Configured error logging/monitoring service (optional)
- [ ] Set up email service credentials (if using notifications)

---

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file in the root directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-CHANGE-THIS
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters-CHANGE-THIS
JWT_EXPIRY=24h

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL
CLIENT_URL=https://yourdomain.com

# Security
BCRYPT_ROUNDS=10
```

### Generating Secure Secrets

Generate secure random strings for JWT secrets:

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Build Instructions

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the Application

```bash
# Build both client and server
npm run build
```

This will create:
- `dist/spa/` - Optimized frontend build
- `dist/server/` - Compiled server code

### Step 3: Test Production Build Locally

```bash
# Start production server
npm start
```

Visit `http://localhost:3000` to test the production build.

---

## Deployment Options

### Option 1: Netlify (Recommended for Frontend + Serverless)

#### Prerequisites
- Netlify account
- GitHub repository (optional but recommended)

#### Steps:

1. **Install Netlify CLI** (optional):
   ```bash
   npm install -g netlify-cli
   ```

2. **Configure `netlify.toml`** (already exists):
   The project includes a `netlify.toml` file with build configurations.

3. **Deploy via Netlify CLI**:
   ```bash
   netlify deploy --prod
   ```

4. **Or Deploy via Netlify Dashboard**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist/spa`
   - Configure environment variables in Netlify dashboard

5. **Configure Serverless Functions** (if using backend on Netlify):
   - Backend routes can be deployed as Netlify Functions
   - See `netlify/functions` directory

#### Environment Variables on Netlify:
Go to Site Settings → Environment Variables and add all variables from `.env.production`.

---

### Option 2: Vercel

#### Steps:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Create `vercel.json`** (if not exists):
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist/spa",
     "devCommand": "npm run dev"
   }
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.production`

---

### Option 3: Docker (Any Platform)

#### Dockerfile

The project includes a `Dockerfile`. To build and run:

```bash
# Build Docker image
docker build -t internship-erp .

# Run container
docker run -p 3000:3000 --env-file .env.production internship-erp
```

#### Docker Compose

For local production testing with docker-compose:

```bash
docker-compose up -d
```

#### Deploy to Cloud:
- **AWS ECS/Fargate**: Push image to ECR and deploy
- **Google Cloud Run**: Push to GCR and deploy
- **Azure Container Instances**: Push to ACR and deploy
- **Heroku**: Use Heroku Container Registry

---

### Option 4: Traditional VPS (DigitalOcean, Linode, AWS EC2)

#### Prerequisites:
- Server with Node.js installed
- Reverse proxy (Nginx) recommended
- SSL certificate (Let's Encrypt)

#### Steps:

1. **Clone Repository**:
   ```bash
   git clone your-repo-url
   cd curry-works
   ```

2. **Install Dependencies**:
   ```bash
   npm install --production
   ```

3. **Build Application**:
   ```bash
   npm run build
   ```

4. **Start with PM2** (Process Manager):
   ```bash
   # Install PM2
   npm install -g pm2

   # Start application
   pm2 start dist/server/production.mjs --name internship-erp

   # Save PM2 configuration
   pm2 save

   # Setup startup script
   pm2 startup
   ```

5. **Configure Nginx** (Optional but recommended):

   Create `/etc/nginx/sites-available/internship-erp`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/internship-erp /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## Post-Deployment

### 1. Verify Deployment

- [ ] Visit your production URL
- [ ] Test login functionality
- [ ] Test sign-up for new users
- [ ] Verify all dashboard pages load
- [ ] Check API endpoints work correctly
- [ ] Test file uploads (if implemented)

### 2. Monitor Application

**Recommended Monitoring Tools:**
- **Error Tracking**: Sentry, Rollbar
- **Performance**: New Relic, DataDog
- **Uptime**: UptimeRobot, Pingdom
- **Logs**: Loggly, Papertrail

### 3. Regular Maintenance

- **Database Backups**: Daily automated backups
- **Security Updates**: Monthly npm audit and updates
- **SSL Certificate**: Auto-renewal with certbot
- **Log Rotation**: Configure logrotate for PM2 logs

---

## Troubleshooting

### Build Failures

**Issue**: `npm run build` fails

**Solutions**:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Check Node.js version (requires v18+):
   ```bash
   node --version
   ```

3. Check for TypeScript errors:
   ```bash
   npm run typecheck
   ```

---

### Authentication Issues

**Issue**: Login fails in production

**Solutions**:
1. Verify JWT_SECRET is set correctly in environment variables
2. Check CORS configuration allows your frontend domain
3. Verify backend API URL is correct in frontend
4. Check browser console for CORS errors

---

### Rate Limiting Too Strict

**Issue**: "Too many requests" errors

**Solutions**:
1. Increase rate limits in `.env.production`:
   ```bash
   RATE_LIMIT_MAX_REQUESTS=200
   ```

2. Or disable rate limiting for testing (not recommended for production):
   Comment out rate limiting middleware in `server/index.ts`

---

### Database Connection Issues

**Issue**: Cannot connect to database

**Solutions**:
1. Verify DATABASE_URL is correct
2. Check database is accessible from server
3. Verify database user has correct permissions
4. Check firewall rules allow connection

---

## Security Best Practices

### 1. Environment Variables
- Never commit `.env.production` to git
- Use separate secrets for development and production
- Rotate secrets regularly (every 90 days)

### 2. HTTPS
- Always use HTTPS in production
- Enable HSTS headers
- Use strong SSL configuration

### 3. Dependencies
- Run `npm audit` regularly
- Keep dependencies updated
- Remove unused dependencies

### 4. Access Control
- Implement proper role-based access control
- Use strong password requirements
- Enable multi-factor authentication (future enhancement)

### 5. Input Validation
- Validate all user inputs
- Sanitize data before database operations
- Use parameterized queries

---

## Performance Optimization

### 1. Frontend
- Enable gzip compression in Nginx/server
- Use CDN for static assets
- Implement lazy loading for routes
- Optimize images

### 2. Backend
- Set up database connection pooling
- Implement response caching
- Use database indexes
- Optimize API queries

### 3. Monitoring
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs internship-erp

# Monitor resources
pm2 monit
```

---

## Rollback Procedure

If deployment fails, rollback:

### Netlify/Vercel
- Use deployment history in dashboard
- Click "Rollback" on previous deployment

### Docker
```bash
# Stop current container
docker stop internship-erp

# Run previous image
docker run -p 3000:3000 internship-erp:previous-tag
```

### PM2
```bash
# Stop current process
pm2 stop internship-erp

# Start from backup
pm2 start internship-erp-backup
```

---

## Support

For deployment issues:
1. Check application logs
2. Review this documentation
3. Consult platform-specific documentation:
   - [Netlify Docs](https://docs.netlify.com)
   - [Vercel Docs](https://vercel.com/docs)
   - [Docker Docs](https://docs.docker.com)

---

## Success Checklist

After successful deployment:

- ✅ Application accessible at production URL
- ✅ HTTPS enabled and working
- ✅ Authentication working correctly
- ✅ All dashboards functional
- ✅ API rate limiting active
- ✅ Error monitoring configured
- ✅ Database backups automated
- ✅ SSL certificate auto-renewal configured
- ✅ Monitoring alerts set up

Congratulations! Your Internship ERP is now live in production! 🎉
