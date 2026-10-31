import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Receipt, 
  Search, 
  Filter, 
  ShieldCheck, 
  FileText,
  X,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Transaction } from '../types.ts';
import { formatEGP } from '../utils/rules.ts';

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filtered = transactions.filter((tx) => {
    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'deposits' && tx.type !== 'deposit' && tx.type !== 'admin_credit') return false;
      if (filterType === 'transfers_sent' && tx.type !== 'transfer_sent') return false;
      if (filterType === 'transfers_received' && tx.type !== 'transfer_received') return false;
      if (filterType === 'admin' && tx.type !== 'admin_credit' && tx.type !== 'admin_debit') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = tx.tx_reference.toLowerCase().includes(q);
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchRelated = tx.related_username?.toLowerCase().includes(q);
      return matchRef || matchDesc || matchRelated;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Controls: Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم المرجع أو الوصف..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all pr-10 text-right"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            الكل ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('deposits')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              filterType === 'deposits'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            الشحن والإيداع
          </button>
          <button
            onClick={() => setFilterType('transfers_sent')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              filterType === 'transfers_sent'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            تحويل صادر
          </button>
          <button
            onClick={() => setFilterType('transfers_received')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              filterType === 'transfers_received'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            تحويل وارد
          </button>
        </div>

      </div>

      {/* Transactions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">جاري تحميل سجل المعاملات...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-700" />
            <p>لا توجد معاملات مطابقة في الوقت الحالي</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((tx) => {
              const isCredit = tx.type === 'deposit' || tx.type === 'transfer_received' || tx.type === 'admin_credit';

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-850/60 transition-colors cursor-pointer text-right group"
                >
                  {/* Left: Amount & Balance after */}
                  <div className="text-left font-['Plus_Jakarta_Sans',sans-serif]">
                    <div
                      className={`text-base font-bold flex items-center gap-1 ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <span>{isCredit ? '+' : '-'}</span>
                      <span>{formatEGP(tx.amount)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      الرصيد بعدها: {formatEGP(tx.balance_after)}
                    </div>
                  </div>

                  {/* Right: Icon, Title, and Reference */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {tx.type === 'deposit' && 'شحن رصيد إيداع'}
                        {tx.type === 'transfer_sent' && `تحويل صادر إلى @${tx.related_username || 'مستخدم'}`}
                        {tx.type === 'transfer_received' && `تحويل وارد من @${tx.related_username || 'مستخدم'}`}
                        {tx.type === 'admin_credit' && 'إضافة رصيد إدارية (Credit)'}
                        {tx.type === 'admin_debit' && 'خصم رصيد إداري (Debit)'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[280px] sm:max-w-md">
                        {tx.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                        <span>{tx.tx_reference}</span>
                        <span>•</span>
                        <span>{new Date(tx.created_at).toLocaleString('ar-EG')}</span>
                      </div>
                    </div>

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCredit
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">إيصال المعاملة المالية</span>
                <Receipt className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Receipt Body */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4 font-sans text-xs">
              <div className="text-center pb-3 border-b border-slate-800">
                <div className="text-xs text-slate-400 mb-1">المبلغ الصافي</div>
                <div className="text-2xl font-black text-emerald-400 font-['Plus_Jakarta_Sans',sans-serif]">
                  {formatEGP(selectedTx.amount)}
                </div>
                <div className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-500 font-semibold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>معاملة مكتملة ومقيدة بالرصيد</span>
                </div>
              </div>

              <div className="space-y-2.5 text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">رقم الإيصال / المرجع:</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedTx.tx_reference}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">نوع العملية:</span>
                  <span className="font-medium text-white">
                    {selectedTx.type === 'deposit' && 'شحن رصيد'}
                    {selectedTx.type === 'transfer_sent' && 'تحويل صادر'}
                    {selectedTx.type === 'transfer_received' && 'تحويل وارد'}
                    {selectedTx.type === 'admin_credit' && 'إضافة رصيد إدارية'}
                    {selectedTx.type === 'admin_debit' && 'خصم رصيد إداري'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">الرصيد قبل المعاملة:</span>
                  <span className="font-mono">{formatEGP(selectedTx.balance_before)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">الرصيد بعد المعاملة:</span>
                  <span className="font-mono text-white font-bold">{formatEGP(selectedTx.balance_after)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">التاريخ والوقت:</span>
                  <span className="font-mono">{new Date(selectedTx.created_at).toLocaleString('ar-EG')}</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">البيان / الوصف:</span>
                  <p className="bg-slate-900 p-2.5 rounded-xl text-slate-200 text-xs leading-relaxed border border-slate-800">
                    {selectedTx.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-all"
              >
                إغلاق الإيصال
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
