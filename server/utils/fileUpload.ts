/**
 * File Upload Utilities
 * Handles PDF validation, file size checking, and secure storage paths
 */

import path from "path";
import fs from "fs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = ["application/pdf"];
const ALLOWED_EXTENSIONS = [".pdf"];

// Mock multer-like upload config for development
// In production, replace with actual multer configuration
export const uploadConfig = {
  single: (_fieldName: string) => {
    return (req: any, _res: any, next: any) => {
      // Mock file processing - in production use multer
      // This just passes through for now
      next();
    };
  },
};

/**
 * Validate uploaded file
 */
export function validateFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
}): { isValid: boolean; error?: string } {
  return validatePdfFile(file.originalname, file.mimetype, file.size);
}

/**
 * Validate if file is a valid PDF
 */
export function validatePdfFile(
  fileName: string,
  mimeType: string,
  fileSize: number
): { isValid: boolean; error?: string } {
  // Check file extension
  const extension = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { isValid: false, error: "Only PDF files are allowed" };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { isValid: false, error: "Invalid file type. PDF files only" };
  }

  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds limit. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Generate secure file path for storage
 */
export function generateSecureFilePath(
  studentId: string,
  submissionType: "task" | "assignment",
  submissionId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 50);

  return `submissions/${submissionType}/${studentId}/${submissionId}/${timestamp}-${randomStr}-${sanitizedFileName}`;
}

/**
 * Generate signed URL for file download (mock implementation)
 * In production, use cloud storage provider's signed URL feature
 */
export function generateSignedUrl(
  filePath: string,
  expiresIn: number = 3600 // 1 hour
): string {
  // Mock implementation - in production use AWS S3, Google Cloud Storage, etc.
  const signature = Buffer.from(`${filePath}:${Date.now() + expiresIn * 1000}`)
    .toString("base64")
    .substring(0, 32);

  return `/api/files/download?path=${encodeURIComponent(
    filePath
  )}&sig=${signature}`;
}

/**
 * Get file extension
 */
export function getFileExtension(fileName: string): string {
  return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
}

/**
 * Check if file can be downloaded by user
 */
export function canDownloadFile(
  requestingUserId: string,
  requestingUserRole: "student" | "faculty" | "admin",
  fileOwnerId: string,
  facultyId?: string
): boolean {
  // Admin can download any file
  if (requestingUserRole === "admin") {
    return true;
  }

  // Student can only download their own files
  if (requestingUserRole === "student") {
    return requestingUserId === fileOwnerId;
  }

  // Faculty can download files from assigned students
  if (requestingUserRole === "faculty") {
    return facultyId === requestingUserId || fileOwnerId === requestingUserId;
  }

  return false;
}

/**
 * Cleanup old files periodically
 * Implement with cron job in production
 */
export function shouldCleanupOldFiles(fileUploadedAt: Date, days: number = 90): boolean {
  const fileAge = Math.floor(
    (Date.now() - fileUploadedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return fileAge > days;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate file name (prevent directory traversal attacks)
 */
export function isSafeFileName(fileName: string): boolean {
  // Check for directory traversal attempts
  if (fileName.includes("../") || fileName.includes("..\\")) {
    return false;
  }

  // Check for absolute paths
  if (fileName.startsWith("/") || fileName.match(/^[a-zA-Z]:/)) {
    return false;
  }

  // Check for null bytes
  if (fileName.includes("\0")) {
    return false;
  }

  return true;
}
