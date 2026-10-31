/**
 * Pure business logic for MMG Wallet
 * Closed-Loop Financial Platform
 */

export interface TransferValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTransferAmount(
  amount: number,
  senderBalance: number,
  minTransfer: number = 10
): TransferValidationResult {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return { valid: false, error: 'المبلغ غير صالح، يرجى إدخال قيمة رقمية صحيحة' };
  }

  if (amount <= 0) {
    return { valid: false, error: 'يجب أن يكون مبلغ التحويل أكبر من صفر' };
  }

  if (amount < minTransfer) {
    return { valid: false, error: `الحد الأدنى للتحويل الداخلي هو ${minTransfer} ج.م` };
  }

  if (amount > senderBalance) {
    return { valid: false, error: 'رصيدك الحالي غير كافٍ لإتمام هذه المعاملة' };
  }

  return { valid: true };
}

export function validateUserCredentials(username: string, email: string): { valid: boolean; error?: string } {
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    return { valid: false, error: 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return { valid: false, error: 'اسم المستخدم يجب أن يحتوي فقط على حروف وأرقام إنجليزية وشرطة سفلية' };
  }

  const cleanEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, error: 'البريد الإلكتروني غير صحيح' };
  }

  return { valid: true };
}

export function validateTransactionPin(pin: string): { valid: boolean; error?: string } {
  const cleanPin = String(pin || '').trim();
  if (!cleanPin) {
    return { valid: false, error: 'يرجى إدخال كلمة سر المعاملات المكونة من 6 أرقام' };
  }
  if (!/^\d{6}$/.test(cleanPin)) {
    return { valid: false, error: 'كلمة سر المعاملات يجب أن تتكون من 6 أرقام تماماً' };
  }
  return { valid: true };
}

export function formatEGP(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0.00 ج.م';
  return new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ج.م';
}

export function generateReference(prefix: string = 'TX-MMG'): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestampPart = Date.now().toString(36).substring(4).toUpperCase();
  return `${prefix}-${timestampPart}${randomPart}`;
}

export function generateWhatsAppDepositLink(params: {
  whatsappNumber: string;
  username: string;
  email: string;
  amount: number;
  paymentMethod: string;
  senderReference: string;
}): string {
  const cleanPhone = params.whatsappNumber.replace(/[^0-9]/g, '');
  const message = `السلام عليكم ورحمة الله وبركاته،
دعم منصة MMG Wallet (mmgwallet.com)،
أرغب في تأكيد شحن رصيد وإيداع يدوي جديد بالمحفظة:

👤 اسم المستخدم: ${params.username}
📧 البريد الإلكتروني: ${params.email}
💰 المبلغ المحول: ${params.amount} ج.م
💳 وسيلة الدفع: ${params.paymentMethod}
🔢 رقم العملية / الحساب المحول منه: ${params.senderReference}

مرفق مع هذه الرسالة صورة إيصال التحويل (Screenshot). برجاء المراجعة وإضافة الرصيد إلى حسابي.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppWithdrawalLink(params: {
  whatsappNumber: string;
  username: string;
  email: string;
  amount: number;
  paymentMethod: string;
  recipientDetails: string;
  requestReference: string;
}): string {
  const cleanPhone = params.whatsappNumber.replace(/[^0-9]/g, '');
  const message = `السلام عليكم ورحمة الله وبركاته،
دعم منصة MMG Wallet (mmgwallet.com)،
لدي طلب سحب رصيد جديد قيد المراجعة:

👤 اسم المستخدم: ${params.username}
📧 البريد الإلكتروني: ${params.email}
💰 المبلغ المطلوب سحبه: ${params.amount} ج.م
💳 طريقة الاستلام: ${params.paymentMethod}
📋 بيانات الحساب المستلم: ${params.recipientDetails}
🔢 رقم مرجع طلب السحب: ${params.requestReference}

برجاء مراجعة الطلب وتحويل المبلغ إلى حسابي المذكور أعلاه وتأكيد العملية. شكراً لكم.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

