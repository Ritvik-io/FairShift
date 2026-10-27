'use client';

import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  Info,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useFairShiftStore } from '@/lib/data/store';
import { Navbar } from '@/components/common/Navbar';
import { WorkerPortal } from '@/components/worker/WorkerPortal';
import { AdminPortal } from '@/components/admin/AdminPortal';

export default function Home() {
  const { activeRole, setRole, currentOrg, setOrg, isDemoMode } = useFairShiftStore();
  const [showDemoGuide, setShowDemoGuide] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Global Navigation Bar */}
      <Navbar />

      {/* Guided Demonstration & Evaluation Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 text-xs px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-teal-300">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="font-semibold">
              Live Demo Active: {currentOrg.name} ({currentOrg.industry.toUpperCase()})
            </span>
            <span className="text-slate-400 hidden md:inline">• Mode: {activeRole.toUpperCase()}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDemoGuide(!showDemoGuide)}
              className="text-slate-300 hover:text-white font-semibold flex items-center space-x-1 underline decoration-teal-400 decoration-2 underline-offset-4"
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>{showDemoGuide ? 'Hide Demo Guide' : 'Prompt Wars Demonstration Guide (10 Steps)'}</span>
              {showDemoGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Judge / Evaluator Walkthrough Guide */}
        {showDemoGuide && (
          <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <h4 className="font-bold text-teal-300 text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-teal-400" />
                  <span>Mandatory 10-Step Demonstration Flow (Section 11)</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>
                    <strong>Open Construction Org:</strong> Apex Buildtech (Metro Rail Site 42) is loaded by default.
                  </li>
                  <li>
                    <strong>View Worker Dashboard:</strong> See Ramesh Kumar&apos;s active shift, planned hours, and mandatory PPE checklist.
                  </li>
                  <li>
                    <strong>Check In:</strong> Click &ldquo;Scan QR&rdquo; to simulate camera beacon verification or use manual check-in.
                  </li>
                  <li>
                    <strong>Open Pay Breakdown:</strong> Switch to &ldquo;My Pay&rdquo; to inspect 2.0x overtime multiplier, EPF deductions, and transparent slip.
                  </li>
                  <li>
                    <strong>Submit Safety Report:</strong> Use voice-to-text or type a hazard; toggle &ldquo;Report Anonymously&rdquo; to test cryptographic identity shielding.
                  </li>
                  <li>
                    <strong>Switch to Admin Portal:</strong> Click &ldquo;Admin Mode&rdquo; in the top navbar.
                  </li>
                  <li>
                    <strong>Review & Resolve Hazard:</strong> Review the anonymous report in &ldquo;Safety Reports&rdquo; and confirm zero identity disclosure.
                  </li>
                  <li>
                    <strong>Review Fatigue Alert:</strong> Inspect the explainable rule (3.0h rest &lt; 11h norm) and record corrective action.
                  </li>
                  <li>
                    <strong>Switch Industry:</strong> Select &ldquo;SRM Facilities (University)&rdquo; from the dropdown.
                  </li>
                  <li>
                    <strong>Verify Cross-Industry Scalability:</strong> Observe distinct 1.5x overtime rate, campus housekeeping/security data, and isolated records!
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-cyan-300 text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Key Differentiators & SDG 8 Alignment</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li className="flex items-start space-x-1.5">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>
                      <strong>Fairness Scorecard (Differentiator):</strong> 4 dimensions (Pay Transparency, Workload Safety, Incident Response, Worker Voice) with mathematical formula documentation.
                    </span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>
                      <strong>Explainable Fatigue Engine:</strong> Pre-shift validation warns on &lt;11h rest (ILO C106) and &gt;48h weekly hours.
                    </span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>
                      <strong>Zero-Identity Hazard Anonymity:</strong> Real pseudonymous tokens with manager view data stripping.
                    </span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>
                      <strong>Inclusivity & Languages:</strong> Full English, Tamil (தமிழ்), and Hindi (हिन्दी) interface translations + Web Speech API voice reporting.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Experience View */}
      <div className="flex-1 flex flex-col">
        {activeRole === 'worker' ? <WorkerPortal /> : <AdminPortal />}
      </div>
    </div>
  );
}
