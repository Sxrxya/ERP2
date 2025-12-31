import { Router, RequestHandler } from "express";
import { z } from "zod";
import { validateAttendanceMarkable, getInternshipDaysRemaining } from "../utils/attendance";
import { AttendanceStatus } from "../../shared/models";
import { dataStore } from "../utils/dataStore";
import {
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  ValidateAttendanceRequest,
  ValidateAttendanceResponse,
  CreateTaskRequest,
  AssignTaskRequest,
  GetFacultyStudentsResponse,
  FacultyDashboardResponse,
} from "../../shared/api";

export const facultyRoutes = Router();

// Validation schemas
const markAttendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["present", "absent"]),
  remarks: z.string().optional(),
});

const validateAttendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["present", "absent"]),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const assignTaskSchema = z.object({
  taskId: z.string().min(1),
  studentIds: z.array(z.string().min(1)),
});

/**
 * GET /api/faculty/dashboard
 * Get faculty dashboard with alerts
 */
export const handleGetFacultyDashboard: RequestHandler = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get all students assigned to this faculty
    const allStudents = dataStore.getAllStudents();
    const facultyStudents = allStudents.filter(s => s.facultyEmail === req.user!.email);

    // Students completing in next 3 days
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    const studentsCompletingSoon = facultyStudents.filter(s => {
      const endDate = new Date(s.internshipEndDate);
      return endDate >= today && endDate <= threeDaysLater;
    });

    // Students absent yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const studentsAbsentYesterday = facultyStudents.filter(s => {
      const attendance = dataStore.getAttendance(s.email);
      const yesterdayRecord = attendance.find(a => a.date === yesterdayStr);
      return yesterdayRecord?.status === 'absent';
    });

    // Get attendance summary
    const todayStr = today.toISOString().split('T')[0];
    let totalPresent = 0;
    let totalAbsent = 0;

    facultyStudents.forEach(s => {
      const attendance = dataStore.getAttendance(s.email);
      const todayRecord = attendance.find(a => a.date === todayStr);
      if (todayRecord?.status === 'present') totalPresent++;
      else if (todayRecord?.status === 'absent') totalAbsent++;
    });

    const response: FacultyDashboardResponse = {
      studentsCompletingInNext3Days: studentsCompletingSoon as any,
      studentsAbsentYesterday: studentsAbsentYesterday as any,
      studentsWithoutTaskSubmission: [], // TODO: Implement submission tracking
      studentsWithoutAssignmentSubmission: [], // TODO: Implement submission tracking
      attendanceSummary: {
        totalPresent,
        totalAbsent,
        date: todayStr,
      },
      pendingReviews: 0, // TODO: Count from submissions
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
 * GET /api/faculty/students
 * Get all assigned students for faculty
 */
export const handleGetStudents: RequestHandler = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get students assigned to this faculty
    const allStudents = dataStore.getAllStudents();
    const facultyStudents = allStudents.filter(s => s.facultyEmail === req.user!.email);

    // Calculate attendance percentage for each student
    const studentsWithStats = facultyStudents.map(student => {
      const attendance = dataStore.getAttendance(student.email);
      const presentCount = attendance.filter(a => a.status === 'present').length;
      const totalDays = attendance.length;
      const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

      return {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        attendancePercentage,
      };
    });

    const response: GetFacultyStudentsResponse = {
      students: studentsWithStats,
      totalAssigned: facultyStudents.length,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch students",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/faculty/attendance/validate
 * Validate before marking attendance
 */
export const handleValidateAttendance: RequestHandler = (req, res) => {
  try {
    const { studentId, date, status } = validateAttendanceSchema.parse(req.body);

    const student = dataStore.getAllStudents().find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const existingAttendance = dataStore.getAttendance(student.email);
    const holidays: string[] = []; // TODO: Load from dataStore.getHolidays()

    const validation = validateAttendanceMarkable(
      studentId,
      date,
      student.daysPerWeekAllowed,
      student.internshipStartDate,
      student.internshipEndDate,
      holidays,
      existingAttendance
    );

    const response: ValidateAttendanceResponse = {
      isValid: validation.isValid,
      reason: validation.errors.length > 0 ? validation.errors[0] : undefined,
      details: {
        isWeekend: new Date(date).getDay() === 0 || new Date(date).getDay() === 6,
        isHoliday: holidays.includes(date),
        exceedsWeeklyLimit: false,
        outsideInternshipDates:
          date < student.internshipStartDate || date > student.internshipEndDate,
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    res.status(500).json({
      error: "Validation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/faculty/attendance/mark
 * Mark attendance for student
 */
export const handleMarkAttendance: RequestHandler = (req, res) => {
  try {
    const { studentId, date, status, remarks } = markAttendanceSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const student = dataStore.getAllStudents().find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Validate attendance
    const existingAttendance = dataStore.getAttendance(student.email);
    const holidays: string[] = []; // TODO: Load from dataStore.getHolidays()

    const validation = validateAttendanceMarkable(
      studentId,
      date,
      student.daysPerWeekAllowed,
      student.internshipStartDate,
      student.internshipEndDate,
      holidays,
      existingAttendance
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: "Cannot mark attendance",
        message: validation.errors[0],
      });
    }

    // Save attendance to dataStore
    const attendanceRecord = {
      id: `att-${Date.now()}`,
      studentEmail: student.email,
      date,
      status: status as "present" | "absent",
      remarks,
      markedBy: req.user.email,
    };

    dataStore.addAttendance(attendanceRecord);

    const response: MarkAttendanceResponse = {
      success: true,
      message: "Attendance marked successfully",
      attendance: {
        id: attendanceRecord.id,
        studentId,
        facultyId: req.user.roleId,
        date,
        status: status as any,
        remarks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    res.status(500).json({
      error: "Failed to mark attendance",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/faculty/tasks
 * Create a new task
 */
export const handleCreateTask: RequestHandler = (req, res) => {
  try {
    const { title, description, deadline } = createTaskSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.status(201).json({
      id: `task-${Date.now()}`,
      message: "Task created successfully",
      task: {
        id: `task-${Date.now()}`,
        title,
        description,
        deadline,
        createdByFacultyId: req.user.roleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    res.status(500).json({
      error: "Failed to create task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/faculty/tasks/:taskId/assign
 * Assign task to students
 */
export const handleAssignTask: RequestHandler = (req, res) => {
  try {
    const { taskId } = req.params;
    const { studentIds } = assignTaskSchema.parse(req.body);

    res.json({
      success: true,
      message: `Task assigned to ${studentIds.length} student(s)`,
      assignments: studentIds.map((studentId) => ({
        id: `assign-${Date.now()}`,
        taskId,
        studentId,
        assignedAt: new Date().toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    res.status(500).json({
      error: "Failed to assign task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/faculty/tasks/:taskId/submissions/:submissionId/review
 * Review task submission
 */
export const handleReviewTaskSubmission: RequestHandler = (req, res) => {
  try {
    const { taskId, submissionId } = req.params;
    const { remarks, status } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      success: true,
      message: "Task submission reviewed",
      review: {
        submissionId,
        status: status || "reviewed",
        remarks,
        reviewedByFacultyId: req.user.roleId,
        reviewedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to review submission",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/faculty/assignments
 * Create assignment
 */
export const handleCreateAssignment: RequestHandler = (req, res) => {
  try {
    const { title, description, deadline } = createTaskSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.status(201).json({
      id: `assign-${Date.now()}`,
      message: "Assignment created successfully",
      assignment: {
        id: `assign-${Date.now()}`,
        title,
        description,
        deadline,
        createdByFacultyId: req.user.roleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    res.status(500).json({
      error: "Failed to create assignment",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Route definitions
facultyRoutes.get("/dashboard", handleGetFacultyDashboard);
facultyRoutes.get("/students", handleGetStudents);
facultyRoutes.post("/attendance/validate", handleValidateAttendance);
facultyRoutes.post("/attendance/mark", handleMarkAttendance);
facultyRoutes.post("/tasks", handleCreateTask);
facultyRoutes.post("/tasks/:taskId/assign", handleAssignTask);
facultyRoutes.post("/tasks/:taskId/submissions/:submissionId/review", handleReviewTaskSubmission);
facultyRoutes.post("/assignments", handleCreateAssignment);
