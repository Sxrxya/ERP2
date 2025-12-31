# Internship ERP System - Development Guidance

This document provides guidance for AI assistants (Claude, GPT, etc.) working on this project.

## 🎯 Project Overview

**Type**: Full-stack ERP application for internship management
**Status**: MVP with production-ready architecture
**Scale**: Enterprise-grade with RBAC and audit capabilities

## 📦 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + React Router v6 (SPA)
- **Styling**: TailwindCSS + Radix UI
- **State**: React Context + React Query (TanStack Query)
- **Form**: React Hook Form + Zod validation
- **UI Components**: Pre-built Radix UI library in `client/components/ui/`
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based custom auth
- **Validation**: Zod for schema validation

### Development
- **Build Tool**: Vite with SWC
- **Package Manager**: PNPM (preferred)
- **Testing**: Vitest
- **Hot Reload**: Enabled for both client & server

## 🏗️ Architecture Patterns

### API Design
- REST API with `/api/` prefix
- Role-based route grouping: `/api/student/`, `/api/faculty/`, `/api/admin/`
- Request/response types defined in `shared/api.ts`
- Validation with Zod schemas before processing

### Authentication & Authorization
- JWT tokens stored in localStorage
- Token format: `{ id, email, role, roleId, iat, exp }`
- RBAC middleware enforces role checks on protected routes
- Ownership validation for student accessing own data

### File Structure
```
/client          → React frontend (SPA)
/server          → Express backend
/shared          → Shared types & utilities
/prisma          → Database schema & migrations
```

## 🔑 Key Components

### Authentication System
**File**: `server/utils/auth.ts`

Key functions:
- `authenticateToken()` - Middleware to verify JWT
- `authorizeRole(...roles)` - Middleware to check user role
- `ensureStudentOwnership()` - Verify student accessing own data
- `createUserPayload()` - Create JWT payload
- `hashPassword()` / `comparePassword()` - Password handling

⚠️ **Current State**: Mock implementation with Base64 encoding
✅ **TODO for Production**: Replace with bcrypt library

### Attendance Business Logic
**File**: `server/utils/attendance.ts`

Key functions:
- `isWeekend(date)` - Check if Saturday/Sunday
- `isValidWorkingDay(date, holidays)` - Check if day is workable
- `isWithinInternshipPeriod(date, start, end)` - Date range validation
- `validateAttendanceMarkable()` - Complete validation with all rules
- `calculateAttendancePercentage()` - Compute attendance rate
- `getTotalWorkingDaysInInternship()` - Count available working days

**Rules Implemented**:
1. Cannot mark on weekends (Sat/Sun)
2. Cannot mark on holidays (from Holiday table)
3. Cannot mark outside internship dates
4. Cannot exceed weekly limit (daysPerWeekAllowed)
5. Cannot mark duplicate attendance for same date

### File Upload System
**File**: `server/utils/fileUpload.ts`

Key functions:
- `validatePdfFile()` - Validate MIME type, size, extension
- `generateSecureFilePath()` - Create safe storage paths
- `generateSignedUrl()` - Create temporary download URLs
- `canDownloadFile()` - Check access permissions

**Constraints**:
- PDF only (application/pdf)
- Max 20MB per file
- Students can only access own uploads
- Faculty can access assigned students' uploads
- Admin can access all

## 📊 Database Schema

### Main Tables
- **User** - Authentication records
- **Student** - Student details + internship info
- **Faculty** - Faculty information
- **Attendance** - Attendance records with date + status
- **Holiday** - Government/regional holidays
- **Task** - Tasks created by faculty
- **TaskAssignment** - Task to student mapping
- **TaskSubmission** - Student's task submissions
- **Assignment** - Assignments created by faculty
- **AssignmentSubmission** - Student's assignment submissions
- **FacultyAssignment** - Faculty to student mapping (many-to-many)
- **FileUpload** - Metadata for uploaded files

### Key Relationships
```
Faculty ──1:N── Task
Faculty ──1:N── Assignment
Faculty ──1:N── Attendance (marked by)
Faculty ──M:N── Student (via FacultyAssignment)

Student ──1:N── Attendance
Student ──1:N── TaskSubmission
Student ──1:N── AssignmentSubmission

Task ──1:N── TaskAssignment
TaskAssignment ──1:1── TaskSubmission

Assignment ──1:N── AssignmentSubmission
```

## 🛣️ Route Structure

### Client Routes (React Router)
```
/                          → Home/Landing page
/login                     → Authentication

/student/dashboard         → Student main dashboard
/student/attendance        → View attendance (read-only)
/student/tasks            → View assigned tasks
/student/assignments      → View assignments
/student/submissions      → View submission history

/faculty/dashboard        → Faculty main dashboard with alerts
/faculty/attendance       → Mark attendance form
/faculty/students        → Manage assigned students
/faculty/tasks           → Manage tasks
/faculty/assignments     → Manage assignments
/faculty/reviews         → Review submissions

/admin/dashboard         → Admin overview
/admin/sync              → Google Forms sync
/admin/faculty-mapping   → Map faculty to students
/admin/holidays          → Manage holidays
/admin/reports           → View reports
/admin/settings          → System settings
```

### Server Routes (Express)
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/student/dashboard
GET    /api/student/{id}/attendance
GET    /api/student/{id}/tasks
GET    /api/student/{id}/assignments
POST   /api/student/{id}/tasks/{taskId}/submit
POST   /api/student/{id}/assignments/{assignId}/submit

GET    /api/faculty/dashboard
GET    /api/faculty/students
POST   /api/faculty/attendance/validate
POST   /api/faculty/attendance/mark
POST   /api/faculty/tasks
POST   /api/faculty/assignments
POST   /api/faculty/tasks/{taskId}/submissions/{subId}/review

GET    /api/admin/dashboard
GET/POST /api/admin/holidays
DELETE /api/admin/holidays/{id}
GET/POST /api/admin/faculty-mappings
DELETE /api/admin/faculty-mappings/{id}
POST   /api/admin/sync-google-form
GET    /api/admin/reports
POST   /api/admin/export-data
```

## 💼 Common Tasks

### Adding a New API Endpoint

1. **Define types in `shared/api.ts`**:
   ```typescript
   export interface MyRequest {
     field: string;
   }
   export interface MyResponse {
     success: boolean;
   }
   ```

2. **Create handler in `server/routes/{role}.ts`**:
   ```typescript
   export const handleMyEndpoint: RequestHandler = (req, res) => {
     // Implementation
     res.json({ success: true });
   };
   ```

3. **Register route in handler file**:
   ```typescript
   roleRoutes.post("/my-endpoint", handleMyEndpoint);
   ```

4. **Call from frontend**:
   ```typescript
   const response = await fetch("/api/role/my-endpoint", {
     method: "POST",
     headers: { "Authorization": `Bearer ${token}` },
     body: JSON.stringify(data),
   });
   ```

### Adding a New Frontend Page

1. **Create component in `client/pages/{role}/Page.tsx`**:
   ```typescript
   export default function MyPage() {
     const user = JSON.parse(localStorage.getItem("user") || "{}");
     return (
       <AppLayout role="student" userName={user.email}>
         {/* Content */}
       </AppLayout>
     );
   }
   ```

2. **Add route in `client/App.tsx`**:
   ```typescript
   <Route path="/student/my-page" element={
     <ProtectedRoute requiredRole="student">
       <MyPage />
     </ProtectedRoute>
   } />
   ```

### Adding Database Field

1. **Update `prisma/schema.prisma`**:
   ```prisma
   model Student {
     // existing fields...
     newField String
   }
   ```

2. **Create migration**:
   ```bash
   npx prisma migrate dev --name add_new_field
   ```

3. **Update types in `shared/models.ts`**

## ⚠️ Current Limitations & TODO

### Mock Data (Remove Before Production)
- `server/routes/auth.ts` - Uses in-memory mockUsers array
- `server/routes/student.ts` - Returns mock attendance & tasks
- `server/routes/faculty.ts` - Returns mock student lists & alerts
- `server/routes/admin.ts` - Returns mock dashboard data

**TODO**: Replace all mock data with Prisma database queries

### Authentication (Upgrade Security)
- ✅ JWT structure ready
- ⚠️ Password hashing is Base64 (not secure)
- ⚠️ Token verification is mock

**TODO**: 
- Install `jsonwebtoken` and `bcrypt`
- Update `server/utils/auth.ts` with real implementations
- Add refresh token logic

### File Storage
- ✅ Validation logic complete
- ✅ Signed URL generation ready
- ⚠️ No actual storage backend

**TODO**: Integrate AWS S3 or Google Cloud Storage

### Google Sheets Sync
- ✅ API endpoint ready (`POST /api/admin/sync-google-form`)
- ⚠️ Mock implementation only

**TODO**: Implement with `googleapis` library

### Logging & Monitoring
- ✅ Basic error handling
- ⚠️ No structured logging
- ⚠️ No error tracking

**TODO**: Add Winston (logging) and Sentry (monitoring)

## 🧪 Testing

### Unit Tests
- Create tests in `*.test.ts` files
- Run with `pnpm test`
- Especially important for:
  - Attendance validation logic
  - File upload validation
  - RBAC checks
  - API response handling

### E2E Tests
- Test complete workflows:
  - Login → Mark Attendance → View Dashboard
  - Student Submit Task → Faculty Review
  - Admin Sync Google Forms → Data appears

## 📖 Code Patterns to Follow

### API Response Format
```typescript
// Success
res.json({ success: true, message: "OK", data: {...} })

// Error
res.status(400).json({
  error: "Error Type",
  message: "Detailed message"
})
```

### Request Validation
```typescript
const schema = z.object({
  field: z.string().min(1),
});

try {
  const validated = schema.parse(req.body);
  // Use validated data
} catch (error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }
}
```

### Database Queries (Prisma)
```typescript
// Find
const student = await prisma.student.findUnique({
  where: { id: studentId }
});

// Filter
const attendance = await prisma.attendance.findMany({
  where: { studentId, date: { gte: startDate } }
});

// Create with relations
const submission = await prisma.taskSubmission.create({
  data: {
    taskId,
    studentId,
    fileUrl,
    status: "submitted"
  },
  include: { task: true }
});
```

## 🚀 Deployment Checklist

When deploying to production:

1. **Security**
   - [ ] Change JWT_SECRET
   - [ ] Enable HTTPS
   - [ ] Add rate limiting
   - [ ] Implement helmet.js
   - [ ] Configure CORS properly

2. **Database**
   - [ ] Use production PostgreSQL (Neon/RDS)
   - [ ] Setup backups
   - [ ] Run migrations
   - [ ] Test connections

3. **Environment**
   - [ ] Set NODE_ENV=production
   - [ ] Configure file storage
   - [ ] Setup monitoring/logging
   - [ ] Configure email service (for notifications)

4. **Testing**
   - [ ] Test all RBAC workflows
   - [ ] Load test attendance marking
   - [ ] Test file uploads
   - [ ] Verify attendance calculations

## 🎓 Learning Resources

### For Understanding Attendance Logic
- See `server/utils/attendance.ts` comments
- Test with various date combinations
- Review `server/routes/faculty.ts` `handleMarkAttendance()`

### For Understanding RBAC
- See `server/utils/auth.ts` middleware functions
- Check how each route enforces roles
- Test by logging in with different user roles

### For Understanding Database
- Review `prisma/schema.prisma` relationships
- See type definitions in `shared/models.ts`
- Understand Prisma Client queries

## 🤖 AI Assistant Tips

When making changes:

1. **Check existing patterns** - Mirror the style of similar files
2. **Validate with Zod** - Always validate external input
3. **Test RBAC** - Make sure routes check user role/ownership
4. **Use TypeScript** - Leverage type system for safety
5. **Follow naming** - Use descriptive names matching conventions
6. **Document complexity** - Add comments for non-obvious logic
7. **Test data flow** - Trace how data moves from frontend → backend → DB
8. **Handle errors** - Always wrap async/await in try-catch

## 📞 Contact & Support

For issues or questions:
- Review README.md for system overview
- Check shared/models.ts for types
- Review existing route implementations
- Check AGENTS.md (this file) for guidance

---

**Last Updated**: 2024
**Status**: Production Ready (with noted TODOs)
**Maintained by**: Development Team
