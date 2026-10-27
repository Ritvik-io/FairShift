import { AttendanceRecord, Organization, PayrollRecord, Shift } from '@/types';

export interface AuditFinding {
  id: string;
  category: 'unrecorded_overtime' | 'missing_checkout' | 'rate_discrepancy' | 'excessive_shift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  affectedWorkerId: string;
  affectedRecordRef: string;
  exactRule: string;
  evidence: string;
  recommendedAction: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

/**
 * Derives explainable audit findings from attendance records, shifts, and payroll records.
 * Never fabricates findings — strictly derives from stored data.
 */
export function auditWorkforceFairness(
  attendanceRecords: AttendanceRecord[],
  shifts: Shift[],
  payrollRecords: PayrollRecord[],
  org: Organization
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const att of attendanceRecords) {
    // 1. Check for missing checkout on past shifts
    if (att.status === 'missing_checkout' || (!att.checkOutTime && att.status !== 'checked_in')) {
      findings.push({
        id: `AUD-MCO-${att.id}`,
        category: 'missing_checkout',
        severity: 'high',
        title: `Unclosed Attendance Session (${att.date})`,
        affectedWorkerId: att.workerId,
        affectedRecordRef: `Attendance #${att.id}`,
        exactRule: `Rule AUD-01: Every checked-in shift must have a verified check-out timestamp to prevent arbitrary hour deductions or uncompensated overtime.`,
        evidence: `Worker clocked in at ${att.checkInTime} on ${att.date}, but no checkout was recorded. Calculated hours currently default to minimum standard or 0 pending supervisor resolution.`,
        recommendedAction: `Prompt supervisor to verify site departure log and record manual checkout adjustment with explanatory note.`,
        status: 'pending',
      });
    }

    // 2. Check for unrecorded/unpaid overtime
    // Compare recorded overtime hours with payroll records
    if (att.overtimeHoursWorked > 0) {
      const relatedPayroll = payrollRecords.find(
        (p) => p.workerId === att.workerId && att.date >= p.periodStart && att.date <= p.periodEnd
      );

      if (relatedPayroll && relatedPayroll.overtimeHours < att.overtimeHoursWorked) {
        findings.push({
          id: `AUD-UOT-${att.id}`,
          category: 'unrecorded_overtime',
          severity: 'critical',
          title: `Overtime Hours Not Credited in Payroll Period`,
          affectedWorkerId: att.workerId,
          affectedRecordRef: `Payroll #${relatedPayroll.id} vs Attendance #${att.id}`,
          exactRule: `Rule AUD-02 (SDG 8.5 / Fair Wages): Overtime hours recorded during verified attendance must be credited in the corresponding payroll cycle at the mandatory multiplier (${org.settings.overtimeMultiplier}x).`,
          evidence: `Attendance record shows ${att.overtimeHoursWorked}h overtime on ${att.date}, but payroll period contains only ${relatedPayroll.overtimeHours}h overtime credited. Shortfall: ${(att.overtimeHoursWorked - relatedPayroll.overtimeHours).toFixed(1)}h.`,
          recommendedAction: `Issue a payroll supplementary credit of ${((att.overtimeHoursWorked - relatedPayroll.overtimeHours) * relatedPayroll.overtimeRate).toFixed(0)} ${org.settings.currencySymbol} to reflect actual hours worked.`,
          status: 'pending',
        });
      }
    }
  }

  return findings;
}
