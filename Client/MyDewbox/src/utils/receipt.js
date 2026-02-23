function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function capReceiptFees(fees, currency = "NGN") {
  const value = toNumber(fees);
  if (value === null) return null;

  const cap = String(currency).toUpperCase() === "NGN" ? 1000 : 3;
  return Number(Math.min(value, cap).toFixed(2));
}

function fallbackReceiptFromVerification(verification = {}) {
  const amountInMainCurrency = toNumber(verification.amount);
  const requestedAmountInMainCurrency = toNumber(verification.requested_amount);
  const feesInMainCurrency = toNumber(verification.fees);
  const currency = verification.currency || "NGN";

  return {
    reference: verification.reference || null,
    transactionId: verification.id || null,
    status: verification.status || null,
    amount: amountInMainCurrency !== null ? amountInMainCurrency / 100 : null,
    requestedAmount:
      requestedAmountInMainCurrency !== null
        ? requestedAmountInMainCurrency / 100
        : null,
    fees:
      feesInMainCurrency !== null
        ? capReceiptFees(feesInMainCurrency / 100, currency)
        : null,
    currency,
    channel: verification.channel || verification.authorization?.channel || null,
    gatewayResponse: verification.gateway_response || null,
    paidAt: verification.paid_at || verification.paidAt || null,
    createdAt: verification.created_at || verification.createdAt || null,
    customerEmail: verification.customer?.email || null,
    paymentType:
      verification.metadata?.type ||
      verification.metadata?.contributionType ||
      null,
    senderName: verification.authorization?.sender_name || null,
    senderBank: verification.authorization?.sender_bank || null,
    senderAccountNumber:
      verification.authorization?.sender_bank_account_number || null,
    narration: verification.authorization?.narration || null
  };
}

function formatAmount(value, currency = "NGN") {
  const n = toNumber(value);
  if (n === null) return "N/A";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    currencyDisplay: "code"
  }).format(n);
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function sanitizeFilePart(value, fallback = "receipt") {
  if (!value) return fallback;
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function toPdfSafeText(value) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value) {
  return toPdfSafeText(value).replace(/([\\()])/g, "\\$1");
}

function wrapTextLine(line, maxChars = 92) {
  const safeLine = toPdfSafeText(line);
  if (safeLine.length <= maxChars) return [safeLine];

  const parts = [];
  let remaining = safeLine;
  while (remaining.length > maxChars) {
    let splitAt = remaining.lastIndexOf(" ", maxChars);
    if (splitAt <= 0) splitAt = maxChars;
    parts.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function buildPdfBlob(lines) {
  const wrappedLines = lines.flatMap((line) => wrapTextLine(line));
  const pageHeight = 792;
  const startY = 760;
  const lineHeight = 14;
  const maxLinesPerPage = 48;
  const pages = [];

  for (let i = 0; i < wrappedLines.length; i += maxLinesPerPage) {
    pages.push(wrappedLines.slice(i, i + maxLinesPerPage));
  }

  const objects = [];
  const pageObjectIds = [];
  const contentObjectIds = [];
  let nextId = 3;

  for (let i = 0; i < pages.length; i += 1) {
    pageObjectIds.push(nextId++);
    contentObjectIds.push(nextId++);
  }
  const fontObjectId = nextId++;

  pages.forEach((pageLines, index) => {
    const contentLines = [
      "BT",
      "/F1 10 Tf",
      `${lineHeight} TL`,
      `50 ${startY} Td`
    ];

    pageLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) contentLines.push("T*");
      contentLines.push(`(${escapePdfText(line)}) Tj`);
    });
    contentLines.push("ET");

    const contentStream = contentLines.join("\n");
    const contentBytes = new TextEncoder().encode(contentStream).length;

    objects[pageObjectIds[index]] =
      `${pageObjectIds[index]} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>\n` +
      "endobj\n";

    objects[contentObjectIds[index]] =
      `${contentObjectIds[index]} 0 obj\n` +
      `<< /Length ${contentBytes} >>\n` +
      "stream\n" +
      `${contentStream}\n` +
      "endstream\n" +
      "endobj\n";
  });

  objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  objects[2] =
    `2 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>\nendobj\n`;
  objects[fontObjectId] =
    `${fontObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    if (!objects[id]) continue;
    offsets[id] = new TextEncoder().encode(pdf).length;
    pdf += objects[id];
  }

  const xrefStart = new TextEncoder().encode(pdf).length;
  const totalObjects = objects.length - 1;
  pdf += `xref\n0 ${totalObjects + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= totalObjects; id += 1) {
    const offset = String(offsets[id] || 0).padStart(10, "0");
    pdf += `${offset} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadReceipt({
  receipt = null,
  verification = null,
  title = "MyDewbox Receipt"
} = {}) {
  const resolvedReceipt = receipt
    ? {
        ...receipt,
        fees: capReceiptFees(receipt.fees, receipt.currency || "NGN")
      }
    : fallbackReceiptFromVerification(verification);
  if (!resolvedReceipt?.reference && !resolvedReceipt?.transactionId) {
    return false;
  }

  const currency = resolvedReceipt.currency || "NGN";
  const lines = [
    title.toUpperCase(),
    "",
    `Receipt Ref: ${resolvedReceipt.reference || "N/A"}`,
    `Transaction ID: ${resolvedReceipt.transactionId || "N/A"}`,
    `Status: ${resolvedReceipt.status || "N/A"}`,
    `Payment Type: ${resolvedReceipt.paymentType || "N/A"}`,
    `Amount: ${formatAmount(resolvedReceipt.amount, currency)}`,
    `Requested Amount: ${formatAmount(resolvedReceipt.requestedAmount, currency)}`,
    `Fees: ${formatAmount(resolvedReceipt.fees, currency)}`,
    `Channel: ${resolvedReceipt.channel || "N/A"}`,
    `Gateway Response: ${resolvedReceipt.gatewayResponse || "N/A"}`,
    `Customer Email: ${resolvedReceipt.customerEmail || "N/A"}`,
    `Sender Name: ${resolvedReceipt.senderName || "N/A"}`,
    `Sender Bank: ${resolvedReceipt.senderBank || "N/A"}`,
    `Sender Account: ${resolvedReceipt.senderAccountNumber || "N/A"}`,
    `Narration: ${resolvedReceipt.narration || "N/A"}`,
    `Paid At: ${formatDate(resolvedReceipt.paidAt)}`,
    `Created At: ${formatDate(resolvedReceipt.createdAt)}`,
    "",
    `Generated At: ${formatDate(new Date().toISOString())}`
  ];

  const blob = buildPdfBlob(lines);

  const fileKey =
    sanitizeFilePart(resolvedReceipt.reference, "") ||
    sanitizeFilePart(resolvedReceipt.transactionId, "receipt");
  const fileName = `receipt_${fileKey}.pdf`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return true;
}
