'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  HardHat,
  HelpCircle,
  Mic,
  MicOff,
  PhoneCall,
  QrCode,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Volume2,
} from 'lucide-react';
import { SafetyCategory, SafetySeverity, Shift } from '@/types';
import { useFairShiftStore } from '@/lib/data/store';
import { QRCodeModal } from '../common/QRCodeModal';

export const WorkerPortal: React.FC = () => {
  const {
    currentOrg,
    activeWorker,
    shifts,
    attendanceRecords,
    payrollRecords,
    discrepancies,
    safetyReports,
    skillCredentials,
    checkInShift,
    checkOutShift,
    submitSafetyReport,
    raiseDiscrepancy,
    requestSkillVerification,
    submitWorkerFeedback,
    t,
    language,
  } = useFairShiftStore();

  const [activeTab, setActiveTab] = useState<'home' | 'shifts' | 'attendance' | 'pay' | 'safety' | 'skills' | 'feedback'>('home');
  const [selectedShiftForQr, setSelectedShiftForQr] = useState<Shift | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Safety Form State
  const [safetyCategory, setSafetyCategory] = useState<SafetyCategory>('equipment');
  const [safetySeverity, setSafetySeverity] = useState<SafetySeverity>('high');
  const [safetyTitle, setSafetyTitle] = useState('');
  const [safetyDescription, setSafetyDescription] = useState('');
  const [safetyLocation, setSafetyLocation] = useState(activeWorker.site);
  const [safetyAnonymous, setSafetyAnonymous] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [safetySubmittedCode, setSafetySubmittedCode] = useState<string | null>(null);

  // Discrepancy Form State
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>('');
  const [discrepancyType, setDiscrepancyType] = useState<'missing_overtime' | 'incorrect_rate' | 'wrong_deduction' | 'unrecorded_shift'>('missing_overtime');
  const [claimedHours, setClaimedHours] = useState('2');
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackCategory, setFeedbackCategory] = useState<'workload' | 'supervisor_treatment' | 'facilities' | 'timely_pay' | 'safety_climate'>('facilities');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Filter shifts and records for active worker
  const workerShifts = shifts.filter((s) => s.assignedWorkerId === activeWorker.id);
  const workerAttendance = attendanceRecords.filter((a) => a.workerId === activeWorker.id);
  const workerPayroll = payrollRecords.filter((p) => p.workerId === activeWorker.id);
  const workerDiscrepancies = discrepancies.filter((d) => d.workerId === activeWorker.id);
  const workerSkills = skillCredentials.filter((s) => s.workerId === activeWorker.id);

  // Find active or upcoming shift
  const today = '2026-10-27';
  const activeShift = workerShifts.find((s) => s.status === 'in_progress' || s.date === today) || workerShifts[0];
  const activeAttendance = activeShift
    ? workerAttendance.find((a) => a.shiftId === activeShift.id && a.status === 'checked_in')
    : null;

  // Active site safety alerts
  const siteHazards = safetyReports.filter(
    (r) => r.status !== 'resolved' && (r.locationSite.toLowerCase().includes(activeWorker.site.toLowerCase()) || r.severity === 'critical')
  );

  // Voice Recognition Handler (Web Speech API)
  const toggleVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    // Check if browser supports SpeechRecognition
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not natively supported by this browser. Please type your description in the box.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSafetyDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed', e);
      setIsRecording(false);
    }
  };

  const handleClockIn = (shift: Shift) => {
    const res = checkInShift(shift.id, 'manual');
    if (res.success) {
      try {
        confetti({ particleCount: 60, spread: 50 });
      } catch {}
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const handleClockOut = (shift: Shift) => {
    const res = checkOutShift(shift.id);
    if (res.success) {
      try {
        confetti({ particleCount: 80, spread: 70 });
      } catch {}
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const handleSafetySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyTitle.trim() || !safetyDescription.trim()) {
      alert('Please provide a hazard title and brief description.');
      return;
    }

    const report = submitSafetyReport({
      category: safetyCategory,
      severity: safetySeverity,
      title: safetyTitle,
      description: safetyDescription,
      locationSite: safetyLocation,
      isAnonymous: safetyAnonymous,
      voiceTranscript: isRecording ? safetyDescription : undefined,
    });

    setSafetySubmittedCode(report.reportCode);
    setSafetyTitle('');
    setSafetyDescription('');
    try {
      confetti({ particleCount: 50 });
    } catch {}
  };

  const handleDiscrepancySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollId || !discrepancyReason.trim()) {
      alert('Please fill in the discrepancy details.');
      return;
    }

    const claimedHoursNum = parseFloat(claimedHours) || 0;
    const targetPayroll = workerPayroll.find((p) => p.id === selectedPayrollId);
    const hourlyRate = targetPayroll ? targetPayroll.overtimeRate : activeWorker.hourlyRate * currentOrg.settings.overtimeMultiplier;

    raiseDiscrepancy({
      payrollId: selectedPayrollId,
      discrepancyType,
      claimedHours: claimedHoursNum,
      claimedAmount: claimedHoursNum * hourlyRate,
      reason: discrepancyReason,
    });

    setIsDiscrepancyModalOpen(false);
    setDiscrepancyReason('');
    setActionFeedback(t.discrepancySuccess);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitWorkerFeedback(feedbackCategory, feedbackRating, feedbackComment, true);
    setFeedbackSubmitted(true);
    setFeedbackComment('');
    setTimeout(() => setFeedbackSubmitted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12">
      {/* Worker Header Card */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 px-4 py-5 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-13 h-13 rounded-2xl bg-teal-500/20 border-2 border-teal-500/40 overflow-hidden flex items-center justify-center shadow-inner">
              {activeWorker.avatarUrl ? (
                <img src={activeWorker.avatarUrl} alt={activeWorker.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-teal-400" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-white">{activeWorker.fullName}</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                  {activeWorker.employeeCode}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                {activeWorker.role} • {activeWorker.department}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Site: {activeWorker.site}</p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-400">Base Hourly Rate</span>
            <span className="text-lg font-bold text-teal-400 font-mono">
              {currentOrg.settings.currencySymbol}
              {activeWorker.hourlyRate}/hr
            </span>
            <span className="text-[10px] text-slate-500">
              Overtime: {currentOrg.settings.overtimeMultiplier}x ({currentOrg.settings.currencySymbol}
              {activeWorker.hourlyRate * currentOrg.settings.overtimeMultiplier}/hr)
            </span>
          </div>
        </div>
      </div>

      {/* Floating Action Feedback Banner */}
      {actionFeedback && (
        <div className="max-w-4xl mx-auto px-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 bg-teal-950/90 border border-teal-500/40 rounded-xl text-xs sm:text-sm text-teal-200 flex items-center space-x-2 shadow-lg">
            <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-5">
        {/* Navigation Tabs (Desktop & Tablet) */}
        <div className="hidden md:flex space-x-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl mb-6 overflow-x-auto">
          {[
            { id: 'home', label: t.home, icon: Clock },
            { id: 'shifts', label: t.myShifts, icon: Calendar },
            { id: 'attendance', label: t.attendance, icon: CheckCircle },
            { id: 'pay', label: t.myPay, icon: DollarSign },
            { id: 'safety', label: t.reportSafety, icon: AlertTriangle },
            { id: 'skills', label: t.mySkills, icon: Award },
            { id: 'feedback', label: t.feedback, icon: Volume2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: HOME */}
        {/* ============================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Active / Assigned Shift Hero Card */}
            {activeShift ? (
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {t.currentShift}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-2.5">
                      {activeShift.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center space-x-1">
                      <span>📍 {activeShift.siteLocation}</span>
                      <span>•</span>
                      <span>{activeShift.plannedHours}h planned</span>
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      activeAttendance
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {activeAttendance ? '● CLOCKED IN' : 'SCHEDULED'}
                  </span>
                </div>

                {/* Shift Hours & Clock Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Scheduled Time</span>
                    <p className="text-base font-bold text-white font-mono mt-0.5">
                      {activeShift.startTime} - {activeShift.endTime}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {activeAttendance ? t.checkedInAt : 'Check-In Status'}
                    </span>
                    <p className="text-base font-bold text-teal-300 font-mono mt-0.5">
                      {activeAttendance ? activeAttendance.checkInTime : 'Not Clocked In'}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-slate-400 font-medium">{t.estimatedEarnedToday}</span>
                    <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                      ~{currentOrg.settings.currencySymbol}
                      {(activeShift.plannedHours * activeWorker.hourlyRate).toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Required PPE Checklist */}
                {activeShift.requiredPpe && activeShift.requiredPpe.length > 0 && (
                  <div className="mb-5 bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5">
                    <div className="flex items-center space-x-1.5 text-amber-300 text-xs font-bold mb-2">
                      <HardHat className="w-4 h-4" />
                      <span>Mandatory PPE For This Shift:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeShift.requiredPpe.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-slate-900/90 text-amber-200 border border-amber-500/20 px-2.5 py-1 rounded-lg"
                        >
                          ✓ {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Big Touch Target Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {!activeAttendance ? (
                    <>
                      <button
                        onClick={() => setSelectedShiftForQr(activeShift)}
                        className="w-full py-4 px-5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-base shadow-lg shadow-teal-500/30 flex items-center justify-center space-x-2.5 transition-all transform active:scale-[0.98]"
                      >
                        <QrCode className="w-5 h-5" />
                        <span>{t.scanQrCode}</span>
                      </button>

                      <button
                        onClick={() => handleClockIn(activeShift)}
                        className="w-full py-4 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
                      >
                        <Clock className="w-4 h-4 text-teal-400" />
                        <span>{t.manualCheckInFallback}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleClockOut(activeShift)}
                      className="w-full sm:col-span-2 py-4 px-5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black rounded-xl text-base shadow-lg shadow-rose-900/40 flex items-center justify-center space-x-2.5 transition-all transform active:scale-[0.98]"
                    >
                      <Clock className="w-5 h-5" />
                      <span>{t.checkOut} & Record Worked Hours</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h3 className="font-bold text-base text-slate-300">{t.noActiveShift}</h3>
                <p className="text-xs text-slate-500 mt-1">Check back later or view upcoming shifts tab.</p>
              </div>
            )}

            {/* Quick Safety Alert Banner (if site has open hazard) */}
            {siteHazards.length > 0 && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4.5 flex items-start space-x-3.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-rose-300">
                      Active Workplace Hazard Alert ({siteHazards.length})
                    </h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded">
                      High Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{siteHazards[0].title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Location: {siteHazards[0].locationSite}</p>
                  <button
                    onClick={() => setActiveTab('safety')}
                    className="text-xs text-teal-400 hover:text-teal-300 font-bold mt-2 inline-flex items-center space-x-1"
                  >
                    <span>View all hazards or submit a report →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              <div
                onClick={() => setActiveTab('pay')}
                className="bg-slate-900 border border-slate-800 hover:border-teal-500/40 rounded-xl p-4 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between text-teal-400 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-[10px] font-semibold text-slate-400">Latest Pay</span>
                </div>
                <p className="text-lg sm:text-xl font-bold font-mono text-white">
                  {currentOrg.settings.currencySymbol}
                  {workerPayroll[0]?.estimatedNetPay.toLocaleString() || '14,132'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Status:{' '}
                  <span className="text-amber-400 font-semibold">{workerPayroll[0]?.status || 'Disputed'}</span>
                </p>
              </div>

              <div
                onClick={() => setActiveTab('skills')}
                className="bg-slate-900 border border-slate-800 hover:border-teal-500/40 rounded-xl p-4 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between text-cyan-400 mb-2">
                  <Award className="w-5 h-5" />
                  <span className="text-[10px] font-semibold text-slate-400">Skill Passport</span>
                </div>
                <p className="text-lg sm:text-xl font-bold font-mono text-white">
                  {workerSkills.filter((s) => s.isVerified).length} / {workerSkills.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Verified Credentials</p>
              </div>
            </div>

            {/* Upcoming Shifts Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span>{t.upcomingShifts}</span>
              </h3>
              <div className="space-y-2.5">
                {workerShifts.slice(1, 3).map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/80"
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-200">{shift.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {shift.date} • {shift.startTime} - {shift.endTime} ({shift.plannedHours}h)
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium">
                      {shift.siteLocation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MY SHIFTS */}
        {/* ============================================================== */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">{t.myShifts}</h2>
              <span className="text-xs text-slate-400">{workerShifts.length} Assigned Shifts</span>
            </div>

            {workerShifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-teal-300 rounded">
                      {shift.date}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{shift.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Location: {shift.siteLocation}</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                      shift.status === 'completed'
                        ? 'bg-slate-800 text-slate-300'
                        : shift.status === 'in_progress'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {shift.status}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-300 mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>
                      {shift.startTime} - {shift.endTime} ({shift.plannedHours} hrs)
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono text-slate-400">{shift.qrToken}</span>
                  </div>
                </div>

                {shift.notes && (
                  <p className="text-xs text-amber-300/80 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg mt-3">
                    ℹ️ Note: {shift.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ATTENDANCE */}
        {/* ============================================================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">{t.attendance}</h2>
              <span className="text-xs text-slate-400">{workerAttendance.length} Records</span>
            </div>

            {workerAttendance.map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    <span className="font-bold text-sm text-white">{rec.date}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      rec.status === 'overtime'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : rec.status === 'missing_checkout'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {rec.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block">Check-In</span>
                    <span className="font-mono font-bold text-slate-200">{rec.checkInTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Check-Out</span>
                    <span className="font-mono font-bold text-slate-200">
                      {rec.checkOutTime || 'Active / None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Regular Hours</span>
                    <span className="font-mono font-bold text-slate-200">{rec.regularHoursWorked}h</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Overtime Hours</span>
                    <span className="font-mono font-bold text-teal-400">
                      {rec.overtimeHoursWorked > 0 ? `+${rec.overtimeHoursWorked}h` : '0h'}
                    </span>
                  </div>
                </div>

                {rec.status === 'missing_checkout' && (
                  <div className="mt-3 bg-rose-950/30 border border-rose-500/30 p-2.5 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-rose-300">
                      Missing check-out flagged. Correction requested.
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                      Under Review
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MY PAY & TRANSPARENT PAYSLIP */}
        {/* ============================================================== */}
        {activeTab === 'pay' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{t.myPay}</h2>
                <p className="text-xs text-slate-400">Deterministic calculation breakdown with verified hours</p>
              </div>

              <button
                onClick={() => {
                  setSelectedPayrollId(workerPayroll[0]?.id || '');
                  setIsDiscrepancyModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t.raiseDiscrepancy}</span>
              </button>
            </div>

            {/* Active Discrepancy Alert */}
            {workerDiscrepancies.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>{t.discrepancyPending}</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {workerDiscrepancies[0].status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5">{workerDiscrepancies[0].reason}</p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                  <span>Claimed: {workerDiscrepancies[0].claimedHours} hours overtime</span>
                  <span>•</span>
                  <span>
                    Claimed Payout: ~{currentOrg.settings.currencySymbol}
                    {workerDiscrepancies[0].claimedAmount}
                  </span>
                </div>
              </div>
            )}

            {/* Transparent Payslip Card */}
            {workerPayroll.map((pay) => (
              <div
                key={pay.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Payroll Period</span>
                    <h3 className="text-base font-bold text-white font-mono mt-0.5">
                      {pay.periodStart} to {pay.periodEnd}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                      pay.status === 'approved' || pay.status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {pay.status}
                  </span>
                </div>

                {/* Calculation Breakdown Grid */}
                <div className="space-y-3.5 my-5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-300">
                      {t.baseEarnings} ({pay.regularHours}h @ {currentOrg.settings.currencySymbol}
                      {pay.regularHourlyRate}/hr)
                    </span>
                    <span className="font-mono font-bold text-white">
                      {currentOrg.settings.currencySymbol}
                      {pay.baseEarnings.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs sm:text-sm bg-teal-950/20 p-2.5 rounded-lg border border-teal-500/20">
                    <div>
                      <span className="text-teal-300 font-semibold">{t.overtimeEarnings}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {pay.overtimeHours}h @ {currentOrg.settings.currencySymbol}
                        {pay.overtimeRate}/hr ({currentOrg.settings.overtimeMultiplier}x mandatory multiplier)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-teal-300">
                      +{currentOrg.settings.currencySymbol}
                      {pay.overtimeEarnings.toLocaleString()}
                    </span>
                  </div>

                  {pay.bonuses > 0 && (
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-300">{t.bonusesAllowances}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{currentOrg.settings.currencySymbol}
                        {pay.bonuses.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs sm:text-sm text-slate-400">
                    <div>
                      <span>{t.deductions}</span>
                      <span className="text-[10px] text-slate-500 block">
                        EPF 12% ({currentOrg.settings.currencySymbol}
                        {pay.breakdown.epfDeduction}) + ESI 0.75% ({currentOrg.settings.currencySymbol}
                        {pay.breakdown.insuranceDeduction})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-400">
                      -{currentOrg.settings.currencySymbol}
                      {pay.deductions.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Net Pay Total */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {t.estimatedNetPay}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {currentOrg.settings.currencySymbol}
                      {pay.estimatedNetPay.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Audited Deterministic Slip</span>
                    <span className="text-xs text-teal-400 font-semibold">SDG 8 Fair Pay Verified ✓</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: REPORT WORKPLACE HAZARD (SAFETY) */}
        {/* ============================================================== */}
        {activeTab === 'safety' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">{t.reportHazardTitle}</h2>
              <p className="text-xs text-slate-400">
                Zero-retaliation reporting with privacy-preserving identity shielding
              </p>
            </div>

            {/* Emergency Hotline Notice */}
            <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>{t.emergencyNotice}</span>
              </div>
              <a
                href={`tel:${currentOrg.settings.emergencyHotline}`}
                className="font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-1 rounded"
              >
                {currentOrg.settings.emergencyHotline}
              </a>
            </div>

            {/* Submission Confirmation Card */}
            {safetySubmittedCode && (
              <div className="bg-emerald-950/80 border border-emerald-500 rounded-2xl p-5 text-emerald-200">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
                  <CheckCircle className="w-5 h-5" />
                  <span>Hazard Report Submitted Successfully!</span>
                </div>
                <p className="text-xs text-slate-300">
                  {t.reportSubmittedSuccess}{' '}
                  <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2 py-0.5 rounded">
                    {safetySubmittedCode}
                  </span>
                </p>
                <p className="text-[11px] text-emerald-300/80 mt-2">
                  Your safety report has entered the supervisor compliance board. If you chose anonymous reporting,
                  your personal identity has been cryptographically isolated.
                </p>
                <button
                  onClick={() => setSafetySubmittedCode(null)}
                  className="mt-3 text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg"
                >
                  Submit Another Report
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSafetySubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              {/* Category Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">{t.category}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'equipment', label: 'Equipment & Hoist' },
                    { id: 'electrical', label: 'Electrical MEP' },
                    { id: 'slips_trips', label: 'Slips & Falls' },
                    { id: 'ppe', label: 'PPE Defect' },
                    { id: 'sanitation', label: 'Sanitation / Chemical' },
                    { id: 'heat_stress', label: 'Heat & Dehydration' },
                    { id: 'harassment', label: 'Workplace Conduct' },
                    { id: 'other', label: 'Other Hazard' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSafetyCategory(cat.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                        safetyCategory === cat.id
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">{t.severity}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'low', label: 'Low', color: 'text-slate-300' },
                    { id: 'medium', label: 'Medium', color: 'text-amber-300' },
                    { id: 'high', label: 'High', color: 'text-orange-400' },
                    { id: 'critical', label: 'Critical Life Risk', color: 'text-rose-400' },
                  ].map((sev) => (
                    <button
                      key={sev.id}
                      type="button"
                      onClick={() => setSafetySeverity(sev.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold text-center border ${
                        safetySeverity === sev.id
                          ? 'bg-slate-800 border-teal-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      } ${sev.color}`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hazard Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scaffolding clamp loose on 4th floor"
                    value={safetyTitle}
                    onChange={(e) => setSafetyTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">{t.location}</label>
                  <input
                    type="text"
                    required
                    value={safetyLocation}
                    onChange={(e) => setSafetyLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Description & Voice-to-Text Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">{t.description}</label>
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecording ? t.stopVoiceRecording : t.startVoiceRecording}</span>
                  </button>
                </div>

                {isRecording && (
                  <p className="text-xs text-rose-400 mb-2 font-medium animate-pulse">
                    ● {t.listening}
                  </p>
                )}

                <textarea
                  rows={3}
                  required
                  placeholder={t.descriptionPlaceholder}
                  value={safetyDescription}
                  onChange={(e) => setSafetyDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Anonymous Shield Toggle */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-teal-500/30 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={safetyAnonymous}
                  onChange={(e) => setSafetyAnonymous(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded bg-slate-800 border-slate-700 focus:ring-teal-500"
                />
                <label htmlFor="anonCheck" className="text-xs cursor-pointer">
                  <span className="font-bold text-teal-300 block">{t.anonymousToggle}</span>
                  <span className="text-slate-400 block mt-0.5">{t.anonymousGuarantee}</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-teal-500/20"
              >
                {t.submitReport}
              </button>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: MY SKILLS (DIGITAL SKILL PASSPORT) */}
        {/* ============================================================== */}
        {activeTab === 'skills' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{t.mySkills}</h2>
                <p className="text-xs text-slate-400">
                  Worker-owned verifiable credentials & safety accreditations
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {workerSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-teal-400" />
                        <h3 className="font-bold text-base text-white">{skill.skillName}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Issuing Body: <span className="text-slate-300 font-medium">{skill.issuingBody}</span>
                      </p>
                      {skill.certificateRef && (
                        <p className="text-[11px] font-mono text-teal-300/80 mt-0.5">
                          Ref: {skill.certificateRef}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center space-x-1 ${
                        skill.isVerified
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>{skill.isVerified ? t.verifiedBadge : t.unverifiedBadge}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800">
                    <span>Issued: {skill.issueDate}</span>
                    {skill.expiryDate ? (
                      <span>Valid until: {skill.expiryDate}</span>
                    ) : (
                      <span>Lifetime Validity</span>
                    )}
                  </div>

                  {!skill.isVerified && (
                    <button
                      onClick={() => {
                        requestSkillVerification(skill.id);
                        alert('Verification request sent to your site operations manager.');
                      }}
                      className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-bold rounded-xl transition-colors border border-amber-500/20"
                    >
                      {t.requestVerification}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: WORKER VOICE / FEEDBACK */}
        {/* ============================================================== */}
        {activeTab === 'feedback' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">{t.feedback}</h2>
              <p className="text-xs text-slate-400">
                Share constructive suggestions on site facilities, climate, and supervision
              </p>
            </div>

            {feedbackSubmitted && (
              <div className="p-4 bg-teal-950/80 border border-teal-500 rounded-xl text-xs text-teal-300 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                <span>Thank you! Your feedback will be reviewed anonymously in the Fairness Scorecard.</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Feedback Topic</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white"
                >
                  <option value="facilities">Drinking Water, Heat Relief & Lockers</option>
                  <option value="workload">Shift Pace & Rest Breaks</option>
                  <option value="supervisor_treatment">Supervisor Respect & Communication</option>
                  <option value="timely_pay">Transparent Pay & Allowances</option>
                  <option value="safety_climate">Safety Equipment Availability</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Overall Experience</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        feedbackRating >= star ? 'text-amber-400' : 'text-slate-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Your Comments</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Need more shade or cold drinking water near pier 42 during afternoon heat..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-sm transition-all"
              >
                Submit Anonymous Voice
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* ============================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-1.5 flex justify-around">
        {[
          { id: 'home', label: t.home, icon: Clock },
          { id: 'shifts', label: 'Shifts', icon: Calendar },
          { id: 'attendance', label: 'Attend', icon: CheckCircle },
          { id: 'pay', label: 'Pay', icon: DollarSign },
          { id: 'safety', label: 'Safety', icon: AlertTriangle },
          { id: 'skills', label: 'Skills', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                isActive ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Discrepancy Modal */}
      {isDiscrepancyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="font-bold text-lg text-amber-300 mb-1">{t.raiseDiscrepancy}</h3>
            <p className="text-xs text-slate-400 mb-4">
              Submit your uncredited hours for management review and supplementary payment
            </p>

            <form onSubmit={handleDiscrepancySubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t.discrepancyType}
                </label>
                <select
                  value={discrepancyType}
                  onChange={(e) => setDiscrepancyType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="missing_overtime">Missing / Uncredited Overtime Hours</option>
                  <option value="incorrect_rate">Incorrect Base Hourly Rate Applied</option>
                  <option value="unrecorded_shift">Completed Shift Not Listed in Record</option>
                  <option value="wrong_deduction">Excessive Statutory Deduction</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t.claimedHours}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={claimedHours}
                  onChange={(e) => setClaimedHours(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reason & Dates
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t.discrepancyReasonPlaceholder}
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDiscrepancyModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs"
                >
                  {t.submitDiscrepancy}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal for Verification */}
      {selectedShiftForQr && (
        <QRCodeModal
          shift={selectedShiftForQr}
          isOpen={true}
          onClose={() => setSelectedShiftForQr(null)}
          onSuccessCheckIn={() => checkInShift(selectedShiftForQr.id, 'qr_scanner')}
        />
      )}
    </div>
  );
};
