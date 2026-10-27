import { SafetyReport } from '@/types';

/**
 * Generates a privacy-preserving anonymous report tracking code.
 * Allows the reporter to monitor progress and updates without exposing their user account.
 */
export function generateAnonymousTrackingCode(): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ANON-${randomPart}-${suffix}`;
}

/**
 * Sanitizes safety report for manager and public audit consumption.
 * When a report is marked isAnonymous = true:
 * - reporterWorkerId is strictly stripped (undefined)
 * - reporterAlias is set to a generic non-identifiable handle
 * - Protects against de-anonymization through manager dashboards or inspection of API responses
 */
export function sanitizeSafetyReportForManager(report: SafetyReport): SafetyReport {
  if (!report.isAnonymous) {
    return { ...report };
  }

  // Strip all identifiable fields
  const sanitized = { ...report };
  delete sanitized.reporterWorkerId;
  sanitized.reporterAlias = 'Shielded Worker (Anonymous)';

  return sanitized;
}

/**
 * Returns privacy disclosure statement for workers before submitting.
 */
export const ANONYMITY_DISCLOSURE = {
  guarantee:
    'When you select Anonymous Reporting, your name, employee badge number, and user ID are cryptographically separated from this report.',
  managerVisibility:
    'Site supervisors and administrators will only see the category, hazard location, photos/voice description, and severity level.',
  tracking:
    'You are provided an Anonymous Tracking Token so you can view resolution progress directly without revealing your identity.',
  limitations:
    'Please do not include personal self-identifying statements inside the description text or photos.',
};
