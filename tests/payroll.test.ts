import { describe, expect, it } from 'vitest';
import {
  calculateElapsedHours,
  calculatePayroll,
  splitRegularAndOvertime,
  validateAttendanceCheckIn,
} from '../src/lib/calculations/payroll';
import { ORGANIZATIONS } from '../src/lib/data/seedData';

describe('Payroll & Shift Hours Calculation Engine', () => {
  it('calculates standard same-day shift hours correctly', () => {
    const hours = calculateElapsedHours('08:00', '16:30');
    expect(hours).toBe(8.5);
  });

  it('accurately handles overnight shifts crossing midnight', () => {
    // Shift starts at 22:00 (10 PM) and finishes at 06:00 (6 AM) next morning
    const hours = calculateElapsedHours('22:00', '06:00');
    expect(hours).toBe(8.0);
  });

  it('correctly splits regular hours and overtime based on standard 8-hour daily limit', () => {
    const normal = splitRegularAndOvertime(7.5, 8);
    expect(normal.regularHours).toBe(7.5);
    expect(normal.overtimeHours).toBe(0);

    const overtime = splitRegularAndOvertime(10.5, 8);
    expect(overtime.regularHours).toBe(8);
    expect(overtime.overtimeHours).toBe(2.5);
  });

  it('calculates deterministic payroll breakdown with org-specific overtime multiplier (Construction 2.0x)', () => {
    const constructionOrg = ORGANIZATIONS.find((o) => o.code === 'APEX')!;
    expect(constructionOrg.settings.overtimeMultiplier).toBe(2.0);

    const hourlyRate = 140; // ₹140/hr
    const regularHours = 80;
    const overtimeHours = 10;
    const bonuses = 500;

    const payroll = calculatePayroll(
      'w-apex-1',
      constructionOrg,
      regularHours,
      overtimeHours,
      hourlyRate,
      bonuses,
      '2026-10-01',
      '2026-10-15'
    );

    // Regular Pay: 80 * 140 = 11,200
    expect(payroll.baseEarnings).toBe(11200);
    // Overtime Rate: 140 * 2.0 = 280
    expect(payroll.overtimeRate).toBe(280);
    // Overtime Pay: 10 * 280 = 2,800
    expect(payroll.overtimeEarnings).toBe(2800);
    // EPF (12% of 11,200 = 1344) + ESI (0.75% of 11,200 = 84) = 1428
    expect(payroll.deductions).toBe(1428);
    // Net Pay: 11200 + 2800 + 500 - 1428 = 13072
    expect(payroll.estimatedNetPay).toBe(13072);
  });

  it('prevents duplicate check-in events for the same shift', () => {
    const existingRecords = [
      { shiftId: 'shift-101', status: 'checked_in' },
      { shiftId: 'shift-102', status: 'completed' },
    ];

    const duplicateCheck = validateAttendanceCheckIn(existingRecords, 'shift-101');
    expect(duplicateCheck.isValid).toBe(false);
    expect(duplicateCheck.errorMessage).toContain('Duplicate check-in detected');

    const validNewCheck = validateAttendanceCheckIn(existingRecords, 'shift-103');
    expect(validNewCheck.isValid).toBe(true);
  });
});
