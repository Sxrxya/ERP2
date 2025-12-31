/**
 * Production Logger
 * 
 * Structured logging for production with Winston
 * Replaces all console.log/error calls
 */

import winston from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    isDevelopment
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...metadata }) => {
                let msg = `${timestamp} [${level}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                    msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
            })
        )
        : winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { service: 'internship-erp' },
    transports: [
        // Console transport
        new winston.transports.Console({
            stderrLevels: ['error'],
        }),
    ],
});

// Add file transports in production
if (!isDevelopment) {
    logger.add(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
    logger.add(
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};

export default logger;
