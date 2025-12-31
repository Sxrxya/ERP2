# Netlify Deployment Guide

## Quick Start

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Netlify will auto-detect settings from `netlify.toml`
   - Click "Deploy site"

3. **Configure Environment Variables**:
   - Go to Site settings → Environment variables
   - Add the following variables:

## Required Environment Variables

### Authentication
```
JWT_SECRET=<generate-secure-32-char-string>
JWT_REFRESH_SECRET=<generate-secure-32-char-string>
JWT_EXPIRY=24h
BCRYPT_ROUNDS=10
```

### Email Notifications

**Option 1 - SendGrid (Recommended)**:
```
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.com
```

**Option 2 - Gmail SMTP**:
```
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail@gmail.com>
SMTP_PASS=<your-app-password>
EMAIL_FROM=<your-gmail@gmail.com>
```

### Google Sheets Integration

**Option 1 - Service Account(Recommended)**:
```
GOOGLE_CLIENT_EMAIL=<service-account-email>
GOOGLE_PRIVATE_KEY=<service-account-private-key>
```

**Option 2 - API Key**:
```
GOOGLE_SHEETS_API_KEY=<your-api-key>
```

### Application
```
NODE_ENV=production
CLIENT_URL=https://your-site.netlify.app
CORS_ORIGIN=https://your-site.netlify.app
```

---

## Setting Up Email Notifications

### Using SendGrid (Easiest)

1. **Create SendGrid Account**:
   - Go to [sendgrid.com](https://sendgrid.com)
   - Sign up for free (100 emails/day)

2. **Get API Key**:
   - Go to Settings → API Keys
   - Create API Key → Full Access
   - Copy the key

3. **Add to Netlify**:
   ```
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   EMAIL_FROM=noreply@yourdomain.com
   ```

### Using Gmail SMTP

1. **Enable 2-Step Verification**:
   - Go to Google Account settings
   - Security → 2-Step Verification → Turn on

2. **Create App Password**:
   - Security → App passwords
   - Select app: Mail
   - Select device: Other (Custom name)
   - Generate → Copy 16-character password

3. **Add to Netlify**:
   ```
   EMAIL_SERVICE=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=youremail@gmail.com
   SMTP_PASS=<app-password>
   EMAIL_FROM=youremail@gmail.com
   ```

---

## Setting Up Google Sheets Integration

### Method 1: Service Account (Recommended)

1. **Create Google Cloud Project**:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project

2. **Enable Google Sheets API**:
   - APIs & Services → Library
   - Search "Google Sheets API" → Enable

3. **Create Service Account**:
   - APIs & Services → Credentials
   - Create Credentials → Service Account
   - Download JSON key file

4. **Share Sheet with Service Account**:
   - Open your Google Sheet
   - Click Share
   - Add service account email (from JSON file)
   - Give "Viewer" access

5. **Add to Netlify**:
   - Extract from JSON file:
   ```
   GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----
   ```

### Method 2: API Key (Simpler, Less Secure)

1. **Create API Key**:
   - Google Cloud Console → Credentials
   - Create Credentials → API Key
   - Restrict key to Google Sheets API

2. **Make Sheet Public**:
   - Open Google Sheet
   - File → Share → Publish to web
   - Or Share → Anyone with the link

3. **Add to Netlify**:
   ```
   GOOGLE_SHEETS_API_KEY=AIzaxxxxxxxxxxxxxxx
   ```

---

## Configuration Steps

### 1. Generate Secure Secrets

```bash
# Generate JWT secrets (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run twice to get two different secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### 2. Update Environment Variables in Netlify

1. Go to your site: Site settings → Environment variables
2. Click "Add a variable"
3. Add each variable one by one
4. Click "Save"

### 3. Trigger Redeploy

After adding environment variables:
- Go to Deploys
- Click "Trigger deploy" → "Clear cache and deploy site"

---

## Testing the Deployment

### 1. Test Website Access

Visit your Netlify URL: `https://your-site.netlify.app`

Expected: Login page loads

### 2. Test Sign-Up with Email

1. Create a new account
2. Check your email for welcome message
3. If no email arrives:
   - Check Netlify logs: Site → Functions → logs
   - Verify EMAIL environment variables are set correctly

### 3. Test Google Sheets Sync

1. Create a Google Form following the [Google Form Guide](../google_form_guide.md)
2. Get some test submissions
3. Login as admin (`admin@test.com` / `password123`)
4. Go to Admin Dashboard → Google Form Sync
5. Enter:
   - Spreadsheet ID (or full URL)
   - Sheet Name: "Form Responses 1"
6. Click Sync

Expected: 
- Success message
- New students imported
- Welcome emails sent

---

## Troubleshooting

### Email Not Sending

**Check Netlify Function Logs**:
- Site → Functions → Click on function name
- View logs for email errors

**Common Issues**:
1. Wrong SMTP credentials
2. Gmail blocking "Less secure apps" (use app password instead)
3. SendGrid API key not activated

**Solution**:
- Verify environment variables are correctly set
- Check email service configuration in logs

### Google Sheets Sync Fails

**Error: "Failed to fetch data"**

**Solutions**:
1. Check spreadsheet ID is correct
2. For Service Account: Verify sheet is shared with service account email
3. For API Key: Verify sheet is public or shared
4. Check Google Cloud API is enabled

**Error: "Validation errors"**

**Solutions**:
- Check Google Form has all required fields
- Verify field order matches expected structure
- Check data format (dates, numbers, etc.)

### Build Fails

**Error: "Module not found"**

**Solution**:
```bash
# Locally, install dependencies
npm install

# Commit package.json and package-lock.json
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Functions Timeout

**Error: "Function execution timed out"**

**Solution**:
- Reduce batch size in Google Sheets sync
- Optimize email sending (send async)
- Increase function timeout in `netlify.toml` (max 26s on free plan)

---

## Post-Deployment Checklist

- [ ] Website loads correctly
- [ ] Login works
- [ ] Sign-up sends welcome email
- [ ] Google Sheets sync imports students
- [ ] All dashboard pages accessible
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Environment variables secured

---

## Custom Domain (Optional)

1. **Add Domain in Netlify**:
   - Site settings → Domain management
   - Add custom domain

2. **Update DNS Records**:
   - Add CNAME record: `www` → `your-site.netlify.app`
   - Add A record: `@` → Netlify's IP (provided in Netlify)

3. **Update Environment Variables**:
   ```
   CLIENT_URL=https://yourdomain.com
   CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
   ```

4. **Enable HTTPS**:
   - Netlify auto-provisions SSL certificate
   - Force HTTPS redirect enabled by default

---

## Maintenance

### Monitor Function Usage

Free Plan Limits:
- 125,000 function requests/month
- 100 hours function runtime/month

Check usage:
- Site → Functions → Usage

### Update Dependencies

Monthly:
```bash
npm audit
npm update
npm test
git commit -am "Update dependencies"
git push
```

---

## Success!

Your Internship ERP is now live on Netlify with:

✅ Automatic HTTPS
✅ Email notifications
✅ Google Forms integration
✅ Production security
✅ Global CDN

**Next Steps:**
1. Share the URL with users
2. Distribute Google Form link
3. Monitor function logs
4. Set up custom domain (optional)

🎉 **Deployment Complete!**
