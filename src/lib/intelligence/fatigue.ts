import { FatigueAlert, Organization, Shift } from '@/types';
import { calculateElapsedHours } from '../calculations/payroll';

/**
 * Calculates rest interval in hours between end of previous shift and start of next shift.
 */
export function calculateRestIntervalHours(
  prevShiftDate: string,
  prevShiftEndTime: string,
  nextShiftDate: string,
  nextShiftStartTime: string
): number {
  const prevEndIso = `${prevShiftDate}T${prevShiftEndTime}:00`;
  const nextStartIso = `${nextShiftDate}T${nextShiftStartTime}:00`;

  const prevDate = new Date(prevEndIso);
  const nextDate = new Date(nextStartIso);

  const diffMs = nextDate.getTime() - prevDate.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
}

/**
 * Validates a proposed or existing shift against fatigue safety constraints.
 * Generates explainable FatigueAlerts with clear mathematical evidence and recommendations.
 */
export function evaluateShiftFatigue(
  targetShift: Shift,
  workerShifts: Shift[],
  org: Organization
): FatigueAlert[] {
  const alerts: FatigueAlert[] = [];
  const minRestRequired = org.settings.minRestBetweenShiftsHours || 11;
  const maxWeeklyLimit = org.settings.maxWeeklyHoursLimit || 48;

  // 1. Shift duration check
  const duration = calculateElapsedHours(targetShift.startTime, targetShift.endTime);
  if (duration > 10) {
    alerts.push({
      id: `FAT-DUR-${targetShift.id}`,
      orgId: org.id,
      workerId: targetShift.assignedWorkerId,
      shiftId: targetShift.id,
      ruleTriggered: 'excessive_shift_duration',
      severity: duration >= 12 ? 'critical' : 'medium',
      title: `Excessive Shift Duration (${duration}h planned)`,
      evidence: `Scheduled shift from ${targetShift.startTime} to ${targetShift.endTime} totals ${duration} hours, exceeding the standard ${org.settings.standardDailyHours}h baseline and safety cap of 10h.`,
      exactRuleExplanation: `Rule FS-R01: Continuous working shifts exceeding 10 hours significantly increase cognitive fatigue, workplace mishap risk, and violate standard occupational rest norms.`,
      recommendedAction: `Split this shift into two rotations or assign a relief worker for the remaining ${duration - 8} hours.`,
      isResolved: false,
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Rest interval check with chronological neighboring shifts
  const sortedShifts = [...workerShifts]
    .filter((s) => s.id !== targetShift.id && s.assignedWorkerId === targetShift.assignedWorkerId)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());

  for (const existingShift of sortedShifts) {
    // Check if targetShift occurs shortly after existingShift
    const targetStart = new Date(`${targetShift.date}T${targetShift.startTime}`).getTime();
    const existingEnd = new Date(`${existingShift.date}T${existingShift.endTime}`).getTime();

    if (targetStart > existingEnd) {
      const restHours = (targetStart - existingEnd) / (1000 * 60 * 60);
      if (restHours >= 0 && restHours < minRestRequired) {
        alerts.push({
          id: `FAT-REST-${targetShift.id}-${existingShift.id}`,
          orgId: org.id,
          workerId: targetShift.assignedWorkerId,
          shiftId: targetShift.id,
          ruleTriggered: 'insufficient_rest',
          severity: restHours < 8 ? 'critical' : 'medium',
          title: `Insufficient Rest Interval (${restHours.toFixed(1)}h rest)`,
          evidence: `Worker finishes shift "${existingShift.title}" at ${existingShift.date} ${existingShift.endTime} and starts "${targetShift.title}" at ${targetShift.date} ${targetShift.startTime}. Only ${restHours.toFixed(1)} hours of rest provided.`,
          exactRuleExplanation: `Rule FS-R02 (SDG 8.8 / ILO C106): Workers must receive a minimum uninterrupted rest period of ${minRestRequired} hours between consecutive daily shifts to allow neurological and physiological recovery.`,
          recommendedAction: `Adjust the start time of the next shift or reassign to an off-duty colleague who has completed at least ${minRestRequired} hours of rest.`,
          isResolved: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 3. Weekly cumulative hours check
  // Group shifts within a 7-day window
  const targetDate = new Date(`${targetShift.date}T12:00:00Z`);
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(targetDate.getDate() - 6);

  const weeklyShifts = [...workerShifts, targetShift].filter((s) => {
    if (s.assignedWorkerId !== targetShift.assignedWorkerId) return false;
    const sDate = new Date(`${s.date}T12:00:00Z`);
    return sDate >= sevenDaysAgo && sDate <= targetDate;
  });

  const totalWeeklyHours = weeklyShifts.reduce((acc, s) => {
    return acc + calculateElapsedHours(s.startTime, s.endTime);
  }, 0);

  if (totalWeeklyHours > maxWeeklyLimit) {
    alerts.push({
      id: `FAT-WEEK-${targetShift.id}`,
      orgId: org.id,
      workerId: targetShift.assignedWorkerId,
      shiftId: targetShift.id,
      ruleTriggered: 'weekly_hours_exceeded',
      severity: totalWeeklyHours >= 56 ? 'critical' : 'medium',
      title: `Excessive Weekly Workload (${totalWeeklyHours.toFixed(1)}h in 7 days)`,
      evidence: `Scheduled shifts over the trailing 7 days accumulate ${totalWeeklyHours.toFixed(1)} hours, breaching the organization's limit of ${maxWeeklyLimit}h/week.`,
      exactRuleExplanation: `Rule FS-R03 (The Factories Act / SDG 8 Decent Work): Total weekly hours must not exceed ${maxWeeklyLimit} hours per week without formal compensatory rest periods.`,
      recommendedAction: `Schedule a mandatory rest day for this worker and assign substitute personnel.`,
      isResolved: false,
      createdAt: new Date().toISOString(),
    });
  }

  return alerts;
}
