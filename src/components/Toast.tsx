import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 4000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-stone-950/85 backdrop-blur-xl text-stone-100 px-4 py-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.25)] border border-white/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
      <div className="flex items-center gap-2.5">
        {type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
        {type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
        <span className="text-xs font-normal leading-snug">{message}</span>
      </div>
      <button onClick={onClose} className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
