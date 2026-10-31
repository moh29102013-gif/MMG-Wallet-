import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

// Open or create the SQLite database in the workspace
const dbPath = path.resolve(process.cwd(), 'wallet.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency and immediate write durability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables with strict constraints and security
export function initDatabase() {
  // 1. Users table with check constraint on non-negative balance
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      balance REAL NOT NULL DEFAULT 0.0 CHECK(balance >= 0),
      transaction_pin_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // Migration: ensure transaction_pin_hash column exists in existing database
  try {
    db.exec(`ALTER TABLE users ADD COLUMN transaction_pin_hash TEXT;`);
  } catch (e) {
    // Column already exists
  }

  // 2. Transactions table with full audit trail
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_reference TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('deposit', 'transfer_sent', 'transfer_received', 'admin_credit', 'admin_debit')),
      amount REAL NOT NULL CHECK(amount > 0),
      balance_before REAL NOT NULL,
      balance_after REAL NOT NULL,
      related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
  `);

  // 3. Deposit requests (Manual deposit logging alongside WhatsApp confirmation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS deposit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_reference TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      sender_account_or_ref TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      admin_notes TEXT,
      processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
    CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON deposit_requests(user_id);
  `);

  // 3.b Withdrawal requests (Manual withdrawal hold & review with WhatsApp integration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_reference TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      recipient_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      admin_notes TEXT,
      processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
  `);

  // 4. System & Payment Channels Configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 5. Audit Log for security actions
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER REFERENCES users(id),
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_user_id INTEGER REFERENCES users(id),
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Remove Fawry from system settings
  db.exec(`DELETE FROM system_settings WHERE key LIKE 'fawry%';`);

  // Seed / update system configurations according to user request:
  // - InstaPay address: mohamed29102013@instapay
  // - InstaPay phone: 01550464096
  // - Bank: Mashreq Neo, Account: 059102114579, IBAN: EG090046020100000059102114597
  // - Cash wallet number: 01141714725
  // - Support WhatsApp: +201063994059
  const defaultSettings = [
    { key: 'site_name', value: 'MMG Wallet - محفظة إم إم جي' },
    { key: 'domain', value: 'https://mmgwallet.com' },
    { key: 'support_whatsapp', value: '+201063994059' },
    { key: 'instapay_address', value: 'mohamed29102013@instapay' },
    { key: 'instapay_phone', value: '01550464096' },
    { key: 'instapay_account_name', value: 'Mohamed - MMG Wallet' },
    { key: 'bank_name', value: 'بنك المشرق (Mashreq Neo)' },
    { key: 'bank_account_number', value: '059102114579' },
    { key: 'bank_iban', value: 'EG090046020100000059102114597' },
    { key: 'bank_beneficiary', value: 'حساب مشرق نيو (Mashreq Neo)' },
    { key: 'cash_wallet_number', value: '01141714725' },
    { key: 'min_transfer_amount', value: '10' },
    { key: 'min_deposit_amount', value: '50' }
  ];

  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)
  `);

  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }

  // Ensure settings are forced in active DB instance
  db.prepare(`UPDATE system_settings SET value = 'mohamed29102013@instapay' WHERE key = 'instapay_address'`).run();
  db.prepare(`UPDATE system_settings SET value = '01550464096' WHERE key = 'instapay_phone'`).run();
  db.prepare(`UPDATE system_settings SET value = 'بنك المشرق (Mashreq Neo)' WHERE key = 'bank_name'`).run();
  db.prepare(`UPDATE system_settings SET value = '059102114579' WHERE key = 'bank_account_number'`).run();
  db.prepare(`UPDATE system_settings SET value = 'EG090046020100000059102114597' WHERE key = 'bank_iban'`).run();
  db.prepare(`UPDATE system_settings SET value = '01141714725' WHERE key = 'cash_wallet_number'`).run();
  db.prepare(`UPDATE system_settings SET value = '+201063994059' WHERE key = 'support_whatsapp'`).run();

  // Populate default 6-digit transaction PIN (123456) for any existing users without one
  const defaultPinHash = bcrypt.hashSync('123456', 10);
  db.prepare(`UPDATE users SET transaction_pin_hash = ? WHERE transaction_pin_hash IS NULL`).run(defaultPinHash);

  // Seed Default Master Admin if not exists
  const checkAdmin = db.prepare(`SELECT id FROM users WHERE username = 'admin' OR email = 'admin@mmgwallet.com'`).get();
  if (!checkAdmin) {
    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync('Mohamed2910', salt);
    const adminPin = bcrypt.hashSync('291020', 10);

    db.prepare(`
      INSERT INTO users (username, email, password_hash, transaction_pin_hash, full_name, phone, role, balance, status)
      VALUES (?, ?, ?, ?, ?, ?, 'admin', 0.0, 'active')
    `).run('admin', 'admin@mmgwallet.com', hash, adminPin, 'المدير العام (Mohamed)', '+201063994059');

    console.log('✅ Master Admin account initialized: admin / Mohamed2910');
  }

  // Seed a demo user for immediate review/testing if empty
  const checkDemoUser = db.prepare(`SELECT id FROM users WHERE username = 'ahmed_client'`).get();
  if (!checkDemoUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('client1234', salt);

    const info = db.prepare(`
      INSERT INTO users (username, email, password_hash, transaction_pin_hash, full_name, phone, role, balance, status)
      VALUES (?, ?, ?, ?, ?, ?, 'user', 5000.0, 'active')
    `).run('ahmed_client', 'ahmed@example.com', hash, defaultPinHash, 'أحمد محمود القاضي', '+201012345678');

    db.prepare(`
      INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, description)
      VALUES (?, ?, 'deposit', 5000.0, 0.0, 5000.0, ?)
    `).run('TX-MMG-INIT5000', info.lastInsertRowid, 'رصيد افتتاحي - شحن عبر إنستاباي');
  }

  const checkSecondUser = db.prepare(`SELECT id FROM users WHERE username = 'sara_trade'`).get();
  if (!checkSecondUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('client1234', salt);

    const info = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, phone, role, balance, status)
      VALUES (?, ?, ?, ?, ?, 'user', 1250.0, 'active')
    `).run('sara_trade', 'sara@example.com', hash, 'سارة إبراهيم الشناوي', '+201098765432');

    db.prepare(`
      INSERT INTO transactions (tx_reference, user_id, type, amount, balance_before, balance_after, description)
      VALUES (?, ?, 'deposit', 1250.0, 0.0, 1250.0, ?)
    `).run('TX-MMG-INIT1250', info.lastInsertRowid, 'رصيد افتتاحي - إيداع بنكي');
  }
}
