import { Router, RequestHandler } from "express";
import { z } from "zod";
import { ensureStudentOwnership } from "../utils/auth";
import { dataStore } from "../utils/dataStore";
import {
  getWorkingDaysInRange,
  countAttendance,
  calculateAttendancePercentage,
  getInternshipDaysRemaining,
  getTotalWorkingDaysInInternship,
} from "../utils/attendance";
import {
  GetStudentAttendanceResponse,
  GetStudentTasksResponse,
  GetStudentAssignmentsResponse,
} from "../../shared/api";
import { AttendanceStatus } from "../../shared/models";

export const studentRoutes = Router();

// All data now comes from dataStore (synced from Google Sheets)

/**
 * GET /api/student/dashboard
 * Get student dashboard data
 */
export const handleGetDashboard: RequestHandler = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const student = dataStore.getStudent(req.user!.email);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const holidays: string[] = []; // Load from database
    const totalWorkingDays = getTotalWorkingDaysInInternship(
      student.internshipStartDate,
      student.internshipEndDate,
      holidays
    );

    const attendance = countAttendance(
      dataStore.getAttendance(student.email),
      student.internshipStartDate,
      student.internshipEndDate
    );

    const attendancePercentage = calculateAttendancePercentage(
      attendance.present,
      totalWorkingDays
    );

    // Calculate from actual submissions
    const studentSubmissions = dataStore.getSubmissionsForStudent(student.email);
    const submittedTasks = studentSubmissions.filter((s) => s.taskId).length;
    const submittedAssignments = studentSubmissions.filter((s) => s.assignmentId).length;

    res.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
      },
      attendance: {
        totalWorkingDays,
        presentDays: attendance.present,
        absentDays: attendance.absent,
        attendancePercentage,
      },
      internship: {
        startDate: student.internshipStartDate,
        endDate: student.internshipEndDate,
        daysRemaining: getInternshipDaysRemaining(
          student.internshipStartDate,
          student.internshipEndDate
        ),
        projectTitle: student.projectTitle || "N/A",
      },
      tasks: {
        total: dataStore.getTasksForStudent(student.email).length,
        submitted: submittedTasks,
        pending: dataStore.getTasksForStudent(student.email).length - submittedTasks,
      },
      assignments: {
        total: dataStore.getAssignmentsForStudent(student.email).length,
        submitted: submittedAssignments,
        pending: dataStore.getAssignmentsForStudent(student.email).length - submittedAssignments,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch dashboard",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/student/:studentId/attendance
 * Get student attendance records (read-only)
 */
export const handleGetAttendance: RequestHandler = (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify ownership
    if (req.user?.role === "student" && req.user.roleId !== studentId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only view your own attendance",
      });
    }

    const student = dataStore.getAllStudents().find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const holidays: string[] = []; // Load from database
    const studentEmail = student.email;
    const attendance = dataStore.getAttendance(studentEmail);

    const totalWorkingDays = getTotalWorkingDaysInInternship(
      student.internshipStartDate,
      student.internshipEndDate,
      holidays
    );

    const attendanceCounts = countAttendance(
      attendance,
      student.internshipStartDate,
      student.internshipEndDate
    );

    const response: GetStudentAttendanceResponse = {
      totalWorkingDays,
      presentDays: attendanceCounts.present,
      absentDays: attendanceCounts.absent,
      attendancePercentage: calculateAttendancePercentage(
        attendanceCounts.present,
        totalWorkingDays
      ),
      internshipDaysRemaining: getInternshipDaysRemaining(
        student.internshipStartDate,
        student.internshipEndDate
      ),
      records: attendance.map((a) => ({
        ...a,
        studentId: studentId,
        facultyId: student.facultyEmail || "unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: (a.status === "present" ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT) as AttendanceStatus,
      })),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch attendance",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/student/:studentId/tasks
 * Get assigned tasks for student
 */
export const handleGetTasks: RequestHandler = (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify ownership
    if (req.user?.role === "student" && req.user.roleId !== studentId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only view your own tasks",
      });
    }

    const student = dataStore.getAllStudents().find((s) => s.id === studentId);
    const studentEmail = student?.email || "";
    const tasks = dataStore.getTasksForStudent(studentEmail);
    const submissions = dataStore.getSubmissionsForStudent(studentEmail);

    const assignedTasks = tasks.map((t) => {
      const taskSubmission = submissions.find((s) => s.taskId === t.id);
      return {
        ...t,
        createdByFacultyId: t.createdBy,
        updatedAt: new Date().toISOString(),
        submitted: !!taskSubmission,
        submissionStatus: taskSubmission?.status || "pending",
        deadline: t.deadline,
      };
    });

    const completedTasks = assignedTasks.filter((t) => t.submitted).length;
    const pendingTasks = assignedTasks.filter((t) => !t.submitted).length;

    const response: GetStudentTasksResponse = {
      assignedTasks,
      completedTasks,
      pendingTasks,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch tasks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/student/:studentId/assignments
 * Get assigned assignments for student
 */
export const handleGetAssignments: RequestHandler = (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify ownership
    if (req.user?.role === "student" && req.user.roleId !== studentId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only view your own assignments",
      });
    }

    const student = dataStore.getAllStudents().find((s) => s.id === studentId);
    const studentEmail = student?.email || "";
    const assignments = dataStore.getAssignmentsForStudent(studentEmail);
    const submissions = dataStore.getSubmissionsForStudent(studentEmail);

    const assignedAssignments = assignments.map((a) => {
      const assignmentSubmission = submissions.find((s) => s.assignmentId === a.id);
      return {
        ...a,
        createdByFacultyId: a.createdBy,
        updatedAt: new Date().toISOString(),
        submitted: !!assignmentSubmission,
        submissionStatus: assignmentSubmission?.status || "pending",
        deadline: a.deadline,
      };
    });

    const completedAssignments = assignedAssignments.filter((a) => a.submitted).length;
    const pendingAssignments = assignedAssignments.filter((a) => !a.submitted).length;

    const response: GetStudentAssignmentsResponse = {
      assignedAssignments,
      completedAssignments,
      pendingAssignments,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch assignments",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/student/:studentId/tasks/:taskId/submit
 * Submit task
 */
export const handleSubmitTask: RequestHandler = (req, res) => {
  try {
    const { studentId, taskId } = req.params;
    const { fileUrl, fileName } = req.body;

    // Verify ownership
    if (req.user?.role === "student" && req.user.roleId !== studentId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only submit your own tasks",
      });
    }

    res.json({
      success: true,
      message: "Task submitted successfully",
      submission: {
        id: `sub-${Date.now()}`,
        taskId,
        studentId,
        fileUrl,
        fileName,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to submit task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/student/:studentId/assignments/:assignmentId/submit
 * Submit assignment
 */
export const handleSubmitAssignment: RequestHandler = (req, res) => {
  try {
    const { studentId, assignmentId } = req.params;
    const { fileUrl, fileName } = req.body;

    // Verify ownership
    if (req.user?.role === "student" && req.user.roleId !== studentId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only submit your own assignments",
      });
    }

    res.json({
      success: true,
      message: "Assignment submitted successfully",
      submission: {
        id: `sub-${Date.now()}`,
        assignmentId,
        studentId,
        fileUrl,
        fileName,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to submit assignment",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Route definitions
studentRoutes.get("/dashboard", handleGetDashboard);
studentRoutes.get("/:studentId/attendance", handleGetAttendance);
studentRoutes.get("/:studentId/tasks", handleGetTasks);
studentRoutes.get("/:studentId/assignments", handleGetAssignments);
studentRoutes.post("/:studentId/tasks/:taskId/submit", handleSubmitTask);
studentRoutes.post(
  "/:studentId/assignments/:assignmentId/submit",
  handleSubmitAssignment
);
