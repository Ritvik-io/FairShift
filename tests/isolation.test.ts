import { describe, expect, it } from 'vitest';
import { ORGANIZATIONS, SHIFTS, WORKERS } from '../src/lib/data/seedData';

describe('Multi-Industry Configuration & Cross-Organization Isolation', () => {
  const apex = ORGANIZATIONS.find((o) => o.code === 'APEX')!;
  const srm = ORGANIZATIONS.find((o) => o.code === 'SRMU')!;

  it('supports two distinct industry configurations', () => {
    expect(apex.industry).toBe('construction');
    expect(srm.industry).toBe('facilities');

    // Construction has higher risk 2.0x overtime multiplier
    expect(apex.settings.overtimeMultiplier).toBe(2.0);
    // Facilities has standard 1.5x overtime multiplier
    expect(srm.settings.overtimeMultiplier).toBe(1.5);
  });

  it('strictly isolates workers to their respective organizations', () => {
    const apexWorkers = WORKERS.filter((w) => w.orgId === apex.id);
    const srmWorkers = WORKERS.filter((w) => w.orgId === srm.id);

    expect(apexWorkers.length).toBeGreaterThanOrEqual(6);
    expect(srmWorkers.length).toBeGreaterThanOrEqual(6);

    // Ensure no worker ID overlaps across organizations
    const apexIds = new Set(apexWorkers.map((w) => w.id));
    const srmIds = new Set(srmWorkers.map((w) => w.id));

    for (const id of apexIds) {
      expect(srmIds.has(id)).toBe(false);
    }
  });

  it('strictly isolates shifts to correct organization and workers', () => {
    for (const shift of SHIFTS) {
      const assignedWorker = WORKERS.find((w) => w.id === shift.assignedWorkerId);
      expect(assignedWorker).toBeDefined();
      expect(assignedWorker?.orgId).toBe(shift.orgId);
    }
  });
});
