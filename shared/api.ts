/**
 * Shared API types and interfaces
 */

import { UserRole, Student, Faculty, Attendance, Task, Assignment, AttendanceStatus } from "./models";

// ==================== AUTH ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    roleId: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "faculty"; // Only student/faculty can self-register
}

// ==================== STUDENT APIs ====================
export interface GetStudentAttendanceResponse {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: number;
  internshipDaysRemaining: number;
  records: Attendance[];
}

export interface GetStudentTasksResponse {
  assignedTasks: (Task & {
    submitted: boolean;
    submissionStatus?: string;
    deadline: string;
  })[];
  completedTasks: number;
  pendingTasks: number;
}

export interface GetStudentAssignmentsResponse {
  assignedAssignments: (Assignment & {
    submitted: boolean;
    submissionStatus?: string;
    deadline: string;
  })[];
  completedAssignments: number;
  pendingAssignments: number;
}

export interface UploadTaskRequest {
  taskAssignmentId: string;
  file: File;
}

export interface UploadAssignmentRequest {
  assignmentId: string;
  file: File;
}

// ==================== FACULTY APIs ====================
export interface MarkAttendanceRequest {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface MarkAttendanceResponse {
  success: boolean;
  attendance: Attendance;
  message: string;
}

export interface ValidateAttendanceRequest {
  studentId: string;
  date: string;
  status: AttendanceStatus;
}

export interface ValidateAttendanceResponse {
  isValid: boolean;
  reason?: string;
  details: {
    isWeekend: boolean;
    isHoliday: boolean;
    exceedsWeeklyLimit: boolean;
    outsideInternshipDates: boolean;
  };
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  deadline: string;
}

export interface CreateTaskResponse {
  id: string;
  message: string;
}

export interface AssignTaskRequest {
  taskId: string;
  studentIds: string[];
}

export interface GetFacultyStudentsResponse {
  students: (Student & { attendancePercentage: number })[];
  totalAssigned: number;
}

export interface FacultyDashboardResponse {
  studentsCompletingInNext3Days: Student[];
  studentsAbsentYesterday: Student[];
  studentsWithoutTaskSubmission: Student[];
  studentsWithoutAssignmentSubmission: Student[];
  attendanceSummary: {
    totalPresent: number;
    totalAbsent: number;
    date: string;
  };
  pendingReviews: number;
}

// ==================== ADMIN APIs ====================
export interface SyncGoogleFormRequest {
  spreadsheetId: string;
  sheetName: string;
  apiKey: string;
}

export interface SyncGoogleFormResponse {
  success: boolean;
  synced: number;
  errors: string[];
}

export interface CreateHolidayRequest {
  date: string;
  name: string;
  description?: string;
  type: "national" | "state" | "regional";
}

export interface MapFacultyToStudentRequest {
  facultyId: string;
  studentIds: string[];
}

export interface AdminDashboardResponse {
  totalInterns: number;
  activeInternships: number;
  completedInternships: number;
  facultyWorkload: {
    facultyId: string;
    facultyName: string;
    assignedStudents: number;
  }[];
  systemOverview: {
    totalFaculty: number;
    totalTasks: number;
    totalAssignments: number;
  };
}

export interface GetReportsResponse {
  attendanceReport: {
    studentId: string;
    studentName: string;
    attendancePercentage: number;
  }[];
  taskSubmissionReport: {
    taskId: string;
    taskTitle: string;
    submissionRate: number;
  }[];
  assignmentSubmissionReport: {
    assignmentId: string;
    assignmentTitle: string;
    submissionRate: number;
  }[];
}

// ==================== ERROR RESPONSE ====================
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

// ==================== FILE UPLOAD ====================
export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface GetSignedUrlRequest {
  fileId: string;
}

export interface GetSignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
}

export interface DemoResponse {
  message: string;
}
