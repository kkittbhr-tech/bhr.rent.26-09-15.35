import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, X, ArrowRight, Mail } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (rememberMe?: boolean) => void;
  correctEmail?: string;
  correctPassword?: string;
  onNotify?: (msg: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  correctEmail = 'nitibangkok.horizon@gmail.com',
  correctPassword = '7014',
  onNotify
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('condohub_admin_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPassword = (correctPassword || '7014').trim();
    const expectedEmail = (correctEmail || 'nitibangkok.horizon@gmail.com').trim().toLowerCase();

    const inputEmail = email.trim().toLowerCase();
    const inputPassword = password.trim();

    // Check email & password
    const isEmailValid = !expectedEmail || inputEmail === expectedEmail;
    const isPasswordValid = inputPassword === expectedPassword;

    if (isEmailValid && isPasswordValid) {
      if (rememberMe) {
        localStorage.setItem('condohub_admin_remembered_email', inputEmail);
      } else {
        localStorage.removeItem('condohub_admin_remembered_email');
      }

      onLoginSuccess(rememberMe);
      onNotify?.('เข้าสู่ระบบเจ้าหน้าที่สำเร็จ');
      setPassword('');
      setErrorMsg('');
      onClose();
    } else {
      if (!isEmailValid && !isPasswordValid) {
        setErrorMsg('อีเมลและรหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      } else if (!isEmailValid) {
        setErrorMsg('อีเมลเจ้าหน้าที่ไม่ถูกต้อง');
      } else {
        setErrorMsg('รหัส PIN ไม่ถูกต้อง');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.15)] border border-stone-200/90 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-stone-900 text-stone-100 p-6 text-center relative border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-400/20 shadow-inner">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>

          <h2 className="font-display text-base font-semibold text-white tracking-wide">เข้าสู่ระบบเจ้าหน้าที่</h2>
          <p className="text-xs text-stone-300/80 mt-1 font-light">
            ฝ่ายบริหารอาคารและทรัพย์สิน Bangkok Horizon ราม 60
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-stone-500" />
              <span>อีเมลเจ้าหน้าที่ (Admin Email)</span>
            </label>
            <input
              id="login-email-input"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="กรอกอีเมลเจ้าหน้าที่"
              autoComplete="username"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-stone-400 shadow-2xs"
            />
          </div>

          {/* Password / PIN input */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-stone-500" />
              <span>รหัสผ่าน / PIN เจ้าหน้าที่</span>
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="กรอกรหัสผ่าน PIN"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-sm font-mono text-center tracking-widest focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-stone-400 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 border-stone-300 focus:ring-stone-500 cursor-pointer"
              />
              <span>จำฉันไว้ในระบบ (ไม่ต้องใส่รหัสใหม่)</span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center shadow-2xs">
              {errorMsg}
            </div>
          )}

          <div className="pt-1">
            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-stone-800"
            >
              <span>ยืนยันเข้าสู่ระบบ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
