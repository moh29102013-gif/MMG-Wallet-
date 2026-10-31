import React, { useState } from 'react';
import { 
  Building2, 
  Smartphone, 
  Receipt, 
  Copy, 
  Check, 
  MessageCircle, 
  Send, 
  ShieldAlert, 
  Sparkles,
  Info,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { User, SystemSettings, DepositRequest } from '../types.ts';
import { generateWhatsAppDepositLink } from '../utils/rules.ts';

interface DepositSectionProps {
  user: User;
  settings: SystemSettings | null;
  depositRequests: DepositRequest[];
  onDepositSubmitted: () => void;
}

export const DepositSection: React.FC<DepositSectionProps> = ({
  user,
  settings,
  depositRequests,
  onDepositSubmitted,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'instapay' | 'bank' | 'wallet'>('instapay');
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [senderRef, setSenderRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const whatsappPhone = settings?.support_whatsapp || '+201063994059';
  const numericAmount = parseFloat(depositAmount) || 0;

  // Generate WhatsApp pre-filled receipt link
  const methodTitle = {
    instapay: 'إنستاباي (InstaPay)',
    bank: 'بنك المشرق (Mashreq Neo)',
    wallet: 'محافظ الكاش (Cash Wallet)',
  }[selectedMethod];

  const whatsappLink = generateWhatsAppDepositLink({
    whatsappNumber: whatsappPhone,
    username: user.username,
    email: user.email,
    amount: numericAmount,
    paymentMethod: methodTitle,
    senderReference: senderRef.trim() || 'سيتم إرفاق صورة الإيصال',
  });

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount < 10) {
      setSubmitMessage({ type: 'error', text: 'الحد الأدنى للشحن هو 10 ج.م' });
      return;
    }

    if (!senderRef.trim()) {
      setSubmitMessage({ type: 'error', text: 'يرجى إدخال رقم العملية أو الحساب المحول منه لمطابقة الإيصال' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const token = localStorage.getItem('mmg_token');
      const res = await fetch('/api/wallet/deposit-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_method: methodTitle,
          amount: numericAmount,
          sender_reference: senderRef.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء تسجيل الطلب');
      }

      setSubmitMessage({
        type: 'success',
        text: 'تم تسجيل طلب الشحن في النظام بنجاح! يرجى الآن الضغط على زر واتساب لإرسال صورة إيصال التحويل.',
      });
      onDepositSubmitted();
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Informational Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 mt-1">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">كيف يعمل نظام الشحن اليدوي في MMG Wallet؟</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                1. اختر وسيلة الدفع المناسبة وحوّل المبلغ المطلوب لحساباتنا الرسمية أدناه.<br />
                2. التقط لقطة شاشة (Screenshot) للإيصال، ثم اضغط على زر الواتساب لإرسال الإيصال للدعم مع اسمك.<br />
                3. يقوم مسؤول الحسابات بمطابقة الإيداع في البنك الفعلي وإضافة الرصيد لمحفظتك فورياً.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              فريق الدعم متاح للمراجعة 24/7
            </span>
          </div>
        </div>
      </div>

      {/* Payment Channels Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
          اختر وسيلة الدفع لعرض بيانات الحساب:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* InstaPay */}
          <button
            type="button"
            onClick={() => setSelectedMethod('instapay')}
            className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
              selectedMethod === 'instapay'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10 text-white'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <Smartphone className="w-6 h-6 text-emerald-400" />
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">الأسرع</span>
            </div>
            <div>
              <div className="font-bold text-base text-white">إنستاباي InstaPay</div>
              <div className="text-xs text-slate-400 mt-0.5">تحويل لحظي بالرقم أو الـ IPA</div>
            </div>
          </button>

          {/* Bank Transfer */}
          <button
            type="button"
            onClick={() => setSelectedMethod('bank')}
            className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
              selectedMethod === 'bank'
                ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10 text-white'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <Building2 className="w-6 h-6 text-blue-400" />
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">بنكي</span>
            </div>
            <div>
              <div className="font-bold text-base text-white">بنك المشرق Mashreq Neo</div>
              <div className="text-xs text-slate-400 mt-0.5">رقم الحساب & آيبان IBAN</div>
            </div>
          </button>

          {/* Cash Wallets */}
          <button
            type="button"
            onClick={() => setSelectedMethod('wallet')}
            className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
              selectedMethod === 'wallet'
                ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-500/10 text-white'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <Smartphone className="w-6 h-6 text-rose-400" />
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">كاش</span>
            </div>
            <div>
              <div className="font-bold text-base text-white">محافظ الكاش</div>
              <div className="text-xs text-slate-400 mt-0.5">فودافون / أورنج / اتصالات / وي</div>
            </div>
          </button>

        </div>
      </div>

      {/* Selected Channel Details Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {selectedMethod === 'instapay' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">بيانات حساب إنستاباي (InstaPay IPN)</h4>
                  <p className="text-xs text-slate-400">حوّل عبر تطبيق InstaPay باستخدام عنوان الدفع اللحظي أو رقم الهاتف</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                تأكيد فوري
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">عنوان الدفع اللحظي (IPA)</div>
                  <div className="text-base sm:text-lg font-mono font-bold text-emerald-400 tracking-wide select-all">
                    {settings?.instapay_address || 'mohamed29102013@instapay'}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(settings?.instapay_address || 'mohamed29102013@instapay', 'instapay_ipa')}
                  className="p-2.5 bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-300 rounded-lg transition-all"
                  title="نسخ عنوان الدفع"
                >
                  {copiedKey === 'instapay_ipa' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">رقم هاتف إنستاباي المباشر</div>
                  <div className="text-base sm:text-lg font-mono font-bold text-white tracking-wider select-all">
                    {settings?.instapay_phone || '01550464096'}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(settings?.instapay_phone || '01550464096', 'instapay_phone')}
                  className="p-2.5 bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-300 rounded-lg transition-all"
                  title="نسخ رقم الهاتف"
                >
                  {copiedKey === 'instapay_phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'bank' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">بيانات التحويل البنكي - بنك المشرق (Mashreq Neo)</h4>
                  <p className="text-xs text-slate-400">تحويل بنكي عادي أو لحظي عبر رقم الحساب أو الآيبان الرسمي</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold">
                حساب رسمي
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">اسم البنك</div>
                  <div className="text-sm font-bold text-white">{settings?.bank_name || 'بنك المشرق (Mashreq Neo)'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{settings?.bank_beneficiary || 'حساب مشرق نيو'}</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">رقم الحساب (Account No)</div>
                  <div className="text-sm font-mono font-bold text-blue-400 select-all">
                    {settings?.bank_account_number || '059102114579'}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(settings?.bank_account_number || '059102114579', 'bank_acc')}
                  className="p-2 bg-slate-800 hover:text-blue-400 text-slate-300 rounded-lg"
                  title="نسخ رقم الحساب"
                >
                  {copiedKey === 'bank_acc' ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">رقم الآيبان (IBAN)</div>
                  <div className="text-xs font-mono font-bold text-blue-300 truncate max-w-[170px] select-all" title={settings?.bank_iban || 'EG090046020100000059102114597'}>
                    {settings?.bank_iban || 'EG090046020100000059102114597'}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(settings?.bank_iban || 'EG090046020100000059102114597', 'iban')}
                  className="p-2 bg-slate-800 hover:text-blue-400 text-slate-300 rounded-lg"
                  title="نسخ الآيبان"
                >
                  {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'wallet' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">محافظ الكاش (Vodafone / Orange / Etisalat / WE)</h4>
                  <p className="text-xs text-slate-400">تحويل مباشر من محفظتك الإلكترونية لرقم المحفظة المعتمد</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-xs font-bold">
                كاش فوري
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-1">رقم محفظة الكاش المعتمد للتحويل</div>
                <div className="text-2xl font-mono font-bold text-rose-400 tracking-wider select-all">
                  {settings?.cash_wallet_number || '01141714725'}
                </div>
              </div>
              <button
                onClick={() => handleCopy(settings?.cash_wallet_number || '01141714725', 'cash_num')}
                className="p-2.5 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-300 rounded-lg transition-all"
                title="نسخ رقم الكاش"
              >
                {copiedKey === 'cash_num' ? <Check className="w-4 h-4 text-rose-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation & WhatsApp Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Step 2: Register in-app & WhatsApp */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h4 className="font-bold text-white text-base">تسجيل بيانات التحويل لإصدار نص الواتساب</h4>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  المبلغ المحول بالجنيه المصري (EGP / ج.م):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] focus:outline-none transition-all pl-16 text-right"
                    placeholder="500"
                  />
                  <div className="absolute left-3 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                    ج.م EGP
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم العملية / اسم أو رقم الحساب المحول منه:
                </label>
                <input
                  type="text"
                  value={senderRef}
                  onChange={(e) => setSenderRef(e.target.value)}
                  required
                  placeholder="مثال: تحويل من إنستاباي حسام أحمد أو كود 98402"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all text-right"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  يساعد المشرف على سرعة مطابقة الإيداع فوراً مع كشف حساب البنك
                </span>
              </div>

              {submitMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    submitMessage.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{submitMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'جاري التسجيل...' : 'تسجيل طلب الشحن في النظام أولاً'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Step 3: WhatsApp Direct Link */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-white text-base">إرسال صورة الإيصال لواتساب الشركة</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              اضغط على الزر التالي ليتم فتح تطبيق الواتساب مباشرة برقم الدعم الفني، وستكون الرسالة محملة تلقائياً ببياناتك (اسمك، بريدك، المبلغ)؛ ما عليك سوى إرفاق صورة لقطة الشاشة (Screenshot) للإيصال والضغط على إرسال.
            </p>

            {/* Message Preview Box */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 mb-5 text-right font-sans text-xs text-slate-300 space-y-1">
              <div className="text-[11px] text-emerald-400 font-bold border-b border-slate-800 pb-1 mb-1">
                معاينة النص التلقائي للرسالة:
              </div>
              <div>• <strong>المستخدم:</strong> {user.username} ({user.full_name})</div>
              <div>• <strong>البريد:</strong> {user.email}</div>
              <div>• <strong>المبلغ:</strong> {numericAmount} ج.م</div>
              <div>• <strong>طريقة الشحن:</strong> {methodTitle}</div>
              <div>• <strong>المرجع:</strong> {senderRef.trim() || '(سيتم كتابته أو إرفاقه)'}</div>
            </div>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-base rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 text-center group"
          >
            <MessageCircle className="w-5 h-5 text-slate-950 fill-slate-950" />
            <span>إرسال إيصال التحويل عبر واتساب الآن</span>
            <ArrowUpRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

      </div>

      {/* User's Previous Deposit Requests Status */}
      {depositRequests.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>متابعة حالة طلبات الشحن الخاصة بك:</span>
            </h4>
            <span className="text-xs text-slate-500">{depositRequests.length} طلبات مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">رقم الطلب</th>
                  <th className="pb-3 font-semibold">وسيلة الدفع</th>
                  <th className="pb-3 font-semibold">المبلغ</th>
                  <th className="pb-3 font-semibold">المرجع المرفق</th>
                  <th className="pb-3 font-semibold">الحالة</th>
                  <th className="pb-3 font-semibold">ملاحظات الإدارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {depositRequests.map((req) => (
                  <tr key={req.id} className="text-slate-300">
                    <td className="py-3 font-mono text-slate-400">{req.request_reference}</td>
                    <td className="py-3 font-medium text-white">{req.payment_method}</td>
                    <td className="py-3 font-bold font-['Plus_Jakarta_Sans',sans-serif] text-emerald-400">
                      {req.amount.toLocaleString()} ج.م
                    </td>
                    <td className="py-3 text-slate-400 max-w-[150px] truncate">{req.sender_account_or_ref}</td>
                    <td className="py-3">
                      {req.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                          قيد المراجعة
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          تم الشحن والإضافة ✓
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                          مرفوض
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-400 italic">
                      {req.admin_notes || (req.status === 'pending' ? 'بانتظار وصول الإيصال عبر الواتساب' : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
