import React, { useState } from 'react';
import { 
  Send, 
  X, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeftRight,
  UserCheck
} from 'lucide-react';
import { User } from '../types.ts';
import { formatEGP } from '../utils/rules.ts';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onTransferSuccess: (newBalance: number) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onTransferSuccess,
}) => {
  const [recipientQuery, setRecipientQuery] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<{
    id: number;
    username: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [transactionPin, setTransactionPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    message: string;
    reference: string;
    amount: number;
    recipient: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleLookupRecipient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recipientQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setVerifiedRecipient(null);

    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch(`/api/wallet/lookup-recipient?query=${encodeURIComponent(recipientQuery.trim())}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'لم يتم العثور على المستخدم');
      }
      setVerifiedRecipient(data.recipient);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedRecipient) {
      setActionError('يرجى التحقق من المستلم أولاً');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setActionError('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    if (numAmount > currentUser.balance) {
      setActionError('المبلغ يتجاوز رصيدك المتاح حالياً');
      return;
    }

    if (!/^\d{6}$/.test(transactionPin.trim())) {
      setActionError('يرجى إدخال كلمة سر المعاملات المكونة من 6 أرقام');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient_identifier: verifiedRecipient.username,
          amount: numAmount,
          note: note.trim(),
          transaction_pin: transactionPin.trim(),
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت عملية التحويل');
      }

      setSuccessData({
        message: data.message,
        reference: data.reference,
        amount: numAmount,
        recipient: verifiedRecipient.full_name
      });

      onTransferSuccess(data.new_balance);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setRecipientQuery('');
    setVerifiedRecipient(null);
    setAmount('');
    setNote('');
    setTransactionPin('');
    setActionError(null);
    setSearchError(null);
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-lg font-bold text-white">إرسال أموال (نقل رصيد داخلي)</h3>
              <p className="text-xs text-slate-400">تحويل فوري بدون أي رسوم بين عملاء MMG Wallet</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {successData ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-bold text-white mb-1">تم التحويل بنجاح!</h4>
              <p className="text-sm text-slate-400">{successData.message}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-right space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">رقم مرجع المعاملة:</span>
                <span className="font-mono text-emerald-400 font-bold">{successData.reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">المبلغ المحول:</span>
                <span className="font-bold text-white">{successData.amount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">المستلم:</span>
                <span className="font-bold text-slate-200">{successData.recipient}</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              تم وإغلاق
            </button>
          </div>
        ) : (
          /* Transfer Form */
          <div className="space-y-6">
            
            {/* Step 1: Lookup Recipient */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                1. اسم المستخدم أو البريد الإلكتروني للمستلم:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleLookupRecipient()}
                  disabled={isSearching || !recipientQuery.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                >
                  <Search className="w-4 h-4" />
                  <span>{isSearching ? 'جاري البحث...' : 'تحقق'}</span>
                </button>
                <input
                  type="text"
                  value={recipientQuery}
                  onChange={(e) => {
                    setRecipientQuery(e.target.value);
                    setVerifiedRecipient(null);
                    setSearchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLookupRecipient();
                  }}
                  placeholder="مثال: ahmed_client أو sara@example.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none transition-all text-right font-mono"
                />
              </div>

              {searchError && (
                <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Verified Recipient Card */}
              {verifiedRecipient && (
                <div className="mt-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-right">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{verifiedRecipient.full_name}</div>
                      <div className="text-xs text-emerald-300 font-mono">@{verifiedRecipient.username}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
                    مستلم مؤكد ✓
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Amount & Note Form */}
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400">
                    رصيدك الحالي: <strong className="text-emerald-400">{formatEGP(currentUser.balance)}</strong>
                  </span>
                  <label className="text-xs font-semibold text-slate-300">
                    2. المبلغ المراد تحويله:
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    max={currentUser.balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] focus:outline-none transition-all pl-16 text-right"
                  />
                  <div className="absolute left-3 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                    ج.م EGP
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ملاحظة / سبب التحويل (اختياري):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: دفعة مشتريات أو سداد حساب"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none transition-all text-right"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-emerald-400">مكونة من 6 أرقام سرية</span>
                  <label className="text-xs font-semibold text-slate-300">
                    3. كلمة سر المعاملات (Transaction PIN):
                  </label>
                </div>
                <input
                  type="password"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={transactionPin}
                  onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-lg tracking-[0.4em] font-mono focus:outline-none transition-all text-center placeholder:tracking-normal"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  أدخل كلمة سر المعاملات المكونة من 6 أرقام التي حددتها عند تسجيل حسابك
                </span>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Security confirmation badge */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>التحويل محمي بالكامل ويتم قيد العملية في كشف حساب الطرفين فوراً</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !verifiedRecipient || !amount || transactionPin.length !== 6}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>{isSubmitting ? 'جاري التحويل الآمن...' : 'تأكيد وإرسال الرصيد الآن'}</span>
              </button>
            </form>

          </div>
        )}

      </div>
    </div>
  );
};
