/**
 * Google Sheets API Integration
 * 
 * Fetch student data from Google Forms responses stored in Google Sheets
 */

import { google } from "googleapis";

const GOOGLE_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

interface GoogleSheetsStudent {
    timestamp: string;
    studentIdNumber: string;
    fullName: string;
    parentName: string;
    dateOfBirth: string;
    phoneNumber: string;
    email: string;
    degree: string;
    course: string;
    studyingYear: number;
    semester: number;
    internshipStartDate: string;
    internshipEndDate: string;
    projectTitle: string;
    projectType: string;
    daysPerWeekAllowed: number;
}

/**
 * Initialize Google Sheets API client
 */
function getGoogleSheetsClient() {
    if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
        // Service Account authentication (recommended for server)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: GOOGLE_CLIENT_EMAIL,
                private_key: GOOGLE_PRIVATE_KEY,
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        return google.sheets({ version: "v4", auth });
    } else if (GOOGLE_API_KEY) {
        // API Key authentication (simpler but less secure)
        return google.sheets({ version: "v4", auth: GOOGLE_API_KEY });
    } else {
        throw new Error("Google Sheets credentials not configured");
    }
}

/**
 * Fetch data from Google Sheets - uses header-based mapping for flexibility
 */
export async function fetchGoogleSheetData(
    spreadsheetId: string,
    sheetName: string = "Form Responses 1"
): Promise<GoogleSheetsStudent[]> {
    try {
        const sheets = getGoogleSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:Z`, // Get all columns
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return [];
        }

        // First row is headers - normalize them
        const headers = rows[0].map((h: string) => h?.toLowerCase().trim() || "");
        const dataRows = rows.slice(1);

        console.log("Found headers:", headers);

        // Helper function to find column index by possible names
        const findColumn = (possibleNames: string[]): number => {
            for (const name of possibleNames) {
                const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
                if (idx !== -1) return idx;
            }
            return -1;
        };

        // Map column indices dynamically
        const colMap = {
            timestamp: findColumn(["timestamp", "time"]),
            studentId: findColumn(["student id", "id number", "roll", "enrollment"]),
            fullName: findColumn(["name", "full name", "student name"]),
            parentName: findColumn(["parent", "father", "guardian"]),
            email: findColumn(["email", "e-mail", "mail"]),
            phone: findColumn(["phone", "mobile", "contact"]),
            dob: findColumn(["date of birth", "dob", "birth"]),
            degree: findColumn(["degree", "qualification"]),
            course: findColumn(["course", "branch", "stream"]),
            year: findColumn(["year", "studying year"]),
            semester: findColumn(["semester", "sem"]),
            startDate: findColumn(["start date", "internship start", "from"]),
            endDate: findColumn(["end date", "internship end", "to"]),
            projectTitle: findColumn(["project", "title", "project title"]),
            projectType: findColumn(["type", "project type"]),
            daysPerWeek: findColumn(["days", "per week"]),
        };

        // Map rows to student objects using dynamic column mapping
        const students: GoogleSheetsStudent[] = dataRows.map((row: string[]) => {
            const getValue = (colIndex: number): string => (colIndex >= 0 ? row[colIndex] || "" : "");
            const getNumValue = (colIndex: number, defaultVal: number): number => {
                const val = parseInt(getValue(colIndex));
                return isNaN(val) ? defaultVal : val;
            };

            return {
                timestamp: getValue(colMap.timestamp),
                studentIdNumber: getValue(colMap.studentId),
                fullName: getValue(colMap.fullName),
                parentName: getValue(colMap.parentName),
                email: getValue(colMap.email),
                phoneNumber: getValue(colMap.phone),
                dateOfBirth: getValue(colMap.dob),
                degree: getValue(colMap.degree),
                course: getValue(colMap.course),
                studyingYear: getNumValue(colMap.year, 1),
                semester: getNumValue(colMap.semester, 1),
                internshipStartDate: getValue(colMap.startDate),
                internshipEndDate: getValue(colMap.endDate),
                projectTitle: getValue(colMap.projectTitle),
                projectType: getValue(colMap.projectType),
                daysPerWeekAllowed: getNumValue(colMap.daysPerWeek, 5),
            };
        });

        console.log(`Found ${students.length} students in sheet ${sheetName}`);
        return students;
    } catch (error) {
        console.error("Error fetching Google Sheets data:", error);
        throw new Error(`Failed to fetch data from Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Validate student data from Google Sheets
 */
export function validateStudentData(student: GoogleSheetsStudent): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Required fields
    if (!student.studentIdNumber) errors.push("Student ID is required");
    if (!student.fullName) errors.push("Full name is required");
    if (!student.email) errors.push("Email is required");
    if (!student.parentName) errors.push("Parent name is required");
    if (!student.dateOfBirth) errors.push("Date of birth is required");
    if (!student.phoneNumber) errors.push("Phone number is required");
    if (!student.degree) errors.push("Degree is required");
    if (!student.course) errors.push("Course is required");
    if (!student.internshipStartDate) errors.push("Internship start date is required");
    if (!student.internshipEndDate) errors.push("Internship end date is required");
    if (!student.projectTitle) errors.push("Project title is required");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (student.email && !emailRegex.test(student.email)) {
        errors.push("Invalid email format");
    }

    // Validate phone number (assuming 10 digits)
    if (student.phoneNumber && !/^\d{10}$/.test(student.phoneNumber)) {
        errors.push("Phone number must be 10 digits");
    }

    // Validate studying year (1-5)
    if (student.studyingYear < 1 || student.studyingYear > 5) {
        errors.push("Studying year must be between 1 and 5");
    }

    // Validate semester (1-10)
    if (student.semester < 1 || student.semester > 10) {
        errors.push("Semester must be between 1 and 10");
    }

    // Validate days per week (2-5)
    if (student.daysPerWeekAllowed < 2 || student.daysPerWeekAllowed > 5) {
        errors.push("Days per week must be between 2 and 5");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Get spreadsheet ID from URL
 */
export function extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

/**
 * Test Google Sheets connection
 */
export async function testGoogleSheetsConnection(
    spreadsheetId: string
): Promise<boolean> {
    try {
        const sheets = getGoogleSheetsClient();
        await sheets.spreadsheets.get({ spreadsheetId });
        return true;
    } catch (error) {
        console.error("Google Sheets connection test failed:", error);
        return false;
    }
}

/**
 * Fetch faculty data from Google Sheets
 * Expected columns: Timestamp, Faculty Name, Faculty ID, Email, Phone, Department, Designation
 */
interface GoogleSheetsFaculty {
    timestamp: string;
    fullName: string;
    facultyId: string;
    email: string;
    phoneNumber: string;
    department: string;
    designation: string;
}

export async function fetchFacultyData(
    spreadsheetId: string,
    sheetName: string = "Form responses 2"
): Promise<GoogleSheetsFaculty[]> {
    try {
        const sheets = getGoogleSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:G`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
            console.log(`No faculty data found in sheet: ${sheetName}`);
            return [];
        }

        const dataRows = rows.slice(1); // Skip header

        const faculty: GoogleSheetsFaculty[] = dataRows.map((row) => ({
            timestamp: row[0] || "",
            fullName: row[1] || "",
            facultyId: row[2] || "",
            email: row[3] || "",
            phoneNumber: row[4] || "",
            department: row[5] || "",
            designation: row[6] || "",
        }));

        console.log(`Fetched ${faculty.length} faculty records from ${sheetName}`);
        return faculty;
    } catch (error) {
        console.error("Error fetching faculty data:", error);
        return []; // Return empty array instead of throwing
    }
}

/**
 * Validate faculty data
 */
export function validateFacultyData(faculty: GoogleSheetsFaculty): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (!faculty.fullName) errors.push("Full name is required");
    if (!faculty.email) errors.push("Email is required");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (faculty.email && !emailRegex.test(faculty.email)) {
        errors.push("Invalid email format");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Fetch attendance data from Google Sheets
 * Expected columns: Date, Student Email, Status, Remarks
 */
export async function fetchAttendanceData(
    spreadsheetId: string,
    sheetName: string = "Attendance"
): Promise<any[]> {
    try {
        const sheets = getGoogleSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:D`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
            return [];
        }

        const dataRows = rows.slice(1); // Skip header

        return dataRows.map((row, index) => ({
            id: `att-${index + 1}`,
            date: row[0] || "",
            studentEmail: row[1] || "",
            status: (row[2] || "").toLowerCase() === "present" ? "present" : "absent",
            remarks: row[3] || "",
        }));
    } catch (error) {
        console.error("Error fetching attendance data:", error);
        return [];
    }
}

/**
 * Fetch tasks data from Google Sheets
 * Expected columns: Task ID, Title, Description, Due Date, Assigned To (emails), Created By, Priority
 */
export async function fetchTasksData(
    spreadsheetId: string,
    sheetName: string = "Tasks"
): Promise<any[]> {
    try {
        const sheets = getGoogleSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:G`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
            return [];
        }

        const dataRows = rows.slice(1); // Skip header

        return dataRows.map((row) => ({
            id: row[0] || `task-${Date.now()}-${Math.random()}`,
            title: row[1] || "",
            description: row[2] || "",
            deadline: row[3] || "",
            assignedTo: (row[4] || "").split(",").map((e: string) => e.trim()).filter((e: string) => e),
            createdBy: row[5] || "",
            priority: (row[6] || "medium").toLowerCase(),
            status: "pending",
            createdAt: new Date().toISOString(),
        }));
    } catch (error) {
        console.error("Error fetching tasks data:", error);
        return [];
    }
}

/**
 * Fetch assignments data from Google Sheets
 * Expected columns: Assignment ID, Title, Description, Due Date, Assigned To (emails), Created By, Max Grade
 */
export async function fetchAssignmentsData(
    spreadsheetId: string,
    sheetName: string = "Assignments"
): Promise<any[]> {
    try {
        const sheets = getGoogleSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:G`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
            return [];
        }

        const dataRows = rows.slice(1); // Skip header

        return dataRows.map((row) => ({
            id: row[0] || `assign-${Date.now()}-${Math.random()}`,
            title: row[1] || "",
            description: row[2] || "",
            deadline: row[3] || "",
            assignedTo: (row[4] || "").split(",").map((e: string) => e.trim()).filter((e: string) => e),
            createdBy: row[5] || "",
            maxGrade: parseInt(row[6]) || 100,
            status: "pending",
            createdAt: new Date().toISOString(),
        }));
    } catch (error) {
        console.error("Error fetching assignments data:", error);
        return [];
    }
}

/**
 * Fetch all data from Google Sheets (multiple tabs)
 */
export async function fetchAllSheetsData(spreadsheetId: string, studentSheetName?: string, facultySheetName?: string) {
    try {
        const [students, faculty, attendance, tasks, assignments] = await Promise.all([
            fetchGoogleSheetData(spreadsheetId, studentSheetName || "Form responses 1"),
            fetchFacultyData(spreadsheetId, facultySheetName || "Form responses 2"),
            fetchAttendanceData(spreadsheetId, "Attendance"),
            fetchTasksData(spreadsheetId, "Tasks"),
            fetchAssignmentsData(spreadsheetId, "Assignments"),
        ]);

        console.log(`📊 Fetched: ${students.length} students, ${faculty.length} faculty`);

        return {
            students,
            faculty,
            attendance,
            tasks,
            assignments,
        };
    } catch (error) {
        console.error("Error fetching all sheets data:", error);
        throw error;
    }
}
