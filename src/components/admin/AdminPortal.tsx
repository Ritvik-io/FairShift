'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Filter,
  GraduationCap,
  HardHat,
  HelpCircle,
  Layers,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SafetyCategory, SafetySeverity, SafetyStatus, Shift } from '@/types';
import { useFairShiftStore } from '@/lib/data/store';

export const AdminPortal: React.FC = () => {
  const {
    currentOrg,
    workers,
    shifts,
    attendanceRecords,
    payrollRecords,
    discrepancies,
    safetyReports,
    fatigueAlerts,
    skillCredentials,
    feedbacks,
    scorecard,
    updateSafetyReportStatus,
    resolveDiscrepancy,
    resolveFatigueAlert,
    addShift,
    verifySkill,
    t,
  } = useFairShiftStore();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'workforce'
    | 'shifts'
    | 'attendance'
    | 'payroll'
    | 'safety'
    | 'fatigue'
    | 'scorecard'
    | 'analytics'
    | 'settings'
  >('overview');

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState(false);
  const [newShiftTitle, setNewShiftTitle] = useState('');
  const [newShiftDept, setNewShiftDept] = useState(workers[0]?.department || 'Civil Structural');
  const [newShiftSite, setNewShiftSite] = useState(workers[0]?.site || 'Site Location A');
  const [newShiftWorkerId, setNewShiftWorkerId] = useState(workers[0]?.id || '');
  const [newShiftDate, setNewShiftDate] = useState('2026-10-27');
  const [newShiftStart, setNewShiftStart] = useState('08:00');
  const [newShiftEnd, setNewShiftEnd] = useState('16:30');
  const [shiftWarningFeedback, setShiftWarningFeedback] = useState<string | null>(null);

  // Resolution Notes Modal
  const [resolvingHazardId, setResolvingHazardId] = useState<string | null>(null);
  const [hazardResolutionNote, setHazardResolutionNote] = useState('');

  const [resolvingDiscrepancyId, setResolvingDiscrepancyId] = useState<string | null>(null);
  const [discrepancyResolutionNote, setDiscrepancyResolutionNote] = useState('');

  const [resolvingFatigueId, setResolvingFatigueId] = useState<string | null>(null);
  const [fatigueResolutionNote, setFatigueResolutionNote] = useState('');

  // Departments in current org
  const departments = Array.from(new Set(workers.map((w) => w.department)));

  // Filtered collections
  const filteredWorkers = workers.filter((w) => {
    const matchesDept = departmentFilter === 'all' || w.department === departmentFilter;
    const matchesSearch =
      w.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const filteredShifts = shifts.filter((s) => {
    const matchesDept = departmentFilter === 'all' || s.department === departmentFilter;
    return matchesDept;
  });

  const filteredAttendance = attendanceRecords.filter((a) => {
    const worker = workers.find((w) => w.id === a.workerId);
    return !worker || departmentFilter === 'all' || worker.department === departmentFilter;
  });

  // KPI Calculations
  const totalWorkers = workers.length;
  const presentToday = attendanceRecords.filter((a) => a.status === 'checked_in' || a.status === 'completed' || a.status === 'overtime').length;
  const overtimeExceptions = attendanceRecords.filter((a) => a.overtimeHoursWorked > 0).length;
  const unresolvedHazards = safetyReports.filter((r) => r.status !== 'resolved').length;
  const pendingDiscrepancies = discrepancies.filter((d) => d.status === 'under_review').length;
  const activeFatigueBreaches = fatigueAlerts.filter((f) => !f.isResolved).length;

  // Chart Data: Scheduled vs Worked Hours by Department
  const deptHoursData = departments.map((dept) => {
    const deptWorkers = workers.filter((w) => w.department === dept);
    const workerIds = deptWorkers.map((w) => w.id);
    const deptShifts = shifts.filter((s) => workerIds.includes(s.assignedWorkerId));
    const deptAttendance = attendanceRecords.filter((a) => workerIds.includes(a.workerId));

    const scheduledHours = deptShifts.reduce((acc, s) => acc + s.plannedHours, 0);
    const workedHours = deptAttendance.reduce((acc, a) => acc + a.regularHoursWorked + a.overtimeHoursWorked, 0);

    return {
      department: dept.length > 12 ? `${dept.slice(0, 10)}..` : dept,
      Scheduled: Math.round(scheduledHours),
      Worked: Math.round(workedHours),
    };
  });

  // Chart Data: Safety Hazards by Category
  const hazardCategoryData = [
    { name: 'Equipment', count: safetyReports.filter((r) => r.category === 'equipment').length },
    { name: 'Electrical', count: safetyReports.filter((r) => r.category === 'electrical').length },
    { name: 'PPE', count: safetyReports.filter((r) => r.category === 'ppe').length },
    { name: 'Slips/Falls', count: safetyReports.filter((r) => r.category === 'slips_trips').length },
    { name: 'Sanitation', count: safetyReports.filter((r) => r.category === 'sanitation').length },
  ].filter((d) => d.count > 0);

  const PIE_COLORS = ['#14b8a6', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftTitle || !newShiftWorkerId) return;

    const res = addShift({
      title: newShiftTitle,
      department: newShiftDept,
      siteLocation: newShiftSite,
      assignedWorkerId: newShiftWorkerId,
      date: newShiftDate,
      startTime: newShiftStart,
      endTime: newShiftEnd,
      plannedHours: 8.5,
      requiredPpe: ['Hard Hat', 'Safety Shoes'],
    });

    if (res.warnings.length > 0) {
      setShiftWarningFeedback(
        `Shift created! Fatigue Alert Flagged: ${res.warnings[0].title}. Please review in the Fatigue Alerts tab.`
      );
    } else {
      setShiftWarningFeedback('Shift scheduled successfully with zero fatigue violations!');
    }

    setTimeout(() => {
      setIsNewShiftModalOpen(false);
      setShiftWarningFeedback(null);
      setNewShiftTitle('');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR NAVIGATION */}
      {/* ============================================================== */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">Operations Portal</span>
              <span className="text-[11px] text-slate-400 block truncate max-w-[170px]">
                {currentOrg.name}
              </span>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {[
            { id: 'overview', label: t.overview, icon: Layers },
            { id: 'scorecard', label: t.fairnessScorecard, icon: Award, badge: `${scorecard.overallScore}%` },
            { id: 'shifts', label: t.shiftManagement, icon: Calendar },
            { id: 'workforce', label: t.workforce, icon: Users },
            { id: 'attendance', label: t.attendanceAudit, icon: Clock, badge: overtimeExceptions ? `${overtimeExceptions}` : undefined },
            { id: 'payroll', label: t.payrollReview, icon: DollarSign, badge: pendingDiscrepancies ? `${pendingDiscrepancies}` : undefined },
            { id: 'safety', label: t.safetyReports, icon: AlertTriangle, badge: unresolvedHazards ? `${unresolvedHazards}` : undefined },
            { id: 'fatigue', label: t.fatigueAlerts, icon: ShieldAlert, badge: activeFatigueBreaches ? `${activeFatigueBreaches}` : undefined },
            { id: 'analytics', label: t.analytics, icon: BarChart3 },
            { id: 'settings', label: t.settings, icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      item.id === 'scorecard'
                        ? 'bg-teal-500/30 text-teal-300'
                        : 'bg-rose-500/30 text-rose-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Org Footer */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <p className="font-semibold text-slate-400">Policy: {currentOrg.industry.toUpperCase()}</p>
          <p className="text-[11px] mt-0.5">Overtime: {currentOrg.settings.overtimeMultiplier}x • Max 48h/wk</p>
          <p className="text-[11px]">Rest Interval: ≥{currentOrg.settings.minRestBetweenShiftsHours}h</p>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN ADMIN CONTENT AREA */}
      {/* ============================================================== */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Top Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white capitalize">
                {activeTab.replace('_', ' ')}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-slate-700 font-semibold">
                {currentOrg.code} • {currentOrg.industry}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Workforce compliance & fair work monitoring dashboard
            </p>
          </div>

          {/* Department Filter & Action */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                aria-label="Filter by department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Departments ({workers.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsNewShiftModalOpen(true)}
              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Shift</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: OVERVIEW */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Total Workforce</span>
                  <Users className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-2xl font-bold font-mono text-white">{totalWorkers}</p>
                <p className="text-[11px] text-teal-400 mt-1">100% contracts registered</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Present Today</span>
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-2xl font-bold font-mono text-white">
                  {presentToday} / {totalWorkers}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {((presentToday / totalWorkers) * 100).toFixed(0)}% attendance rate
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Unresolved Hazards</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-2xl font-bold font-mono text-rose-400">{unresolvedHazards}</p>
                <p className="text-[11px] text-rose-300/80 mt-1">Action required by Safety Marshal</p>
              </div>

              <div
                onClick={() => setActiveTab('scorecard')}
                className="bg-gradient-to-br from-teal-950/40 to-slate-900 border border-teal-500/40 rounded-2xl p-4.5 cursor-pointer hover:border-teal-400 transition-all shadow-lg shadow-teal-500/10"
              >
                <div className="flex items-center justify-between text-teal-300 mb-2">
                  <span className="text-xs font-bold uppercase">Fairness Score</span>
                  <Award className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-2xl font-black font-mono text-teal-300">{scorecard.overallScore} / 100</p>
                <p className="text-[11px] text-teal-200 mt-1">SDG 8 Decent Work Compliant →</p>
              </div>
            </div>

            {/* Quick Action Alerts Banner */}
            {(activeFatigueBreaches > 0 || pendingDiscrepancies > 0) && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-amber-300">
                      Compliance Attention Required
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {activeFatigueBreaches} fatigue warnings and {pendingDiscrepancies} employee pay
                      discrepancies require supervisory resolution.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {activeFatigueBreaches > 0 && (
                    <button
                      onClick={() => setActiveTab('fatigue')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                    >
                      Review Fatigue
                    </button>
                  )}
                  {pendingDiscrepancies > 0 && (
                    <button
                      onClick={() => setActiveTab('payroll')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg transition-colors"
                    >
                      Review Payroll
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scheduled vs Worked Hours */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4">
                  Scheduled vs Worked Hours (by Department)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="Scheduled" fill="#64748b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Worked" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hazard Distribution by Category */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4">Safety Hazards by Category</h3>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hazardCategoryData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {hazardCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FAIRNESS SCORECARD (MAIN DIFFERENTIATOR) */}
        {/* ============================================================== */}
        {activeTab === 'scorecard' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/60 border border-teal-500/40 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-bold text-teal-400 tracking-wider">
                    Core Platform Differentiator
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {t.scorecardTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                    {t.scorecardSubtitle}
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
                  <span className="text-xs text-slate-400 block">{t.overallFairnessScore}</span>
                  <span className="text-4xl sm:text-5xl font-black font-mono text-teal-300">
                    {scorecard.overallScore}%
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold block mt-1">
                    Rating: {scorecard.overallScore >= 80 ? 'Grade A - Exemplary' : 'Grade B - Active Progress'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800">
                ℹ️ {scorecard.methodologyNote}
              </p>
            </div>

            {/* 4 Dimension Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Dimension 1: Pay Transparency */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white">{t.payTransparencyTitle}</h3>
                  <span className="text-lg font-bold font-mono text-teal-400">
                    {scorecard.dimensions.payTransparency.score}/100
                  </span>
                </div>

                <p className="text-xs text-slate-400 my-3">
                  {scorecard.dimensions.payTransparency.formulaExplanation}
                </p>

                <div className="space-y-2 mb-4">
                  {scorecard.dimensions.payTransparency.supportingMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs p-2 bg-slate-950 rounded-lg border border-slate-800/80"
                    >
                      <span className="text-slate-300">{m.label}</span>
                      <span className="font-mono font-bold text-teal-300">{m.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-teal-950/30 border border-teal-500/20 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-teal-300 block mb-1">
                    {t.recommendedCorrectiveAction}:
                  </span>
                  <p className="text-xs text-slate-300">
                    {scorecard.dimensions.payTransparency.recommendedActions[0]}
                  </p>
                </div>
              </div>

              {/* Dimension 2: Workload Fairness */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white">{t.workloadFairnessTitle}</h3>
                  <span className="text-lg font-bold font-mono text-teal-400">
                    {scorecard.dimensions.workloadFairness.score}/100
                  </span>
                </div>

                <p className="text-xs text-slate-400 my-3">
                  {scorecard.dimensions.workloadFairness.formulaExplanation}
                </p>

                <div className="space-y-2 mb-4">
                  {scorecard.dimensions.workloadFairness.supportingMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs p-2 bg-slate-950 rounded-lg border border-slate-800/80"
                    >
                      <span className="text-slate-300">{m.label}</span>
                      <span className="font-mono font-bold text-amber-300">{m.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-amber-300 block mb-1">
                    {t.recommendedCorrectiveAction}:
                  </span>
                  <p className="text-xs text-slate-300">
                    {scorecard.dimensions.workloadFairness.recommendedActions[0]}
                  </p>
                </div>
              </div>

              {/* Dimension 3: Safety Responsiveness */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white">{t.safetyResponsivenessTitle}</h3>
                  <span className="text-lg font-bold font-mono text-teal-400">
                    {scorecard.dimensions.safetyResponsiveness.score}/100
                  </span>
                </div>

                <p className="text-xs text-slate-400 my-3">
                  {scorecard.dimensions.safetyResponsiveness.formulaExplanation}
                </p>

                <div className="space-y-2 mb-4">
                  {scorecard.dimensions.safetyResponsiveness.supportingMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs p-2 bg-slate-950 rounded-lg border border-slate-800/80"
                    >
                      <span className="text-slate-300">{m.label}</span>
                      <span className="font-mono font-bold text-cyan-300">{m.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-cyan-300 block mb-1">
                    {t.recommendedCorrectiveAction}:
                  </span>
                  <p className="text-xs text-slate-300">
                    {scorecard.dimensions.safetyResponsiveness.recommendedActions[0]}
                  </p>
                </div>
              </div>

              {/* Dimension 4: Worker Voice */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white">{t.workerVoiceTitle}</h3>
                  <span className="text-lg font-bold font-mono text-teal-400">
                    {scorecard.dimensions.workerVoice.score}/100
                  </span>
                </div>

                <p className="text-xs text-slate-400 my-3">
                  {scorecard.dimensions.workerVoice.formulaExplanation}
                </p>

                <div className="space-y-2 mb-4">
                  {scorecard.dimensions.workerVoice.supportingMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs p-2 bg-slate-950 rounded-lg border border-slate-800/80"
                    >
                      <span className="text-slate-300">{m.label}</span>
                      <span className="font-mono font-bold text-emerald-300">{m.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-emerald-300 block mb-1">
                    {t.recommendedCorrectiveAction}:
                  </span>
                  <p className="text-xs text-slate-300">
                    {scorecard.dimensions.workerVoice.recommendedActions[0]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: SHIFT MANAGEMENT & FATIGUE-AWARE SCHEDULER */}
        {/* ============================================================== */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Displaying {filteredShifts.length} scheduled and completed shifts
              </span>
              <button
                onClick={() => setIsNewShiftModalOpen(true)}
                className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule New Shift</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Shift Title</th>
                      <th className="px-4 py-3">Assigned Worker</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Site Location</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">QR Beacon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredShifts.map((shift) => {
                      const worker = workers.find((w) => w.id === shift.assignedWorkerId);
                      return (
                        <tr key={shift.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">{shift.title}</td>
                          <td className="px-4 py-3">
                            <span className="text-slate-200 block font-medium">
                              {worker?.fullName || 'Unassigned'}
                            </span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              {worker?.employeeCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className="text-slate-300 block">{shift.date}</span>
                            <span className="text-[11px] text-slate-400">
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{shift.siteLocation}</td>
                          <td className="px-4 py-3 font-mono">{shift.plannedHours}h</td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                shift.status === 'in_progress'
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                  : shift.status === 'completed'
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {shift.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {shift.qrToken}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: ATTENDANCE & OVERTIME AUDIT */}
        {/* ============================================================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Daily Attendance & Overtime Auditing</h3>
                  <p className="text-xs text-slate-400">
                    Scans verified check-ins, unrecorded overtime, and missing check-outs
                  </p>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                  {filteredAttendance.length} Total Records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Worker</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">In / Out</th>
                      <th className="px-4 py-3">Regular Hrs</th>
                      <th className="px-4 py-3">Overtime Hrs</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredAttendance.map((rec) => {
                      const worker = workers.find((w) => w.id === rec.workerId);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white block">
                              {worker?.fullName || rec.workerId}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {worker?.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">{rec.date}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">
                            {rec.checkInTime} → {rec.checkOutTime || 'Active'}
                          </td>
                          <td className="px-4 py-3 font-mono">{rec.regularHoursWorked}h</td>
                          <td className="px-4 py-3 font-mono">
                            {rec.overtimeHoursWorked > 0 ? (
                              <span className="text-amber-400 font-bold">
                                +{rec.overtimeHoursWorked}h ({currentOrg.settings.overtimeMultiplier}x)
                              </span>
                            ) : (
                              '0h'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {rec.checkInMethod === 'qr_scanner' ? 'Verified QR' : 'Manual Entry'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                rec.status === 'overtime'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : rec.status === 'missing_checkout'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {rec.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: PAYROLL REVIEW & DISCREPANCY RESOLUTION */}
        {/* ============================================================== */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            {/* Discrepancies Queue */}
            {discrepancies.length > 0 && (
              <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-amber-300 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Worker Pay Discrepancies Resolution Queue ({discrepancies.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400">Mandatory response under SDG 8.5</span>
                </div>

                <div className="space-y-3">
                  {discrepancies.map((disc) => {
                    const worker = workers.find((w) => w.id === disc.workerId);
                    return (
                      <div
                        key={disc.id}
                        className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-xs">{worker?.fullName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-teal-300 rounded">
                              {disc.discrepancyType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{disc.reason}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Claimed: {disc.claimedHours} hours • Payout Claim:{' '}
                            <span className="text-amber-400 font-bold font-mono">
                              {currentOrg.settings.currencySymbol}
                              {disc.claimedAmount}
                            </span>
                          </p>
                        </div>

                        {disc.status === 'under_review' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setResolvingDiscrepancyId(disc.id);
                                setDiscrepancyResolutionNote(
                                  `Approved ${disc.claimedHours} hours supplementary overtime credit.`
                                );
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors"
                            >
                              Resolve & Credit
                            </button>
                            <button
                              onClick={() => {
                                resolveDiscrepancy(
                                  disc.id,
                                  'rejected',
                                  'Biometric muster roll shows standard departure.'
                                );
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/20 px-2.5 py-1 rounded-full">
                            ✓ {disc.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payroll Sheets */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Audited Payroll Sheets</h3>
                <span className="text-xs text-slate-400">
                  Calculated at {currentOrg.settings.overtimeMultiplier}x Overtime Multiplier
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Worker</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Base Pay</th>
                      <th className="px-4 py-3">Overtime Pay</th>
                      <th className="px-4 py-3">EPF & ESI Deductions</th>
                      <th className="px-4 py-3">Net Pay</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {payrollRecords.map((pay) => {
                      const worker = workers.find((w) => w.id === pay.workerId);
                      return (
                        <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">
                            {worker?.fullName || pay.workerId}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">
                            {pay.periodStart} to {pay.periodEnd}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {currentOrg.settings.currencySymbol}
                            {pay.baseEarnings.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-teal-400">
                            +{currentOrg.settings.currencySymbol}
                            {pay.overtimeEarnings.toLocaleString()} ({pay.overtimeHours}h)
                          </td>
                          <td className="px-4 py-3 font-mono text-rose-400">
                            -{currentOrg.settings.currencySymbol}
                            {pay.deductions.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-white text-sm">
                            {currentOrg.settings.currencySymbol}
                            {pay.estimatedNetPay.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                pay.status === 'approved' || pay.status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {pay.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 6: SAFETY HAZARDS (PRIVACY PRESERVING) */}
        {/* ============================================================== */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {safetyReports.length} Total Hazards Reported • Zero Identity Disclosure for Anonymous Submissions
              </span>
            </div>

            <div className="space-y-3.5">
              {safetyReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                          {report.reportCode}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            report.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {report.severity} Severity
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          Category: {report.category.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-1.5">{report.title}</h3>
                      <p className="text-xs text-slate-300 mt-1">{report.description}</p>
                    </div>

                    <div className="flex flex-col sm:items-end">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                          report.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {report.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Site: {report.locationSite}
                      </span>
                    </div>
                  </div>

                  {/* Reporter Privacy Shield Banner */}
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800">
                    <Shield className="w-3.5 h-3.5 text-teal-400" />
                    <span>
                      Reporter:{' '}
                      <strong className="text-teal-300 font-medium">{report.reporterAlias}</strong>
                    </span>
                    {report.isAnonymous && (
                      <span className="text-[10px] bg-slate-800 text-teal-300 px-2 py-0.5 rounded-full font-semibold">
                        Identity Shield Active
                      </span>
                    )}
                  </div>

                  {/* Resolution Notes or Action Buttons */}
                  <div className="mt-3.5 flex items-center justify-between">
                    {report.resolutionNotes ? (
                      <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl w-full">
                        ✓ Resolution Note: {report.resolutionNotes}
                      </p>
                    ) : (
                      <div className="flex space-x-2">
                        {report.status !== 'in_progress' && (
                          <button
                            onClick={() =>
                              updateSafetyReportStatus(
                                report.id,
                                'in_progress',
                                'Site marshal inspected location.'
                              )
                            }
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold rounded-lg transition-colors"
                          >
                            Mark In Progress
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setResolvingHazardId(report.id);
                            setHazardResolutionNote('Hazard repaired, tested, and cleared by site marshal.');
                          }}
                          className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                        >
                          Resolve Hazard
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 7: FATIGUE & FAIRNESS ALERTS (INTELLIGENCE ENGINE) */}
        {/* ============================================================== */}
        {activeTab === 'fatigue' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Derived by Workforce Fairness Intelligence Subsystem from real shift and attendance logs
              </span>
            </div>

            <div className="space-y-4">
              {fatigueAlerts.map((alert) => {
                const worker = workers.find((w) => w.id === alert.workerId);
                return (
                  <div
                    key={alert.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              alert.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {alert.severity} Risk
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {alert.ruleTriggered.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1.5">{alert.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Affected Worker:{' '}
                          <span className="text-white font-medium">{worker?.fullName}</span> (
                          {worker?.role})
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                          alert.isResolved
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300 animate-pulse'
                        }`}
                      >
                        {alert.isResolved ? 'Resolved' : 'Active Breach'}
                      </span>
                    </div>

                    {/* Mathematical Evidence & Rule */}
                    <div className="my-3 space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block">Evidence Log:</span>
                        <span className="text-slate-200">{alert.evidence}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Regulatory Rule:</span>
                        <span className="text-teal-300/90">{alert.exactRuleExplanation}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-amber-300">
                        <strong>Recommended Action:</strong> {alert.recommendedAction}
                      </div>

                      {!alert.isResolved ? (
                        <button
                          onClick={() => {
                            setResolvingFatigueId(alert.id);
                            setFatigueResolutionNote(
                              'Shift adjusted to provide 11h uninterrupted rest; alternate crew assigned.'
                            );
                          }}
                          className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg shrink-0 transition-colors"
                        >
                          Take Corrective Action
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold">
                          ✓ Corrective Action: {alert.resolutionAction}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 8: WORKFORCE DIRECTORY */}
        {/* ============================================================== */}
        {activeTab === 'workforce' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                placeholder="Search workers by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white w-72 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <span className="text-xs text-slate-400">{filteredWorkers.length} Personnel</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkers.map((worker) => {
                const workerCreds = skillCredentials.filter((s) => s.workerId === worker.id);
                return (
                  <div
                    key={worker.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex items-start space-x-3.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                      {worker.avatarUrl ? (
                        <img src={worker.avatarUrl} alt={worker.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-slate-400 m-3" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-white">{worker.fullName}</h3>
                        <span className="text-[11px] font-mono text-teal-300 bg-slate-800 px-2 py-0.5 rounded">
                          {worker.employeeCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {worker.role} • {worker.department}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Site: {worker.site}</p>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800 text-xs">
                        <span className="font-mono text-teal-400 font-bold">
                          {currentOrg.settings.currencySymbol}
                          {worker.hourlyRate}/hr
                        </span>
                        <span className="text-slate-400">
                          {workerCreds.filter((c) => c.isVerified).length} Verified Skills
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 9: ANALYTICS */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-2">
                  Department Workload Distribution (Hours)
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Scheduled versus actual logged hours across organizational divisions
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptHoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      />
                      <Bar dataKey="Scheduled" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Worked" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-2">Workplace Hazard Incident Breakdown</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Aggregated categories reported through worker safety channels
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hazardCategoryData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {hazardCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 10: SETTINGS */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white">Organization Policy & Industry Rules</h3>
            <p className="text-xs text-slate-400">
              Configurable compliance thresholds mapped to UN SDG 8 and national labor norms
            </p>

            <div className="space-y-3 pt-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-300 font-semibold">Standard Daily Hours</span>
                <span className="font-mono text-teal-400 font-bold">
                  {currentOrg.settings.standardDailyHours} Hours / Day
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-300 font-semibold">Overtime Multiplier</span>
                <span className="font-mono text-teal-400 font-bold">
                  {currentOrg.settings.overtimeMultiplier}x Base Rate
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-300 font-semibold">Minimum Inter-Shift Rest (SDG 8.8)</span>
                <span className="font-mono text-teal-400 font-bold">
                  {currentOrg.settings.minRestBetweenShiftsHours} Consecutive Hours
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-300 font-semibold">Weekly Working Limit</span>
                <span className="font-mono text-teal-400 font-bold">
                  {currentOrg.settings.maxWeeklyHoursLimit} Hours / Week
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl">
                <span className="text-slate-300 font-semibold">Emergency Incident Hotline</span>
                <span className="font-mono text-white font-bold">
                  {currentOrg.settings.emergencyHotline}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: SCHEDULE NEW SHIFT (WITH FATIGUE ENGINE) */}
      {/* ============================================================== */}
      {isNewShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-1">Schedule Shift (Fatigue-Aware)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Real-time validation against 11h rest and 48h weekly working caps
            </p>

            {shiftWarningFeedback && (
              <div className="mb-4 p-3 bg-amber-950/80 border border-amber-500 rounded-xl text-xs text-amber-300">
                {shiftWarningFeedback}
              </div>
            )}

            <form onSubmit={handleCreateShift} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Shift Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scaffolding Assembly Pier 44"
                  value={newShiftTitle}
                  onChange={(e) => setNewShiftTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Assign Worker
                </label>
                <select
                  value={newShiftWorkerId}
                  onChange={(e) => setNewShiftWorkerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} ({w.role} - {w.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newShiftDate}
                    onChange={(e) => setNewShiftDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Department</label>
                  <select
                    value={newShiftDept}
                    onChange={(e) => setNewShiftDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewShiftModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs"
                >
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLVE HAZARD */}
      {resolvingHazardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="font-bold text-base text-teal-300 mb-2">Resolve Workplace Hazard</h3>
            <p className="text-xs text-slate-400 mb-3">
              Document resolution and mitigation note before marking hazard as resolved.
            </p>

            <textarea
              rows={3}
              required
              value={hazardResolutionNote}
              onChange={(e) => setHazardResolutionNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mb-4"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setResolvingHazardId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateSafetyReportStatus(resolvingHazardId, 'resolved', hazardResolutionNote);
                  setResolvingHazardId(null);
                }}
                className="flex-1 py-2 bg-teal-500 text-slate-950 text-xs font-bold rounded-xl"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESOLVE PAY DISCREPANCY */}
      {resolvingDiscrepancyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="font-bold text-base text-amber-300 mb-2">Resolve Pay Discrepancy</h3>
            <p className="text-xs text-slate-400 mb-3">
              Authorize supplementary payment adjustment and record explanatory note.
            </p>

            <textarea
              rows={3}
              required
              value={discrepancyResolutionNote}
              onChange={(e) => setDiscrepancyResolutionNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mb-4"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setResolvingDiscrepancyId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resolveDiscrepancy(resolvingDiscrepancyId, 'resolved', discrepancyResolutionNote);
                  setResolvingDiscrepancyId(null);
                }}
                className="flex-1 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                Approve & Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RESOLVE FATIGUE WARNING */}
      {resolvingFatigueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="font-bold text-base text-teal-300 mb-2">Record Corrective Fatigue Action</h3>
            <p className="text-xs text-slate-400 mb-3">
              Describe corrective measure (e.g. shift swap, mandatory rest interval granted).
            </p>

            <textarea
              rows={3}
              required
              value={fatigueResolutionNote}
              onChange={(e) => setFatigueResolutionNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mb-4"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setResolvingFatigueId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resolveFatigueAlert(resolvingFatigueId, fatigueResolutionNote);
                  setResolvingFatigueId(null);
                }}
                className="flex-1 py-2 bg-teal-500 text-slate-950 text-xs font-bold rounded-xl"
              >
                Save Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
