import { Router, RequestHandler } from "express";
import { z } from "zod";
import {
  CreateHolidayRequest,
  MapFacultyToStudentRequest,
  SyncGoogleFormRequest,
  AdminDashboardResponse,
  GetReportsResponse,
} from "../../shared/api";
import { dataStore } from "../utils/dataStore";

export const adminRoutes = Router();

// Validation schemas
const createHolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["national", "state", "regional"]),
});

const mapFacultySchema = z.object({
  facultyId: z.string().min(1),
  studentIds: z.array(z.string().min(1)),
});

const syncGoogleFormSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional(),
});

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview - ALL DATA FROM DATASTORE
 */
export const handleGetAdminDashboard: RequestHandler = (req, res) => {
  try {
    const students = dataStore.getAllStudents();
    const faculty = dataStore.getAllFaculty();
    const tasks = dataStore.getAllTasks();
    const assignments = dataStore.getAllAssignments();

    // Calculate faculty workload from actual data
    const facultyWorkload = faculty.map((f) => ({
      facultyId: f.id,
      facultyName: f.fullName,
      assignedStudents: students.filter((s) => s.facultyEmail === f.email).length,
    }));

    // Count active vs completed internships
    const today = new Date().toISOString().split("T")[0];
    const activeInternships = students.filter((s) => s.internshipEndDate >= today).length;
    const completedInternships = students.filter((s) => s.internshipEndDate < today).length;

    const response: AdminDashboardResponse = {
      totalInterns: students.length,
      activeInternships,
      completedInternships,
      facultyWorkload,
      systemOverview: {
        totalFaculty: faculty.length,
        totalTasks: tasks.length,
        totalAssignments: assignments.length,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch dashboard",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/holidays
 * Get all holidays from dataStore
 */
export const handleGetHolidays: RequestHandler = (req, res) => {
  try {
    const holidays = dataStore.getHolidays ? dataStore.getHolidays() : [];
    res.json({
      holidays,
      totalHolidays: holidays.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch holidays",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/admin/holidays
 * Create a new holiday
 */
export const handleCreateHoliday: RequestHandler = (req, res) => {
  try {
    const { date, name, description, type } = createHolidaySchema.parse(req.body);

    const newHoliday = {
      id: `hol-${Date.now()}`,
      date,
      name,
      description,
      type,
      createdAt: new Date().toISOString(),
    };

    if (dataStore.addHoliday) {
      dataStore.addHoliday(newHoliday);
    }

    res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      holiday: newHoliday,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    res.status(500).json({
      error: "Failed to create holiday",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * DELETE /api/admin/holidays/:holidayId
 * Delete a holiday
 */
export const handleDeleteHoliday: RequestHandler = (req, res) => {
  try {
    const { holidayId } = req.params;

    if (dataStore.removeHoliday) {
      dataStore.removeHoliday(holidayId);
    }

    res.json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete holiday",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/students
 * Get all students from dataStore
 */
export const handleGetAllStudents: RequestHandler = (req, res) => {
  try {
    const students = dataStore.getAllStudents();
    res.json({
      students,
      total: students.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch students",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/faculty
 * Get all faculty from dataStore
 */
export const handleGetAllFaculty: RequestHandler = (req, res) => {
  try {
    const faculty = dataStore.getAllFaculty();
    res.json({
      faculty,
      total: faculty.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch faculty",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/faculty-mappings
 * Get all faculty-student mappings from actual data
 */
export const handleGetFacultyMappings: RequestHandler = (req, res) => {
  try {
    const students = dataStore.getAllStudents();

    // Build mappings from student.facultyEmail
    const mappings = students
      .filter((s) => s.facultyEmail)
      .map((s) => ({
        id: `map-${s.id}`,
        facultyEmail: s.facultyEmail,
        studentId: s.id,
        studentEmail: s.email,
        studentName: s.fullName,
      }));

    res.json({
      mappings,
      totalMappings: mappings.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch faculty mappings",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/admin/faculty-mappings
 * Map faculty to students (update student records)
 */
export const handleMapFacultyToStudents: RequestHandler = (req, res) => {
  try {
    const { facultyId, studentIds } = mapFacultySchema.parse(req.body);

    const faculty = dataStore.getAllFaculty().find((f) => f.id === facultyId);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Update each student's facultyEmail
    let mappedCount = 0;
    for (const studentId of studentIds) {
      const student = dataStore.getAllStudents().find((s) => s.id === studentId);
      if (student) {
        student.facultyEmail = faculty.email;
        dataStore.setStudent(student);
        mappedCount++;
      }
    }

    res.status(201).json({
      success: true,
      message: `Faculty mapped to ${mappedCount} student(s)`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    res.status(500).json({
      error: "Failed to map faculty",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * DELETE /api/admin/faculty-mappings/:mappingId
 * Remove faculty-student mapping
 */
export const handleRemoveMapping: RequestHandler = (req, res) => {
  try {
    const { mappingId } = req.params;

    // Find student by mapping ID (map-{studentId})
    const studentId = mappingId.replace("map-", "");
    const student = dataStore.getAllStudents().find((s) => s.id === studentId);

    if (student) {
      student.facultyEmail = undefined;
      dataStore.setStudent(student);
    }

    res.json({
      success: true,
      message: "Mapping removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to remove mapping",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/admin/sync-google-form
 * Sync student AND faculty data from Google Forms
 */
import { fetchAllSheetsData, validateStudentData, validateFacultyData, extractSpreadsheetId } from "../utils/googleSheets";
import { sendWelcomeEmail } from "../utils/emailService";

export const handleSyncGoogleForm: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId: rawSpreadsheetId, sheetName } = syncGoogleFormSchema.parse(req.body);

    // Extract spreadsheet ID from URL if full URL was provided
    const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId) || rawSpreadsheetId;

    // Fetch all data from Google Sheets (including faculty)
    const sheetsData = await fetchAllSheetsData(spreadsheetId, sheetName);

    const results = {
      synced: 0,
      errors: [] as string[],
      newStudents: 0,
      newFaculty: 0,
      updatedStudents: 0,
      emailsSent: 0,
    };

    // Clear existing data
    dataStore.clearStudents();
    dataStore.clearFaculty();

    // Process each student
    for (const studentData of sheetsData.students) {
      try {
        const validation = validateStudentData(studentData);
        if (!validation.isValid) {
          results.errors.push(`Student ${studentData.email || 'Unknown'}: ${validation.errors.join(', ')}`);
          continue;
        }

        const studentWithId = {
          id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...studentData,
        };
        dataStore.setStudent(studentWithId);
        results.newStudents++;
        results.synced++;
      } catch (error) {
        results.errors.push(`Student ${studentData.email || 'Unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process each faculty
    for (const facultyData of sheetsData.faculty) {
      try {
        const validation = validateFacultyData(facultyData);
        if (!validation.isValid) {
          results.errors.push(`Faculty ${facultyData.email || 'Unknown'}: ${validation.errors.join(', ')}`);
          continue;
        }

        const facultyWithId = {
          id: `faculty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...facultyData,
        };
        dataStore.setFaculty(facultyWithId);
        results.newFaculty++;
        results.synced++;
      } catch (error) {
        results.errors.push(`Faculty ${facultyData.email || 'Unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add attendance records
    for (const att of sheetsData.attendance) {
      dataStore.addAttendance(att);
    }

    // Add tasks
    for (const task of sheetsData.tasks) {
      dataStore.setTask(task);
    }

    // Add assignments
    for (const assignment of sheetsData.assignments) {
      dataStore.setAssignment(assignment);
    }

    console.log(`✅ Synced ${results.newStudents} students and ${results.newFaculty} faculty from Google Sheets`);

    res.json({
      success: true,
      message: `Successfully synced ${results.newStudents} students and ${results.newFaculty} faculty`,
      ...results,
      dataStoreStats: dataStore.getStats(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    console.error("Sync error:", error);
    res.status(500).json({
      error: "Failed to sync Google Form",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/reports
 * Get system reports from actual data
 */
export const handleGetReports: RequestHandler = (req, res) => {
  try {
    const students = dataStore.getAllStudents();
    const tasks = dataStore.getAllTasks();
    const assignments = dataStore.getAllAssignments();

    // Build attendance report from actual data
    const attendanceReport = students.map((s) => {
      const attendance = dataStore.getAttendance(s.email);
      const presentDays = attendance.filter((a) => a.status === "present").length;
      const totalDays = attendance.length || 1;
      return {
        studentId: s.id,
        studentName: s.fullName,
        attendancePercentage: Math.round((presentDays / totalDays) * 100),
      };
    });

    // Build task submission report
    const submissions = dataStore.getAllSubmissions();
    const taskSubmissionReport = tasks.map((t) => {
      const taskSubmissions = submissions.filter((s) => s.taskId === t.id);
      const submissionRate = t.assignedTo.length > 0
        ? Math.round((taskSubmissions.length / t.assignedTo.length) * 100)
        : 0;
      return {
        taskId: t.id,
        taskTitle: t.title,
        submissionRate,
      };
    });

    // Build assignment submission report
    const assignmentSubmissionReport = assignments.map((a) => {
      const assignmentSubmissions = submissions.filter((s) => s.assignmentId === a.id);
      const submissionRate = a.assignedTo.length > 0
        ? Math.round((assignmentSubmissions.length / a.assignedTo.length) * 100)
        : 0;
      return {
        assignmentId: a.id,
        assignmentTitle: a.title,
        submissionRate,
      };
    });

    res.json({
      attendanceReport,
      taskSubmissionReport,
      assignmentSubmissionReport,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch reports",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/reports/attendance
 * Get detailed attendance report
 */
export const handleGetAttendanceReport: RequestHandler = (req, res) => {
  try {
    const { startDate, endDate, studentId } = req.query;

    let records = dataStore.getAllAttendance();

    // Filter by date range
    if (startDate) {
      records = records.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      records = records.filter((r) => r.date <= endDate);
    }
    if (studentId) {
      const student = dataStore.getAllStudents().find((s) => s.id === studentId);
      if (student) {
        records = records.filter((r) => r.studentEmail === student.email);
      }
    }

    const presentDays = records.filter((r) => r.status === "present").length;
    const absentDays = records.filter((r) => r.status === "absent").length;

    res.json({
      startDate,
      endDate,
      studentId,
      records,
      totalDays: records.length,
      presentDays,
      absentDays,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch attendance report",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/admin/export-data
 * Export system data
 */
export const handleExportData: RequestHandler = (req, res) => {
  try {
    const { dataType } = req.body;

    // Get actual data for export
    let data: any[] = [];
    switch (dataType) {
      case "students":
        data = dataStore.getAllStudents();
        break;
      case "faculty":
        data = dataStore.getAllFaculty();
        break;
      case "attendance":
        data = dataStore.getAllAttendance();
        break;
      case "tasks":
        data = dataStore.getAllTasks();
        break;
      case "assignments":
        data = dataStore.getAllAssignments();
        break;
    }

    res.json({
      success: true,
      message: `${dataType} exported successfully`,
      data,
      count: data.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to export data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/sync-status
 * Get auto-sync status and statistics
 */
import { getSyncScheduler } from "../utils/syncScheduler";

export const handleGetSyncStatus: RequestHandler = (req, res) => {
  try {
    const scheduler = getSyncScheduler();

    if (!scheduler) {
      return res.json({
        enabled: false,
        message: "Auto-sync not initialized",
        dataStoreStats: dataStore.getStats(),
      });
    }

    const stats = scheduler.getSyncStats();
    const lastSync = scheduler.getLastSyncTime();
    const nextSync = scheduler.getNextSyncTime();
    const isRunning = scheduler.isAutoSyncRunning();

    res.json({
      enabled: isRunning,
      lastSync: lastSync ? lastSync.toISOString() : null,
      nextSync: nextSync ? nextSync.toISOString() : null,
      stats: {
        totalSyncs: stats.totalSyncs,
        successfulSyncs: stats.successfulSyncs,
        failedSyncs: stats.failedSyncs,
        lastSyncDuration: stats.lastSyncDuration,
        lastError: stats.lastError,
      },
      dataStoreStats: dataStore.getStats(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get sync status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/admin/sync-now
 * Trigger immediate sync
 */
export const handleSyncNow: RequestHandler = async (req, res) => {
  try {
    const scheduler = getSyncScheduler();

    if (!scheduler) {
      return res.status(400).json({
        error: "Auto-sync not initialized",
        message: "Please use the sync-google-form endpoint instead",
      });
    }

    const result = await scheduler.runSyncNow();

    res.json({
      success: result.success,
      message: result.success
        ? `Synced ${result.studentsCount} students, ${result.attendanceCount} attendance records`
        : "Sync failed",
      ...result,
      dataStoreStats: dataStore.getStats(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to trigger sync",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Route definitions
adminRoutes.get("/dashboard", handleGetAdminDashboard);
adminRoutes.get("/students", handleGetAllStudents);
adminRoutes.get("/faculty", handleGetAllFaculty);
adminRoutes.get("/holidays", handleGetHolidays);
adminRoutes.post("/holidays", handleCreateHoliday);
adminRoutes.delete("/holidays/:holidayId", handleDeleteHoliday);
adminRoutes.get("/faculty-mappings", handleGetFacultyMappings);
adminRoutes.post("/faculty-mappings", handleMapFacultyToStudents);
adminRoutes.delete("/faculty-mappings/:mappingId", handleRemoveMapping);
adminRoutes.post("/sync-google-form", handleSyncGoogleForm);
adminRoutes.get("/reports", handleGetReports);
adminRoutes.get("/reports/attendance", handleGetAttendanceReport);
adminRoutes.post("/export-data", handleExportData);
adminRoutes.get("/sync-status", handleGetSyncStatus);
adminRoutes.post("/sync-now", handleSyncNow);
