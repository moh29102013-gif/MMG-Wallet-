import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTransferAmount,
  validateUserCredentials,
  validateTransactionPin,
  formatEGP,
  generateReference,
  generateWhatsAppDepositLink,
  generateWhatsAppWithdrawalLink,
} from './rules.ts';

test('validateTransferAmount rejects non-numeric or negative values', () => {
  assert.equal(validateTransferAmount(-50, 100).valid, false);
  assert.equal(validateTransferAmount(0, 100).valid, false);
  assert.equal(validateTransferAmount(NaN, 100).valid, false);
});

test('validateTransferAmount enforces minimum transfer limit', () => {
  const result = validateTransferAmount(5, 100, 10);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /الحد الأدنى/);
});

test('validateTransferAmount rejects transfer exceeding available balance', () => {
  const result = validateTransferAmount(250, 100);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /غير كافٍ/);
});

test('validateTransferAmount accepts valid transfer within balance', () => {
  const result = validateTransferAmount(75, 100, 10);
  assert.equal(result.valid, true);
});

test('validateUserCredentials checks username and email formatting', () => {
  assert.equal(validateUserCredentials('ab', 'test@example.com').valid, false);
  assert.equal(validateUserCredentials('invalid name!', 'test@example.com').valid, false);
  assert.equal(validateUserCredentials('valid_user1', 'bad-email').valid, false);
  assert.equal(validateUserCredentials('valid_user1', 'valid@mmgwallet.com').valid, true);
});

test('generateReference generates unique strings with prefix', () => {
  const ref1 = generateReference('DEP');
  const ref2 = generateReference('DEP');
  assert.ok(ref1.startsWith('DEP-'));
  assert.notEqual(ref1, ref2);
});

test('generateWhatsAppDepositLink formats pre-filled link accurately', () => {
  const link = generateWhatsAppDepositLink({
    whatsappNumber: '+201063994059',
    username: 'ahmed_client',
    email: 'ahmed@example.com',
    amount: 1500,
    paymentMethod: 'InstaPay',
    senderReference: 'INSTA-88392',
  });

  assert.ok(link.startsWith('https://wa.me/201063994059?text='));
  assert.ok(link.includes(encodeURIComponent('ahmed_client')));
  assert.ok(link.includes(encodeURIComponent('1500')));
});

test('formatEGP produces formatted string with currency', () => {
  const formatted = formatEGP(1000);
  assert.ok(formatted.includes('ج.م'));
});

test('validateTransactionPin checks for exactly 6 numeric digits', () => {
  assert.equal(validateTransactionPin('').valid, false);
  assert.equal(validateTransactionPin('12345').valid, false);
  assert.equal(validateTransactionPin('1234567').valid, false);
  assert.equal(validateTransactionPin('12345a').valid, false);
  assert.equal(validateTransactionPin('123456').valid, true);
  assert.equal(validateTransactionPin('000000').valid, true);
});

test('generateWhatsAppWithdrawalLink formats pre-filled link accurately', () => {
  const link = generateWhatsAppWithdrawalLink({
    whatsappNumber: '+201063994059',
    username: 'ahmed_client',
    email: 'ahmed@example.com',
    amount: 1000,
    paymentMethod: 'إنستاباي (InstaPay)',
    recipientDetails: '01550464096 / ahmed@instapay',
    requestReference: 'WR-TEST1234',
  });

  assert.ok(link.startsWith('https://wa.me/201063994059?text='));
  assert.ok(link.includes(encodeURIComponent('ahmed_client')));
  assert.ok(link.includes(encodeURIComponent('WR-TEST1234')));
  assert.ok(link.includes(encodeURIComponent('1000')));
});

