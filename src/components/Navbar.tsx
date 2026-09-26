import React from 'react';
import { Building2, Shield, User, LogOut, Phone, Globe, Lock } from 'lucide-react';
import { AppSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  currentView: 'customer' | 'admin';
  setCurrentView: (view: 'customer' | 'admin') => void;
  isAdminLoggedIn: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  settings: AppSettings;
  urgentLeaseCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  isAdminLoggedIn,
  onOpenLogin,
  onLogout,
  settings,
  urgentLeaseCount = 0
}) => {
  const { lang, setLang, t, isTh } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-colors no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo & Brand */}
          <div 
            id="brand-logo"
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
            onClick={() => setCurrentView('customer')}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] flex items-center justify-center text-white shadow-sm border border-white/40 transition-transform duration-200 group-hover:scale-[1.03]">
              <span className="font-bold text-white text-base sm:text-lg font-sans tracking-tight leading-none select-none">
                S
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-semibold text-sm sm:text-base md:text-lg tracking-tight text-stone-900">
                  Bangkok Horizon Ram 60
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] uppercase font-semibold tracking-wider bg-white/60 backdrop-blur-xs text-stone-700 border border-white/70 shadow-2xs">
                  {isTh ? 'นิติบุคคล' : 'Juristic'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-500 font-normal hidden md:block">
                {isTh ? 'สำนักงานนิติบุคคลอาคารชุด แบงค์คอก ฮอไรซอน รามคำแหง 60' : 'Bangkok Horizon Ramkhamhaeng 60 Juristic Condominium Office'}
              </p>
            </div>
          </div>

          {/* Navigation & Mode Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* Direct Contact Hotline for Customers */}
            {settings.defaultContactPhone && (
              <a
                id="contact-hotline-btn"
                href={`tel:${settings.defaultContactPhone.replace(/[^0-9]/g, '')}`}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700 bg-white/70 hover:bg-white hover:text-stone-900 hover:scale-105 hover:shadow-md backdrop-blur-md border border-white/80 transition-all duration-200 shadow-2xs cursor-pointer active:scale-95"
                title="ติดต่อสอบถามสำนักงานนิติบุคคล"
              >
                <Phone className="w-3.5 h-3.5 text-[#0284c7]" />
                <span className="font-mono">{settings.defaultContactPhone}</span>
              </a>
            )}

            {/* Bilingual Switcher: TH | EN */}
            <div 
              id="lang-switcher-navbar"
              className="flex items-center p-0.5 bg-white/60 backdrop-blur-md rounded-xl border border-white/80 shadow-2xs"
              title={isTh ? 'สลับภาษา / Change Language' : 'Change language'}
            >
              <button
                type="button"
                id="lang-btn-th"
                onClick={() => setLang('th')}
                className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                  lang === 'th'
                    ? 'bg-white text-stone-900 shadow-xs font-bold border border-white/80'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                TH
              </button>
              <button
                type="button"
                id="lang-btn-en"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                  lang === 'en'
                    ? 'bg-white text-stone-900 shadow-xs font-bold border border-white/80'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                EN
              </button>
            </div>

            {/* Admin Controls: Shown when logged in */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* View Switcher: Segmented Control */}
                <div className="flex items-center p-0.5 sm:p-1 bg-stone-200/50 backdrop-blur-md rounded-xl border border-white/70 shadow-2xs">
                  <button
                    id="nav-customer-view-btn"
                    onClick={() => setCurrentView('customer')}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                      currentView === 'customer'
                        ? 'bg-white/95 text-stone-900 shadow-xs font-semibold border border-white/80'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-stone-500" />
                    <span className="hidden sm:inline">{isTh ? 'หน้าเว็บลูกค้า' : 'Customer'}</span>
                    <span className="sm:hidden text-xs">{isTh ? 'ลูกค้า' : 'Web'}</span>
                  </button>

                  <button
                    id="nav-admin-view-btn"
                    onClick={() => setCurrentView('admin')}
                    className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                      currentView === 'admin'
                        ? 'bg-stone-900 text-white shadow-xs font-semibold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-200" />
                    <span className="hidden sm:inline">{isTh ? 'ระบบนิติบุคคล' : 'Staff Admin'}</span>
                    <span className="sm:hidden text-xs">{isTh ? 'นิติฯ' : 'Admin'}</span>
                    
                    {/* Urgent Expiration Alert Badge */}
                    {urgentLeaseCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                        {urgentLeaseCount}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  id="nav-logout-btn"
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 text-stone-500 hover:text-rose-700 hover:bg-white/60 backdrop-blur-md rounded-xl transition-colors border border-transparent hover:border-white/80"
                  title={isTh ? 'ออกจากระบบเจ้าหน้าที่' : 'Logout Staff'}
                >
                  <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </div>
            ) : (
              /* If not logged in, provide a discreet Staff Login button */
              <button
                id="nav-staff-login-btn"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-800 bg-white/70 hover:bg-white hover:scale-105 hover:shadow-md hover:border-stone-300 backdrop-blur-md transition-all duration-200 border border-white/80 shadow-2xs active:scale-95 cursor-pointer"
                title="เข้าสู่ระบบเจ้าหน้าที่นิติบุคคล"
              >
                <Lock className="w-3 h-3 text-stone-600" />
                <span className="text-xs">{isTh ? 'เจ้าหน้าที่นิติฯ' : 'Staff Login'}</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
