function toMainCurrencyAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric / 100;
}

function capReceiptFees(fees, currency) {
  if (!Number.isFinite(fees)) return null;

  const upperCurrency = String(currency || 'NGN').toUpperCase();
  const cap = upperCurrency === 'NGN' ? 1000 : 3;

  return Number(Math.min(fees, cap).toFixed(2));
}

function buildPaystackReceipt(verificationData, overrides = {}) {
  if (!verificationData || typeof verificationData !== 'object') {
    return null;
  }

  const amount = toMainCurrencyAmount(verificationData.amount);
  const requestedAmount = toMainCurrencyAmount(verificationData.requested_amount);
  const rawFees = toMainCurrencyAmount(verificationData.fees);
  const currency = verificationData.currency || 'NGN';
  const fees = capReceiptFees(rawFees, currency);
  const netAmount =
    Number.isFinite(amount) && Number.isFinite(fees)
      ? Number((amount - fees).toFixed(2))
      : null;

  return {
    transactionId: verificationData.id || null,
    reference: verificationData.reference || null,
    status: verificationData.status || null,
    domain: verificationData.domain || null,
    amount,
    requestedAmount,
    fees,
    netAmount,
    currency,
    channel:
      verificationData.channel ||
      verificationData.authorization?.channel ||
      null,
    gatewayResponse: verificationData.gateway_response || null,
    paidAt: verificationData.paid_at || verificationData.paidAt || null,
    createdAt: verificationData.created_at || verificationData.createdAt || null,
    customerEmail: verificationData.customer?.email || null,
    paymentType:
      overrides.paymentType ||
      verificationData.metadata?.type ||
      verificationData.metadata?.contributionType ||
      null,
    senderName: verificationData.authorization?.sender_name || null,
    senderBank: verificationData.authorization?.sender_bank || null,
    senderAccountNumber:
      verificationData.authorization?.sender_bank_account_number || null,
    narration: verificationData.authorization?.narration || null
  };
}

module.exports = { buildPaystackReceipt };
