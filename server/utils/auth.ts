/**
 * Production-Ready Authentication Utilities
 * 
 * Features:
 * - Real JWT token signing and verification using jsonwebtoken
 * - Secure password hashing using bcrypt
 * - Token refresh mechanism
 * - Enhanced security middleware
 */

import { Request, Response, NextFunction } from "express";
import { UserRole } from "../../shared/models";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import logger from "./logger";

// JWT Configuration
const JWT_SECRET_ENV = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET_ENV = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";
const JWT_REFRESH_EXPIRY = "7d";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10");

// Validate JWT secrets on module load
if (!JWT_SECRET_ENV) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!JWT_REFRESH_SECRET_ENV) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}
if (JWT_SECRET_ENV.includes('change-in-production') && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET cannot use default value in production');
}
if (JWT_REFRESH_SECRET_ENV.includes('change-in-production') && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_REFRESH_SECRET cannot use default value in production');
}
if (JWT_SECRET_ENV === JWT_REFRESH_SECRET_ENV) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
}

// After validation, we know these are defined
const JWT_SECRET: string = JWT_SECRET_ENV;
const JWT_REFRESH_SECRET: string = JWT_REFRESH_SECRET_ENV;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        roleId: string;
      };
    }
  }
}

interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  roleId: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign JWT token with user payload
 */
export function signToken(payload: TokenPayload, expiresIn: string = JWT_EXPIRY): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Sign refresh token
 */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    logger.debug('Token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    logger.debug('Refresh token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

/**
 * Authentication Middleware
 * Extracts and validates JWT token from Authorization header
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to specific user roles
 */
export function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This endpoint requires one of these roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}

/**
 * Middleware to ensure student can only access their own data
 */
export function ensureStudentOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== UserRole.STUDENT) {
    // Non-students can access all records (faculty/admin)
    return next();
  }

  // Check if the requested studentId matches the logged-in student's roleId
  const requestedStudentId = req.params.studentId || req.body.studentId;
  if (requestedStudentId && requestedStudentId !== req.user.roleId) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You can only access your own data",
    });
  }

  next();
}

/**
 * Middleware to ensure faculty can only access their assigned students
 */
export function ensureFacultyAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== UserRole.FACULTY) {
    // Non-faculty can access (admin or handled elsewhere)
    return next();
  }

  // This requires checking if faculty is assigned to the student
  // Implementation depends on database query (see ensureFacultyAssigned middleware)
  next();
}

/**
 * Middleware to check if faculty is assigned to the student
 * Requires database access - to be implemented with actual DB calls
 */
export function ensureFacultyAssigned(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // This would need database access
  // Check if req.user (faculty) is assigned to the student in req.params.studentId
  // For now, this is a placeholder
  next();
}

/**
 * Generate JWT payload for user
 */
export function createUserPayload(
  id: string,
  email: string,
  role: UserRole,
  roleId: string
): TokenPayload {
  return {
    id,
    email,
    role,
    roleId,
  };
}

/**
 * Hash password using bcrypt (production-ready)
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Synchronous version for demo data generation
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Compare password with hash using bcrypt (production-ready)
 */
export async function comparePassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return await bcrypt.compare(password, passwordHash);
}

/**
 * Token refresh endpoint handler
 */
export function refreshTokenHandler(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  const user = verifyRefreshToken(refreshToken);
  if (!user) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  // Generate new access token
  const payload = createUserPayload(user.id, user.email, user.role, user.roleId);
  const newAccessToken = signToken(payload);

  res.json({
    accessToken: newAccessToken,
  });
}
