# Production Deployment Checklist

## Pre-Deployment

### Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Generate strong JWT_SECRET (64+ characters)
- [ ] Generate strong JWT_REFRESH_SECRET (different from JWT_SECRET)
- [ ] Verify JWT secrets are NOT default values
- [ ] Set Google Sheets spreadsheet ID
- [ ] Configure email service (SMTP or SendGrid)
- [ ] Set CORS_ORIGIN to production domain
- [ ] Set CLIENT_URL for email links
- [ ] Set NODE_ENV=production

### Security Verification
- [ ] JWT secrets are strong and unique
- [ ] No default secret values in .env
- [ ] CORS restricted to production domain
- [ ] Rate limiting configured
- [ ] CSP headers will be enabled in production

### Google Sheets Setup
- [ ] Spreadsheet has 4 tabs: "Form Responses 1", "Attendance", "Tasks", "Assignments"
- [ ] API credentials configured (API key OR service account)
- [ ] Test API access with spreadsheet ID
- [ ] Verify auto-sync interval is appropriate

### Code Quality
- [ ] Run `npm run typecheck` - passes with no errors
- [ ] Run `npm run build` - successful build
- [ ] No console.log statements in production code (all using logger)
- [ ] All environment variables validated on startup

## Deployment Steps

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Test Production Build Locally**
   ```bash
   NODE_ENV=production npm start
   ```

3. **Verify Health Check**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{ "status": "ok", ... }`

4. **Test Auto-Sync**
   - Wait 5 minutes for first sync
   - Check logs for sync success
   - Verify no errors

5. **Deploy to Hosting**
   - Upload built files
   - Set environment variables
   - Start server
   - Monitor logs

## Post-Deployment Verification

### Server Health
- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Environment validation passes
- [ ] No JWT secret warnings in logs

### Auto-Sync
- [ ] Auto-sync initializes on startup
- [ ] First sync completes successfully
- [ ] Data appears in system
- [ ] Subsequent syncs run on schedule

### API Endpoints
- [ ] POST /api/auth/login - works
- [ ] GET /api/admin/sync-status - protected
- [ ] POST /api/admin/sync-now - triggers sync
- [ ] GET /api/health - returns OK

### Frontend
- [ ] Application loads
- [ ] Login works
- [ ] Student dashboard shows data
- [ ] No console errors

## Monitoring

### Logs to Watch
- Server startup logs
- Auto-sync logs
- Error logs (`logs/error.log`)
- Combined logs (`logs/combined.log`)

### Key Metrics
- Auto-sync success rate
- API response times
- Authentication failures
- Error rates

## Rollback Plan

If issues occur:
1. Check logs: `tail -f logs/error.log`
2. Verify environment variables
3. Test database connectivity
4. Restart server
5. If critical: rollback to previous version

## Emergency Contacts

- **System Admin**: [Your email]
- **Google Sheets Owner**: [Owner email]
- **Hosting Support**: [Provider support]

## Success Criteria

✅ Server running without errors  
✅ Environment validation passes  
✅ Auto-sync functioning  
✅ Students can login  
✅ Data displays correctly  
✅ No security warnings  
✅ Logs are clean

When all criteria met: **PRODUCTION READY** 🚀
