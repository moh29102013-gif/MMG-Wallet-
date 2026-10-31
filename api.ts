import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import { generateReference, validateTransferAmount, validateTransactionPin } from '../utils/rules.ts';

export const apiRouter = Router();

// Simple in-memory session/token store (mapping token -> userId)
// In production or multi-server, JWT with signing key or Redis is used
const tokenStore = new Map<string, { userId: number; role: string; expiresAt: number }>();

function generateToken(userId: number, role: string): string {
  const token = 'mmg_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  tokenStore.set(token, {
    userId,
    role,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });
  return token;
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'غير مصرح، يرجى تسجيل الدخول أولاً' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const session = tokenStore.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) tokenStore.delete(token);
    res.status(401).json({ error: 'الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى' });
    return;
  }

  const user = db.prepare(`SELECT id, username, email, full_name, role, balance, status FROM users WHERE id = ?`).get(session.userId) as any;
  if (!user || user.status !== 'active') {
    res.status(403).json({ error: 'الحساب غير متاح أو موقوف' });
    return;
  }

  (req as any).user = user;
  next();
}

// Admin authorization middleware
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'غير مسموح. هذه الصفحة مخصصة لمدير النظام فقط.' });
      return;
    }
    next();
  });
}

// ==========================================
// 1. PUBLIC & AUTH ROUTES
// ==========================================

// Get public system settings & payment channels (InstaPay, Fawry, Bank Accounts)
apiRouter.get('/settings', (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`SELECT key, value FROM system_settings`).all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في جلب إعدادات النظام' });
  }
});

// User Registration
apiRouter.post('/auth/register', (req: Request, res: Response): void => {
  try {
    const { username, email, password, full_name, phone, transaction_pin } = req.body;

    if (!username || !email || !password || !full_name) {
      res.status(400).json({ error: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    const pinValidation = validateTransactionPin(transaction_pin);
    if (!pinValidation.valid) {
      res.status(400).json({ error: pinValidation.error });
      return;
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUsername.length < 3) {
      res.status(400).json({ error: 'اسم المستخدم يجب ألا يقل عن 3 أحرف' });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل' });
      return;
    }

    // Check duplicate
    const existing = db.prepare(`SELECT id, username, email FROM users WHERE username = ? OR email = ?`).get(cleanUsername, cleanEmail) as any;
    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername.toLowerCase()) {
        res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم آخر' });
        return;
      }
      res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
      return;
    }

    // Hash password with bcrypt
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(password, salt);
    const pinHash = bcrypt.hashSync(String(transaction_pin).trim(), 10);

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, transaction_pin_hash, full_name, phone, role, balance, status)
      VALUES (?, ?, ?, ?, ?, ?, 'user', 0.0, 'active')
    `).run(cleanUsername, cleanEmail, passwordHash, pinHash, full_name.trim(), phone?.trim() || null);

    const newUser = db.prepare(`SELECT id, username, email, full_name, role, balance, status, created_at FROM users WHERE id = ?`).get(result.lastInsertRowid) as any;
    const token = generateToken(newUser.id, newUser.role);

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      user: newUser,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب: ' + err.message });
  }
});

// Login (Handles both User and Admin)
apiRouter.post('/auth/login', (req: Request, res: Response): void => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم/البريد وكلمة المرور' });
      return;
    }

    const cleanIdentifier = String(identifier).trim();
    const user = db.prepare(`
      SELECT id, username, email, password_hash, full_name, role, balance, status, created_at
      FROM users
      WHERE username = ? OR email = ?
    `).get(cleanIdentifier, cleanIdentifier) as any;

    if (!user) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'هذا الحساب موقوف، يرجى مراجعة إدارة MMG Wallet' });
      return;
    }

    // Verify bcrypt password
    const passwordMatch = bcrypt.compareSync(String(password), user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
      return;
    }

    const token = generateToken(user.id, user.role);
    const { password_hash, ...safeUser } = user;

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      user: safeUser,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في عملية الدخول' });
  }
});

// Get current user profile and fresh balance
apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user });
});

// ==========================================
// 2. USER WALLET & TRANSACTIONS
// ==========================================

// Get user transaction history
apiRouter.get('/wallet/transactions', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const txs = db.prepare(`
      SELECT t.*, u_rel.username as related_username, u_adm.full_name as admin_name
      FROM transactions t
      LEFT JOIN users u_rel ON t.related_user_id = u_rel.id
      LEFT JOIN users u_adm ON t.admin_id = u_adm.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 100
    `).all(userId);

    res.json(txs);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في استرجاع سجل العمليات' });
  }
});

// Search potential recipient for internal transfer by username or email
apiRouter.get('/wallet/lookup-recipient', requireAuth, (req: Request, res: Response): void => {
  try {
    const query = String(req.query.query || '').trim();
    const currentUserId = (req as any).user.id;

    if (!query || query.length < 2) {
      res.status(400).json({ error: 'يرجى إدخال حرفين على الأقل للبحث' });
      return;
    }

    const recipient = db.prepare(`
      SELECT id, username, full_name, email
      FROM users
      WHERE (username = ? OR email = ?) AND id != ? AND status = 'active'
    `).get(query, query, currentUserId) as any;

    if (!recipient) {
      res.status(404).json({ error: 'لم يتم العثور على مستخدم مطابق ونشط' });
      return;
    }

    res.json({
      recipient: {
        id: recipient.id,
        username: recipient.username,
        full_name: recipient.full_name,
        email: recipient.email
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في البحث عن المستلم' });
  }
});

// ==========================================
// 3. ATOMIC INTERNAL PEER-TO-PEER TRANSFER
// Guaranteed ACID execution with BEGIN/COMMIT/ROLLBACK
// ==========================================
apiRouter.post('/wallet/transfer', requireAuth, (req: Request, res: Response): void => {
  const senderId = (req as any).user.id;
  const { recipient_identifier, amount, note, transaction_pin } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'يرجى إدخال مبلغ تحويل صحيح وأكبر من صفر' });
    return;
  }

  if (!recipient_identifier) {
    res.status(400).json({ error: 'يرجى تحديد اسم المستخدم أو البريد الإلكتروني للمستلم' });
    return;
  }

  const pinValidation = validateTransactionPin(transaction_pin);
  if (!pinValidation.valid) {
    res.status(400).json({ error: pinValidation.error });
    return;
  }

  // Atomic database transaction block
  const transferTx = db.transaction(() => {
    // 1. Fetch fresh sender data with lock
    const sender = db.prepare(`SELECT id, username, balance, transaction_pin_hash, status FROM users WHERE id = ?`).get(senderId) as any;
    if (!sender || sender.status !== 'active') {
      throw new Error('حسابك غير نشط، لا يمكن إتمام التحويل');
    }

    // 2. Verify 6-digit Transaction PIN
    if (sender.transaction_pin_hash) {
      const pinMatch = bcrypt.compareSync(String(transaction_pin).trim(), sender.transaction_pin_hash);
      if (!pinMatch) {
        throw new Error('كلمة سر المعاملات (المكونة من 6 أرقام) غير صحيحة');
      }
    }

    // 3. Validate balance
    const validation = validateTransferAmount(numAmount, sender.balance, 10);
    if (!validation.valid) {
      throw new Error(validation.error || 'رصيدك غير كافٍ');
    }

    // 4. Find and lock recipient
    const recipient = db.prepare(`
      SELECT id, username, balance, status
      FROM users
      WHERE (username = ? OR email = ?) AND status = 'active'
    `).get(recipient_identifier.trim(), recipient_identifier.trim()) as any;

    if (!recipient) {
      throw new Error('المستلم غير موجود أو حسابه موقوف');
    }

    if (recipient.id === sender.id) {
      throw new Error('لا يمكنك التحويل لنفس حسابك');
    }

    const senderBalanceBefore = sender.balance;
    const senderBalanceAfter = senderBalanceBefore - numAmount;
    const recipientBalanceBefore = recipient.balance;
    const recipientBalanceAfter = recipientBalanceBefore + numAmount;

    // 4. Update Sender Balance
    db.prepare(`
      UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(senderBalanceAfter, sender.id);

    // 5. Update Recipient Balance
    db.prepare(`
      UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(recipientBalanceAfter, recipient.id);

    // 6. Insert Sender Transaction record
    const senderTxRef = generateReference('TX-OUT');
    const senderDesc = note?.trim()
      ? `تحويل داخلي إلى @${recipient.username} - ${note.trim()}`
      : `تحويل داخلي إلى @${recipient.username}`;

    db.prepare(`
      INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, related_user_id, description)
      VALUES (?, ?, 'transfer_sent', ?, ?, ?, ?, ?)
    `).run(senderTxRef, sender.id, numAmount, senderBalanceBefore, senderBalanceAfter, recipient.id, senderDesc);

    // 7. Insert Recipient Transaction record
    const recipientTxRef = generateReference('TX-IN');
    const recipientDesc = note?.trim()
      ? `تحويل داخلي مستلم من @${sender.username} - ${note.trim()}`
      : `تحويل داخلي مستلم من @${sender.username}`;

    db.prepare(`
      INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, related_user_id, description)
      VALUES (?, ?, 'transfer_received', ?, ?, ?, ?, ?)
    `).run(recipientTxRef, recipient.id, numAmount, recipientBalanceBefore, recipientBalanceAfter, sender.id, recipientDesc);

    return {
      senderTxRef,
      senderBalanceAfter,
      recipientUsername: recipient.username,
      amount: numAmount
    };
  });

  try {
    const result = transferTx();
    res.json({
      success: true,
      message: `تم تحويل ${result.amount} ج.م إلى @${result.recipientUsername} بنجاح`,
      reference: result.senderTxRef,
      new_balance: result.senderBalanceAfter
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشلت عملية التحويل وتم إلغاء التغييرات' });
  }
});

// ==========================================
// 4. DEPOSIT REQUEST REGISTRATION (MANUAL SHAHEN)
// ==========================================
apiRouter.post('/wallet/deposit-request', requireAuth, (req: Request, res: Response): void => {
  try {
    const userId = (req as any).user.id;
    const { payment_method, amount, sender_reference } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      res.status(400).json({ error: 'الحد الأدنى لطلب الشحن هو 10 ج.م' });
      return;
    }

    if (!payment_method || !sender_reference) {
      res.status(400).json({ error: 'يرجى تحديد وسيلة الدفع وبيانات المحول / رقم العملية' });
      return;
    }

    const requestRef = generateReference('DEP');
    db.prepare(`
      INSERT INTO deposit_requests (request_reference, user_id, payment_method, amount, sender_account_or_ref, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(requestRef, userId, payment_method, numAmount, sender_reference.trim());

    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلب الشحن بنجاح. يرجى إرسال الإيصال عبر الواتساب لتأكيده وإضافة الرصيد فوراً.',
      reference: requestRef
    });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في تسجيل طلب الشحن' });
  }
});

apiRouter.get('/wallet/deposit-requests', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const requests = db.prepare(`
      SELECT * FROM deposit_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(userId);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في جلب طلبات الإيداع' });
  }
});

// ==========================================
// 4.b WITHDRAWAL REQUEST (MANUAL SAHB)
// ==========================================
apiRouter.post('/wallet/withdrawal-request', requireAuth, (req: Request, res: Response): void => {
  const userId = (req as any).user.id;
  const { payment_method, amount, recipient_details, transaction_pin } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < 10) {
    res.status(400).json({ error: 'الحد الأدنى لطلب السحب هو 10 ج.م' });
    return;
  }

  if (!payment_method || !recipient_details || !String(recipient_details).trim()) {
    res.status(400).json({ error: 'يرجى تحديد وسيلة السحب وكتابة بيانات الحساب المستلم بدقة' });
    return;
  }

  const pinValidation = validateTransactionPin(transaction_pin);
  if (!pinValidation.valid) {
    res.status(400).json({ error: pinValidation.error });
    return;
  }

  // Atomic withdrawal hold transaction
  const withdrawalTx = db.transaction(() => {
    // 1. Fetch user with password and transaction PIN hash
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
    if (!user || user.status !== 'active') {
      throw new Error('حسابك غير نشط أو غير متاح');
    }

    // 2. Validate transaction PIN
    if (user.transaction_pin_hash) {
      const pinMatch = bcrypt.compareSync(String(transaction_pin).trim(), user.transaction_pin_hash);
      if (!pinMatch) {
        throw new Error('كلمة سر المعاملات (المكونة من 6 أرقام) غير صحيحة');
      }
    } else {
      // Fallback to main password if PIN not set yet
      const passMatch = bcrypt.compareSync(String(transaction_pin).trim(), user.password_hash);
      if (!passMatch) {
        throw new Error('رمز التأكيد غير صحيح');
      }
    }

    // 3. Validate user balance
    if (user.balance < numAmount) {
      throw new Error(`رصيدك المتاح (${user.balance} ج.م) غير كافٍ لسحب ${numAmount} ج.م`);
    }

    const balanceBefore = user.balance;
    const balanceAfter = balanceBefore - numAmount;

    // 4. Deduct balance immediately (funds held in escrow for review)
    db.prepare(`UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(balanceAfter, user.id);

    // 5. Generate unique withdrawal reference
    const requestRef = generateReference('WR');

    // 6. Record transaction log
    const desc = `طلب سحب رصيد (${payment_method}) قيد المراجعة - المستلم: ${recipient_details.trim()} - مرجع ${requestRef}`;
    db.prepare(`
      INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, description)
      VALUES (?, ?, 'admin_debit', ?, ?, ?, ?)
    `).run(requestRef, user.id, numAmount, balanceBefore, balanceAfter, desc);

    // 7. Insert into withdrawal_requests
    db.prepare(`
      INSERT INTO withdrawal_requests (request_reference, user_id, payment_method, amount, recipient_details, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(requestRef, user.id, payment_method, numAmount, recipient_details.trim());

    // 8. Log audit
    db.prepare(`
      INSERT INTO audit_logs (actor_id, actor_role, action, target_user_id, details)
      VALUES (?, 'user', 'withdrawal_request_created', ?, ?)
    `).run(user.id, user.id, `المبلغ: ${numAmount} ج.م | الوسيلة: ${payment_method} | المرجع: ${requestRef}`);

    return {
      reference: requestRef,
      newBalance: balanceAfter,
      amount: numAmount
    };
  });

  try {
    const result = withdrawalTx();
    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلب السحب بنجاح وهو الآن قيد المراجعة. يمكنك أيضاً مراسلة خدمة العملاء عبر الواتساب لتسريع التحويل.',
      reference: result.reference,
      new_balance: result.newBalance
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'حدث خطأ أثناء تقديم طلب السحب' });
  }
});

apiRouter.get('/wallet/withdrawal-requests', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const requests = db.prepare(`
      SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
    `).all(userId);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في جلب طلبات السحب' });
  }
});

// Delete user account
apiRouter.post('/wallet/delete-account', requireAuth, (req: Request, res: Response): void => {
  try {
    const userId = (req as any).user.id;
    const { password, confirm_forfeit } = req.body;

    if (!password) {
      res.status(400).json({ error: 'يرجى إدخال كلمة المرور لتأكيد حذف الحساب' });
      return;
    }

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
    if (!user) {
      res.status(404).json({ error: 'المستخدم غير موجود' });
      return;
    }

    if (user.role === 'admin' && user.username.toLowerCase() === 'admin') {
      res.status(403).json({ error: 'لا يمكن حذف الحساب الإداري الرئيسي للنظام' });
      return;
    }

    // Verify password
    const passwordMatch = bcrypt.compareSync(String(password), user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
      return;
    }

    if (user.balance > 0 && !confirm_forfeit) {
      res.status(400).json({
        error: `يحتوي حسابك على رصيد متبقي (${user.balance} ج.م). يجب تحويله لمستخدم آخر أو تأكيد التنازل عنه لإتمام الحذف.`,
        has_balance: true
      });
      return;
    }

    // Atomic transaction for deleting user account
    const deleteTx = db.transaction(() => {
      // 1. Audit log the deletion
      db.prepare(`
        INSERT INTO audit_logs (actor_id, actor_role, action, target_user_id, details)
        VALUES (?, ?, 'delete_account', ?, ?)
      `).run(userId, user.role, userId, `تم حذف الحساب نهائياً بواسطة صاحبه. الرصيد المتبقي وقت الحذف: ${user.balance} ج.م`);

      // 2. Delete user row (cascades to user's transactions and deposit requests)
      db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
    });

    deleteTx();

    // Clean up active session tokens
    for (const [token, session] of tokenStore.entries()) {
      if (session.userId === userId) {
        tokenStore.delete(token);
      }
    }

    res.json({
      success: true,
      message: 'تم حذف حسابك وجميع بياناته بنجاح.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الحساب: ' + err.message });
  }
});

// ==========================================
// 5. ADMIN PANEL OPERATIONS
// ==========================================

// Search users by username, email, or full name
apiRouter.get('/admin/users', requireAdmin, (req: Request, res: Response) => {
  try {
    const query = String(req.query.query || '').trim();
    let users;
    if (query) {
      users = db.prepare(`
        SELECT id, username, email, full_name, phone, role, balance, status, created_at
        FROM users
        WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(`%${query}%`, `%${query}%`, `%${query}%`);
    } else {
      users = db.prepare(`
        SELECT id, username, email, full_name, phone, role, balance, status, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 50
      `).all();
    }
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في استعلام المستخدمين' });
  }
});

// Manual Balance Credit / Debit with mandatory Reason and ACID Transactions
apiRouter.post('/admin/adjust-balance', requireAdmin, (req: Request, res: Response): void => {
  const adminId = (req as any).user.id;
  const { user_id, action_type, amount, reason } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'يجب أن يكون المبلغ قيمة موجبة أكبر من صفر' });
    return;
  }

  if (action_type !== 'credit' && action_type !== 'debit') {
    res.status(400).json({ error: 'نوع العملية غير صالح (يجب أن يكون إضافة أو خصم)' });
    return;
  }

  if (!reason || String(reason).trim().length < 3) {
    res.status(400).json({ error: 'سبب العملية مطلوب إلزامياً للتدقيق والأمان' });
    return;
  }

  // Atomic SQLite transaction
  const adjustTx = db.transaction(() => {
    // 1. Lock and retrieve user
    const targetUser = db.prepare(`SELECT id, username, full_name, balance FROM users WHERE id = ?`).get(user_id) as any;
    if (!targetUser) {
      throw new Error('المستخدم المطلوب غير موجود');
    }

    const currentBalance = targetUser.balance;
    let newBalance = 0;
    let txType: 'admin_credit' | 'admin_debit';

    if (action_type === 'credit') {
      newBalance = currentBalance + numAmount;
      txType = 'admin_credit';
    } else {
      if (currentBalance < numAmount) {
        throw new Error(`لا يمكن خصم ${numAmount} ج.م لأن رصيد المستخدم الحالي ${currentBalance} ج.م فقط`);
      }
      newBalance = currentBalance - numAmount;
      txType = 'admin_debit';
    }

    // 2. Update user balance
    db.prepare(`UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newBalance, targetUser.id);

    // 3. Write transaction log
    const ref = generateReference(action_type === 'credit' ? 'ADM-CR' : 'ADM-DR');
    const fullDesc = `إجراء إداري (${action_type === 'credit' ? 'إضافة رصيد' : 'خصم رصيد'}): ${reason.trim()}`;

    db.prepare(`
      INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, admin_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ref, targetUser.id, txType, numAmount, currentBalance, newBalance, adminId, fullDesc);

    // 4. Write audit log
    db.prepare(`
      INSERT INTO audit_logs (actor_id, actor_role, action, target_user_id, details)
      VALUES (?, 'admin', ?, ?, ?)
    `).run(adminId, `manual_${action_type}`, targetUser.id, `المبلغ: ${numAmount} ج.م | السبب: ${reason.trim()}`);

    return {
      username: targetUser.username,
      newBalance,
      reference: ref,
      amount: numAmount,
      type: action_type
    };
  });

  try {
    const result = adjustTx();
    res.json({
      success: true,
      message: `تمت عملية ال${result.type === 'credit' ? 'إضافة' : 'خصم'} بنجاح للمستخدم @${result.username}. الرصيد الجديد: ${result.newBalance} ج.م`,
      reference: result.reference,
      new_balance: result.newBalance
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشلت العملية وتم التراجع عن كافة التغييرات' });
  }
});

// Admin: Get all deposit requests
apiRouter.get('/admin/deposit-requests', requireAdmin, (req: Request, res: Response) => {
  try {
    const requests = db.prepare(`
      SELECT dr.*, u.username, u.full_name, u.email, u.balance as current_balance
      FROM deposit_requests dr
      JOIN users u ON dr.user_id = u.id
      ORDER BY 
        CASE dr.status WHEN 'pending' THEN 0 ELSE 1 END,
        dr.created_at DESC
      LIMIT 100
    `).all();
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في جلب طلبات الإيداع' });
  }
});

// Admin: Approve or Reject a Deposit Request
apiRouter.post('/admin/process-deposit', requireAdmin, (req: Request, res: Response): void => {
  const adminId = (req as any).user.id;
  const { request_id, decision, notes } = req.body;

  if (decision !== 'approved' && decision !== 'rejected') {
    res.status(400).json({ error: 'القرار يجب أن يكون إما موافقة (approved) أو رفض (rejected)' });
    return;
  }

  const processTx = db.transaction(() => {
    const depositReq = db.prepare(`
      SELECT dr.*, u.username, u.balance
      FROM deposit_requests dr
      JOIN users u ON dr.user_id = u.id
      WHERE dr.id = ?
    `).get(request_id) as any;

    if (!depositReq) {
      throw new Error('طلب الإيداع غير موجود');
    }

    if (depositReq.status !== 'pending') {
      throw new Error('هذا الطلب تم معالجته مسبقاً');
    }

    if (decision === 'approved') {
      const currentBalance = depositReq.balance;
      const newBalance = currentBalance + depositReq.amount;

      // 1. Credit balance
      db.prepare(`UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newBalance, depositReq.user_id);

      // 2. Insert transaction
      const txRef = generateReference('DEP-OK');
      const desc = `شحن رصيد معتمد (${depositReq.payment_method}) - رقم الإيصال/المرجع: ${depositReq.sender_account_or_ref}`;

      db.prepare(`
        INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, admin_id, description)
        VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?)
      `).run(txRef, depositReq.user_id, depositReq.amount, currentBalance, newBalance, adminId, desc);

      // 3. Update deposit request status
      db.prepare(`
        UPDATE deposit_requests
        SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(notes || 'تم التحقق من التحويل البنكي/إنستاباي بنجاح', adminId, depositReq.id);

      return {
        decision: 'approved',
        username: depositReq.username,
        amount: depositReq.amount,
        newBalance
      };
    } else {
      // Rejected
      db.prepare(`
        UPDATE deposit_requests
        SET status = 'rejected', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(notes || 'لم يصل التحويل للحساب الفعلي أو الإيصال غير مطابق', adminId, depositReq.id);

      return {
        decision: 'rejected',
        username: depositReq.username,
        amount: depositReq.amount
      };
    }
  });

  try {
    const result = processTx();
    res.json({
      success: true,
      message: result.decision === 'approved'
        ? `تمت الموافقة وإضافة ${result.amount} ج.م لرصيد @${result.username}`
        : `تم رفض طلب الإيداع للمستخدم @${result.username}`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'خطأ أثناء معالجة الطلب' });
  }
});

// Admin: Get all withdrawal requests
apiRouter.get('/admin/withdrawal-requests', requireAdmin, (req: Request, res: Response) => {
  try {
    const requests = db.prepare(`
      SELECT wr.*, u.username, u.full_name, u.email, u.balance as current_balance
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY 
        CASE wr.status WHEN 'pending' THEN 0 ELSE 1 END,
        wr.created_at DESC
      LIMIT 100
    `).all();
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في جلب طلبات السحب' });
  }
});

// Admin: Approve or Reject a Withdrawal Request
apiRouter.post('/admin/process-withdrawal', requireAdmin, (req: Request, res: Response): void => {
  const adminId = (req as any).user.id;
  const { request_id, decision, notes } = req.body;

  if (decision !== 'approved' && decision !== 'rejected') {
    res.status(400).json({ error: 'القرار يجب أن يكون إما موافقة (approved) أو رفض (rejected)' });
    return;
  }

  const processTx = db.transaction(() => {
    const withdrawalReq = db.prepare(`
      SELECT wr.*, u.username, u.balance
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.id = ?
    `).get(request_id) as any;

    if (!withdrawalReq) {
      throw new Error('طلب السحب غير موجود');
    }

    if (withdrawalReq.status !== 'pending') {
      throw new Error('هذا الطلب تم معالجته مسبقاً');
    }

    if (decision === 'approved') {
      // Balance was already deducted and held upon request creation.
      // Finalize the withdrawal request status as approved.
      db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(notes || 'تم تحويل المبلغ لحساب العميل بنجاح', adminId, withdrawalReq.id);

      db.prepare(`
        INSERT INTO audit_logs (actor_id, actor_role, action, target_user_id, details)
        VALUES (?, 'admin', 'withdrawal_approved', ?, ?)
      `).run(adminId, withdrawalReq.user_id, `تمت الموافقة على سحب ${withdrawalReq.amount} ج.م | المرجع: ${withdrawalReq.request_reference} | ملاحظات: ${notes || 'تم التحويل'}`);

      return {
        decision: 'approved',
        username: withdrawalReq.username,
        amount: withdrawalReq.amount
      };
    } else {
      // Rejection: Refund the held amount back to the user's available balance
      const currentBalance = withdrawalReq.balance;
      const refundedBalance = currentBalance + withdrawalReq.amount;

      // 1. Re-credit user balance
      db.prepare(`UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(refundedBalance, withdrawalReq.user_id);

      // 2. Insert refund transaction record
      const refundRef = generateReference('REFUND');
      const refundDesc = `استرجاع رصيد طلب سحب مرفوض (${withdrawalReq.request_reference}) - ${notes || 'تم رفض الطلب واسترجاع المبلغ للمحفظة'}`;
      db.prepare(`
        INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, admin_id, description)
        VALUES (?, ?, 'admin_credit', ?, ?, ?, ?, ?)
      `).run(refundRef, withdrawalReq.user_id, withdrawalReq.amount, currentBalance, refundedBalance, adminId, refundDesc);

      // 3. Update withdrawal request status
      db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'rejected', admin_notes = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(notes || 'تم رفض طلب السحب واسترجاع الرصيد للمحفظة', adminId, withdrawalReq.id);

      // 4. Log audit
      db.prepare(`
        INSERT INTO audit_logs (actor_id, actor_role, action, target_user_id, details)
        VALUES (?, 'admin', 'withdrawal_rejected', ?, ?)
      `).run(adminId, withdrawalReq.user_id, `تم رفض سحب ${withdrawalReq.amount} ج.م واسترجاعها | السبب: ${notes || 'غير محدد'}`);

      return {
        decision: 'rejected',
        username: withdrawalReq.username,
        amount: withdrawalReq.amount,
        refundedBalance
      };
    }
  });

  try {
    const result = processTx();
    res.json({
      success: true,
      message: result.decision === 'approved'
        ? `تمت الموافقة وتأكيد تحويل ${result.amount} ج.م لحساب @${result.username}`
        : `تم رفض طلب السحب واسترجاع ${result.amount} ج.م لرصيد @${result.username}`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'خطأ أثناء معالجة طلب السحب' });
  }
});

// Admin: System overview stats
apiRouter.get('/admin/stats', requireAdmin, (req: Request, res: Response) => {
  try {
    const totalUsers = (db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'user'`).get() as any).count;
    const totalLiquidity = (db.prepare(`SELECT SUM(balance) as total FROM users`).get() as any).total || 0;
    const pendingDeposits = (db.prepare(`SELECT COUNT(*) as count FROM deposit_requests WHERE status = 'pending'`).get() as any).count;
    const pendingWithdrawals = (db.prepare(`SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'pending'`).get() as any).count;
    const totalTransactions = (db.prepare(`SELECT COUNT(*) as count FROM transactions`).get() as any).count;
    const recentAuditLogs = db.prepare(`
      SELECT al.*, u.username as target_username
      FROM audit_logs al
      LEFT JOIN users u ON al.target_user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 20
    `).all();

    res.json({
      totalUsers,
      totalLiquidity,
      pendingDeposits,
      pendingWithdrawals,
      totalTransactions,
      recentAuditLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في جلب إحصائيات النظام' });
  }
});

// Admin: Update Payment Accounts & Settings
apiRouter.put('/admin/settings', requireAdmin, (req: Request, res: Response): void => {
  try {
    const updates = req.body;
    const updateStmt = db.prepare(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`);

    for (const [key, val] of Object.entries(updates)) {
      if (typeof val === 'string' || typeof val === 'number') {
        updateStmt.run(key, String(val));
      }
    }

    res.json({ success: true, message: 'تم تحديث بيانات الدفع والإعدادات بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في حفظ الإعدادات' });
  }
});
