import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Clock, 
  ShieldCheck, 
  Send, 
  Sparkles,
  Smartphone,
  Building2,
  Copy,
  Check,
  TrendingUp,
  CreditCard,
  Settings,
  Trash2,
  AlertTriangle,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Lock,
  MessageCircle,
  X
} from 'lucide-react';
import { User, SystemSettings, Transaction, DepositRequest, WithdrawalRequest } from '../types.ts';
import { formatEGP, generateWhatsAppWithdrawalLink } from '../utils/rules.ts';
import { DepositSection } from './DepositSection.tsx';
import { TransactionHistory } from './TransactionHistory.tsx';
import { TransferModal } from './TransferModal.tsx';
import { WithdrawalModal } from './WithdrawalModal.tsx';

interface UserDashboardProps {
  user: User;
  settings: SystemSettings | null;
  transactions: Transaction[];
  depositRequests: DepositRequest[];
  withdrawalRequests: WithdrawalRequest[];
  isLoadingData: boolean;
  onRefreshData: () => void;
  onUserBalanceUpdated: (newBalance: number) => void;
  onAccountDeleted?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  settings,
  transactions,
  depositRequests,
  withdrawalRequests,
  isLoadingData,
  onRefreshData,
  onUserBalanceUpdated,
  onAccountDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history' | 'settings'>('overview');
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Delete Account Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(key);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Quick stats
  const totalReceived = transactions
    .filter((t) => t.type === 'deposit' || t.type === 'transfer_received' || t.type === 'admin_credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransferred = transactions
    .filter((t) => t.type === 'transfer_sent' || t.type === 'admin_debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('يرجى إدخال كلمة المرور لتأكيد الهوية');
      return;
    }

    if (user.balance > 0 && !confirmForfeit) {
      setDeleteError('يجب الموافقة على إقرار التنازل عن الرصيد المتبقي لحذف الحساب');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/wallet/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: deletePassword,
          confirm_forfeit: confirmForfeit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الحساب');
      }

      setIsDeleteModalOpen(false);
      localStorage.removeItem('mmg_token');
      if (onAccountDeleted) {
        onAccountDeleted();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Top Hero Balance Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Balance Block */}
          <div className="space-y-2 text-right">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>الرصيد المتاح في المحفظة (بالجنيه المصري)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                رصيد فعلي 100%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
                {user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xl font-bold text-emerald-400">ج.م EGP</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>رقم حساب المحفظة: <strong className="text-slate-200 font-mono">MMG-ACC-{String(user.id).padStart(6, '0')}</strong></span>
              <span>•</span>
              <span>المستخدم: <strong className="text-slate-200">@{user.username}</strong></span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('deposit')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all"
            >
              <ArrowDownLeft className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>شحن الحساب (إيداع)</span>
            </button>

            <button
              onClick={() => setIsWithdrawalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-600/20 transition-all"
            >
              <ArrowUpRight className="w-4 h-4 text-white stroke-[2.5]" />
              <span>سحب رصيد (طلب سحب)</span>
            </button>

            <button
              onClick={() => setIsTransferOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-2xl border border-slate-700 transition-all"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>إرسال أموال (تحويل)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className="flex items-center justify-center p-3.5 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-all"
              title="كشف الحساب وسجل العمليات"
            >
              <Receipt className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-center p-3.5 rounded-2xl border transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="إعدادات الحساب والأمان"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Secondary Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-800/80 text-right">
          <div>
            <div className="text-[11px] text-slate-400">إجمالي الإيداعات والمقبوضات</div>
            <div className="text-base font-bold text-emerald-400 font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
              +{formatEGP(totalReceived)}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">إجمالي التحويلات الصادرة</div>
            <div className="text-base font-bold text-rose-400 font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
              -{formatEGP(totalTransferred)}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-400">حالة أمان المحفظة</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>نظام محفظة مغلقة مؤمنة 100%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>نظرة عامة</span>
        </button>

        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'deposit'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>شحن الحساب وطرق الدفع</span>
        </button>

        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'withdraw'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>سحب الرصيد</span>
          {withdrawalRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950 text-slate-300">
              {withdrawalRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سجل العمليات وكشف الحساب</span>
          {transactions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950 text-slate-300">
              {transactions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>إعدادات المحفظة والحساب</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Quick Payment Channel Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>حسابات الشحن المعتمدة لدينا (InstaPay & بنك المشرق & محافظ الكاش):</span>
              </h3>
              <button
                onClick={() => setActiveTab('deposit')}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                عرض كافة التفاصيل وإرسال إيصال ←
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">إنستاباي IPA & الهاتف</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{settings?.instapay_address || 'mohamed29102013@instapay'}</span>
                  <span className="text-[11px] font-mono text-slate-300 block">{settings?.instapay_phone || '01550464096'}</span>
                </div>
                <button
                  onClick={() => handleCopy(settings?.instapay_address || 'mohamed29102013@instapay', 'q_insta')}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg"
                  title="نسخ عنوان إنستاباي"
                >
                  {copiedAccount === 'q_insta' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">بنك المشرق (Mashreq Neo)</span>
                  <span className="text-xs font-mono font-bold text-blue-400">{settings?.bank_account_number || '059102114579'}</span>
                  <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[150px]">{settings?.bank_iban || 'EG090046020100000059102114597'}</span>
                </div>
                <button
                  onClick={() => handleCopy(settings?.bank_account_number || '059102114579', 'q_bank')}
                  className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg"
                  title="نسخ رقم الحساب البنكي"
                >
                  {copiedAccount === 'q_bank' ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">محافظ الكاش (Vodafone/Orange/WE)</span>
                  <span className="text-sm font-mono font-bold text-rose-400">{settings?.cash_wallet_number || '01141714725'}</span>
                </div>
                <button
                  onClick={() => handleCopy(settings?.cash_wallet_number || '01141714725', 'q_cash')}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                  title="نسخ رقم محفظة الكاش"
                >
                  {copiedAccount === 'q_cash' ? <Check className="w-3.5 h-3.5 text-rose-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>أحدث العمليات المالية:</span>
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                عرض الكل ({transactions.length}) ←
              </button>
            </div>

            <TransactionHistory
              transactions={transactions.slice(0, 5)}
              isLoading={isLoadingData}
            />
          </div>

        </div>
      )}

      {/* Tab 2: Deposit Section */}
      {activeTab === 'deposit' && (
        <DepositSection
          user={user}
          settings={settings}
          depositRequests={depositRequests}
          onDepositSubmitted={onRefreshData}
        />
      )}

      {/* Tab 2.b: Withdrawal Requests Section */}
      {activeTab === 'withdraw' && (
        <div className="space-y-6 text-right">
          <div className="bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 border border-rose-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 mt-1">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">نظام سحب الأرصدة اليدوي (Withdrawal System)</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  1. اضغط على زر تقديم طلب سحب جديد، وحدد وسيلة الاستلام (إنستاباي، تحويل بنكي، أو محفظة كاش) واكتب بيانات حسابك بدقة.<br />
                  2. يتم حجز المبلغ المطلوب وتأكيد كلمة سر المعاملات (6 أرقام)، وينتقل الطلب إلى حالة "قيد المراجعة".<br />
                  3. يقوم مسؤول الحسابات بمراجعة الطلب وتحويل المبلغ إلى حسابك الفعلي وتأكيد الإتمام فوراً.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsWithdrawalOpen(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>تقديم طلب سحب جديد الآن</span>
            </button>
          </div>

          {/* Table of previous withdrawal requests */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>سجل ومتابعة طلبات السحب الخاصة بك:</span>
              </h4>
              <span className="text-xs text-slate-500">{withdrawalRequests.length} طلبات مسجلة</span>
            </div>

            {withdrawalRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-3">
                <ArrowUpRight className="w-10 h-10 mx-auto text-slate-700" />
                <p>لا توجد لديك أي طلبات سحب مسجلة حتى الآن.</p>
                <button
                  onClick={() => setIsWithdrawalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                >
                  تقديم طلبك الأول
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 font-semibold">رقم المرجع</th>
                      <th className="pb-3 font-semibold">المبلغ المسحوب</th>
                      <th className="pb-3 font-semibold">طريقة الاستلام</th>
                      <th className="pb-3 font-semibold">الحساب المستلم</th>
                      <th className="pb-3 font-semibold">تاريخ الطلب</th>
                      <th className="pb-3 font-semibold">الحالة</th>
                      <th className="pb-3 font-semibold">ملاحظات الإدارة</th>
                      <th className="pb-3 font-semibold">متابعة واتساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {withdrawalRequests.map((req) => (
                      <tr key={req.id} className="text-slate-300">
                        <td className="py-3 font-mono text-slate-400">{req.request_reference}</td>
                        <td className="py-3 font-bold font-['Plus_Jakarta_Sans',sans-serif] text-rose-400 text-sm">
                          -{req.amount.toLocaleString()} ج.م
                        </td>
                        <td className="py-3 font-medium text-white">{req.payment_method}</td>
                        <td className="py-3 font-mono text-slate-300 max-w-[200px] truncate" title={req.recipient_details}>
                          {req.recipient_details}
                        </td>
                        <td className="py-3 text-slate-400 font-mono text-[11px]">
                          {new Date(req.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="py-3">
                          {req.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                              قيد المراجعة
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              تم التحويل والإتمام ✓
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                              مرفوض ومسترد
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-400 italic text-[11px]">
                          {req.admin_notes || (req.status === 'pending' ? 'بانتظار التحويل من الإدارة' : '-')}
                        </td>
                        <td className="py-3">
                          <a
                            href={generateWhatsAppWithdrawalLink({
                              whatsappNumber: settings?.support_whatsapp || '+201063994059',
                              username: user.username,
                              email: user.email,
                              amount: req.amount,
                              paymentMethod: req.payment_method,
                              recipientDetails: req.recipient_details,
                              requestReference: req.request_reference
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 rounded-lg text-[10px] font-bold transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>واتساب</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Transaction History */}
      {activeTab === 'history' && (
        <TransactionHistory
          transactions={transactions}
          isLoading={isLoadingData}
        />
      )}

      {/* Tab 4: Wallet & Account Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6 text-right">
          
          {/* Account Profile Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">بيانات الحساب والمحفظة</h3>
                <p className="text-xs text-slate-400">معلومات الهوية ورقم الحساب المسجل في المنصة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block mb-1">الاسم بالكامل:</span>
                <span className="text-base font-bold text-white">{user.full_name}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block mb-1">اسم المستخدم (Username):</span>
                <span className="text-base font-bold font-mono text-emerald-400">@{user.username}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block mb-1">البريد الإلكتروني:</span>
                <span className="text-sm font-bold font-mono text-slate-200">{user.email}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block mb-1">رقم الهاتف المسجل:</span>
                <span className="text-sm font-bold font-mono text-slate-200">{user.phone || 'غير مسجل'}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block mb-1">رقم المحفظة المالي:</span>
                <span className="text-sm font-bold font-mono text-emerald-400">MMG-ACC-{String(user.id).padStart(6, '0')}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block mb-1">تاريخ إنشاء المحفظة:</span>
                <span className="text-sm font-mono text-slate-300">
                  {new Date(user.created_at).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="bg-slate-900 border border-rose-900/40 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-rose-900/30">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-300">منطقة الحذف وإغلاق المحفظة (Danger Zone)</h3>
                <p className="text-xs text-slate-400">الإجراءات التالية دائمة ولا يمكن التراجع عنها بعد التنفيذ</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-rose-950/20 border border-rose-900/30 p-5 rounded-2xl">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">حذف الحساب وإغلاق المحفظة نهائياً</h4>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  سيتم مسح بيانات تسجيل الدخول الخاصة بك، وكشف الحساب، والطلبات المسجلة من النظام. في حال وجود رصيد متبقي، يُفضل تحويله لمستخدم آخر قبل تنفيذ الحذف.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(true);
                  setDeleteError(null);
                  setDeletePassword('');
                  setConfirmForfeit(false);
                }}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف حسابي الآن</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Internal Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        currentUser={user}
        onTransferSuccess={(newBalance) => {
          onUserBalanceUpdated(newBalance);
          onRefreshData();
        }}
      />

      {/* Manual Withdrawal Request Modal */}
      <WithdrawalModal
        isOpen={isWithdrawalOpen}
        onClose={() => setIsWithdrawalOpen(false)}
        currentUser={user}
        settings={settings}
        onWithdrawalSubmitted={(newBalance) => {
          onUserBalanceUpdated(newBalance);
          onRefreshData();
        }}
      />

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-right">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-rose-400">تأكيد حذف الحساب نهائياً</span>
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-xs text-rose-200 leading-relaxed">
                تحذير: سيتم حذف حسابك <strong>@{user.username}</strong> نهائياً وإلغاء تسجيل الدخول. هذا الإجراء لا يمكن الرجوع فيه.
              </div>

              {user.balance > 0 && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-800/50 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span>رصيدك الحالي في المحفظة:</span>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif]">{formatEGP(user.balance)}</span>
                  </div>
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={confirmForfeit}
                      onChange={(e) => setConfirmForfeit(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>أوافق وأقر بالتنازل عن هذا الرصيد المتبقي وإغلاق المحفظة فوراً دون مطالبة لاحقة.</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  يرجى إدخال كلمة المرور لتأكيد الحذف:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white text-xs text-right font-mono focus:outline-none pl-10"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isDeleting || (user.balance > 0 && !confirmForfeit) || !deletePassword}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-rose-600/20"
                >
                  {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي للمحفظة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
