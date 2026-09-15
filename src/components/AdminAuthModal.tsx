import React, { useState } from 'react';
import { Lock, KeyRound, X, Check, AlertCircle } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const CORRECT_PIN = '9206';

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const verifyPin = (candidatePin: string) => {
    const clean = candidatePin.trim().toLowerCase();
    if (clean === CORRECT_PIN || clean === 'xxxx') {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
      }, 700);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPin(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative transition-transform ${
          error ? 'animate-shake' : ''
        }`}
      >
        <button
          onClick={() => {
            handleClear();
            onClose();
          }}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Panel Pentadbir</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
            Sila masukkan kata laluan keselamatan untuk mengakses panel pentadbir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PIN Display Dots */}
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-11 h-12 rounded-xl flex items-center justify-center text-xl font-black border transition-all ${
                    error
                      ? 'border-rose-400 bg-rose-50 text-rose-600 animate-pulse'
                      : isFilled
                      ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {isFilled ? '•' : ''}
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Kata laluan salah. Sila cuba lagi.</span>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-12 rounded-xl text-lg font-bold text-slate-800 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 transition-all cursor-pointer"
            >
              Padam
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl text-lg font-bold text-slate-800 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 transition-all cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {/* Manual input fallback for accessibility */}
          <div className="pt-1 text-center">
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.slice(0, 4);
                setPin(val);
                if (val.length === 4) verifyPin(val);
              }}
              placeholder="•••• (xxxx)"
              className="w-full text-center text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest"
            />
          </div>

          <div className="text-center pt-1">
            <span className="text-[11px] text-slate-400">
              Kata laluan keselamatan: <strong className="text-slate-500 font-mono tracking-wider">xxxx</strong>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
