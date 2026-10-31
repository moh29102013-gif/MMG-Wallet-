import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  LogOut, 
  User as UserIcon, 
  Lock, 
  RotateCw, 
  MessageCircle, 
  ExternalLink 
} from 'lucide-react';
import { User, SystemSettings } from '../types.ts';
import { formatEGP } from '../utils/rules.ts';

interface NavbarProps {
  user: User | null;
  settings: SystemSettings | null;
  activeTab: 'user' | 'admin';
  setActiveTab: (tab: 'user' | 'admin') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onRefreshBalance: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  settings,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onRefreshBalance,
  isRefreshing,
}) => {
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleCopyDomain = () => {
    navigator.clipboard.writeText('https://mmgwallet.com');
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const whatsappLink = settings?.support_whatsapp 
    ? `https://wa.me/${settings.support_whatsapp.replace(/[^0-9]/g, '')}`
    : 'https://wa.me/201063994059';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  MMG <span className="text-emerald-400">WALLET</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 rounded-full">
                  محفظة مغلقة EGP
                </span>
              </div>
              <button 
                onClick={handleCopyDomain}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 mt-0.5"
                title="اضغط لنسخ الرابط الرسمي"
              >
                <span>mmgwallet.com</span>
                {copiedDomain ? (
                  <span className="text-emerald-400 text-[10px]">✓ تم النسخ</span>
                ) : (
                  <ExternalLink className="w-3 h-3 opacity-60" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* WhatsApp Support Direct Button */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
              title="دعم العملاء المباشر عبر واتساب"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
              <span>واتساب الدعم والشحن</span>
            </a>

            {user ? (
              <>
                {/* Balance display badge with refresh */}
                <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 gap-2">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">رصيدك الحالي</div>
                    <div className="text-sm sm:text-base font-bold text-emerald-400 font-['Plus_Jakarta_Sans',sans-serif]">
                      {formatEGP(user.balance)}
                    </div>
                  </div>
                  <button
                    onClick={onRefreshBalance}
                    disabled={isRefreshing}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    title="تحديث الرصيد"
                    aria-label="تحديث الرصيد"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>
                </div>

                {/* Role Switcher if Admin */}
                {user.role === 'admin' && (
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveTab('user')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        activeTab === 'user'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      شاشة العميل
                    </button>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        activeTab === 'admin'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>لوحة الأدمن</span>
                    </button>
                  </div>
                )}

                {/* User menu / Log out */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col text-left text-xs text-slate-300">
                    <span className="font-semibold text-slate-200 truncate max-w-[120px]">{user.full_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">@{user.username}</span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all"
                    title="تسجيل الخروج"
                    aria-label="تسجيل الخروج"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
                >
                  <UserIcon className="w-4 h-4 text-slate-950" />
                  <span>دخول / تسجيل حساب</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
