import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  PlusCircle, 
  MinusCircle, 
  CheckCircle, 
  XCircle, 
  Settings, 
  FileSpreadsheet, 
  Users, 
  Coins, 
  AlertTriangle,
  RotateCw,
  Building2,
  Smartphone,
  Save,
  MessageCircle,
  Eye,
  Check,
  ArrowUpRight
} from 'lucide-react';
import { User, SystemSettings, DepositRequest, WithdrawalRequest } from '../types.ts';
import { formatEGP } from '../utils/rules.ts';

interface AdminPortalProps {
  currentUser: User;
  settings: SystemSettings | null;
  onSettingsUpdated: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  settings,
  onSettingsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'adjust' | 'deposits' | 'withdrawals' | 'users' | 'settings' | 'audit'>('adjust');

  // Stats
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalLiquidity: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    totalTransactions: number;
    recentAuditLogs: any[];
  } | null>(null);

  // Search User for Credit / Debit
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Credit / Debit Form
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustFeedback, setAdjustFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deposit Requests
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
  const [actionNotes, setActionNotes] = useState<Record<number, string>>({});

  // Withdrawal Requests
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [withdrawActionNotes, setWithdrawActionNotes] = useState<Record<number, string>>({});
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState<number | null>(null);
  const [withdrawalFeedback, setWithdrawalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Payment Channels Settings Form
  const [editSettings, setEditSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchDepositRequests();
    fetchWithdrawalRequests();
    if (settings) {
      setEditSettings(settings as any);
    }
  }, [settings]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepositRequests = async () => {
    setIsLoadingDeposits(true);
    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/admin/deposit-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDepositRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDeposits(false);
    }
  };

  const fetchWithdrawalRequests = async () => {
    setIsLoadingWithdrawals(true);
    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/admin/withdrawal-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawalRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  const handleProcessWithdrawal = async (requestId: number, decision: 'approved' | 'rejected') => {
    setIsProcessingWithdrawal(requestId);
    setWithdrawalFeedback(null);
    try {
      const token = localStorage.getItem('mmg_token');
      const notes = withdrawActionNotes[requestId] || '';
      const res = await fetch('/api/admin/process-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: requestId,
          decision,
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت معالجة طلب السحب');
      }
      setWithdrawalFeedback({ type: 'success', text: data.message });
      await Promise.all([fetchWithdrawalRequests(), fetchStats()]);
    } catch (err: any) {
      setWithdrawalFeedback({ type: 'error', text: err.message });
    } finally {
      setIsProcessingWithdrawal(null);
    }
  };

  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch(`/api/admin/users?query=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchedUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setAdjustFeedback({ type: 'error', text: 'يرجى اختيار العميل أولاً' });
      return;
    }

    const numAmount = parseFloat(adjustAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAdjustFeedback({ type: 'error', text: 'يرجى إدخال مبلغ صحيح أكبر من صفر' });
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustFeedback({ type: 'error', text: 'سبب العملية إلزامي للأمان والتدقيق' });
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustFeedback(null);

    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/admin/adjust-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          action_type: adjustType,
          amount: numAmount,
          reason: adjustReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت العملية');
      }

      setAdjustFeedback({ type: 'success', text: data.message });
      setSelectedUser({
        ...selectedUser,
        balance: data.new_balance
      });
      setAdjustAmount('');
      setAdjustReason('');
      fetchStats();
    } catch (err: any) {
      setAdjustFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleProcessDeposit = async (requestId: number, decision: 'approved' | 'rejected') => {
    const notes = actionNotes[requestId] || (decision === 'approved' ? 'تم التأكد من استلام المبلغ في الحساب الفعلي' : 'لم يتم استلام التحويل');
    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/admin/process-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: requestId,
          decision,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطأ أثناء المعالجة');
        return;
      }

      fetchDepositRequests();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsFeedback(null);

    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editSettings)
      });

      if (!res.ok) throw new Error('فشل تحديث الإعدادات');
      setSettingsFeedback('تم حفظ وتحديث بيانات الدفع والحسابات بنجاح!');
      onSettingsUpdated();
      setTimeout(() => setSettingsFeedback(null), 3000);
    } catch (err: any) {
      setSettingsFeedback('خطأ أثناء الحفظ');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* Top Admin Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-600/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">لوحة تحكم الإدارة والأمان (Admin Center)</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
                  SECURE PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                نظام إدارة السيولة والشحن اليدوي مع حماية المعاملات الذرية (BEGIN/COMMIT/ROLLBACK)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStats();
                fetchDepositRequests();
                fetchWithdrawalRequests();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">إجمالي السيولة</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-['Plus_Jakarta_Sans',sans-serif]">
                {formatEGP(stats.totalLiquidity)}
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">العملاء المسجلين</span>
              <span className="text-lg sm:text-xl font-black text-white font-['Plus_Jakarta_Sans',sans-serif]">
                {stats.totalUsers} عميل
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">شحن معلق</span>
              <span className={`text-lg sm:text-xl font-black font-['Plus_Jakarta_Sans',sans-serif] ${
                stats.pendingDeposits > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'
              }`}>
                {stats.pendingDeposits} طلب
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-rose-900/40">
              <span className="text-xs text-rose-300 block mb-1">سحب معلق</span>
              <span className={`text-lg sm:text-xl font-black font-['Plus_Jakarta_Sans',sans-serif] ${
                stats.pendingWithdrawals > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
              }`}>
                {stats.pendingWithdrawals || 0} طلب
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">العمليات المنجزة</span>
              <span className="text-lg sm:text-xl font-black text-blue-400 font-['Plus_Jakarta_Sans',sans-serif]">
                {stats.totalTransactions} عملية
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'adjust'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>إضافة / خصم رصيد يدوي</span>
        </button>

        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'deposits'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>طلبات الشحن والإيصالات</span>
          {stats?.pendingDeposits ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
              {stats.pendingDeposits}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'withdrawals'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>طلبات السحب والمراجعة</span>
          {stats?.pendingWithdrawals ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-800">
              {stats.pendingWithdrawals}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>دليل العملاء والأرصدة</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>تعديل حسابات الدفع والواتساب</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>سجل الرقابة والتدقيق (Audit)</span>
        </button>
      </div>

      {/* Tab 1: Manual Credit / Debit */}
      {activeTab === 'adjust' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Step 1: Search & Pick user */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-400" />
              <span>1. البحث عن العميل واختياره</span>
            </h3>

            <form onSubmit={handleSearchUsers} className="flex gap-2">
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
              >
                {isSearching ? 'بحث...' : 'بحث'}
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المستخدم، البريد، أو الاسم..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-white text-xs text-right focus:outline-none"
              />
            </form>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {searchedUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  اضغط "بحث" بدون كتابة لعرض أحدث العملاء، أو اكتب اسم المستخدم
                </div>
              ) : (
                searchedUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedUser?.id === u.id
                        ? 'bg-amber-950/40 border-amber-500 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-left font-mono">
                      <span className="text-xs font-bold text-emerald-400 block">{formatEGP(u.balance)}</span>
                      <span className="text-[10px] text-slate-500">{u.role}</span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{u.full_name}</div>
                      <div className="text-[11px] text-amber-400 font-mono">@{u.username}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Step 2: Form to Credit or Debit */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>2. نموذج تعديل الرصيد الآمن (معاملات ذرية ACID)</span>
            </h3>

            {selectedUser ? (
              <div className="mt-4 space-y-5">
                
                {/* Selected User Header */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-xs text-slate-400 block">الرصيد الحالي</span>
                    <span className="text-xl font-black text-emerald-400 font-['Plus_Jakarta_Sans',sans-serif]">
                      {formatEGP(selectedUser.balance)}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{selectedUser.full_name}</div>
                    <div className="text-xs text-amber-400 font-mono">@{selectedUser.username}</div>
                    <div className="text-[11px] text-slate-400">{selectedUser.email}</div>
                  </div>
                </div>

                <form onSubmit={handleExecuteAdjustment} className="space-y-4">
                  {/* Operation Type Switcher */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustType('credit')}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                        adjustType === 'credit'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      <span>إضافة رصيد (Credit)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjustType('debit')}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                        adjustType === 'debit'
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <MinusCircle className="w-4 h-4 text-rose-400" />
                      <span>خصم رصيد (Debit)</span>
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      المبلغ بالجنيه المصري (EGP / ج.م):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        required
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] focus:outline-none pl-16 text-right"
                      />
                      <div className="absolute left-3 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                        ج.م EGP
                      </div>
                    </div>
                  </div>

                  {/* Reason Input (Mandatory) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      سبب العملية / الوصف (إلزامي للرقابة والتدقيق):
                    </label>
                    <textarea
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      required
                      rows={2}
                      placeholder="مثال: شحن يدوي تأكيد إيصال إنستاباي رقم #984210 بعد المطابقة في كشف حساب البنك"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white focus:outline-none text-right"
                    />
                  </div>

                  {/* Technical Safety Notice */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>يتم تنفيذ التحديث عبر Transaction ذرية مع إدراج سجل في كشف الحساب وسجلات الرقابة</span>
                  </div>

                  {adjustFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        adjustFeedback.type === 'success'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      <span>{adjustFeedback.text}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingAdjust || !adjustAmount || !adjustReason}
                      className={`flex-1 py-3.5 font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                        adjustType === 'credit'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                      }`}
                    >
                      <span>
                        {isSubmittingAdjust
                          ? 'جاري التنفيذ...'
                          : adjustType === 'credit'
                          ? `تأكيد إضافة الرصيد لحساب @${selectedUser.username}`
                          : `تأكيد خصم الرصيد من حساب @${selectedUser.username}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setAdjustFeedback(null);
                        setAdjustAmount('');
                        setAdjustReason('');
                      }}
                      className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="mt-12 text-center text-slate-500 text-sm space-y-3">
                <Users className="w-12 h-12 mx-auto text-slate-700" />
                <p>يرجى البحث واختيار عميل من القائمة بالجانب للبدء في إضافة أو خصم الرصيد.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 2: Deposit Requests Approval */}
      {activeTab === 'deposits' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white text-base">مراجعة طلبات الشحن اليدوية الواردة من العملاء</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                طابق رقم العملية أو اسم المحول مع كشف حساب البنك/إنستاباي الفعلي قبل الموافقة
              </p>
            </div>
            <button
              onClick={fetchDepositRequests}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {isLoadingDeposits ? (
            <div className="p-12 text-center text-slate-500 text-xs">جاري تحميل الطلبات...</div>
          ) : depositRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">لا توجد طلبات إيداع مسجلة حالياً</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3">العميل</th>
                    <th className="pb-3">المبلغ</th>
                    <th className="pb-3">وسيلة الدفع</th>
                    <th className="pb-3">بيانات التحويل / الإيصال</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3">الإجراء والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {depositRequests.map((req) => (
                    <tr key={req.id} className="text-slate-300">
                      <td className="py-4">
                        <div className="font-bold text-white">{req.full_name}</div>
                        <div className="text-[11px] text-amber-400 font-mono">@{req.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{req.email}</div>
                      </td>
                      <td className="py-4 font-bold font-['Plus_Jakarta_Sans',sans-serif] text-emerald-400 text-sm">
                        {formatEGP(req.amount)}
                      </td>
                      <td className="py-4 font-medium text-white">{req.payment_method}</td>
                      <td className="py-4">
                        <div className="font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
                          {req.sender_account_or_ref}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{req.request_reference}</span>
                      </td>
                      <td className="py-4">
                        {req.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                            بانتظار المراجعة
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            معتمد وشحن ✓
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                            مرفوض ✕
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        {req.status === 'pending' ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <input
                              type="text"
                              placeholder="ملاحظات المراجعة (اختياري)..."
                              value={actionNotes[req.id] || ''}
                              onChange={(e) => setActionNotes({ ...actionNotes, [req.id]: e.target.value })}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleProcessDeposit(req.id, 'approved')}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>موافقة وإضافة الرصيد</span>
                              </button>
                              <button
                                onClick={() => handleProcessDeposit(req.id, 'rejected')}
                                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold rounded-lg text-xs transition-all border border-rose-500/30"
                              >
                                <span>رفض</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            {req.admin_notes || 'تمت المعالجة'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2.b: Withdrawal Requests Processing */}
      {activeTab === 'withdrawals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">مراجعة طلبات سحب الرصيد والتحويل للعملاء</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  سحب يدوي
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                راجع وسيلة السحب وبيانات المستلم (إنستاباي / محفظة كاش / بنك). عند الموافقة يتم تأكيد المعاملة، وعند الرفض يُسترد الرصيد فورياً إلى محفظة العميل تلقائياً.
              </p>
            </div>
            <button
              onClick={fetchWithdrawalRequests}
              disabled={isLoadingWithdrawals}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs transition-all self-start sm:self-auto"
            >
              <RotateCw className={`w-3.5 h-3.5 text-rose-400 ${isLoadingWithdrawals ? 'animate-spin' : ''}`} />
              <span>تحديث الطلبات</span>
            </button>
          </div>

          {withdrawalFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center justify-between animate-fade-in ${
                withdrawalFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
              }`}
            >
              <span>{withdrawalFeedback.text}</span>
              <button
                onClick={() => setWithdrawalFeedback(null)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                إغلاق
              </button>
            </div>
          )}

          {isLoadingWithdrawals ? (
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4 animate-spin text-rose-400" />
              <span>جاري تحميل طلبات السحب...</span>
            </div>
          ) : withdrawalRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
              لا توجد طلبات سحب مسجلة حالياً
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3">المرجع والتاريخ</th>
                    <th className="pb-3">العميل</th>
                    <th className="pb-3">المبلغ المطلوب</th>
                    <th className="pb-3">وسيلة السحب</th>
                    <th className="pb-3">بيانات التحويل / المستلم</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3">الإجراء والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {withdrawalRequests.map((req) => (
                    <tr key={req.id} className="text-slate-300 hover:bg-slate-950/30 transition-colors">
                      <td className="py-4">
                        <div className="font-mono text-[11px] font-bold text-slate-200">
                          {req.request_reference}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(req.created_at).toLocaleString('ar-EG', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </div>
                      </td>

                      <td className="py-4">
                        <div className="font-bold text-white">{req.full_name || 'عميل'}</div>
                        <div className="text-[11px] text-rose-400 font-mono">@{req.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{req.email}</div>
                        {req.user_balance !== undefined && (
                          <div className="text-[10px] text-emerald-400 mt-1 font-mono">
                            الرصيد المتبقي: {formatEGP(req.user_balance)}
                          </div>
                        )}
                      </td>

                      <td className="py-4 font-bold font-['Plus_Jakarta_Sans',sans-serif] text-rose-400 text-sm">
                        {formatEGP(req.amount)}
                      </td>

                      <td className="py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-white border border-slate-700">
                          {req.payment_method}
                        </span>
                      </td>

                      <td className="py-4">
                        <div className="font-mono text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] whitespace-pre-wrap select-all max-w-[280px]">
                          {req.recipient_details}
                        </div>
                      </td>

                      <td className="py-4">
                        {req.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800 inline-block">
                            قيد المراجعة
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 inline-block">
                            تم التحويل والموافقة ✓
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800 inline-block">
                            مرفوض ومسترد ✕
                          </span>
                        )}
                        {req.processed_at && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {new Date(req.processed_at).toLocaleString('ar-EG', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </div>
                        )}
                      </td>

                      <td className="py-4">
                        {req.status === 'pending' ? (
                          <div className="flex flex-col gap-2 min-w-[220px]">
                            <input
                              type="text"
                              placeholder="ملاحظات التحويل أو سبب الرفض..."
                              value={withdrawActionNotes[req.id] || ''}
                              onChange={(e) =>
                                setWithdrawActionNotes({
                                  ...withdrawActionNotes,
                                  [req.id]: e.target.value
                                })
                              }
                              className="bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleProcessWithdrawal(req.id, 'approved')}
                                disabled={isProcessingWithdrawal === req.id}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{isProcessingWithdrawal === req.id ? 'جاري...' : 'موافقة وتم التحويل'}</span>
                              </button>
                              <button
                                onClick={() => handleProcessWithdrawal(req.id, 'rejected')}
                                disabled={isProcessingWithdrawal === req.id}
                                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold rounded-lg text-xs transition-all border border-rose-500/30 disabled:opacity-50"
                              >
                                <span>رفض واسترجاع</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-slate-400 text-[11px] block">
                              {req.admin_notes ? `الملاحظات: ${req.admin_notes}` : 'تمت المعالجة بدون ملاحظات'}
                            </span>
                            {req.status === 'rejected' && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900 inline-block">
                                تم استرجاع الرصيد للمحفظة
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Users Directory */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-base">دليل العملاء والأرصدة الحالية في MMG Wallet</h3>
            <button
              onClick={() => handleSearchUsers()}
              className="text-xs text-amber-400 hover:underline"
            >
              عرض وتحديث القائمة
            </button>
          </div>

          <div className="space-y-3">
            {searchedUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                انتقل لتبويب "إضافة / خصم رصيد" للبحث أو اضغط زر التحديث أعلاه
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3">الاسم واليوزر</th>
                      <th className="pb-3">البريد الإلكتروني</th>
                      <th className="pb-3">رقم الهاتف</th>
                      <th className="pb-3">الرصيد الحالي</th>
                      <th className="pb-3">الحالة</th>
                      <th className="pb-3">إجراء سريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {searchedUsers.map((u) => (
                      <tr key={u.id} className="text-slate-300">
                        <td className="py-3">
                          <span className="font-bold text-white block">{u.full_name}</span>
                          <span className="text-[11px] text-amber-400 font-mono">@{u.username}</span>
                        </td>
                        <td className="py-3 font-mono text-slate-400">{u.email}</td>
                        <td className="py-3 font-mono text-slate-400">{u.phone || '-'}</td>
                        <td className="py-3 font-bold font-['Plus_Jakarta_Sans',sans-serif] text-emerald-400 text-sm">
                          {formatEGP(u.balance)}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setActiveTab('adjust');
                            }}
                            className="px-2.5 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-slate-950 rounded-lg text-[11px] font-semibold transition-all border border-amber-600/30"
                          >
                            شحن / خصم
                          </button>
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

      {/* Tab 4: System & Payment Settings */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="font-bold text-white text-lg">تعديل بيانات الحسابات وقنوات الدفع المعروضة للعملاء</h3>
            <p className="text-xs text-slate-400 mt-1">
              أي تعديل هنا سينعكس فوراً على واجهة شحن الحساب للعملاء وروابط الواتساب التلقائية
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* WhatsApp Support Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم هاتف الدعم الفني والشحن عبر الواتساب (مع كود الدولة):
                </label>
                <input
                  type="text"
                  value={editSettings.support_whatsapp || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, support_whatsapp: e.target.value })}
                  placeholder="+201063994059"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono text-right"
                />
              </div>

              {/* InstaPay IPA */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  عنوان إنستاباي للدفع اللحظي (InstaPay Address IPA):
                </label>
                <input
                  type="text"
                  value={editSettings.instapay_address || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, instapay_address: e.target.value })}
                  placeholder="mohamed29102013@instapay"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono text-right"
                />
              </div>

              {/* InstaPay Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم هاتف إنستاباي للتحويل المباشر:
                </label>
                <input
                  type="text"
                  value={editSettings.instapay_phone || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, instapay_phone: e.target.value })}
                  placeholder="01550464096"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono text-right"
                />
              </div>

              {/* Cash Wallet Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم محفظة الكاش المعتمدة (فودافون/أورنج/اتصالات/وي):
                </label>
                <input
                  type="text"
                  value={editSettings.cash_wallet_number || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, cash_wallet_number: e.target.value })}
                  placeholder="01141714725"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono text-right"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم البنك الرسمي:
                </label>
                <input
                  type="text"
                  value={editSettings.bank_name || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, bank_name: e.target.value })}
                  placeholder="بنك المشرق (Mashreq Neo)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm text-right"
                />
              </div>

              {/* Bank Account Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم الحساب البنكي (Account Number):
                </label>
                <input
                  type="text"
                  value={editSettings.bank_account_number || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, bank_account_number: e.target.value })}
                  placeholder="059102114579"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono text-right"
                />
              </div>

              {/* Bank IBAN */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم الآيبان البنكي الكامل (IBAN):
                </label>
                <input
                  type="text"
                  value={editSettings.bank_iban || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, bank_iban: e.target.value })}
                  placeholder="EG090046020100000059102114597"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono text-right"
                />
              </div>

            </div>

            {settingsFeedback && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{settingsFeedback}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ التعديلات وتحديث القنوات'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="font-bold text-white text-base mb-4">سجل العمليات الإدارية الحساسة والرقابة</h3>
          
          <div className="space-y-3">
            {stats?.recentAuditLogs?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">لا توجد عمليات تدقيق مسجلة حتى الآن</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {stats?.recentAuditLogs?.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </span>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        إجراء: <span className="text-amber-400 font-mono">{log.action}</span>
                        {log.target_username && (
                          <span> على حساب: <strong className="text-slate-200">@{log.target_username}</strong></span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{log.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
