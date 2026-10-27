'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AttendanceRecord,
  FairnessScorecard,
  FatigueAlert,
  Organization,
  PayrollDiscrepancy,
  PayrollRecord,
  SafetyCategory,
  SafetyReport,
  SafetySeverity,
  SafetyStatus,
  Shift,
  SkillCredential,
  UserRole,
  WorkerFeedback,
  WorkerProfile,
} from '@/types';
import { calculateElapsedHours, splitRegularAndOvertime } from '../calculations/payroll';
import { calculateFairnessScorecard } from '../calculations/scorecard';
import { generateAnonymousTrackingCode, sanitizeSafetyReportForManager } from '../intelligence/anonymity';
import { evaluateShiftFatigue } from '../intelligence/fatigue';
import { Language, translations } from '../i18n/translations';
import {
  ATTENDANCE_RECORDS,
  FATIGUE_ALERTS,
  ORGANIZATIONS,
  PAYROLL_DISCREPANCIES,
  PAYROLL_RECORDS,
  SAFETY_REPORTS,
  SHIFTS,
  SKILL_CREDENTIALS,
  WORKER_FEEDBACKS,
  WORKERS,
} from './seedData';

interface StoreState {
  currentOrg: Organization;
  selectedOrgId: string;
  activeRole: UserRole;
  activeWorker: WorkerProfile;
  activeWorkerId: string;
  language: Language;
  t: (typeof translations)['en'];
  isDemoMode: boolean;

  // Collections filtered to current org
  organizations: Organization[];
  workers: WorkerProfile[];
  shifts: Shift[];
  attendanceRecords: AttendanceRecord[];
  payrollRecords: PayrollRecord[];
  discrepancies: PayrollDiscrepancy[];
  safetyReports: SafetyReport[];
  skillCredentials: SkillCredential[];
  fatigueAlerts: FatigueAlert[];
  feedbacks: WorkerFeedback[];
  scorecard: FairnessScorecard;

  // Actions
  setOrg: (orgId: string) => void;
  setRole: (role: UserRole) => void;
  setActiveWorkerId: (workerId: string) => void;
  setLanguage: (lang: Language) => void;

  checkInShift: (shiftId: string, method?: 'qr_scanner' | 'manual') => { success: boolean; message: string };
  checkOutShift: (shiftId: string) => { success: boolean; message: string; hours?: number; overtime?: number };
  
  submitSafetyReport: (data: {
    category: SafetyCategory;
    severity: SafetySeverity;
    title: string;
    description: string;
    locationSite: string;
    isAnonymous: boolean;
    voiceTranscript?: string;
  }) => SafetyReport;
  updateSafetyReportStatus: (reportId: string, status: SafetyStatus, note: string) => void;

  raiseDiscrepancy: (data: {
    payrollId: string;
    discrepancyType: 'missing_overtime' | 'incorrect_rate' | 'wrong_deduction' | 'unrecorded_shift';
    claimedHours?: number;
    claimedAmount?: number;
    reason: string;
  }) => void;
  resolveDiscrepancy: (discrepancyId: string, decision: 'resolved' | 'rejected', adminNote: string) => void;

  resolveFatigueAlert: (alertId: string, resolutionAction: string) => void;
  addShift: (newShift: Omit<Shift, 'id' | 'orgId' | 'qrToken' | 'status'>) => { shift: Shift; warnings: FatigueAlert[] };
  requestSkillVerification: (skillId: string) => void;
  verifySkill: (skillId: string, verifiedBy: string) => void;
  submitWorkerFeedback: (category: WorkerFeedback['category'], rating: number, comment: string, isAnonymous: boolean) => void;
  resetToDefaultData: () => void;
}

const StoreContext = createContext<StoreState | null>(null);

const STORAGE_KEY = 'fairshift_v1_store_data';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org-apex-construction');
  const [activeRole, setActiveRole] = useState<UserRole>('worker');
  const [activeWorkerId, setActiveWorkerIdState] = useState<string>('w-apex-1');
  const [language, setLanguage] = useState<Language>('en');

  // Master collections
  const [shifts, setShifts] = useState<Shift[]>(SHIFTS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(ATTENDANCE_RECORDS);
  const [payroll, setPayroll] = useState<PayrollRecord[]>(PAYROLL_RECORDS);
  const [discrepancies, setDiscrepancies] = useState<PayrollDiscrepancy[]>(PAYROLL_DISCREPANCIES);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(SAFETY_REPORTS);
  const [skills, setSkills] = useState<SkillCredential[]>(SKILL_CREDENTIALS);
  const [fatigueAlerts, setFatigueAlerts] = useState<FatigueAlert[]>(FATIGUE_ALERTS);
  const [feedbacks, setFeedbacks] = useState<WorkerFeedback[]>(WORKER_FEEDBACKS);

  // Load from localStorage on client mount if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.shifts) setShifts(parsed.shifts);
        if (parsed.attendance) setAttendance(parsed.attendance);
        if (parsed.payroll) setPayroll(parsed.payroll);
        if (parsed.discrepancies) setDiscrepancies(parsed.discrepancies);
        if (parsed.safetyReports) setSafetyReports(parsed.safetyReports);
        if (parsed.skills) setSkills(parsed.skills);
        if (parsed.fatigueAlerts) setFatigueAlerts(parsed.fatigueAlerts);
        if (parsed.feedbacks) setFeedbacks(parsed.feedbacks);
        if (parsed.selectedOrgId) setSelectedOrgId(parsed.selectedOrgId);
        if (parsed.activeRole) setActiveRole(parsed.activeRole);
        if (parsed.activeWorkerId) setActiveWorkerIdState(parsed.activeWorkerId);
        if (parsed.language) setLanguage(parsed.language);
      }
    } catch (e) {
      console.warn('Failed to parse cached store:', e);
    }
  }, []);

  // Save to localStorage when state updates
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          shifts,
          attendance,
          payroll,
          discrepancies,
          safetyReports,
          skills,
          fatigueAlerts,
          feedbacks,
          selectedOrgId,
          activeRole,
          activeWorkerId,
          language,
        })
      );
    } catch {
      // Storage might be full or private browsing
    }
  }, [
    shifts,
    attendance,
    payroll,
    discrepancies,
    safetyReports,
    skills,
    fatigueAlerts,
    feedbacks,
    selectedOrgId,
    activeRole,
    activeWorkerId,
    language,
  ]);

  const currentOrg = ORGANIZATIONS.find((o) => o.id === selectedOrgId) || ORGANIZATIONS[0];

  // Adjust activeWorkerId when org changes if current worker belongs to another org
  const orgWorkers = WORKERS.filter((w) => w.orgId === selectedOrgId);
  const activeWorker =
    orgWorkers.find((w) => w.id === activeWorkerId) || orgWorkers[0] || WORKERS[0];

  const handleSetOrg = (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    const newOrgWorkers = WORKERS.filter((w) => w.orgId === newOrgId);
    if (newOrgWorkers.length > 0) {
      setActiveWorkerIdState(newOrgWorkers[0].id);
    }
  };

  // Filter collections for current organization
  const currentShifts = shifts.filter((s) => s.orgId === selectedOrgId);
  const currentAttendance = attendance.filter((a) => a.orgId === selectedOrgId);
  const currentPayroll = payroll.filter((p) => p.orgId === selectedOrgId);
  const currentDiscrepancies = discrepancies.filter((d) => d.orgId === selectedOrgId);
  const currentSafety = safetyReports.filter((r) => r.orgId === selectedOrgId);
  const currentSkills = skills.filter((s) => s.orgId === selectedOrgId);
  const currentFatigue = fatigueAlerts.filter((f) => f.orgId === selectedOrgId);
  const currentFeedback = feedbacks.filter((b) => b.orgId === selectedOrgId);

  // Dynamic Scorecard derived directly from real current records
  const scorecard = calculateFairnessScorecard(
    currentOrg,
    currentAttendance,
    currentPayroll,
    currentDiscrepancies,
    currentSafety,
    currentFatigue,
    currentFeedback
  );

  // Check In Action
  const checkInShift = (shiftId: string, method: 'qr_scanner' | 'manual' = 'manual') => {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return { success: false, message: 'Shift not found' };

    // Prevent duplicate check in
    const existing = currentAttendance.find(
      (a) => a.shiftId === shiftId && (a.status === 'checked_in' || a.status === 'completed')
    );
    if (existing) {
      return { success: false, message: 'Worker is already clocked in or shift is completed.' };
    }

    const nowTime = new Date().toTimeString().slice(0, 5); // HH:mm
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      orgId: selectedOrgId,
      shiftId: shift.id,
      workerId: shift.assignedWorkerId,
      date: shift.date,
      checkInTime: nowTime,
      regularHoursWorked: 0,
      overtimeHoursWorked: 0,
      status: 'checked_in',
      checkInMethod: method,
    };

    setAttendance((prev) => [newRecord, ...prev]);
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, status: 'in_progress' } : s))
    );

    return { success: true, message: `Clocked in successfully at ${nowTime} via ${method === 'qr_scanner' ? 'Verified QR' : 'Manual Entry'}.` };
  };

  // Check Out Action
  const checkOutShift = (shiftId: string) => {
    const recordIndex = attendance.findIndex(
      (a) => a.shiftId === shiftId && a.status === 'checked_in'
    );
    if (recordIndex === -1) {
      return { success: false, message: 'No active check-in record found for this shift.' };
    }

    const record = attendance[recordIndex];
    const nowTime = new Date().toTimeString().slice(0, 5); // HH:mm
    const totalElapsed = calculateElapsedHours(record.checkInTime, nowTime);
    // If testing quickly, ensure at least planned hours or realistic duration
    const effectiveHours = totalElapsed < 0.1 ? 8.5 : totalElapsed;

    const { regularHours, overtimeHours } = splitRegularAndOvertime(
      effectiveHours,
      currentOrg.settings.standardDailyHours
    );

    const updatedRecord: AttendanceRecord = {
      ...record,
      checkOutTime: nowTime,
      regularHoursWorked: regularHours,
      overtimeHoursWorked: overtimeHours,
      status: overtimeHours > 0 ? 'overtime' : 'completed',
    };

    const updatedAttendance = [...attendance];
    updatedAttendance[recordIndex] = updatedRecord;
    setAttendance(updatedAttendance);

    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, status: 'completed' } : s))
    );

    return {
      success: true,
      message: `Checked out at ${nowTime}. Total hours: ${effectiveHours.toFixed(1)}h (${regularHours}h regular + ${overtimeHours}h overtime).`,
      hours: effectiveHours,
      overtime: overtimeHours,
    };
  };

  // Submit Safety Report
  const submitSafetyReport = (data: {
    category: SafetyCategory;
    severity: SafetySeverity;
    title: string;
    description: string;
    locationSite: string;
    isAnonymous: boolean;
    voiceTranscript?: string;
  }) => {
    const code = data.isAnonymous
      ? generateAnonymousTrackingCode()
      : `FS-${currentOrg.code}-SAF-${Math.floor(100 + Math.random() * 900)}`;

    const newReport: SafetyReport = {
      id: `rep-${Date.now()}`,
      orgId: selectedOrgId,
      reportCode: code,
      category: data.category,
      severity: data.severity,
      title: data.title,
      description: data.description,
      locationSite: data.locationSite,
      isAnonymous: data.isAnonymous,
      reporterWorkerId: data.isAnonymous ? undefined : activeWorker.id,
      reporterAlias: data.isAnonymous ? 'Shielded Worker (Anonymous)' : activeWorker.fullName,
      status: 'submitted',
      voiceTranscript: data.voiceTranscript,
      createdAt: new Date().toISOString(),
      updates: [
        {
          id: `upd-${Date.now()}`,
          reportId: `rep-${Date.now()}`,
          timestamp: new Date().toISOString(),
          updatedBy: 'System Audit',
          status: 'submitted',
          notes: 'Report logged into FairShift compliance queue.',
        },
      ],
    };

    setSafetyReports((prev) => [newReport, ...prev]);
    return newReport;
  };

  // Update Safety Report Status
  const updateSafetyReportStatus = (reportId: string, status: SafetyStatus, note: string) => {
    setSafetyReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        const newUpdate = {
          id: `upd-${Date.now()}`,
          reportId,
          timestamp: new Date().toISOString(),
          updatedBy: 'Site Operations Manager',
          status,
          notes: note,
        };
        return {
          ...r,
          status,
          resolutionNotes: status === 'resolved' ? note : r.resolutionNotes,
          updates: [...r.updates, newUpdate],
        };
      })
    );
  };

  // Raise Discrepancy
  const raiseDiscrepancy = (data: {
    payrollId: string;
    discrepancyType: 'missing_overtime' | 'incorrect_rate' | 'wrong_deduction' | 'unrecorded_shift';
    claimedHours?: number;
    claimedAmount?: number;
    reason: string;
  }) => {
    const newDiscrepancy: PayrollDiscrepancy = {
      id: `DISC-${Date.now().toString().slice(-6)}`,
      orgId: selectedOrgId,
      payrollId: data.payrollId,
      workerId: activeWorker.id,
      discrepancyType: data.discrepancyType,
      claimedHours: data.claimedHours,
      claimedAmount: data.claimedAmount,
      reason: data.reason,
      status: 'under_review',
      createdAt: new Date().toISOString(),
    };

    setDiscrepancies((prev) => [newDiscrepancy, ...prev]);

    // Mark corresponding payroll status as disputed
    setPayroll((prev) =>
      prev.map((p) => (p.id === data.payrollId ? { ...p, status: 'disputed' } : p))
    );
  };

  // Resolve Discrepancy
  const resolveDiscrepancy = (
    discrepancyId: string,
    decision: 'resolved' | 'rejected',
    adminNote: string
  ) => {
    setDiscrepancies((prev) =>
      prev.map((d) => {
        if (d.id !== discrepancyId) return d;
        return {
          ...d,
          status: decision,
          adminResponse: adminNote,
          resolvedAt: new Date().toISOString(),
        };
      })
    );

    // If resolved, update the payroll record back to approved
    const disc = discrepancies.find((d) => d.id === discrepancyId);
    if (disc) {
      setPayroll((prev) =>
        prev.map((p) => {
          if (p.id !== disc.payrollId) return p;
          if (decision === 'resolved' && disc.claimedAmount) {
            return {
              ...p,
              status: 'approved',
              estimatedNetPay: p.estimatedNetPay + disc.claimedAmount,
              bonuses: p.bonuses + disc.claimedAmount,
              notes: `Resolved discrepancy #${discrepancyId}: Added ${disc.claimedAmount} ${currentOrg.settings.currencySymbol} supplementary credit.`,
            };
          }
          return { ...p, status: 'approved' };
        })
      );
    }
  };

  // Resolve Fatigue Alert
  const resolveFatigueAlert = (alertId: string, resolutionAction: string) => {
    setFatigueAlerts((prev) =>
      prev.map((f) =>
        f.id === alertId
          ? {
              ...f,
              isResolved: true,
              resolvedAt: new Date().toISOString(),
              resolutionAction,
            }
          : f
      )
    );
  };

  // Add Shift with pre-assignment fatigue check
  const addShift = (newShiftData: Omit<Shift, 'id' | 'orgId' | 'qrToken' | 'status'>) => {
    const shiftId = `shift-${currentOrg.code.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const qrToken = `QR-${currentOrg.code}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newShift: Shift = {
      ...newShiftData,
      id: shiftId,
      orgId: selectedOrgId,
      qrToken,
      status: 'scheduled',
    };

    // Pre-assignment fatigue evaluation
    const warnings = evaluateShiftFatigue(newShift, currentShifts, currentOrg);
    if (warnings.length > 0) {
      setFatigueAlerts((prev) => [...warnings, ...prev]);
    }

    setShifts((prev) => [newShift, ...prev]);
    return { shift: newShift, warnings };
  };

  const requestSkillVerification = (skillId: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, isVerified: false } : s))
    );
  };

  const verifySkill = (skillId: string, verifiedBy: string) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId
          ? {
              ...s,
              isVerified: true,
              verifiedBy,
              verificationDate: new Date().toISOString().split('T')[0],
            }
          : s
      )
    );
  };

  const submitWorkerFeedback = (
    category: WorkerFeedback['category'],
    rating: number,
    comment: string,
    isAnonymous: boolean
  ) => {
    const newFb: WorkerFeedback = {
      id: `fb-${Date.now()}`,
      orgId: selectedOrgId,
      workerId: isAnonymous ? undefined : activeWorker.id,
      isAnonymous,
      category,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    setFeedbacks((prev) => [newFb, ...prev]);
  };

  const resetToDefaultData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShifts(SHIFTS);
    setAttendance(ATTENDANCE_RECORDS);
    setPayroll(PAYROLL_RECORDS);
    setDiscrepancies(PAYROLL_DISCREPANCIES);
    setSafetyReports(SAFETY_REPORTS);
    setSkills(SKILL_CREDENTIALS);
    setFatigueAlerts(FATIGUE_ALERTS);
    setFeedbacks(WORKER_FEEDBACKS);
    setSelectedOrgId('org-apex-construction');
    setActiveRole('worker');
    setActiveWorkerIdState('w-apex-1');
  };

  return (
    <StoreContext.Provider
      value={{
        currentOrg,
        selectedOrgId,
        activeRole,
        activeWorker,
        activeWorkerId,
        language,
        t: translations[language] || translations.en,
        isDemoMode: true,

        organizations: ORGANIZATIONS,
        workers: orgWorkers,
        shifts: currentShifts,
        attendanceRecords: currentAttendance,
        payrollRecords: currentPayroll,
        discrepancies: currentDiscrepancies,
        safetyReports:
          activeRole === 'admin'
            ? currentSafety.map(sanitizeSafetyReportForManager)
            : currentSafety,
        skillCredentials: currentSkills,
        fatigueAlerts: currentFatigue,
        feedbacks: currentFeedback,
        scorecard,

        setOrg: handleSetOrg,
        setRole: setActiveRole,
        setActiveWorkerId: setActiveWorkerIdState,
        setLanguage,

        checkInShift,
        checkOutShift,
        submitSafetyReport,
        updateSafetyReportStatus,
        raiseDiscrepancy,
        resolveDiscrepancy,
        resolveFatigueAlert,
        addShift,
        requestSkillVerification,
        verifySkill,
        submitWorkerFeedback,
        resetToDefaultData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useFairShiftStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useFairShiftStore must be used within StoreProvider');
  }
  return context;
};
