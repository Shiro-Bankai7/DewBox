const cron = require('node-cron');
const pool = require('../db');

const MONTHLY_FEE_DESCRIPTION = 'Monthly contribution fee deduction';
const MONTHLY_FEE_TRANSACTION_TYPE = 'monthly_fee';
const DEFAULT_MONTHLY_FEE_RATE_PERCENT = 2;

function toCurrencyAmount(value) {
  return Number.parseFloat(Number(value || 0).toFixed(2));
}

function getYearMonth(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
}

function getPreviousYearMonth(date = new Date()) {
  const current = getYearMonth(date);
  if (current.month === 1) {
    return { year: current.year - 1, month: 12 };
  }
  return { year: current.year, month: current.month - 1 };
}

function getMonthlyFeeRate() {
  const parsed = Number.parseFloat(process.env.MONTHLY_FEE_RATE_PERCENT || '');
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_MONTHLY_FEE_RATE_PERCENT;
}

/**
 * Deduct monthly contributor fee on the 1st of each month.
 * Fee base = previous month's total ICA + PIGGY contributions.
 */
async function processAutomaticContributions(runDate = new Date()) {
  const date = runDate instanceof Date ? runDate : new Date(runDate);
  const { year, month } = getYearMonth(date);
  const { year: previousYear, month: previousMonth } = getPreviousYearMonth(date);
  const feeRatePercent = getMonthlyFeeRate();
  const adminId = process.env.ADMIN_USER_ID || 'admin';

  console.log('Running monthly fee processing...');

  if (date.getDate() !== 1) {
    console.log('Skipping monthly fee processing (only runs on day 1).');
    return;
  }

  try {
    const [contributors] = await pool.query(
      `SELECT c.userId, SUM(c.amount) AS monthly_total
       FROM contributions c
       WHERE c.year = ?
         AND c.month = ?
         AND c.type IN ('ICA', 'PIGGY')
       GROUP BY c.userId
       HAVING monthly_total > 0`,
      [previousYear, previousMonth]
    );

    if (!contributors.length) {
      console.log('No contributors found for previous month. Nothing to deduct.');
      return;
    }

    let applied = 0;
    let skipped = 0;
    let insufficient = 0;

    for (const contributor of contributors) {
      const userId = contributor.userId;
      const monthlyTotal = Number.parseFloat(contributor.monthly_total || 0);
      const feeAmount = toCurrencyAmount((monthlyTotal * feeRatePercent) / 100);

      if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
        skipped += 1;
        continue;
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [existingFeeRows] = await connection.query(
          `SELECT id
           FROM contributions
           WHERE userId = ?
             AND type = 'FEE'
             AND year = ?
             AND month = ?
             AND description = ?
           LIMIT 1
           FOR UPDATE`,
          [userId, year, month, MONTHLY_FEE_DESCRIPTION]
        );

        if (existingFeeRows.length) {
          await connection.rollback();
          skipped += 1;
          continue;
        }

        const [lockedUsers] = await connection.query(
          'SELECT id, balance FROM user WHERE id IN (?, ?) FOR UPDATE',
          [userId, adminId]
        );

        const contributorWallet = lockedUsers.find((entry) => entry.id === userId);
        const adminWallet = lockedUsers.find((entry) => entry.id === adminId);

        if (!contributorWallet || !adminWallet) {
          await connection.rollback();
          skipped += 1;
          continue;
        }

        // Re-check after locking rows to reduce duplicate deductions across concurrent workers.
        const [existingFeeRowsAfterLock] = await connection.query(
          `SELECT id
           FROM contributions
           WHERE userId = ?
             AND type = 'FEE'
             AND year = ?
             AND month = ?
             AND description = ?
           LIMIT 1`,
          [userId, year, month, MONTHLY_FEE_DESCRIPTION]
        );

        if (existingFeeRowsAfterLock.length) {
          await connection.rollback();
          skipped += 1;
          continue;
        }

        if (Number.parseFloat(contributorWallet.balance || 0) < feeAmount) {
          await connection.query(
            `INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt)
             VALUES (UUID(), ?, ?, 'NGN', 'failed', ?, NOW(6))`,
            [MONTHLY_FEE_TRANSACTION_TYPE, feeAmount, userId]
          );
          await connection.commit();
          insufficient += 1;
          continue;
        }

        await connection.query(
          'UPDATE user SET balance = balance - ? WHERE id = ?',
          [feeAmount, userId]
        );
        await connection.query(
          'UPDATE user SET balance = balance + ? WHERE id = ?',
          [feeAmount, adminId]
        );

        await connection.query(
          `INSERT INTO contributions (id, userId, type, amount, contribution_date, year, month, description, createdAt)
           VALUES (UUID(), ?, 'FEE', ?, CURDATE(), ?, ?, ?, NOW(6))`,
          [userId, feeAmount, year, month, MONTHLY_FEE_DESCRIPTION]
        );
        await connection.query(
          `INSERT INTO transaction (id, type, amount, currency, status, userId, createdAt)
           VALUES (UUID(), ?, ?, 'NGN', 'completed', ?, NOW(6))`,
          [MONTHLY_FEE_TRANSACTION_TYPE, feeAmount, userId]
        );

        await connection.commit();
        applied += 1;
      } catch (error) {
        await connection.rollback();
        skipped += 1;
        console.error(`Failed monthly fee deduction for user ${userId}:`, error.message);
      } finally {
        connection.release();
      }
    }

    console.log(
      `Monthly fee processing completed | rate=${feeRatePercent}% | applied=${applied} | insufficient=${insufficient} | skipped=${skipped}`
    );
  } catch (error) {
    console.error('Error in monthly fee processing:', error);
  }
}

/**
 * Initialize contribution cron job
 * Runs every day at 12:00 AM (midnight)
 */
function initializeContributionCron() {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    console.log('Cron job triggered: Processing monthly contribution fees');
    processAutomaticContributions();
  });

  console.log('Contribution cron job initialized (runs daily at 00:00)');
  console.log('Monthly contributor fees are deducted on day 1 of each month.');
}

module.exports = {
  initializeContributionCron,
  processAutomaticContributions
};
