const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/auth');
const { sensitiveWriteLimiter, paymentVerifyLimiter } = require('../middleware/rateLimiter');
const pool = require('../db');
const { ensurePaystackProcessedTable, tryMarkPaystackReferenceProcessed } = require('../utils/paystackProcessed');
const { buildPaystackReceipt } = require('../utils/paystackReceipt');

const router = express.Router();
const ALLOWED_CONTRIBUTION_TYPES = new Set(['ICA', 'PIGGY', 'ESUSU']);
const TRACKED_MONTHLY_CONTRIBUTION_TYPES = ['ICA', 'PIGGY', 'ESUSU'];
const ICA_ONLY_CONTRIBUTION_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.ICA_ONLY_CONTRIBUTION_LIMIT || '10', 10) || 10
);
let subscriberBalanceColumnsCache = null;

function getPaystackEmail(user) {
  const email = (user?.email || '').trim();
  if (email) return email;

  const mobile = String(user?.mobile || '').replace(/\D/g, '');
  if (mobile) return `${mobile}@mydewbox.app`;

  const idPart = String(user?.id || 'user').replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'user';
  return `${idPart}@mydewbox.app`;
}

function getYearMonth(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
}

async function getSubscriberBalanceColumns(connection) {
  if (subscriberBalanceColumnsCache) return subscriberBalanceColumnsCache;

  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'subscriber_balance'`
  );

  subscriberBalanceColumnsCache = new Set(rows.map((row) => row.COLUMN_NAME));
  return subscriberBalanceColumnsCache;
}

async function ensureSubscriberBalanceRow(connection, subscriberId) {
  if (!subscriberId) return;

  const [rows] = await connection.query(
    'SELECT subscriber_id FROM subscriber_balance WHERE subscriber_id = ? LIMIT 1',
    [subscriberId]
  );

  if (rows.length) return;

  const columns = await getSubscriberBalanceColumns(connection);
  if (!columns.has('subscriber_id')) return;
  const insertColumns = ['subscriber_id'];
  const placeholders = ['?'];
  const values = [subscriberId];

  const zeroDefaultColumns = [
    'mtd_contributed',
    'ytd_contributed',
    'available_balance',
    'mtd_wallets',
    'mtd_wallets_copy1',
    'mtd_esusu',
    'ytd_esusu',
    'mtd_purchases',
    'ytd_purchases',
    'ica_balance',
    'piggy_balance'
  ];

  for (const columnName of zeroDefaultColumns) {
    if (!columns.has(columnName)) continue;
    insertColumns.push(columnName);
    placeholders.push('?');
    values.push(0);
  }

  await connection.query(
    `INSERT INTO subscriber_balance (${insertColumns.join(', ')})
     VALUES (${placeholders.join(', ')})`,
    values
  );
}

async function updateSubscriberBalanceForContribution(connection, {
  subscriberId,
  amount,
  contributionType
}) {
  if (!subscriberId || !Number.isFinite(amount) || amount <= 0) return;

  await ensureSubscriberBalanceRow(connection, subscriberId);
  const columns = await getSubscriberBalanceColumns(connection);
  const updates = [];
  const params = [];

  if (columns.has('mtd_contributed')) {
    updates.push('mtd_contributed = COALESCE(mtd_contributed, 0) + ?');
    params.push(amount);
  }
  if (columns.has('ytd_contributed')) {
    updates.push('ytd_contributed = COALESCE(ytd_contributed, 0) + ?');
    params.push(amount);
  }
  if (contributionType === 'ICA' && columns.has('ica_balance')) {
    updates.push('ica_balance = COALESCE(ica_balance, 0) + ?');
    params.push(amount);
  }
  if (contributionType === 'PIGGY' && columns.has('piggy_balance')) {
    updates.push('piggy_balance = COALESCE(piggy_balance, 0) + ?');
    params.push(amount);
  }

  if (!updates.length) return;

  await connection.query(
    `UPDATE subscriber_balance
     SET ${updates.join(', ')}
     WHERE subscriber_id = ?`,
    [...params, subscriberId]
  );
}

async function updateSubscriberBalanceForPiggyWithdrawal(connection, {
  subscriberId,
  amount
}) {
  if (!subscriberId || !Number.isFinite(amount) || amount <= 0) return;

  await ensureSubscriberBalanceRow(connection, subscriberId);
  const columns = await getSubscriberBalanceColumns(connection);
  const updates = [];
  const params = [];

  if (columns.has('piggy_balance')) {
    updates.push('piggy_balance = COALESCE(piggy_balance, 0) - ?');
    params.push(amount);
  }

  if (!updates.length) return;

  await connection.query(
    `UPDATE subscriber_balance
     SET ${updates.join(', ')}
     WHERE subscriber_id = ?`,
    [...params, subscriberId]
  );
}

async function getMonthlyContributionCount(connection, userId, year, month) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM contributions
     WHERE userId = ?
       AND year = ?
       AND month = ?
       AND type IN (?)`,
    [userId, year, month, TRACKED_MONTHLY_CONTRIBUTION_TYPES]
  );
  return Number.parseInt(rows?.[0]?.total || 0, 10);
}

function getContributionRuleState(contributionMode, monthlyContributionCount) {
  const count = Number.isFinite(monthlyContributionCount) ? monthlyContributionCount : 0;
  const allIca = contributionMode === 'all_ica';
  const icaOnlyWindowActive = count < ICA_ONLY_CONTRIBUTION_LIMIT;
  const remainingIcaOnlyContributions = Math.max(ICA_ONLY_CONTRIBUTION_LIMIT - count, 0);
  const allowPiggy = !allIca && !icaOnlyWindowActive;
  const defaultType = allIca || icaOnlyWindowActive ? 'ICA' : 'PIGGY';

  return {
    allIca,
    icaOnlyWindowActive,
    remainingIcaOnlyContributions,
    allowPiggy,
    defaultType
  };
}

function resolveContributionType({ requestedType, contributionMode, monthlyContributionCount }) {
  const normalizedRequestedType = requestedType ? String(requestedType).toUpperCase() : null;
  const ruleState = getContributionRuleState(contributionMode, monthlyContributionCount);

  if (normalizedRequestedType && !ALLOWED_CONTRIBUTION_TYPES.has(normalizedRequestedType)) {
    return {
      invalid: true,
      message: 'Invalid contribution type',
      ...ruleState
    };
  }

  // eSusu is governed by group membership flow, not ICA/Piggy windowing.
  if (normalizedRequestedType === 'ESUSU') {
    return {
      invalid: false,
      requestedType: normalizedRequestedType,
      resolvedType: normalizedRequestedType,
      adjusted: false,
      ruleNotice: null,
      ...ruleState
    };
  }

  let resolvedType = normalizedRequestedType || ruleState.defaultType;
  let adjusted = false;
  let ruleNotice = null;

  if (ruleState.allIca && resolvedType === 'PIGGY') {
    resolvedType = 'ICA';
    adjusted = true;
    ruleNotice = 'Your contribution mode is set to ICA only.';
  } else if (ruleState.icaOnlyWindowActive && resolvedType === 'PIGGY') {
    resolvedType = 'ICA';
    adjusted = true;
    ruleNotice = `The first ${ICA_ONLY_CONTRIBUTION_LIMIT} monthly contributions are ICA only.`;
  }

  return {
    invalid: false,
    requestedType: normalizedRequestedType,
    resolvedType,
    adjusted,
    ruleNotice,
    ...ruleState
  };
}

// Create contribution
router.post('/', authenticateToken, sensitiveWriteLimiter, async (req, res) => {
  try {
    const { amount, description, type, paymentMethod } = req.body;
    const amountNumber = Number.parseFloat(amount);
    
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ status: 'error', message: 'Valid amount is required' });
    }

    if (!paymentMethod || !['wallet', 'bank'].includes(paymentMethod)) {
      return res.status(400).json({ status: 'error', message: 'Valid payment method is required (wallet or bank)' });
    }

    // Get user info and settings
    const [userRows] = await pool.query(
      'SELECT u.*, s.contribution_mode, s.ica_balance, s.piggy_balance FROM user u LEFT JOIN subscribers s ON u.subscriber_id = s.id WHERE u.id = ?',
      [req.user.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    const user = userRows[0];
    const { year, month } = getYearMonth();
    const monthlyContributionCount = await getMonthlyContributionCount(pool, req.user.id, year, month);
    const contributionDecision = resolveContributionType({
      requestedType: type,
      contributionMode: user.contribution_mode,
      monthlyContributionCount
    });

    if (contributionDecision.invalid) {
      return res.status(400).json({ status: 'error', message: contributionDecision.message });
    }

    const contributionType = contributionDecision.resolvedType;
    
    // If bank payment, initialize Paystack
    if (paymentMethod === 'bank') {
      const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/contribute?status=success&type=${contributionType}`;
       
      try {
        const paystackResponse = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email: getPaystackEmail(user),
            amount: amountNumber * 100, // Convert to kobo
            callback_url: callbackUrl,
            metadata: {
              userId: req.user.id,
              contributionType: contributionType,
              paymentMethod: 'bank',
              description: description || `${contributionType} Contribution`,
              custom_fields: [
                {
                  display_name: "User ID",
                  variable_name: "user_id",
                  value: req.user.id
                },
                {
                  display_name: "Contribution Type",
                  variable_name: "contribution_type",
                  value: contributionType
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

        if (paystackResponse.data.status) {
          // Create pending transaction record
          await pool.query(
            `INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt) 
             VALUES (UUID(), ?, ?, 'NGN', 'pending', ?, NOW(6))`,
            ['contribution', amountNumber, req.user.id]
          );

          return res.json({
            status: 'success',
            message: 'Payment initialized',
            data: {
              authorization_url: paystackResponse.data.data.authorization_url,
              reference: paystackResponse.data.data.reference,
              access_code: paystackResponse.data.data.access_code,
              contributionType: contributionType,
              requestedType: contributionDecision.requestedType,
              ruleNotice: contributionDecision.ruleNotice
            }
          });
        }

        return res.status(500).json({
          status: 'error',
          message: 'Failed to initialize payment'
        });
      } catch (paystackError) {
        return res.status(500).json({
          status: 'error',
          message: 'Failed to initialize payment'
        });
      }
    }

    // Wallet payment
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [lockedUserRows] = await connection.query(
        'SELECT balance FROM user WHERE id = ? FOR UPDATE',
        [req.user.id]
      );

      if (!lockedUserRows.length) {
        await connection.rollback();
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      if (parseFloat(lockedUserRows[0].balance) < amountNumber) {
        await connection.rollback();
        return res.status(400).json({ status: 'error', message: 'Insufficient balance' });
      }

      const txMonthlyContributionCount = await getMonthlyContributionCount(connection, req.user.id, year, month);
      const txContributionDecision = resolveContributionType({
        requestedType: type,
        contributionMode: user.contribution_mode,
        monthlyContributionCount: txMonthlyContributionCount
      });

      if (txContributionDecision.invalid) {
        await connection.rollback();
        return res.status(400).json({ status: 'error', message: txContributionDecision.message });
      }

      const effectiveContributionType = txContributionDecision.resolvedType;

      if (effectiveContributionType === 'ICA') {
        // ICA: Transfer to admin wallet
        const adminId = process.env.ADMIN_USER_ID || 'admin';

        await connection.query(
          'UPDATE user SET balance = balance - ? WHERE id = ?',
          [amountNumber, req.user.id]
        );

        await connection.query(
          'UPDATE user SET balance = balance + ? WHERE id = ?',
          [amountNumber, adminId]
        );

        await connection.query(
          'UPDATE subscribers SET ica_balance = ica_balance + ? WHERE userId = ?',
          [amountNumber, req.user.id]
        );
      } else if (effectiveContributionType === 'PIGGY') {
        // Piggy contribution moves funds from wallet into piggy balance.
        await connection.query(
          'UPDATE user SET balance = balance - ? WHERE id = ?',
          [amountNumber, req.user.id]
        );

        await connection.query(
          'UPDATE subscribers SET piggy_balance = piggy_balance + ? WHERE userId = ?',
          [amountNumber, req.user.id]
        );
      } else if (effectiveContributionType === 'ESUSU') {
        await connection.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'eSusu contributions are handled through your eSusu group flow.'
        });
      }

      await connection.query(
        `INSERT INTO contributions (id, userId, type, amount, contribution_date, year, month, createdAt) 
         VALUES (UUID(), ?, ?, ?, CURDATE(), ?, ?, NOW(6))`,
        [req.user.id, effectiveContributionType, amountNumber, year, month]
      );

      await connection.query(
        `INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt) 
         VALUES (UUID(), ?, ?, 'NGN', 'completed', ?, NOW(6))`,
        ['contribution', amountNumber, req.user.id]
      );

      await updateSubscriberBalanceForContribution(connection, {
        subscriberId: user.subscriber_id,
        amount: amountNumber,
        contributionType: effectiveContributionType
      });

      await connection.commit();

      return res.json({
        status: 'success',
        message: `${effectiveContributionType} contribution successful`,
        data: {
          type: effectiveContributionType,
          requestedType: txContributionDecision.requestedType,
          ruleNotice: txContributionDecision.ruleNotice,
          amount: amountNumber,
          description:
            effectiveContributionType === 'ICA'
              ? 'Investment Cooperative Account - Join an investment cooperative group. Rotating collection'
              : 'Piggy Savings - Flexible savings in your piggy balance',
          year,
          month
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to process contribution'
    });
  }
});

// Get contribution info (what type will be used today)
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      'SELECT s.contribution_mode FROM subscribers s WHERE s.userId = ?',
      [req.user.id]
    );
    
    const userSettings = userRows[0] || { contribution_mode: 'auto' };
    const { year, month } = getYearMonth();
    const monthlyContributionCount = await getMonthlyContributionCount(pool, req.user.id, year, month);
    const ruleState = getContributionRuleState(
      userSettings.contribution_mode,
      monthlyContributionCount
    );

    const description = ruleState.allowPiggy
      ? 'You can contribute to ICA or Piggy this month.'
      : `First ${ICA_ONLY_CONTRIBUTION_LIMIT} monthly contributions are ICA only.`;

    res.json({
      status: 'success',
      data: {
        type: ruleState.defaultType,
        mode: userSettings.contribution_mode,
        year,
        month,
        monthlyContributionCount,
        icaOnlyLimit: ICA_ONLY_CONTRIBUTION_LIMIT,
        remainingIcaOnlyContributions: ruleState.remainingIcaOnlyContributions,
        allowPiggy: ruleState.allowPiggy,
        allowedTypes: ruleState.allowPiggy ? ['ICA', 'PIGGY', 'ESUSU'] : ['ICA', 'ESUSU'],
        description
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get contribution info' });
  }
});

// Get user's contribution history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const [contributions] = await pool.query(
      'SELECT * FROM contributions WHERE userId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );

    res.json({
      status: 'success',
      data: contributions
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get contribution history' });
  }
});

// Update contribution mode (user settings)
router.patch('/settings', authenticateToken, sensitiveWriteLimiter, async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!['auto', 'all_ica'].includes(mode)) {
      return res.status(400).json({ status: 'error', message: 'Invalid mode. Use "auto" or "all_ica"' });
    }

    await pool.query(
      'UPDATE subscribers SET contribution_mode = ? WHERE userId = ?',
      [mode, req.user.id]
    );

    res.json({
      status: 'success',
      message: 'Contribution mode updated',
      data: { mode }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update contribution mode' });
  }
});

// Verify contribution payment from Paystack (authenticated user only)
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
      const amount = verificationData.amount / 100; // Convert from kobo
      const userId = verificationData.metadata?.userId;
      const requestedContributionType = String(
        verificationData.metadata?.contributionType || 'PIGGY'
      ).toUpperCase();
      if (!ALLOWED_CONTRIBUTION_TYPES.has(requestedContributionType)) {
        return res.status(400).json({ status: 'error', message: 'Invalid contribution type in payment metadata' });
      }
      const receipt = buildPaystackReceipt(verificationData, { paymentType: requestedContributionType });

      if (!userId) {
        return res.status(400).json({ status: 'error', message: 'User ID not found in transaction metadata' });
      }
      if (String(userId) !== String(req.user.id)) {
        return res.status(403).json({ status: 'error', message: 'You can only verify your own contribution payments' });
      }

      // Get user info
      const [userRows] = await connection.query(
        'SELECT u.*, s.contribution_mode, s.ica_balance, s.piggy_balance FROM user u LEFT JOIN subscribers s ON u.subscriber_id = s.id WHERE u.id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      // Ensure idempotency table exists before starting the transaction (DDL can implicitly commit).
      await ensurePaystackProcessedTable(connection);
      await connection.beginTransaction();

      try {
        // Idempotency: ensure we only process a Paystack reference once.
        const firstTime = await tryMarkPaystackReferenceProcessed(connection, reference);
        if (!firstTime) {
          await connection.rollback();
          return res.json({
            status: 'success',
            message: 'Payment already processed',
            data: {
              amount,
              reference,
              userId,
              contributionType: requestedContributionType,
              requestedType: requestedContributionType,
              year,
              month,
              verification: verificationData,
              receipt
            }
          });
        }

        const [pendingContributionRows] = await connection.query(
          `SELECT id
           FROM transaction
           WHERE userId = ? AND type = 'contribution' AND amount = ? AND status = 'pending'
           ORDER BY createdAt DESC
           LIMIT 1
           FOR UPDATE`,
          [userId, amount]
        );

        if (!pendingContributionRows.length) {
          await connection.rollback();
          return res.status(409).json({
            status: 'error',
            message: 'No matching pending contribution found for this payment'
          });
        }

        const monthlyContributionCount = await getMonthlyContributionCount(connection, userId, year, month);
        const contributionDecision = resolveContributionType({
          requestedType: requestedContributionType,
          contributionMode: userRows[0].contribution_mode,
          monthlyContributionCount
        });

        if (contributionDecision.invalid) {
          await connection.rollback();
          return res.status(400).json({ status: 'error', message: contributionDecision.message });
        }

        const effectiveContributionType = contributionDecision.resolvedType;

        // Add funds to user wallet first
        await connection.query(
          'UPDATE user SET balance = balance + ? WHERE id = ?',
          [amount, userId]
        );

        if (effectiveContributionType === 'ICA') {
          // ICA: Transfer to admin wallet
          const adminId = process.env.ADMIN_USER_ID || 'admin';
          
          // Deduct from user wallet
          await connection.query(
            'UPDATE user SET balance = balance - ? WHERE id = ?',
            [amount, userId]
          );
          
          // Add to admin wallet
          await connection.query(
            'UPDATE user SET balance = balance + ? WHERE id = ?',
            [amount, adminId]
          );
          
          // Update user's ICA balance
          await connection.query(
            'UPDATE subscribers SET ica_balance = ica_balance + ? WHERE userId = ?',
            [amount, userId]
          );
        } else if (effectiveContributionType === 'PIGGY') {
          // Piggy contribution moves funds from wallet into piggy balance.
          await connection.query(
            'UPDATE user SET balance = balance - ? WHERE id = ?',
            [amount, userId]
          );

          await connection.query(
            'UPDATE subscribers SET piggy_balance = piggy_balance + ? WHERE userId = ?',
            [amount, userId]
          );
        } else if (effectiveContributionType === 'ESUSU') {
          // ESUSU: Handled by coop system - just record the transaction
          // The coop service will handle the actual contribution logic
        }

        // Record contribution
        await connection.query(
          `INSERT INTO contributions (id, userId, type, amount, contribution_date, year, month, createdAt) 
           VALUES (UUID(), ?, ?, ?, CURDATE(), ?, ?, NOW(6))`,
          [userId, effectiveContributionType, amount, year, month]
        );

        // Mark the latest matching pending transaction as completed (fallback to insert if missing).
        await connection.query(
          `UPDATE transaction SET status = 'completed' WHERE id = ?`,
          [pendingContributionRows[0].id]
        );

        await updateSubscriberBalanceForContribution(connection, {
          subscriberId: userRows[0].subscriber_id,
          amount,
          contributionType: effectiveContributionType
        });

        await connection.commit();

        return res.json({
          status: 'success',
          message: `${effectiveContributionType} contribution verified successfully`,
          data: { 
            amount, 
            reference, 
            userId,
            contributionType: effectiveContributionType,
            requestedType: contributionDecision.requestedType,
            ruleNotice: contributionDecision.ruleNotice,
            year,
            month,
            verification: verificationData,
            receipt
          }
        });
      } catch (dbErr) {
        await connection.rollback();
        throw dbErr;
      }
    }

    res.status(400).json({ status: 'error', message: 'Payment verification failed' });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify payment'
    });
  } finally {
    connection.release();
  }
});

// Move funds from piggy balance into wallet balance
router.post('/piggy/withdraw', authenticateToken, sensitiveWriteLimiter, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const amount = Number.parseFloat(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Valid amount is required' });
    }

    await connection.beginTransaction();

    const [userRows] = await connection.query(
      'SELECT id, balance FROM user WHERE id = ? FOR UPDATE',
      [req.user.id]
    );
    const [subscriberRows] = await connection.query(
      'SELECT id AS subscriber_id, userId, piggy_balance FROM subscribers WHERE userId = ? FOR UPDATE',
      [req.user.id]
    );

    if (!userRows.length || !subscriberRows.length) {
      await connection.rollback();
      return res.status(404).json({ status: 'error', message: 'User account not found' });
    }

    const currentPiggyBalance = Number.parseFloat(subscriberRows[0].piggy_balance || 0);
    if (currentPiggyBalance < amount) {
      await connection.rollback();
      return res.status(400).json({ status: 'error', message: 'Insufficient piggy balance' });
    }

    await connection.query(
      'UPDATE subscribers SET piggy_balance = piggy_balance - ? WHERE userId = ?',
      [amount, req.user.id]
    );
    await connection.query(
      'UPDATE user SET balance = balance + ? WHERE id = ?',
      [amount, req.user.id]
    );
    await connection.query(
      `INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt) 
       VALUES (UUID(), ?, ?, 'NGN', 'completed', ?, NOW(6))`,
      // Use an existing wallet-credit transaction type supported by older ENUM schemas.
      ['deposit', amount, req.user.id]
    );

    await updateSubscriberBalanceForPiggyWithdrawal(connection, {
      subscriberId: subscriberRows[0].subscriber_id,
      amount
    });

    await connection.commit();

    return res.json({
      status: 'success',
      message: 'Piggy funds moved to wallet successfully',
      data: {
        amount,
        walletBalance: Number.parseFloat(userRows[0].balance || 0) + amount,
        piggyBalance: currentPiggyBalance - amount
      }
    });
  } catch (err) {
    console.error('Piggy withdraw error:', err);
    await connection.rollback();
    return res.status(500).json({ status: 'error', message: 'Failed to withdraw piggy funds' });
  } finally {
    connection.release();
  }
});

module.exports = router;
