const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/auth');
const { sensitiveWriteLimiter, paymentVerifyLimiter } = require('../middleware/rateLimiter');
const pool = require('../db');
const { toPublicId } = require('../utils/publicId');
const { ensurePaystackProcessedTable, tryMarkPaystackReferenceProcessed } = require('../utils/paystackProcessed');
const { buildPaystackReceipt } = require('../utils/paystackReceipt');

const router = express.Router();

function getPaystackEmail(user) {
  const email = String(user?.email || '').trim();
  if (email) return email;

  const mobile = String(user?.mobile || '').replace(/\D/g, '');
  if (mobile) return `${mobile}@mydewbox.app`;

  const idPart = String(user?.id || 'user').replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'user';
  return `${idPart}@mydewbox.app`;
}

function normalizeLookupValue(value) {
  return String(value || '').trim();
}

function normalizeWalletIdToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

async function findWalletTransferRecipient(connection, lookupValue) {
  const candidate = normalizeLookupValue(lookupValue);
  if (!candidate) return null;

  let rows;

  [rows] = await connection.query(
    'SELECT id, email, name, subscriber_id FROM user WHERE id = ? LIMIT 1',
    [candidate]
  );
  if (rows.length) return rows[0];

  if (/^\d+$/.test(candidate)) {
    [rows] = await connection.query(
      'SELECT id, email, name, subscriber_id FROM user WHERE subscriber_id = ? LIMIT 1',
      [Number.parseInt(candidate, 10)]
    );
    if (rows.length) return rows[0];
  }

  // Backward compatibility while frontend migrates from email -> wallet ID.
  [rows] = await connection.query(
    'SELECT id, email, name, subscriber_id FROM user WHERE email = ? LIMIT 1',
    [candidate]
  );
  if (rows.length) return rows[0];

  const upperCandidate = candidate.toUpperCase();
  const normalizedWalletCandidate = normalizeWalletIdToken(candidate);
  [rows] = await connection.query(
    'SELECT id, email, name, subscriber_id FROM user WHERE subscriber_id IS NOT NULL'
  );

  return rows.find((row) => {
    const computedWalletId = toPublicId(`${row.id}:${row.subscriber_id}`);
    if (!computedWalletId) return false;

    const exactMatch = computedWalletId.toUpperCase() === upperCandidate;
    if (exactMatch) return true;

    return normalizeWalletIdToken(computedWalletId) === normalizedWalletCandidate;
  }) || null;
}

function isUnsupportedTransactionTypeError(error) {
  const code = String(error?.code || '');
  const sqlMessage = String(error?.sqlMessage || error?.message || '');

  return (
    code === 'WARN_DATA_TRUNCATED' ||
    code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' ||
    /Data truncated for column 'type'/i.test(sqlMessage) ||
    /Incorrect .* value .* for column 'type'/i.test(sqlMessage)
  );
}

async function insertTransactionWithTypeFallback(connection, { amount, userId, preferredTypes }) {
  let lastError;

  for (const txType of preferredTypes) {
    try {
      await connection.query(
        'INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(6))',
        [txType, amount, 'NGN', 'completed', userId]
      );
      return txType;
    } catch (error) {
      lastError = error;
      if (!isUnsupportedTransactionTypeError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [transactions] = await pool.query(
      'SELECT * FROM transaction WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
      [req.user.id]
    );

    return res.json({
      status: 'success',
      data: transactions
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get transactions' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM transaction WHERE userId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );
    return res.json({ status: 'success', data: rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch transactions' });
  }
});

router.post('/', authenticateToken, sensitiveWriteLimiter, async (req, res) => {
  try {
    const {
      type,
      amount,
      password,
      message,
      accountName,
      bankCode,
      account,
      email,
      recipientEmail,
      publicId,
      recipientPublicId,
      walletId,
      recipientWalletId
    } = req.body;
    const amountNumber = Number.parseFloat(amount);
    const normalizedType = String(type || '').toUpperCase();

    if (!normalizedType || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ status: 'error', message: 'Valid type and amount are required' });
    }

    const [userRows] = await pool.query('SELECT * FROM user WHERE id = ?', [req.user.id]);
    if (!userRows.length) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    const user = userRows[0];

    if (['WITHDRAWAL', 'TRANSFER', 'WALLET'].includes(normalizedType)) {
      if (!password) {
        return res.status(400).json({ status: 'error', message: 'Password is required for this transaction' });
      }

      const bcrypt = require('bcrypt');
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ status: 'error', message: 'Invalid password' });
      }
    }

    switch (normalizedType) {
      case 'CONTRIBUTION':
      case 'DEPOSIT':
      case 'FEE': {
        const isFee = normalizedType === 'FEE';
        const paystackTxType = isFee ? 'fee' : 'deposit';
        const callbackUrl = isFee
          ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?firstPayment=success`
          : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/wallet?status=success`;
        const paystackEmail = getPaystackEmail(user);

        const paystackResponse = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email: paystackEmail,
            amount: amountNumber * 100,
            callback_url: callbackUrl,
            metadata: {
              userId: req.user.id,
              type: paystackTxType,
              custom_fields: [
                {
                  display_name: 'User ID',
                  variable_name: 'user_id',
                  value: req.user.id
                },
                {
                  display_name: 'Transaction Type',
                  variable_name: 'transaction_type',
                  value: isFee ? 'Subscription Fee' : 'Wallet Deposit'
                }
              ]
            },
            channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!paystackResponse.data.status) {
          return res.status(500).json({ status: 'error', message: 'Payment initialization failed' });
        }

        await pool.query(
          'INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(6))',
          [paystackTxType, amountNumber, 'NGN', 'pending', req.user.id]
        );

        return res.json({
          status: 'success',
          message: 'Payment initialized',
          data: {
            authorization_url: paystackResponse.data.data.authorization_url,
            reference: paystackResponse.data.data.reference,
            access_code: paystackResponse.data.data.access_code
          }
        });
      }

      case 'WITHDRAWAL':
      case 'TRANSFER': {
        if (!account || !bankCode || !accountName) {
          return res.status(400).json({
            status: 'error',
            message: 'Bank account details are required (account, bankCode, accountName)'
          });
        }

        if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes('your_actual_live_key_here')) {
          return res.status(503).json({
            status: 'error',
            message: 'Withdrawal service not configured. Please contact administrator.'
          });
        }

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          const [lockedUsers] = await connection.query(
            'SELECT id, balance FROM user WHERE id = ? FOR UPDATE',
            [req.user.id]
          );

          if (!lockedUsers.length) {
            await connection.rollback();
            return res.status(404).json({ status: 'error', message: 'User not found' });
          }

          if (parseFloat(lockedUsers[0].balance) < amountNumber) {
            await connection.rollback();
            return res.status(400).json({ status: 'error', message: 'Insufficient balance' });
          }

          const recipientResponse = await axios.post(
            'https://api.paystack.co/transferrecipient',
            {
              type: 'nuban',
              name: accountName,
              account_number: account,
              bank_code: bankCode,
              currency: 'NGN'
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!recipientResponse.data.status) {
            await connection.rollback();
            return res.status(400).json({ status: 'error', message: 'Failed to create transfer recipient' });
          }

          const transferResponse = await axios.post(
            'https://api.paystack.co/transfer',
            {
              source: 'balance',
              amount: amountNumber * 100,
              recipient: recipientResponse.data.data.recipient_code,
              reason: message || 'Withdrawal from MyDewbox',
              reference: `WD-${Date.now()}-${String(req.user.id).substring(0, 8)}`
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!transferResponse.data.status) {
            await connection.rollback();
            return res.status(400).json({
              status: 'error',
              message: transferResponse.data.message || 'Transfer failed'
            });
          }

          await connection.query(
            'INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(6))',
            [normalizedType.toLowerCase(), amountNumber, 'NGN', 'completed', req.user.id]
          );

          await connection.query(
            'UPDATE user SET balance = balance - ? WHERE id = ?',
            [amountNumber, req.user.id]
          );

          await connection.commit();

          return res.json({
            status: 'success',
            message: 'Withdrawal successful. Funds will be credited shortly.',
            data: {
              amount: amountNumber,
              account,
              accountName,
              reference: transferResponse.data.data.reference,
              status: transferResponse.data.data.status
            }
          });
        } catch (transferError) {
          await connection.rollback();

          if (transferError.response?.status === 401) {
            return res.status(401).json({
              status: 'error',
              message: 'Invalid Paystack API key. Please contact administrator.'
            });
          }

          if (transferError.response?.data?.message?.includes('Insufficient funds')) {
            return res.status(400).json({
              status: 'error',
              message: 'Insufficient funds in payment provider account. Please contact support.'
            });
          }

          if (transferError.response?.data?.code === 'transfer_unavailable') {
            return res.status(403).json({
              status: 'error',
              message: 'Withdrawal service requires business verification. Please contact administrator to upgrade Paystack account.',
              code: 'business_upgrade_required'
            });
          }

          return res.status(500).json({
            status: 'error',
            message: transferError.response?.data?.message || 'Withdrawal failed. Please try again.'
          });
        } finally {
          connection.release();
        }
      }

      case 'WALLET': {
        const recipientLookup =
          walletId ||
          recipientWalletId ||
          publicId ||
          recipientPublicId ||
          email ||
          recipientEmail;
        if (!recipientLookup) {
          return res.status(400).json({ status: 'error', message: 'Recipient wallet ID is required' });
        }

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          const recipient = await findWalletTransferRecipient(connection, recipientLookup);
          if (!recipient) {
            await connection.rollback();
            return res.status(404).json({ status: 'error', message: 'Recipient not found' });
          }

          if (recipient.id === req.user.id) {
            await connection.rollback();
            return res.status(400).json({ status: 'error', message: 'Cannot transfer to yourself' });
          }

          const lockOrder = [req.user.id, recipient.id].sort((a, b) => String(a).localeCompare(String(b)));
          await connection.query('SELECT id FROM user WHERE id IN (?, ?) FOR UPDATE', lockOrder);

          const [senderRows] = await connection.query(
            'SELECT balance FROM user WHERE id = ?',
            [req.user.id]
          );

          if (!senderRows.length || parseFloat(senderRows[0].balance) < amountNumber) {
            await connection.rollback();
            return res.status(400).json({ status: 'error', message: 'Insufficient balance' });
          }

          await connection.query('UPDATE user SET balance = balance - ? WHERE id = ?', [amountNumber, req.user.id]);
          await connection.query('UPDATE user SET balance = balance + ? WHERE id = ?', [amountNumber, recipient.id]);

          await insertTransactionWithTypeFallback(connection, {
            amount: amountNumber,
            userId: req.user.id,
            preferredTypes: ['wallet_transfer_sent', 'transfer', 'withdrawal']
          });
          await insertTransactionWithTypeFallback(connection, {
            amount: amountNumber,
            userId: recipient.id,
            preferredTypes: ['wallet_transfer_received', 'deposit', 'contribution']
          });

          await connection.commit();

          const resolvedRecipientWalletId = recipient.subscriber_id
            ? toPublicId(`${recipient.id}:${recipient.subscriber_id}`)
            : null;

          return res.json({
            status: 'success',
            message: `Transfer of NGN ${amountNumber} to ${recipient.name || recipient.email} completed successfully`,
            data: {
              recipient: recipient.email || recipient.id,
              recipientWalletId: resolvedRecipientWalletId,
              recipientName: recipient.name,
              amount: amountNumber,
              message: message || 'Wallet transfer'
            }
          });
        } catch (walletError) {
          console.error('Wallet transfer error:', walletError);
          await connection.rollback();
          return res.status(500).json({
            status: 'error',
            message: walletError?.message || 'Failed to process wallet transfer'
          });
        } finally {
          connection.release();
        }
      }

      default:
        return res.status(400).json({ status: 'error', message: 'Invalid transaction type' });
    }
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create transaction'
    });
  }
});

// Verify Paystack payment by reference (authenticated user only)
router.get('/verify/:reference', authenticateToken, paymentVerifyLimiter, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (response.data.status && response.data.data.status === 'success') {
      const verificationData = response.data.data;
      const amount = verificationData.amount / 100;
      const userId = verificationData.metadata?.userId;
      const txType = verificationData.metadata?.type || 'deposit';
      const receipt = buildPaystackReceipt(verificationData, { paymentType: txType });

      if (!userId) {
        return res.status(400).json({ status: 'error', message: 'User ID not found in transaction metadata' });
      }
      if (String(userId) !== String(req.user.id)) {
        return res.status(403).json({ status: 'error', message: 'You can only verify your own payments' });
      }

      await ensurePaystackProcessedTable(connection);
      await connection.beginTransaction();

      const firstTime = await tryMarkPaystackReferenceProcessed(connection, reference);
      if (!firstTime) {
        await connection.rollback();
        return res.json({
          status: 'success',
          message: 'Payment already processed',
          data: { amount, reference, userId, verification: verificationData, receipt }
        });
      }

      const [pendingRows] = await connection.query(
        `SELECT id
         FROM transaction
         WHERE userId = ? AND type = ? AND amount = ? AND status = 'pending'
         ORDER BY createdAt DESC
         LIMIT 1
         FOR UPDATE`,
        [userId, txType, amount]
      );

      if (!pendingRows.length) {
        await connection.rollback();
        return res.status(409).json({
          status: 'error',
          message: 'No matching pending transaction found for this payment'
        });
      }

      await connection.query(
        'UPDATE user SET balance = balance + ? WHERE id = ?',
        [amount, userId]
      );

      await connection.query(
        'UPDATE transaction SET status = ? WHERE id = ?',
        ['completed', pendingRows[0].id]
      );

      await connection.commit();

      return res.json({
        status: 'success',
        message: 'Payment verified successfully',
        data: { amount, reference, userId, verification: verificationData, receipt }
      });
    }

    return res.status(400).json({ status: 'error', message: 'Payment verification failed' });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify payment'
    });
  } finally {
    connection.release();
  }
});

router.post('/contribute', authenticateToken, sensitiveWriteLimiter, async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ message: 'Amount is required' });
  try {
    const [userRows] = await pool.query(
      'SELECT u.id, u.mobile, s.subscriber_id, s.available_balance, s.mtd_contributed, s.ytd_contributed, s.mtd_wallets, s.ytd_wallets, s.mtd_esusu, s.ytd_esusu, s.mtd_purchases, s.ytd_purchases, s.currency FROM users u JOIN subscriber s ON u.id = s.subscriber_id WHERE u.id = ?',
      [req.user.id]
    );
    if (userRows.length === 0) return res.status(404).json({ message: 'User or subscriber not found' });
    const user = userRows[0];

    const [result] = await pool.query(
      'INSERT INTO transaction (id, type, amount, currency, status, createdAt, userId) VALUES (UUID(), ?, ?, ?, ?, NOW(6), ?)',
      ['contribution', amount, user.currency, 'completed', req.user.id]
    );

    const newAvailableBalance = parseFloat(user.available_balance) + parseFloat(amount);
    const newMtdContributed = parseFloat(user.mtd_contributed) + parseFloat(amount);
    const newYtdContributed = parseFloat(user.ytd_contributed) + parseFloat(amount);
    await pool.query(
      'UPDATE subscriber SET available_balance = ?, mtd_contributed = ?, ytd_contributed = ? WHERE subscriber_id = ?',
      [newAvailableBalance, newMtdContributed, newYtdContributed, user.subscriber_id]
    );

    return res.status(201).json({
      id: result.insertId,
      type: 'contribution',
      amount,
      currency: user.currency,
      status: 'completed',
      userId: req.user.id,
      available_balance: newAvailableBalance,
      mtd_contributed: newMtdContributed,
      ytd_contributed: newYtdContributed
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to contribute' });
  }
});

module.exports = router;
