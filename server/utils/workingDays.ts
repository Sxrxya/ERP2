/**
 * Custom Working Days Utility
 * Handles validation of attendance based on student-specific working schedules
 */

export interface WorkingDaysConfig {
    daysPerWeek: number; // e.g., 5 for Mon-Fri, 2 for part-time
    customDays?: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
    internshipStartDate: string;
    internshipEndDate: string;
}

/**
 * Check if a given date is a valid working day for the student
 */
export function isValidWorkingDay(
    date: string | Date,
    config: WorkingDaysConfig,
    holidays: string[] = []
): { isValid: boolean; reason?: string } {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const dateStr = checkDate.toISOString().split('T')[0];

    // Check if date is within internship period
    if (dateStr < config.internshipStartDate) {
        return { isValid: false, reason: 'Date is before internship start date' };
    }

    if (dateStr > config.internshipEndDate) {
        return { isValid: false, reason: 'Date is after internship end date' };
    }

    // Check if date is a holiday
    if (holidays.includes(dateStr)) {
        return { isValid: false, reason: 'Date is a holiday' };
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = checkDate.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    // If custom working days are specified, check against them
    if (config.customDays && config.customDays.length > 0) {
        if (!config.customDays.includes(dayName)) {
            return {
                isValid: false,
                reason: `${dayName} is not a working day. Working days: ${config.customDays.join(', ')}`
            };
        }
    } else {
        // Default: Monday to Friday (exclude weekends)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return { isValid: false, reason: 'Weekends are not working days' };
        }
    }

    return { isValid: true };
}

/**
 * Get all working days in a date range for a student
 */
export function getWorkingDaysInRange(
    startDate: string,
    endDate: string,
    config: WorkingDaysConfig,
    holidays: string[] = []
): string[] {
    const workingDays: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const { isValid } = isValidWorkingDay(dateStr, config, holidays);

        if (isValid) {
            workingDays.push(dateStr);
        }
    }

    return workingDays;
}

/**
 * Calculate total expected working days for a student's internship
 */
export function getTotalExpectedWorkingDays(
    config: WorkingDaysConfig,
    holidays: string[] = []
): number {
    return getWorkingDaysInRange(
        config.internshipStartDate,
        config.internshipEndDate,
        config,
        holidays
    ).length;
}

/**
 * Get student's working days schedule as a readable string
 */
export function getWorkingDaysDescription(config: WorkingDaysConfig): string {
    if (config.customDays && config.customDays.length > 0) {
        if (config.customDays.length === 5) {
            return 'Monday to Friday';
        }
        return config.customDays.join(', ');
    }

    // Default based on days per week
    if (config.daysPerWeek === 5) {
        return 'Monday to Friday';
    } else if (config.daysPerWeek === 6) {
        return 'Monday to Saturday';
    } else {
        return `${config.daysPerWeek} days per week`;
    }
}

/**
 * Parse custom working days from Google Sheets format
 * Supports formats like: "Mon,Wed,Fri" or "Monday, Wednesday, Friday"
 */
export function parseCustomWorkingDays(customDaysString?: string): string[] | undefined {
    if (!customDaysString || customDaysString.trim() === '') {
        return undefined;
    }

    const dayAbbreviations: { [key: string]: string } = {
        'mon': 'Monday',
        'tue': 'Tuesday',
        'wed': 'Wednesday',
        'thu': 'Thursday',
        'fri': 'Friday',
        'sat': 'Saturday',
        'sun': 'Sunday',
    };

    const days = customDaysString
        .split(',')
        .map(day => day.trim().toLowerCase())
        .map(day => {
            // Check if it's an abbreviation
            if (dayAbbreviations[day]) {
                return dayAbbreviations[day];
            }
            // Capitalize first letter
            return day.charAt(0).toUpperCase() + day.slice(1);
        })
        .filter(day => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day));

    return days.length > 0 ? days : undefined;
}

/**
 * Validate attendance week limit
 * Ensures student doesn't exceed their allowed days per week
 */
export function validateWeeklyAttendanceLimit(
    studentEmail: string,
    date: string,
    config: WorkingDaysConfig,
    existingAttendance: Array<{ studentEmail: string; date: string; status: string }>
): { isValid: boolean; count: number; limit: number } {
    const checkDate = new Date(date);

    // Get start of week (Monday)
    const startOfWeek = new Date(checkDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Count present days in this week
    const presentDaysThisWeek = existingAttendance.filter(att => {
        if (att.studentEmail !== studentEmail || att.status !== 'present') {
            return false;
        }
        const attDate = new Date(att.date);
        return attDate >= startOfWeek && attDate <= endOfWeek;
    }).length;

    return {
        isValid: presentDaysThisWeek < config.daysPerWeek,
        count: presentDaysThisWeek,
        limit: config.daysPerWeek,
    };
}
