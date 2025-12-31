/**
 * Shared Models for Internship ERP
 * Used across client and server
 */

// ==================== ROLES ====================
export enum UserRole {
  ADMIN = "admin",
  FACULTY = "faculty",
  STUDENT = "student",
}

// ==================== STUDENT MODELS ====================
export interface Student {
  id: string;
  studentIdNumber: string;
  fullName: string;
  parentName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  degree: string;
  course: string;
  studyingYear: number; // 1-5
  semester: number; // 1-10
  internshipStartDate: string;
  internshipEndDate: string;
  projectTitle: string;
  projectType: string;
  daysPerWeekAllowed: number; // 2, 3, 4, or 5
  createdAt: string;
  updatedAt: string;
}

// ==================== FACULTY MODELS ====================
export interface Faculty {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  specialization: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyAssignment {
  id: string;
  facultyId: string;
  studentId: string;
  assignedAt: string;
}

// ==================== ATTENDANCE MODELS ====================
export enum AttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
}

export interface Attendance {
  id: string;
  studentId: string;
  facultyId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRules {
  date: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  isHoliday: boolean;
  isWorkingDay: boolean;
}

// ==================== HOLIDAY MODELS ====================
export interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
  type: "national" | "state" | "regional";
  createdAt: string;
  updatedAt: string;
}

// ==================== TASK MODELS ====================
export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdByFacultyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  studentId: string;
  assignedAt: string;
}

export interface TaskSubmission {
  id: string;
  taskAssignmentId: string;
  studentId: string;
  taskId: string;
  submissionDate: string;
  fileUrl: string;
  fileName: string;
  status: "pending" | "submitted" | "reviewed";
  remarks?: string;
  reviewedByFacultyId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== ASSIGNMENT MODELS ====================
export interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdByFacultyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submissionDate: string;
  fileUrl: string;
  fileName: string;
  status: "pending" | "submitted" | "reviewed";
  remarks?: string;
  reviewedByFacultyId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== USER AUTHENTICATION ====================
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  roleId: string; // Refers to student/faculty/admin record
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// ==================== DASHBOARD ANALYTICS ====================
export interface StudentAttendanceSummary {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: number;
  internshipDaysRemaining: number;
  daysUsed: number;
}

export interface TaskSummary {
  totalTasks: number;
  submittedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface AssignmentSummary {
  totalAssignments: number;
  submittedAssignments: number;
  pendingAssignments: number;
  overdueAssignments: number;
}

export interface FacultyAlert {
  id: string;
  type: "completion" | "absence" | "submission";
  studentId: string;
  studentName: string;
  message: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
  isRead: boolean;
}

export interface AdminReport {
  totalInterns: number;
  activeInternships: number;
  completedInternships: number;
  facultyWorkload: { facultyId: string; studentCount: number }[];
  overdueSubmissions: number;
}

// ==================== FILE UPLOAD ====================
export interface FileUpload {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  studentId: string;
  submissionType: "task" | "assignment";
  submissionId: string;
  storagePath: string;
  uploadedAt: string;
}
