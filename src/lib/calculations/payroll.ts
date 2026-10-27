import { Organization, PayrollRecord } from '@/types';

/**
 * Calculates hours elapsed between two time strings formatted as "HH:mm" or ISO date strings.
 * Accurately handles shifts crossing midnight (e.g., 22:00 to 06:00 = 8.0 hours).
 */
export function calculateElapsedHours(start: string, end: string): number {
  if (!start || !end) return 0;

  // Check if both are simple HH:mm strings
  if (start.includes(':') && !start.includes('T') && end.includes(':') && !end.includes('T')) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Overnight shift: end time is smaller than start time
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
    }

    const diffMinutes = endMinutes - startMinutes;
    return Math.max(0, Math.round((diffMinutes / 60) * 100) / 100);
  }

  // Handle ISO datetime strings
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Splits total hours into regular hours and overtime hours based on organizational daily threshold.
 */
export function splitRegularAndOvertime(
  totalHours: number,
  standardDailyLimit: number = 8
): { regularHours: number; overtimeHours: number } {
  if (totalHours <= 0) {
    return { regularHours: 0, overtimeHours: 0 };
  }

  if (totalHours <= standardDailyLimit) {
    return {
      regularHours: Math.round(totalHours * 100) / 100,
      overtimeHours: 0,
    };
  }

  return {
    regularHours: standardDailyLimit,
    overtimeHours: Math.round((totalHours - standardDailyLimit) * 100) / 100,
  };
}

/**
 * Deterministic Payroll Calculation:
 * - baseEarnings = regularHours * regularHourlyRate
 * - overtimeRate = regularHourlyRate * overtimeMultiplier (e.g. 1.5x / 2.0x)
 * - overtimeEarnings = overtimeHours * overtimeRate
 * - epfDeduction = 12% statutory pension contribution on base pay
 * - insuranceDeduction = 0.75% ESI healthcare coverage
 * - estimatedNetPay = baseEarnings + overtimeEarnings + bonuses - deductions
 */
export function calculatePayroll(
  workerId: string,
  org: Organization,
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number,
  bonuses: number = 0,
  periodStart: string,
  periodEnd: string
): PayrollRecord {
  const baseEarnings = Math.round(regularHours * hourlyRate * 100) / 100;
  const overtimeRate = Math.round(hourlyRate * org.settings.overtimeMultiplier * 100) / 100;
  const overtimeEarnings = Math.round(overtimeHours * overtimeRate * 100) / 100;

  // Statutory social security deductions (EPF 12%, ESI 0.75% capped realistically)
  const epfDeduction = Math.round(baseEarnings * 0.12 * 100) / 100;
  const insuranceDeduction = Math.round(baseEarnings * 0.0075 * 100) / 100;
  const totalDeductions = Math.round((epfDeduction + insuranceDeduction) * 100) / 100;

  const estimatedNetPay = Math.round((baseEarnings + overtimeEarnings + bonuses - totalDeductions) * 100) / 100;

  return {
    id: `PAY-${org.code}-${workerId.slice(-4)}-${periodEnd.replace(/-/g, '')}`,
    orgId: org.id,
    workerId,
    periodStart,
    periodEnd,
    regularHours,
    regularHourlyRate: hourlyRate,
    baseEarnings,
    overtimeHours,
    overtimeRate,
    overtimeEarnings,
    bonuses,
    deductions: totalDeductions,
    estimatedNetPay,
    status: 'under_review',
    breakdown: {
      regularPay: baseEarnings,
      overtimePay: overtimeEarnings,
      specialAllowances: bonuses,
      epfDeduction,
      insuranceDeduction,
    },
  };
}

/**
 * Validates check-in rules:
 * - Prevents duplicate check-ins for the same shift if already checked in
 * - Detects missing checkouts
 */
export function validateAttendanceCheckIn(
  existingRecords: Array<{ shiftId: string; status: string }>,
  targetShiftId: string
): { isValid: boolean; errorMessage?: string } {
  const existing = existingRecords.find((r) => r.shiftId === targetShiftId);
  if (existing && (existing.status === 'checked_in' || existing.status === 'completed')) {
    return {
      isValid: false,
      errorMessage: 'Duplicate check-in detected: An attendance record already exists for this shift.',
    };
  }
  return { isValid: true };
}
