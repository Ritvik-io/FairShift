import { describe, expect, it } from 'vitest';
import { calculateRestIntervalHours, evaluateShiftFatigue } from '../src/lib/intelligence/fatigue';
import { ORGANIZATIONS } from '../src/lib/data/seedData';
import { Shift } from '../src/types';

describe('Workforce Fatigue & Fairness Intelligence Engine', () => {
  const constructionOrg = ORGANIZATIONS.find((o) => o.code === 'APEX')!;

  it('calculates rest interval hours between consecutive shifts accurately', () => {
    // Ends at 22:00 on day 1, next starts at 06:00 on day 2 -> 8 hours rest
    const rest = calculateRestIntervalHours('2026-10-25', '22:00', '2026-10-26', '06:00');
    expect(rest).toBe(8.0);
  });

  it('flags insufficient rest intervals (< 11 hours) with explainable rule', () => {
    const priorShift: Shift = {
      id: 'shift-prev',
      orgId: constructionOrg.id,
      title: 'Overnight Monitoring',
      department: 'Civil',
      siteLocation: 'Pier 42',
      assignedWorkerId: 'w-test-1',
      date: '2026-10-26',
      startTime: '20:00',
      endTime: '05:00',
      plannedHours: 9,
      status: 'completed',
      qrToken: 'QR-P1',
    };

    const nextShift: Shift = {
      id: 'shift-next',
      orgId: constructionOrg.id,
      title: 'Morning Scaffolding',
      department: 'Civil',
      siteLocation: 'Pier 42',
      assignedWorkerId: 'w-test-1',
      date: '2026-10-26',
      startTime: '08:00', // Only 3 hours after 05:00!
      endTime: '16:30',
      plannedHours: 8.5,
      status: 'scheduled',
      qrToken: 'QR-P2',
    };

    const alerts = evaluateShiftFatigue(nextShift, [priorShift], constructionOrg);
    const restAlert = alerts.find((a) => a.ruleTriggered === 'insufficient_rest');

    expect(restAlert).toBeDefined();
    expect(restAlert?.severity).toBe('critical');
    expect(restAlert?.evidence).toContain('3.0 hours of rest');
    expect(restAlert?.exactRuleExplanation).toContain('Rule FS-R02');
  });

  it('flags excessive shift duration (> 10 hours)', () => {
    const longShift: Shift = {
      id: 'shift-long',
      orgId: constructionOrg.id,
      title: 'Continuous Concrete Pour',
      department: 'Civil',
      siteLocation: 'Pier 42',
      assignedWorkerId: 'w-test-2',
      date: '2026-10-27',
      startTime: '07:00',
      endTime: '19:30', // 12.5 hours!
      plannedHours: 12.5,
      status: 'scheduled',
      qrToken: 'QR-L1',
    };

    const alerts = evaluateShiftFatigue(longShift, [], constructionOrg);
    const durationAlert = alerts.find((a) => a.ruleTriggered === 'excessive_shift_duration');

    expect(durationAlert).toBeDefined();
    expect(durationAlert?.severity).toBe('critical');
    expect(durationAlert?.evidence).toContain('12.5 hours');
  });
});
