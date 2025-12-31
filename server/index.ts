import "dotenv/config";
import express, { Express, RequestHandler } from "express";
import cors from "cors";

// Import middleware
import { authenticateToken, authorizeRole } from "./utils/auth";
import { UserRole } from "../shared/models";
import {
  securityHeaders,
  apiRateLimiter,
  authRateLimiter,
  sanitizeRequest,
  errorLogger,
  productionErrorHandler,
} from "./middleware/security";

// Import routes
import { authRoutes } from "./routes/auth";
import { studentRoutes } from "./routes/student";
import { facultyRoutes } from "./routes/faculty";
import { adminRoutes } from "./routes/admin";
import { uploadRoutes } from "./routes/upload";

// Import sync scheduler
import { initializeSyncScheduler, cleanupSyncScheduler } from "./utils/syncScheduler";
import logger from "./utils/logger";
import { validateAndThrow } from "./utils/envValidator";

export function createServer(): Express {
  const app = express();

  // ==================== SECURITY MIDDLEWARE ====================
  // Production security headers
  app.use(securityHeaders());

  // ==================== CORS ====================
  const corsOptions = {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : "*",
    credentials: true,
  };
  app.use(cors(corsOptions));

  // ==================== BASIC MIDDLEWARE ====================
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request sanitization
  app.use(sanitizeRequest);

  // Rate limiting for all API routes
  app.use("/api", apiRateLimiter);

  // Health check endpoint (no auth required)
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ==================== AUTHENTICATION ROUTES ====================
  // Apply stricter rate limiting to auth routes
  app.use("/api/auth", authRateLimiter);
  app.use("/api/auth", authRoutes);

  // ==================== PROTECTED ROUTES ====================
  // Apply authentication middleware to all routes below this
  app.use("/api/student", authenticateToken, authorizeRole(UserRole.STUDENT, UserRole.ADMIN));
  app.use("/api/student", studentRoutes);

  app.use(
    "/api/faculty",
    authenticateToken,
    authorizeRole(UserRole.FACULTY, UserRole.ADMIN)
  );
  app.use("/api/faculty", facultyRoutes);

  app.use(
    "/api/admin",
    authenticateToken,
    authorizeRole(UserRole.ADMIN)
  );
  app.use("/api/admin", adminRoutes);

  // File upload routes (authenticated)
  app.use("/api/upload", authenticateToken);
  app.use("/api/upload", uploadRoutes);

  // ==================== ERROR HANDLING ====================
  // Error logger
  app.use(errorLogger);

  // Production error handler
  app.use(productionErrorHandler);

  // ==================== 404 HANDLER ====================
  app.use((req, res, next) => {
    // Only handle 404 for API routes, let other routes pass to Vite/Frontend
    if (req.path.startsWith("/api")) {
      res.status(404).json({
        error: "Not Found",
        message: `Endpoint ${req.method} ${req.path} not found`,
        statusCode: 404,
      });
    } else {
      next();
    }
  });

  return app;
}

// Start server
const isSSR = import.meta.env ? import.meta.env.SSR : false;
if (isSSR === false && process.env.NODE_ENV === "production") {
  const app = createServer();
  const port = process.env.PORT || 3000;

  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);

    // Initialize auto-sync if enabled
    if (process.env.GOOGLE_SHEETS_AUTO_SYNC === "true") {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const syncInterval = parseInt(process.env.GOOGLE_SHEETS_SYNC_INTERVAL || "300000");

      if (spreadsheetId) {
        const scheduler = initializeSyncScheduler(spreadsheetId, syncInterval);
        scheduler.startAutoSync();
      } else {
        console.warn("⚠️  Auto-sync enabled but GOOGLE_SHEETS_SPREADSHEET_ID not set");
      }
    }
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    cleanupSyncScheduler();
    server.close(() => {
      logger.info("HTTP server closed");
    });
  });
}
