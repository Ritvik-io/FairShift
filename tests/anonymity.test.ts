import { describe, expect, it } from 'vitest';
import {
  generateAnonymousTrackingCode,
  sanitizeSafetyReportForManager,
} from '../src/lib/intelligence/anonymity';
import { SafetyReport } from '../src/types';

describe('Privacy-Preserving Safety Reporting Subsystem', () => {
  it('generates pseudonymous tracking codes matching format ANON-XXXX-XXXX', () => {
    const code = generateAnonymousTrackingCode();
    expect(code).toMatch(/^ANON-\d{4}-[A-Z0-9]+$/);
  });

  it('strictly strips reporter identity from manager view when isAnonymous is true', () => {
    const rawReport: SafetyReport = {
      id: 'rep-secret-1',
      orgId: 'org-apex-construction',
      reportCode: 'ANON-9901-T2',
      category: 'equipment',
      severity: 'critical',
      title: 'Faulty hoist brake on Tower 4',
      description: 'Hoist slipped 2 feet under half load.',
      locationSite: 'Pier 42',
      isAnonymous: true,
      reporterWorkerId: 'w-apex-1', // Real worker ID in database
      reporterAlias: 'Ramesh Kumar (Specialist)',
      status: 'submitted',
      createdAt: '2026-10-27T08:00:00Z',
      updates: [],
    };

    const managerView = sanitizeSafetyReportForManager(rawReport);

    // Reporter identity must be completely erased
    expect(managerView.reporterWorkerId).toBeUndefined();
    expect(managerView.reporterAlias).toBe('Shielded Worker (Anonymous)');
    // Hazard content remains fully visible for mitigation
    expect(managerView.title).toBe('Faulty hoist brake on Tower 4');
    expect(managerView.severity).toBe('critical');
  });

  it('preserves reporter details when isAnonymous is false for transparent follow-up', () => {
    const identifiedReport: SafetyReport = {
      id: 'rep-open-1',
      orgId: 'org-apex-construction',
      reportCode: 'FS-SAF-001',
      category: 'electrical',
      severity: 'high',
      title: 'Exposed live wire in DB box',
      description: 'Needs immediate cover.',
      locationSite: 'Station Box B',
      isAnonymous: false,
      reporterWorkerId: 'w-apex-3',
      reporterAlias: 'Sunil Verma (MEP Electrician)',
      status: 'submitted',
      createdAt: '2026-10-27T08:00:00Z',
      updates: [],
    };

    const managerView = sanitizeSafetyReportForManager(identifiedReport);
    expect(managerView.reporterWorkerId).toBe('w-apex-3');
    expect(managerView.reporterAlias).toBe('Sunil Verma (MEP Electrician)');
  });
});
