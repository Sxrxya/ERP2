import { Router, RequestHandler } from "express";
import { uploadConfig, validateFile } from "../utils/fileUpload";
import { dataStore } from "../utils/dataStore";

export const uploadRoutes = Router();

/**
 * POST /api/upload/submission
 * Upload a file for task/assignment submission
 */
export const handleFileUpload: RequestHandler = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Validate file
        const validation = validateFile(req.file);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { submissionId, submissionType } = req.body;

        if (!submissionId || !submissionType) {
            return res.status(400).json({
                error: "Missing required fields: submissionId, submissionType"
            });
        }

        // Store file metadata
        const fileMetadata = {
            id: `file-${Date.now()}`,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedBy: req.user.email,
            uploadedAt: new Date().toISOString(),
            submissionId,
            submissionType,
        };

        // TODO: Store in dataStore.addFile(fileMetadata)

        res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            file: {
                id: fileMetadata.id,
                filename: fileMetadata.filename,
                size: fileMetadata.size,
                uploadedAt: fileMetadata.uploadedAt,
            },
        });
    } catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({
            error: "File upload failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * GET /api/upload/files/:fileId
 * Download a file
 */
export const handleFileDownload: RequestHandler = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const { fileId } = req.params;

        // TODO: Get file metadata from dataStore
        // const fileMetadata = dataStore.getFile(fileId);

        // Placeholder response
        res.status(200).json({
            message: "File download endpoint - implement with actual file serving",
            fileId,
        });

        // In production, use:
        // res.download(fileMetadata.path, fileMetadata.originalName);
    } catch (error) {
        res.status(500).json({
            error: "File download failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * GET /api/upload/files
 * List all files for current user
 */
export const handleListFiles: RequestHandler = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        // TODO: Get files from dataStore based on user role and permissions
        // For students: their own files
        // For faculty: files from assigned students
        // For admin: all files

        res.json({
            files: [],
            total: 0,
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to list files",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * DELETE /api/upload/files/:fileId
 * Delete a file
 */
export const handleDeleteFile: RequestHandler = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const { fileId } = req.params;

        // TODO: Delete file from storage and dataStore
        // Verify user has permission to delete

        res.json({
            success: true,
            message: "File deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to delete file",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Route definitions
uploadRoutes.post("/submission", uploadConfig.single('file'), handleFileUpload);
uploadRoutes.get("/files/:fileId", handleFileDownload);
uploadRoutes.get("/files", handleListFiles);
uploadRoutes.delete("/files/:fileId", handleDeleteFile);
