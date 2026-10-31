import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  MessageCircle, 
  ArrowUpRight, 
  Send,
  Lock,
  Wallet
} from 'lucide-react';
import { User, SystemSettings } from '../types.ts';
import { formatEGP, generateWhatsAppWithdrawalLink } from '../utils/rules.ts';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: SystemSettings | null;
  onWithdrawalSubmitted: (newBalance: number) => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onWithdrawalSubmitted,
}) => {
  const [method, setMethod] = useState<'instapay' | 'bank' | 'wallet'>('instapay');
  const [amount, setAmount] = useState<string>('');
  const [transactionPin, setTransactionPin] = useState<string>('');

  // Destination accounts
  const [instapayId, setInstapayId] = useState<string>('');
  const [instapayName, setInstapayName] = useState<string>('');

  const [bankName, setBankName] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [bankBeneficiary, setBankBeneficiary] = useState<string>('');
  const [bankIban, setBankIban] = useState<string>('');

  const [cashNumber, setCashNumber] = useState<string>('');
  const [cashProvider, setCashProvider] = useState<string>('فودافون كاش');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [successData, setSuccessData] = useState<{
    reference: string;
    amount: number;
    paymentMethod: string;
    recipientDetails: string;
    newBalance: number;
  } | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handlePercentageClick = (pct: number) => {
    const val = Math.floor(currentUser.balance * pct);
    setAmount(val > 0 ? val.toString() : '');
    setFormError(null);
  };

  const getRecipientSummary = (): string => {
    if (method === 'instapay') {
      return `إنستاباي: ${instapayId.trim()}${instapayName.trim() ? ` باسم (${instapayName.trim()})` : ''}`;
    }
    if (method === 'bank') {
      return `بنك: ${bankName.trim()} | حساب: ${bankAccount.trim()}${bankIban.trim() ? ` | آيبان: ${bankIban.trim()}` : ''} | المستفيد: ${bankBeneficiary.trim() || currentUser.full_name}`;
    }
    return `محفظة كاش (${cashProvider}): ${cashNumber.trim()}`;
  };

  const getMethodTitle = (): string => {
    if (method === 'instapay') return 'إنستاباي (InstaPay)';
    if (method === 'bank') return 'تحويل بنكي (Bank Transfer)';
    return 'محافظ الكاش (Cash Wallet)';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (numAmount < 10) {
      setFormError('الحد الأدنى لطلب السحب هو 10 ج.م');
      return;
    }

    if (numAmount > currentUser.balance) {
      setFormError(`المبلغ المطلوب (${numAmount} ج.م) يتجاوز رصيدك الحالي (${currentUser.balance} ج.م)`);
      return;
    }

    if (!/^\d{6}$/.test(transactionPin.trim())) {
      setFormError('يرجى إدخال كلمة سر المعاملات المكونة من 6 أرقام');
      return;
    }

    // Validate details
    if (method === 'instapay' && !instapayId.trim()) {
      setFormError('يرجى كتابة عنوان إنستاباي (IPA) أو رقم هاتف الحساب');
      return;
    }
    if (method === 'bank' && (!bankName.trim() || !bankAccount.trim())) {
      setFormError('يرجى إدخال اسم البنك ورقم الحساب البنكي على الأقل');
      return;
    }
    if (method === 'wallet' && !cashNumber.trim()) {
      setFormError('يرجى إدخال رقم محفظة الكاش المعتمد لاستلام الأموال');
      return;
    }

    setIsSubmitting(true);

    try {
      const recipientDetails = getRecipientSummary();
      const methodTitle = getMethodTitle();
      const token = localStorage.getItem('mmg_token');

      const res = await fetch('/api/wallet/withdrawal-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_method: methodTitle,
          amount: numAmount,
          recipient_details: recipientDetails,
          transaction_pin: transactionPin.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل طلب السحب');
      }

      setSuccessData({
        reference: data.reference,
        amount: numAmount,
        paymentMethod: methodTitle,
        recipientDetails,
        newBalance: data.new_balance
      });

      onWithdrawalSubmitted(data.new_balance);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setAmount('');
    setTransactionPin('');
    setInstapayId('');
    setInstapayName('');
    setBankName('');
    setBankAccount('');
    setBankBeneficiary('');
    setBankIban('');
    setCashNumber('');
    setFormError(null);
    setSuccessData(null);
    onClose();
  };

  const whatsappPhone = settings?.support_whatsapp || '+201063994059';
  const whatsappLink = successData
    ? generateWhatsAppWithdrawalLink({
        whatsappNumber: whatsappPhone,
        username: currentUser.username,
        email: currentUser.email,
        amount: successData.amount,
        paymentMethod: successData.paymentMethod,
        recipientDetails: successData.recipientDetails,
        requestReference: successData.reference
      })
    : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in text-right">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <button
            onClick={handleResetAndClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-lg font-bold text-white">طلب سحب رصيد (تحويل خارجي)</h3>
              <p className="text-xs text-slate-400">سحب أموالك من المحفظة إلى حسابك الفعلي بدون اقتطاع</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {successData ? (
          /* Success Screen with WhatsApp Button */
          <div className="text-center py-4 space-y-5">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-bold text-white mb-1">تم تسجيل طلب السحب بنجاح!</h4>
              <p className="text-xs text-amber-400 font-semibold bg-amber-950/50 py-1.5 px-3 rounded-full border border-amber-800/60 inline-block">
                حالة الطلب: قيد المراجعة والمطابقة
              </p>
              <p className="text-xs text-slate-300 mt-2">
                تم حجز المبلغ مؤقتاً لحين قيام المشرف بالتحويل لحسابك وتأكيد العملية.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-right space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">رقم مرجع طلب السحب:</span>
                <span className="font-mono text-emerald-400 font-bold">{successData.reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">المبلغ المطلوب:</span>
                <span className="font-bold text-white">{successData.amount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">طريقة الاستلام:</span>
                <span className="font-semibold text-slate-200">{successData.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">الحساب المستلم:</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]">{successData.recipientDetails}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">رصيد محفظتك المتبقي:</span>
                <span className="font-bold text-emerald-400">{formatEGP(successData.newBalance)}</span>
              </div>
            </div>

            {/* Direct WhatsApp button */}
            <div className="pt-1 space-y-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group"
              >
                <MessageCircle className="w-5 h-5 text-slate-950 fill-slate-950" />
                <span>إرسال تفاصيل طلب السحب لخدمة العملاء عبر واتساب</span>
                <ArrowUpRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

              <button
                onClick={handleResetAndClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                إغلاق والعودة للمحفظة
              </button>
            </div>
          </div>
        ) : (
          /* Withdrawal Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Balance info card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">رصيدك المتاح حالياً للسحب:</span>
                <span className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-emerald-400">
                  {formatEGP(currentUser.balance)}
                </span>
              </div>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            {/* Step 1: Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                1. حدد طريقة استلام الأموال المسحوبة:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('instapay')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    method === 'instapay'
                      ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <span className="text-xs block">إنستاباي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('bank')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    method === 'bank'
                      ? 'bg-blue-950/60 border-blue-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <span className="text-xs block">تحويل بنكي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('wallet')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    method === 'wallet'
                      ? 'bg-rose-950/60 border-rose-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-5 h-5 mx-auto mb-1 text-rose-400" />
                  <span className="text-xs block">محافظ كاش</span>
                </button>
              </div>
            </div>

            {/* Step 2: Receiving account details */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-300">
                2. بيانات حسابك الذي ستستلم عليه المبلغ:
              </div>

              {method === 'instapay' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      عنوان الدفع اللحظي (IPA) أو رقم هاتف إنستاباي:
                    </label>
                    <input
                      type="text"
                      value={instapayId}
                      onChange={(e) => setInstapayId(e.target.value)}
                      required
                      placeholder="مثال: name@instapay أو 01550464096"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs font-mono text-right focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">اسم صاحب حساب إنستاباي (اختياري):</label>
                    <input
                      type="text"
                      value={instapayName}
                      onChange={(e) => setInstapayName(e.target.value)}
                      placeholder="اسمك المسجل في إنستاباي للمطابقة"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs text-right focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {method === 'bank' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">اسم البنك:</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                        placeholder="مثال: البنك الأهلي أو المشرق"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-white text-xs text-right focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">رقم الحساب:</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        required
                        placeholder="1234567890123"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-white text-xs font-mono text-right focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">اسم المستفيد الثلاثي:</label>
                    <input
                      type="text"
                      value={bankBeneficiary}
                      onChange={(e) => setBankBeneficiary(e.target.value)}
                      placeholder={currentUser.full_name}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-white text-xs text-right focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رقم الآيبان IBAN (اختياري):</label>
                    <input
                      type="text"
                      value={bankIban}
                      onChange={(e) => setBankIban(e.target.value)}
                      placeholder="EG..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-white text-xs font-mono text-right focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {method === 'wallet' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">شركة المحفظة:</label>
                    <select
                      value={cashProvider}
                      onChange={(e) => setCashProvider(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-white text-xs text-right focus:outline-none"
                    >
                      <option value="فودافون كاش">فودافون كاش (Vodafone Cash)</option>
                      <option value="أورنج كاش">أورنج كاش (Orange Cash)</option>
                      <option value="اتصالات كاش">اتصالات كاش (Etisalat Cash)</option>
                      <option value="وي باي WE Pay">وي باي (WE Pay)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رقم هاتف المحفظة المستلمة:</label>
                    <input
                      type="tel"
                      value={cashNumber}
                      onChange={(e) => setCashNumber(e.target.value)}
                      required
                      placeholder="01012345678"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-white text-xs font-mono text-right focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Amount with Quick Percentages */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400">الحد الأدنى 10 ج.م</span>
                <label className="text-xs font-semibold text-slate-300">
                  3. المبلغ المراد سحبه (ج.م EGP):
                </label>
              </div>

              <div className="relative mb-2">
                <input
                  type="number"
                  min="10"
                  step="1"
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

              {/* Quick Percentage Chips */}
              <div className="flex gap-2">
                {[
                  { label: '25%', pct: 0.25 },
                  { label: '50%', pct: 0.5 },
                  { label: '75%', pct: 0.75 },
                  { label: 'كامل الرصيد 100%', pct: 1.0 },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handlePercentageClick(chip.pct)}
                    className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white rounded-lg transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: 6-Digit Transaction PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-emerald-400">مكونة من 6 أرقام سرية</span>
                <label className="text-xs font-semibold text-slate-300">
                  4. تأكيد بكلمة سر المعاملات (PIN):
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-base tracking-[0.4em] font-mono focus:outline-none transition-all text-center placeholder:tracking-normal"
              />
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-slate-400 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>يتم مراجعة الطلب وتحويل المبلغ لحسابك الفعلي يدوياً مع إمكانية متابعة الحالة</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !amount || numAmount <= 0 || transactionPin.length !== 6}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-white" />
              <span>{isSubmitting ? 'جاري تسجيل طلب السحب...' : 'تقديم طلب السحب الآن'}</span>
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
