'use client';

import React from 'react';
import { useFairShiftStore } from '@/lib/data/store';
import {
  Building2,
  GraduationCap,
  Languages,
  RotateCcw,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentOrg,
    selectedOrgId,
    setOrg,
    activeRole,
    setRole,
    language,
    setLanguage,
    t,
    resetToDefaultData,
    activeWorker,
    workers,
    setActiveWorkerId,
  } = useFairShiftStore();

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
              FS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">FairShift</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  SDG 8 Decent Work
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md">
                {currentOrg.name}
              </p>
            </div>
          </div>

          {/* Quick Selectors & Switchers */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Industry / Org Switcher */}
            <div className="relative">
              <select
                aria-label="Select Organization"
                value={selectedOrgId}
                onChange={(e) => setOrg(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs sm:text-sm text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
              >
                <option value="org-apex-construction">🏗️ Apex Buildtech (Construction)</option>
                <option value="org-srm-facilities">🎓 SRM Facilities (University)</option>
              </select>
            </div>

            {/* Worker Selector (When in Worker Mode) */}
            {activeRole === 'worker' && (
              <div className="hidden md:block">
                <select
                  aria-label="Select Active Worker"
                  value={activeWorker.id}
                  onChange={(e) => setActiveWorkerId(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      👤 {w.fullName} ({w.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Role Switcher Button */}
            <button
              onClick={() => setRole(activeRole === 'worker' ? 'admin' : 'worker')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                activeRole === 'worker'
                  ? 'bg-teal-600 hover:bg-teal-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              title="Toggle between Worker Companion and Operations Portal"
            >
              {activeRole === 'worker' ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Worker Mode</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Mode</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <Languages className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <button
                onClick={() => setLanguage('en')}
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  language === 'en' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  language === 'ta' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
                title="தமிழ் (Tamil)"
              >
                தமிழ்
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  language === 'hi' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
                title="हिन्दी (Hindi)"
              >
                हिन्दी
              </button>
            </div>

            {/* Reset Demo Data button */}
            <button
              onClick={() => {
                if (window.confirm('Reset demo state back to pristine seed data?')) {
                  resetToDefaultData();
                }
              }}
              title="Reset Demo Data"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
