/**
 * Environment Variable Validator
 * 
 * Validates all required environment variables on server startup
 * Prevents production deployment with invalid configuration
 */

import logger from './logger';

interface EnvValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate environment variables
 */
export function validateEnv(): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const isProduction = process.env.NODE_ENV === 'production';

    // Critical: JWT Secrets
    if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required');
    } else if (process.env.JWT_SECRET.includes('change-in-production')) {
        if (isProduction) {
            errors.push('JWT_SECRET cannot use default value in production');
        } else {
            warnings.push('JWT_SECRET is using default value (unsafe for production)');
        }
    } else if (process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (!process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_REFRESH_SECRET is required');
    } else if (process.env.JWT_REFRESH_SECRET.includes('change-in-production')) {
        if (isProduction) {
            errors.push('JWT_REFRESH_SECRET cannot use default value in production');
        } else {
            warnings.push('JWT_REFRESH_SECRET is using default value (unsafe for production)');
        }
    } else if (process.env.JWT_REFRESH_SECRET.length < 32) {
        errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
    }

    // Check JWT secrets are different
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }

    // Google Sheets Configuration
    if (process.env.GOOGLE_SHEETS_AUTO_SYNC === 'true') {
        if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
            errors.push('GOOGLE_SHEETS_SPREADSHEET_ID is required when auto-sync is enabled');
        } else {
            // Validate spreadsheet ID format
            const spreadsheetIdRegex = /^[a-zA-Z0-9-_]{20,}$/;
            if (!spreadsheetIdRegex.test(process.env.GOOGLE_SHEETS_SPREADSHEET_ID)) {
                errors.push('GOOGLE_SHEETS_SPREADSHEET_ID format is invalid');
            }
        }

        // Validate sync interval
        const syncInterval = parseInt(process.env.GOOGLE_SHEETS_SYNC_INTERVAL || '300000');
        if (isNaN(syncInterval) || syncInterval < 60000) {
            errors.push('GOOGLE_SHEETS_SYNC_INTERVAL must be at least 60000ms (1 minute)');
        }
    }

    // Google Sheets API credentials
    if (!process.env.GOOGLE_SHEETS_API_KEY && !process.env.GOOGLE_PRIVATE_KEY) {
        warnings.push('No Google Sheets credentials configured (API key or service account)');
    }

    // Email Configuration (optional but recommended)
    if (process.env.EMAIL_SERVICE === 'smtp') {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            warnings.push('SMTP credentials not configured - email features will be disabled');
        }
    } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
        if (!process.env.SENDGRID_API_KEY) {
            warnings.push('SendGrid API key not configured - email features will be disabled');
        }
    }

    // Server Configuration
    const port = parseInt(process.env.PORT || '3000');
    if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('PORT must be a valid port number (1-65535)');
    }

    // CORS Configuration
    if (isProduction && !process.env.CORS_ORIGIN) {
        errors.push('CORS_ORIGIN must be set in production');
    }

    // Rate Limiting
    const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

    if (isNaN(rateLimitWindow) || rateLimitWindow < 1000) {
        warnings.push('RATE_LIMIT_WINDOW_MS should be at least 1000ms');
    }

    if (isNaN(rateLimitMax) || rateLimitMax < 1) {
        warnings.push('RATE_LIMIT_MAX_REQUESTS should be at least 1');
    }

    // Bcrypt Rounds
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    if (isNaN(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
        warnings.push('BCRYPT_ROUNDS should be between 10 and 15 for optimal security/performance');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate and log results
 * Throws error if validation fails
 */
export function validateAndThrow(): void {
    const result = validateEnv();

    // Log warnings
    result.warnings.forEach((warning) => {
        logger.warn(`⚠️  ${warning}`);
    });

    // Log and throw errors
    if (!result.isValid) {
        result.errors.forEach((error) => {
            logger.error(`❌ ${error}`);
        });

        logger.error('Environment validation failed. Please fix the errors above and restart.');
        throw new Error('Invalid environment configuration');
    }

    logger.info('✅ Environment validation passed');
}
