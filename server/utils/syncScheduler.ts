/**
 * Google Sheets Auto-Sync Scheduler
 * 
 * Automatically syncs data from Google Sheets at regular intervals
 * Eliminates need for manual admin sync actions
 */

import { fetchAllSheetsData } from "./googleSheets";
import { dataStore } from "./dataStore";
import logger from "./logger";

interface SyncStats {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncDuration: number;
    lastError?: string;
}

interface SyncResult {
    success: boolean;
    studentsCount: number;
    attendanceCount: number;
    tasksCount: number;
    assignmentsCount: number;
    duration: number;
    error?: string;
}

class SyncScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private lastSyncTime: Date | null = null;
    private stats: SyncStats = {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncDuration: 0,
    };
    private isRunning = false;
    private syncInterval: number;
    private spreadsheetId: string;

    constructor(spreadsheetId: string, intervalMs: number = 300000) {
        this.spreadsheetId = spreadsheetId;
        this.syncInterval = intervalMs;
    }

    /**
     * Start automatic synchronization
     */
    startAutoSync(): void {
        if (this.isRunning) {
            console.log("⚠️  Auto-sync is already running");
            return;
        }

        console.log(`✅ Auto-sync enabled - checking Google Sheets every ${this.syncInterval / 1000} seconds`);

        // Run initial sync immediately
        this.runSyncNow().catch(error => {
            console.error("❌ Initial sync failed:", error);
        });

        // Set up recurring sync
        this.intervalId = setInterval(() => {
            this.runSyncNow().catch(error => {
                logger.error("Scheduled sync failed", { error });
            });
        }, this.syncInterval);

        this.isRunning = true;
    }

    /**
     * Stop automatic synchronization
     */
    stopAutoSync(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            logger.info("Auto-sync stopped");
        }
    }

    /**
     * Run synchronization immediately
     */
    async runSyncNow(): Promise<SyncResult> {
        const startTime = Date.now();
        this.stats.totalSyncs++;

        try {
            logger.info(`Syncing data from Google Sheets... (Sync #${this.stats.totalSyncs})`);

            // Fetch all data from Google Sheets
            const sheetsData = await fetchAllSheetsData(this.spreadsheetId);

            // Clear existing data
            dataStore.clearAll();

            // Populate students
            for (const studentData of sheetsData.students) {
                const studentWithId = {
                    id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    ...studentData,
                };
                dataStore.setStudent(studentWithId);
            }

            // Populate attendance
            for (const att of sheetsData.attendance) {
                dataStore.addAttendance(att);
            }

            // Populate tasks
            for (const task of sheetsData.tasks) {
                dataStore.setTask(task);
            }

            // Populate assignments
            for (const assignment of sheetsData.assignments) {
                dataStore.setAssignment(assignment);
            }

            const duration = Date.now() - startTime;
            this.stats.successfulSyncs++;
            this.stats.lastSyncDuration = duration;
            this.lastSyncTime = new Date();

            const result: SyncResult = {
                success: true,
                studentsCount: sheetsData.students.length,
                attendanceCount: sheetsData.attendance.length,
                tasksCount: sheetsData.tasks.length,
                assignmentsCount: sheetsData.assignments.length,
                duration,
            };

            logger.info(
                `Sync completed in ${duration}ms: ${result.studentsCount} students, ` +
                `${result.attendanceCount} attendance records, ${result.tasksCount} tasks, ` +
                `${result.assignmentsCount} assignments`
            );

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.stats.failedSyncs++;
            this.stats.lastSyncDuration = duration;
            this.stats.lastError = error instanceof Error ? error.message : "Unknown error";

            logger.error(`Sync failed after ${duration}ms`, { error });

            return {
                success: false,
                studentsCount: 0,
                attendanceCount: 0,
                tasksCount: 0,
                assignmentsCount: 0,
                duration,
                error: this.stats.lastError,
            };
        }
    }

    /**
     * Get last sync time
     */
    getLastSyncTime(): Date | null {
        return this.lastSyncTime;
    }

    /**
     * Get synchronization statistics
     */
    getSyncStats(): SyncStats {
        return { ...this.stats };
    }

    /**
     * Check if auto-sync is running
     */
    isAutoSyncRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get next sync time estimate
     */
    getNextSyncTime(): Date | null {
        if (!this.lastSyncTime || !this.isRunning) {
            return null;
        }
        return new Date(this.lastSyncTime.getTime() + this.syncInterval);
    }
}

// Singleton instance
let schedulerInstance: SyncScheduler | null = null;

/**
 * Initialize sync scheduler
 */
export function initializeSyncScheduler(
    spreadsheetId: string,
    intervalMs: number = 300000
): SyncScheduler {
    if (schedulerInstance) {
        logger.warn("Sync scheduler already initialized");
        return schedulerInstance;
    }

    schedulerInstance = new SyncScheduler(spreadsheetId, intervalMs);
    return schedulerInstance;
}

/**
 * Get sync scheduler instance
 */
export function getSyncScheduler(): SyncScheduler | null {
    return schedulerInstance;
}

/**
 * Stop and cleanup scheduler
 */
export function cleanupSyncScheduler(): void {
    if (schedulerInstance) {
        schedulerInstance.stopAutoSync();
        schedulerInstance = null;
    }
}
