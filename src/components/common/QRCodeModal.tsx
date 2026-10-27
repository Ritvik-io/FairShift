'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, QrCode, ScanLine, X } from 'lucide-react';
import { Shift } from '@/types';

interface QRCodeModalProps {
  shift: Shift;
  isOpen: boolean;
  onClose: () => void;
  onSuccessCheckIn: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  shift,
  isOpen,
  onClose,
  onSuccessCheckIn,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerVerificationSuccess = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if canvas is unsupported
    }
    setFeedback('Verified! Clocked in successfully.');
    setTimeout(() => {
      onSuccessCheckIn();
      onClose();
      setFeedback(null);
      setIsScanning(false);
    }, 1200);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setFeedback('Aligning with Site QR Beacon...');
    setTimeout(() => {
      triggerVerificationSuccess();
    }, 1500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim() === shift.qrToken || manualCode.trim().length >= 4) {
      triggerVerificationSuccess();
    } else {
      setFeedback('Invalid verification token. Please check the site supervisor board.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-teal-400 mb-4">
          <QrCode className="w-6 h-6" />
          <h3 className="font-bold text-lg">Site Shift QR Check-In</h3>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-4 mb-4 border border-slate-700/60">
          <p className="text-sm font-semibold text-slate-200">{shift.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">Location: {shift.siteLocation}</p>
          <div className="flex items-center justify-between text-xs text-slate-300 mt-2 pt-2 border-t border-slate-700">
            <span>Shift: {shift.startTime} - {shift.endTime}</span>
            <span className="font-mono text-teal-300 font-semibold">{shift.qrToken}</span>
          </div>
        </div>

        {/* QR Code Visual Beacon */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl border border-dashed border-teal-500/40 relative overflow-hidden mb-5">
          {/* Mock QR Matrix */}
          <div className="w-44 h-44 bg-white p-3 rounded-xl flex items-center justify-center shadow-lg relative">
            <svg
              className="w-full h-full text-slate-950"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              {/* Corner squares */}
              <rect x="5" y="5" width="25" height="25" rx="3" />
              <rect x="10" y="10" width="15" height="15" fill="white" />
              <rect x="13" y="13" width="9" height="9" />

              <rect x="70" y="5" width="25" height="25" rx="3" />
              <rect x="75" y="10" width="15" height="15" fill="white" />
              <rect x="78" y="13" width="9" height="9" />

              <rect x="5" y="70" width="25" height="25" rx="3" />
              <rect x="10" y="75" width="15" height="15" fill="white" />
              <rect x="13" y="78" width="9" height="9" />

              {/* Data matrix dots */}
              <rect x="36" y="10" width="6" height="6" />
              <rect x="46" y="16" width="6" height="6" />
              <rect x="56" y="8" width="6" height="6" />
              <rect x="36" y="24" width="6" height="6" />
              <rect x="50" y="26" width="8" height="6" />
              <rect x="12" y="40" width="8" height="6" />
              <rect x="26" y="44" width="6" height="6" />
              <rect x="40" y="40" width="18" height="18" rx="2" fill="#0d9488" />
              <rect x="68" y="42" width="8" height="6" />
              <rect x="80" y="40" width="6" height="6" />
              <rect x="36" y="68" width="6" height="8" />
              <rect x="50" y="62" width="8" height="6" />
              <rect x="66" y="68" width="12" height="6" />
              <rect x="44" y="80" width="8" height="8" />
              <rect x="60" y="82" width="14" height="6" />
              <rect x="80" y="78" width="10" height="10" />
            </svg>

            {isScanning && (
              <div className="absolute inset-0 border-2 border-teal-400 bg-teal-500/10 rounded-xl flex items-center justify-center animate-pulse">
                <ScanLine className="w-12 h-12 text-teal-300 animate-bounce" />
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">
            Position mobile scanner at physical site entrance terminal
          </p>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold text-center mb-4 flex items-center justify-center space-x-2 ${
              feedback.includes('Verified')
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600'
                : 'bg-amber-950/80 text-amber-300 border border-amber-600'
            }`}
          >
            {feedback.includes('Verified') && <CheckCircle2 className="w-4 h-4" />}
            <span>{feedback}</span>
          </div>
        )}

        {/* Scan Button */}
        <button
          onClick={handleSimulateScan}
          disabled={isScanning}
          className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <ScanLine className="w-4 h-4" />
          <span>{isScanning ? 'Verifying Beacon...' : 'Simulate Camera QR Scan'}</span>
        </button>

        {/* Manual Fallback Input */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 mb-2 font-medium">Or enter token manually:</p>
          <form onSubmit={handleManualSubmit} className="flex space-x-2">
            <input
              type="text"
              placeholder={`e.g. ${shift.qrToken}`}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-400 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200 rounded-lg transition-colors"
            >
              Verify
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
