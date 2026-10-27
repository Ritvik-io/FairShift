export type IndustryType = 'construction' | 'facilities';

export type UserRole = 'worker' | 'admin';

export interface Organization {
  id: string;
  name: string;
  code: string;
  industry: IndustryType;
  description: string;
  location: string;
  settings: {
    standardDailyHours: number; // e.g. 8
    overtimeMultiplier: number; // e.g. 1.5 or 2.0
    doubleTimeWeekend: boolean;
    maxWeeklyHoursLimit: number; // e.g. 48 (SDG 8 & Factories Act)
    minRestBetweenShiftsHours: number; // e.g. 11
    currencySymbol: string; // '₹'
    emergencyHotline: string;
  };
}

export interface WorkerProfile {
  id: string;
  orgId: string;
  employeeCode: string;
  fullName: string;
  role: string;
  department: string;
  site: string;
  phone: string;
  hourlyRate: number; // Base hourly rate in INR
  joinedDate: string;
  avatarUrl?: string;
  preferredLanguage: 'en' | 'ta' | 'hi';
}

export interface Shift {
  id: string;
  orgId: string;
  title: string;
  department: string;
  siteLocation: string;
  assignedWorkerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24hr)
  endTime: string; // HH:mm (24hr)
  plannedHours: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'flagged';
  requiredPpe?: string[];
  qrToken: string; // Deterministic verification token
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  orgId: string;
  shiftId: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string or HH:mm
  checkOutTime?: string; // ISO string or HH:mm
  regularHoursWorked: number;
  overtimeHoursWorked: number;
  status: 'checked_in' | 'completed' | 'late' | 'overtime' | 'missing_checkout' | 'flagged';
  checkInMethod: 'qr_scanner' | 'manual' | 'supervisor_verified';
  flaggedReason?: string;
  correctionRequested?: boolean;
  correctionNotes?: string;
}

export interface PayrollRecord {
  id: string;
  orgId: string;
  workerId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  regularHours: number;
  regularHourlyRate: number;
  baseEarnings: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeEarnings: number;
  bonuses: number;
  deductions: number; // e.g. EPF/ESI contributions
  estimatedNetPay: number;
  status: 'draft' | 'under_review' | 'approved' | 'paid' | 'disputed';
  paymentDate?: string;
  notes?: string;
  breakdown: {
    regularPay: number;
    overtimePay: number;
    specialAllowances: number;
    epfDeduction: number;
    insuranceDeduction: number;
  };
}

export interface PayrollDiscrepancy {
  id: string;
  orgId: string;
  payrollId: string;
  workerId: string;
  discrepancyType: 'missing_overtime' | 'incorrect_rate' | 'wrong_deduction' | 'unrecorded_shift';
  claimedHours?: number;
  claimedAmount?: number;
  reason: string;
  evidenceNotes?: string;
  status: 'submitted' | 'under_review' | 'resolved' | 'rejected';
  adminResponse?: string;
  createdAt: string;
  resolvedAt?: string;
}

export type SafetyCategory =
  | 'equipment'
  | 'electrical'
  | 'slips_trips'
  | 'sanitation'
  | 'fire'
  | 'ppe'
  | 'heat_stress'
  | 'harassment'
  | 'other';

export type SafetySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SafetyStatus = 'submitted' | 'acknowledged' | 'in_progress' | 'escalated' | 'resolved';

export interface SafetyReportUpdate {
  id: string;
  reportId: string;
  timestamp: string;
  updatedBy: string; // "Safety Officer" or "Site Supervisor" (never discloses anonymous reporter)
  status: SafetyStatus;
  notes: string;
}

export interface SafetyReport {
  id: string;
  orgId: string;
  reportCode: string; // e.g. FS-SAF-2026-001 or ANON-7742
  category: SafetyCategory;
  severity: SafetySeverity;
  title: string;
  description: string;
  locationSite: string;
  isAnonymous: boolean;
  reporterWorkerId?: string; // Stripped or undefined in manager API when isAnonymous is true
  reporterAlias?: string; // "Anonymous Worker"
  status: SafetyStatus;
  voiceTranscript?: string;
  photoUrl?: string;
  createdAt: string;
  assignedTo?: string;
  updates: SafetyReportUpdate[];
  resolutionNotes?: string;
}

export interface SkillCredential {
  id: string;
  workerId: string;
  orgId: string;
  skillName: string;
  category: 'safety' | 'technical' | 'machinery' | 'first_aid' | 'compliance';
  issuingBody: string;
  issueDate: string;
  expiryDate?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verificationDate?: string;
  certificateRef?: string;
}

export interface FatigueAlert {
  id: string;
  orgId: string;
  workerId: string;
  shiftId?: string;
  ruleTriggered:
    | 'insufficient_rest'
    | 'excessive_shift_duration'
    | 'weekly_hours_exceeded'
    | 'consecutive_night_shifts'
    | 'excessive_overtime';
  severity: 'low' | 'medium' | 'critical';
  title: string;
  evidence: string;
  exactRuleExplanation: string;
  recommendedAction: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolutionAction?: string;
  createdAt: string;
}

export interface FairnessDimensionScore {
  score: number; // 0 - 100
  rating: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical Concern';
  formulaExplanation: string;
  supportingMetrics: {
    label: string;
    value: string | number;
    status: 'good' | 'warning' | 'alert';
  }[];
  recommendedActions: string[];
}

export interface FairnessScorecard {
  organizationId: string;
  calculatedAt: string;
  overallScore: number;
  dimensions: {
    payTransparency: FairnessDimensionScore;
    workloadFairness: FairnessDimensionScore;
    safetyResponsiveness: FairnessDimensionScore;
    workerVoice: FairnessDimensionScore;
  };
  methodologyNote: string;
}

export interface WorkerFeedback {
  id: string;
  orgId: string;
  workerId?: string;
  isAnonymous: boolean;
  category: 'workload' | 'supervisor_treatment' | 'facilities' | 'timely_pay' | 'safety_climate';
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}
