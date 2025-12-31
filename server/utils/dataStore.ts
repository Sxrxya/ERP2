/**
 * In-Memory Data Store
 * 
 * Stores data synced from Google Sheets to replace mock data
 * Data persists only during server runtime (lost on restart)
 */

interface Student {
    id: string;
    studentIdNumber: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    degree: string;
    course: string;
    studyingYear: number;
    semester: number;
    internshipStartDate: string;
    internshipEndDate: string;
    projectTitle: string;
    projectType: string;
    daysPerWeekAllowed: number;
    customWorkingDays?: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
    facultyEmail?: string;
    parentName?: string;
}

interface Faculty {
    id: string;
    fullName: string;
    email: string;
    department: string;
    designation: string;
    phoneNumber?: string;
}

interface AttendanceRecord {
    id: string;
    studentEmail: string;
    date: string;
    status: "present" | "absent";
    remarks?: string;
    markedBy?: string;
}

interface Task {
    id: string;
    title: string;
    description: string;
    deadline: string;
    assignedTo: string[]; // Student emails
    createdBy: string; // Faculty email
    priority: "low" | "medium" | "high";
    status: "pending" | "submitted" | "completed";
    createdAt: string;
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    deadline: string;
    assignedTo: string[]; // Student emails
    createdBy: string; // Faculty email
    maxGrade: number;
    status: "pending" | "submitted" | "graded";
    createdAt: string;
}

interface Submission {
    id: string;
    taskId?: string;
    assignmentId?: string;
    studentEmail: string;
    submittedAt: string;
    fileUrl?: string;
    fileName?: string;
    grade?: number;
    feedback?: string;
    status: "submitted" | "graded";
}

// Registered user - someone who has signed up after filling Google Form
interface RegisteredUser {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    role: "student" | "faculty" | "admin";
    roleId: string;
    createdAt: string;
}

// Holiday
interface Holiday {
    id: string;
    date: string;
    name: string;
    description?: string;
    type?: string;
    createdAt: string;
}

// In-memory storage
class DataStore {
    private students: Map<string, Student> = new Map();
    private faculty: Map<string, Faculty> = new Map();
    private registeredUsers: Map<string, RegisteredUser> = new Map();
    private holidays: Map<string, Holiday> = new Map();
    private attendance: Map<string, AttendanceRecord[]> = new Map();
    private tasks: Map<string, Task> = new Map();
    private assignments: Map<string, Assignment> = new Map();
    private submissions: Map<string, Submission> = new Map();


    // Student operations
    setStudent(student: Student): void {
        this.students.set(student.email, student);
    }

    getStudent(email: string): Student | undefined {
        return this.students.get(email);
    }

    getAllStudents(): Student[] {
        return Array.from(this.students.values());
    }

    getStudentsByFaculty(facultyEmail: string): Student[] {
        return this.getAllStudents().filter(s => s.facultyEmail === facultyEmail);
    }

    clearStudents(): void {
        this.students.clear();
    }

    // Faculty operations
    setFaculty(facultyMember: Faculty): void {
        this.faculty.set(facultyMember.email, facultyMember);
    }

    getFaculty(email: string): Faculty | undefined {
        return this.faculty.get(email);
    }

    getAllFaculty(): Faculty[] {
        return Array.from(this.faculty.values());
    }

    clearFaculty(): void {
        this.faculty.clear();
    }

    // Registered User operations (for authentication)
    setRegisteredUser(user: RegisteredUser): void {
        this.registeredUsers.set(user.email, user);
    }

    getRegisteredUser(email: string): RegisteredUser | undefined {
        return this.registeredUsers.get(email);
    }

    getAllRegisteredUsers(): RegisteredUser[] {
        return Array.from(this.registeredUsers.values());
    }

    hasRegisteredUser(email: string): boolean {
        return this.registeredUsers.has(email);
    }

    clearRegisteredUsers(): void {
        this.registeredUsers.clear();
    }

    // Holiday operations
    addHoliday(holiday: Holiday): void {
        this.holidays.set(holiday.id, holiday);
    }

    getHoliday(id: string): Holiday | undefined {
        return this.holidays.get(id);
    }

    getHolidays(): Holiday[] {
        return Array.from(this.holidays.values());
    }

    getHolidayDates(): string[] {
        return Array.from(this.holidays.values()).map((h) => h.date);
    }

    removeHoliday(id: string): void {
        this.holidays.delete(id);
    }

    clearHolidays(): void {
        this.holidays.clear();
    }

    // Attendance operations
    addAttendance(record: AttendanceRecord): void {
        const existing = this.attendance.get(record.studentEmail) || [];
        existing.push(record);
        this.attendance.set(record.studentEmail, existing);
    }

    getAttendance(studentEmail: string): AttendanceRecord[] {
        return this.attendance.get(studentEmail) || [];
    }

    getAllAttendance(): AttendanceRecord[] {
        const all: AttendanceRecord[] = [];
        this.attendance.forEach(records => all.push(...records));
        return all;
    }

    clearAttendance(): void {
        this.attendance.clear();
    }

    // Task operations
    setTask(task: Task): void {
        this.tasks.set(task.id, task);
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getTasksForStudent(studentEmail: string): Task[] {
        return Array.from(this.tasks.values()).filter(t =>
            t.assignedTo.includes(studentEmail)
        );
    }

    getTasksByFaculty(facultyEmail: string): Task[] {
        return Array.from(this.tasks.values()).filter(t =>
            t.createdBy === facultyEmail
        );
    }

    getAllTasks(): Task[] {
        return Array.from(this.tasks.values());
    }

    clearTasks(): void {
        this.tasks.clear();
    }

    // Assignment operations
    setAssignment(assignment: Assignment): void {
        this.assignments.set(assignment.id, assignment);
    }

    getAssignment(id: string): Assignment | undefined {
        return this.assignments.get(id);
    }

    getAssignmentsForStudent(studentEmail: string): Assignment[] {
        return Array.from(this.assignments.values()).filter(a =>
            a.assignedTo.includes(studentEmail)
        );
    }

    getAssignmentsByFaculty(facultyEmail: string): Assignment[] {
        return Array.from(this.assignments.values()).filter(a =>
            a.createdBy === facultyEmail
        );
    }

    getAllAssignments(): Assignment[] {
        return Array.from(this.assignments.values());
    }

    clearAssignments(): void {
        this.assignments.clear();
    }

    // Submission operations
    setSubmission(submission: Submission): void {
        this.submissions.set(submission.id, submission);
    }

    getSubmission(id: string): Submission | undefined {
        return this.submissions.get(id);
    }

    getSubmissionsForStudent(studentEmail: string): Submission[] {
        return Array.from(this.submissions.values()).filter(s =>
            s.studentEmail === studentEmail
        );
    }

    getSubmissionsForTask(taskId: string): Submission[] {
        return Array.from(this.submissions.values()).filter(s =>
            s.taskId === taskId
        );
    }

    getSubmissionsForAssignment(assignmentId: string): Submission[] {
        return Array.from(this.submissions.values()).filter(s =>
            s.assignmentId === assignmentId
        );
    }

    getAllSubmissions(): Submission[] {
        return Array.from(this.submissions.values());
    }

    clearSubmissions(): void {
        this.submissions.clear();
    }

    // Bulk operations
    clearAll(): void {
        this.clearStudents();
        this.clearAttendance();
        this.clearTasks();
        this.clearAssignments();
        this.clearSubmissions();
    }

    getStats() {
        return {
            students: this.students.size,
            attendanceRecords: this.getAllAttendance().length,
            tasks: this.tasks.size,
            assignments: this.assignments.size,
            submissions: this.submissions.size,
        };
    }
}

// Singleton instance
export const dataStore = new DataStore();

// Export types
export type {
    Student,
    Faculty,
    RegisteredUser,
    Holiday,
    AttendanceRecord,
    Task,
    Assignment,
    Submission,
};
