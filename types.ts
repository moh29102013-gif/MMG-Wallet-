export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'user' | 'admin';
  balance: number;
  status: 'active' | 'suspended';
  created_at: string;
}

export type TransactionType =
  | 'deposit'
  | 'transfer_sent'
  | 'transfer_received'
  | 'admin_credit'
  | 'admin_debit';

export interface Transaction {
  id: number;
  tx_reference: string;
  user_id: number;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  related_user_id?: number | null;
  related_username?: string | null;
  admin_id?: number | null;
  admin_name?: string | null;
  description: string;
  created_at: string;
}

export interface DepositRequest {
  id: number;
  request_reference: string;
  user_id: number;
  username?: string;
  payment_method: string;
  amount: number;
  sender_account_or_ref: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface WithdrawalRequest {
  id: number;
  request_reference: string;
  user_id: number;
  username?: string;
  full_name?: string;
  email?: string;
  current_balance?: number;
  payment_method: string;
  amount: number;
  recipient_details: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  processed_by?: number | null;
  created_at: string;
  processed_at?: string | null;
}

export interface SystemSettings {
  site_name: string;
  domain: string;
  support_whatsapp: string;
  instapay_address: string;
  instapay_phone: string;
  instapay_account_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_iban: string;
  bank_beneficiary: string;
  cash_wallet_number: string;
  min_transfer_amount: string;
  min_deposit_amount: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
