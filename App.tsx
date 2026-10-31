import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  ArrowDownLeft, 
  Send, 
  Lock, 
  Smartphone, 
  Receipt, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  MessageCircle,
  Building2,
  AlertCircle
} from 'lucide-react';
import { User, SystemSettings, Transaction, DepositRequest, WithdrawalRequest } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { UserDashboard } from './components/UserDashboard.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { formatEGP } from './utils/rules.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');

  // Check URL parameters for secret admin portal access shortcut
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === '2910' || window.location.pathname.includes('portal-adm-2910')) {
      setActiveTab('admin');
    }
  }, []);

  // Fetch initial settings and check user session
  useEffect(() => {
    fetchSettings();
    checkExistingAuth();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const checkExistingAuth = async () => {
    const token = localStorage.getItem('mmg_token');
    if (!token) {
      setIsLoadingUser(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        fetchUserData();
      } else {
        localStorage.removeItem('mmg_token');
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem('mmg_token');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchUserData = async () => {
    const token = localStorage.getItem('mmg_token');
    if (!token) return;

    setIsLoadingData(true);
    try {
      const [txRes, depRes, withRes] = await Promise.all([
        fetch('/api/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet/deposit-requests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wallet/withdrawal-requests', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }

      if (depRes.ok) {
        const depData = await depRes.json();
        setDepositRequests(depData);
      }

      if (withRes.ok) {
        const withData = await withRes.json();
        setWithdrawalRequests(withData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRefreshBalance = async () => {
    const token = localStorage.getItem('mmg_token');
    if (!token) return;

    setIsRefreshing(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        await fetchUserData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mmg_token');
    setCurrentUser(null);
    setTransactions([]);
    setDepositRequests([]);
    setWithdrawalRequests([]);
    setActiveTab('user');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onRefreshBalance={handleRefreshBalance}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {isLoadingUser ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400">جاري الاتصال بقاعدة بيانات MMG Wallet...</p>
          </div>
        ) : currentUser ? (
          /* Authenticated View */
          <div>
            {activeTab === 'admin' && currentUser.role === 'admin' ? (
              <AdminPortal
                currentUser={currentUser}
                settings={settings}
                onSettingsUpdated={fetchSettings}
              />
            ) : (
              <UserDashboard
                user={currentUser}
                settings={settings}
                transactions={transactions}
                depositRequests={depositRequests}
                withdrawalRequests={withdrawalRequests}
                isLoadingData={isLoadingData}
                onRefreshData={fetchUserData}
                onUserBalanceUpdated={(newBal) => {
                  setCurrentUser((prev) => (prev ? { ...prev, balance: newBal } : null));
                }}
                onAccountDeleted={handleLogout}
              />
            )}
          </div>
        ) : (
          /* Guest Landing & Presentation View */
          <div className="space-y-12 py-6 text-right">
            
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
              <div className="max-w-3xl space-y-6">
                
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>محفظة مالية مغلقة وآمنة (Closed-Loop System)</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                  محفظتك المالية الآمنة <span className="text-emerald-400">بالجنيه المصري</span> بدون عمولات بوابات الدفع
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                  نظام MMG Wallet المالي لإدارة الأرصدة والشحن اليدوي المباشر عبر (InstaPay، بنك المشرق Mashreq Neo، ومحافظ الكاش) مع التحقق اللحظي عبر رسائل الواتساب والتحويلات الداخلية الفورية بكلمة سر المعاملات (PIN 6 أرقام)، محمي بالكامل بنظام المعاملات الذرية (ACID Transactions).
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center gap-2"
                  >
                    <Wallet className="w-5 h-5 text-slate-950" />
                    <span>ابدأ الآن / تسجيل الدخول</span>
                  </button>

                  <a
                    href={settings?.support_whatsapp ? `https://wa.me/${settings.support_whatsapp.replace(/[^0-9]/g, '')}` : 'https://wa.me/201063994059'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5 text-emerald-400" />
                    <span>واتساب خدمة العملاء</span>
                  </a>
                </div>

              </div>

              {/* Security Pillars Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 pt-8 border-t border-slate-800">
                
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
                  <div className="p-2.5 w-fit bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">شحن يدوي بدون اقتطاع رسوم</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حوّل من تطبيق إنستاباي أو بنك المشرق أو محافظ الكاش ثم أرسل الإيصال بضغطة زر على واتساب الدعم مع اسمك ليتم شحن المحفظة فوراً.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
                  <div className="p-2.5 w-fit bg-blue-500/10 text-blue-400 rounded-xl">
                    <Send className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">تحويلات P2P فورية</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    انقل الرصيد لأي مستخدم آخر مسجل في mmgwallet.com في أجزاء من الثانية برقم الحساب أو اسم المستخدم.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
                  <div className="p-2.5 w-fit bg-amber-500/10 text-amber-400 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">معاملات ذرية ACID مشفرة</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تشفير كامل لكلمات المرور بـ Bcrypt، وحماية ضد أي تكرار أو تضارب للأرصدة بنظام Begin/Commit/Rollback.
                  </p>
                </div>

              </div>
            </div>

            {/* Admin Portal Quick Access Notice */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 text-slate-400 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">بوابة المشرفين والإدارة</h4>
                  <p className="text-xs text-slate-400">
                    منطقة مخصصة لإدارة النظام لمراجعة الإيداعات وتأكيد الشحن وإدارة الأرصدة.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all whitespace-nowrap"
              >
                تسجيل دخول الإدارة
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-400">MMG Wallet Platform</span>
            <span>•</span>
            <span className="font-mono text-emerald-500">https://mmgwallet.com</span>
          </div>
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} - نظام المحفظة المالية المغلقة بالجنيه المصري EGP
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(authData) => {
          setCurrentUser(authData.user);
          fetchUserData();
        }}
      />

    </div>
  );
}
