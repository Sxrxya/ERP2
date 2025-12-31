# Internship ERP - Production Ready

A comprehensive Enterprise Resource Planning system for managing student internships with role-based dashboards for Students, Faculty, and Administrators.

## 🚀 Features

### Authentication & Authorization
- ✅ JWT-based authentication with bcrypt password hashing
- ✅ Role-based access control (Student, Faculty, Admin)  
- ✅ Secure sign-up and login flows
- ✅ Token-based session management with localStorage
- ✅ Rate limiting on auth endpoints

### Student Portal
- View attendance records
- Submit tasks and assignments
- Track submission status
- Dashboard analytics
- Personal profile management

### Faculty Portal
- Mark student attendance
- Create and assign tasks
- Review submissions
- Monitor assigned students
- Dashboard alerts

### Admin Portal
- System-wide analytics
- User management
- Google Forms data sync
- Holiday management
- Faculty-student mapping
- System reports

### Security Features
- Helmet.js security headers
- Request sanitization
- CORS configuration
- Rate limiting
- Environment-based configuration

## 📋 Prerequisites

- Node.js v18 or higher
- npm or pnpm
- Git

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd curry-works

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

## 🔧 Development

```bash
# Start development server
npm run dev
```

Visit `http://localhost:8080`

### Demo Credentials

**Student:**
- Email: `student1@test.com`
- Password: `password123`

**Faculty:**
- Email: `faculty1@test.com`  
- Password: `password123`

**Admin:**
- Email: `admin@test.com`
- Password: `password123`

## 🏗️ Production Build

```bash
# Build application
npm run build

# Start production server
npm start
```

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions including:
- Netlify deployment
- Vercel deployment
- Docker deployment
- VPS deployment
- Environment configuration

## 📁 Project Structure

```
curry-works/
├── client/                 # Frontend React application
│   ├── components/        # Reusable UI components
│   ├── lib/              # Utilities and helpers
│   ├── pages/            # Page components
│   │   ├── student/      # Student dashboard pages
│   │   ├── faculty/      # Faculty dashboard pages
│   │   └── admin/        # Admin dashboard pages
│   └── App.tsx           # Main app component
├── server/                # Backend Express application
│   ├── routes/           # API route handlers
│   ├── middleware/       # Security and auth middleware
│   └── utils/            # Utilities and helpers
├── shared/               # Shared types and models
├── dist/                 # Production build output
└── public/               # Static assets
```

## 🔒 Security

### Production Security Checklist
- [x] JWT-based authentication
- [x] Bcrypt password hashing
- [x] Helmet security headers
- [x] Rate limiting
- [x] CORS configuration
- [x] Request sanitization
- [x] Environment-based secrets

### Recommended Additional Security
- [ ] Enable MFA (Multi-Factor Authentication)
- [ ] Implement session invalidation
- [ ] Add audit logging
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure CSP headers

## 📊 Tech Stack

### Frontend
- React 18
- TypeScript
- TailwindCSS
- React Router v6
- React Query
- Shadcn/ui components
- Recharts for analytics

### Backend
- Node.js
- Express 5
- TypeScript
- JWT for authentication
- Bcrypt for password hashing
- Zod for validation

### Security & Middleware
- Helmet.js
- express-rate-limit
- CORS

### Development
- Vite
- SWC
- Vitest
- Prettier

## 🧪 Testing

```bash
# Run tests
npm test

# Run type checking
npm run typecheck
```

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:client # Build frontend only
npm run build:server # Build backend only
npm start            # Start production server
npm test             # Run tests
npm run typecheck    # Run TypeScript type checking
npm run format.fix   # Format code with Prettier
```

## 🌍 Environment Variables

See `.env.production` for required environment variables:

```bash
# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=<your-secret-key>
JWT_REFRESH_SECRET=<your-refresh-secret>

# CORS
CORS_ORIGIN=https://yourdomain.com

# Security
BCRYPT_ROUNDS=10
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Student Endpoints
- `GET /api/student/attendance` - Get attendance records
- `GET /api/student/tasks` - Get assigned tasks
- `POST /api/student/tasks/:id/submit` - Submit task

### Faculty Endpoints
- `POST /api/faculty/attendance` - Mark attendance
- `POST /api/faculty/tasks` - Create task
- `GET /api/faculty/students` - Get assigned students

### Admin Endpoints
- `GET /api/admin/dashboard` - System analytics
- `POST /api/admin/sync` - Google Forms sync
- `GET /api/admin/reports` - Generate reports

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment issues
- See [Google Form Guide](./google_form_guide.md) for data collection
- Review API documentation above

## 🎯 Roadmap

### Completed ✅
- Authentication system with JWT
- Role-based dashboards
- Production security features
- Deployment configurations

### Planned 🔜
- Database integration (PostgreSQL/MongoDB)
- Email notification system
- Real-time updates with WebSockets
- Mobile responsive improvements
- Advanced reporting with PDF export
- Multi-language support

## 🌟 Acknowledgments

Built with:
- React & TypeScript
- Express.js
- TailwindCSS
- Shadcn/ui

---

Made with ❤️ for efficient internship management
