/**
 * Security Middleware
 * 
 * Production-ready security configurations including:
 * - Helmet for security headers
 * - Rate limiting
 * - CORS configuration
 * - Request sanitization
 */

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

/**
 * Helmet security headers middleware
 */
export function securityHeaders() {
    const isDevelopment = process.env.NODE_ENV !== "production";

    return helmet({
        contentSecurityPolicy: isDevelopment ? false : {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    });
}

/**
 * Rate limiting middleware for API endpoints
 */
export const apiRateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Stricter rate limiting for auth endpoints
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: "Too many login attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Request sanitization middleware
 * Prevents common injection attacks
 */
export function sanitizeRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach((key) => {
            if (typeof req.query[key] === "string") {
                req.query[key] = sanitizeString(req.query[key] as string);
            }
        });
    }

    // Sanitize body
    if (req.body) {
        sanitizeObject(req.body);
    }

    next();
}

/**
 * Sanitize string to prevent XSS and injection attacks
 */
function sanitizeString(str: string): string {
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]*>/g, "")
        .trim();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
    Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === "string") {
            obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    });
}

/**
 * Error logging middleware
 */
export function errorLogger(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("Error occurred:", {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString(),
    });
    next(err);
}

/**
 * Production error handler
 * Doesn't leak stack traces in production
 */
export function productionErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    const statusCode = err.statusCode || 500;

    const response: any = {
        error: err.message || "Internal server error",
        statusCode,
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV !== "production") {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}
