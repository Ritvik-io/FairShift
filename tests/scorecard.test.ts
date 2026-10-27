import { describe, expect, it } from 'vitest';
import { calculateFairnessScorecard } from '../src/lib/calculations/scorecard';
import {
  ATTENDANCE_RECORDS,
  FATIGUE_ALERTS,
  ORGANIZATIONS,
  PAYROLL_DISCREPANCIES,
  PAYROLL_RECORDS,
  SAFETY_REPORTS,
  WORKER_FEEDBACKS,
} from '../src/lib/data/seedData';

describe('Fairness Scorecard (Main Differentiator)', () => {
  const constructionOrg = ORGANIZATIONS.find((o) => o.code === 'APEX')!;
  const apexAttendance = ATTENDANCE_RECORDS.filter((a) => a.orgId === constructionOrg.id);
  const apexPayroll = PAYROLL_RECORDS.filter((p) => p.orgId === constructionOrg.id);
  const apexDiscrepancies = PAYROLL_DISCREPANCIES.filter((d) => d.orgId === constructionOrg.id);
  const apexSafety = SAFETY_REPORTS.filter((s) => s.orgId === constructionOrg.id);
  const apexFatigue = FATIGUE_ALERTS.filter((f) => f.orgId === constructionOrg.id);
  const apexFeedback = WORKER_FEEDBACKS.filter((b) => b.orgId === constructionOrg.id);

  it('computes 4 independent fairness dimensions with explainable formula', () => {
    const scorecard = calculateFairnessScorecard(
      constructionOrg,
      apexAttendance,
      apexPayroll,
      apexDiscrepancies,
      apexSafety,
      apexFatigue,
      apexFeedback
    );

    expect(scorecard.overallScore).toBeGreaterThanOrEqual(0);
    expect(scorecard.overallScore).toBeLessThanOrEqual(100);

    // Dimension 1: Pay Transparency
    expect(scorecard.dimensions.payTransparency.score).toBeDefined();
    expect(scorecard.dimensions.payTransparency.supportingMetrics.length).toBeGreaterThan(0);
    expect(scorecard.dimensions.payTransparency.formulaExplanation).toBeDefined();

    // Dimension 2: Workload Fairness
    expect(scorecard.dimensions.workloadFairness.score).toBeDefined();
    expect(scorecard.dimensions.workloadFairness.supportingMetrics.length).toBeGreaterThan(0);

    // Dimension 3: Safety Responsiveness
    expect(scorecard.dimensions.safetyResponsiveness.score).toBeDefined();
    expect(scorecard.dimensions.safetyResponsiveness.supportingMetrics.length).toBeGreaterThan(0);

    // Dimension 4: Worker Voice
    expect(scorecard.dimensions.workerVoice.score).toBeDefined();
    expect(scorecard.dimensions.workerVoice.supportingMetrics.length).toBeGreaterThan(0);
  });
});
