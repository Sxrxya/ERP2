/**
 * Attendance Business Logic Utilities
 * Handles calendar calculations, working days, holidays, and validation
 */

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)
}

/**
 * Get day of week name
 */
export function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

/**
 * Check if attendance can be marked on a given date
 */
export function isValidWorkingDay(dateStr: string, holidays: string[]): {
  isValid: boolean;
  reason?: string;
} {
  // Check if weekend
  if (isWeekend(dateStr)) {
    return { isValid: false, reason: "Cannot mark attendance on weekends" };
  }

  // Check if holiday
  if (holidays.includes(dateStr)) {
    return { isValid: false, reason: "Cannot mark attendance on holidays" };
  }

  return { isValid: true };
}

/**
 * Check if date is within internship period
 */
export function isWithinInternshipPeriod(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  const checkDate = new Date(date).getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return checkDate >= start && checkDate <= end;
}

/**
 * Get all working days in a date range
 */
export function getWorkingDaysInRange(
  startDate: string,
  endDate: string,
  holidays: string[]
): string[] {
  const workingDays: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];

    // Check if it's a working day (not weekend and not holiday)
    if (!isWeekend(dateStr) && !holidays.includes(dateStr)) {
      workingDays.push(dateStr);
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

/**
 * Get working days in current week for a date
 */
export function getWorkingDaysInWeek(
  dateStr: string,
  holidays: string[]
): string[] {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  // Get Monday of this week
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek + 1);

  // Get Friday of this week
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return getWorkingDaysInRange(
    monday.toISOString().split("T")[0],
    friday.toISOString().split("T")[0],
    holidays
  );
}

/**
 * Count attendance for a date range
 */
export function countAttendance(
  attendanceRecords: { date: string; status: "present" | "absent" }[],
  startDate: string,
  endDate: string
): { present: number; absent: number; total: number } {
  let present = 0;
  let absent = 0;

  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();

  for (const record of attendanceRecords) {
    const recordTime = new Date(record.date).getTime();

    if (recordTime >= startTime && recordTime <= endTime) {
      if (record.status === "present") {
        present++;
      } else {
        absent++;
      }
    }
  }

  return {
    present,
    absent,
    total: present + absent,
  };
}

/**
 * Calculate attendance percentage
 */
export function calculateAttendancePercentage(
  presentDays: number,
  totalWorkingDays: number
): number {
  if (totalWorkingDays === 0) {
    return 0;
  }
  return Math.round((presentDays / totalWorkingDays) * 100);
}

/**
 * Validate if attendance can be marked
 */
export function validateAttendanceMarkable(
  studentId: string,
  date: string,
  daysPerWeekAllowed: number,
  internshipStartDate: string,
  internshipEndDate: string,
  holidays: string[],
  existingAttendance: { date: string; status: "present" | "absent" }[]
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if within internship period
  if (!isWithinInternshipPeriod(date, internshipStartDate, internshipEndDate)) {
    errors.push("Date is outside internship period");
  }

  // Check if it's a working day
  const { isValid: isWorkingDay, reason } = isValidWorkingDay(date, holidays);
  if (!isWorkingDay) {
    errors.push(reason || "Not a working day");
  }

  // Check if attendance already marked for this date
  if (existingAttendance.some((a) => a.date === date)) {
    errors.push("Attendance already marked for this date");
  }

  // Check weekly limit
  const weekWorkingDays = getWorkingDaysInWeek(date, holidays);
  const weekAttendance = existingAttendance.filter((a) =>
    weekWorkingDays.includes(a.date)
  );

  if (weekAttendance.length >= daysPerWeekAllowed) {
    errors.push(
      `Weekly attendance limit exceeded (${daysPerWeekAllowed} days per week allowed)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get internship days remaining
 */
export function getInternshipDaysRemaining(
  startDate: string,
  endDate: string
): number {
  const today = new Date();
  const internshipEnd = new Date(endDate);

  if (today > internshipEnd) {
    return 0;
  }

  const daysRemaining = Math.ceil(
    (internshipEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysRemaining);
}

/**
 * Get internship days used
 */
export function getInternshipDaysUsed(
  startDate: string,
  today?: string
): number {
  const todayDate = today ? new Date(today) : new Date();
  const internshipStart = new Date(startDate);

  if (todayDate < internshipStart) {
    return 0;
  }

  const daysUsed = Math.ceil(
    (todayDate.getTime() - internshipStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysUsed);
}

/**
 * Get total working days for internship period
 */
export function getTotalWorkingDaysInInternship(
  startDate: string,
  endDate: string,
  holidays: string[]
): number {
  return getWorkingDaysInRange(startDate, endDate, holidays).length;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Check if date has passed
 */
export function hasDatePassed(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

/**
 * Get next working day from a date
 */
export function getNextWorkingDay(
  dateStr: string,
  holidays: string[]
): string {
  let current = new Date(dateStr);
  current.setDate(current.getDate() + 1);

  while (isWeekend(current.toISOString().split("T")[0]) ||
         holidays.includes(current.toISOString().split("T")[0])) {
    current.setDate(current.getDate() + 1);
  }

  return current.toISOString().split("T")[0];
}
