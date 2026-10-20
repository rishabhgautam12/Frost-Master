const cents = value => Math.round(Number(value || 0) * 100);
const money = value => value / 100;
const fail = message => { const error = new Error(message); error.status = 400; throw error; };

function balances(document) {
  const received = (document.payments || []).reduce((sum, p) => sum + cents(p.amount) - cents(p.refundedAmount), 0);
  const total = cents(document.grandTotal);
  return { received: money(received), applied: money(Math.min(total, received)), advance: money(Math.max(0, received - total)) };
}

function allocate(document) {
  let remaining = cents(document.grandTotal);
  for (const payment of document.payments) {
    const net = cents(payment.amount) - cents(payment.refundedAmount);
    payment.appliedAmount = money(Math.min(remaining, net));
    payment.advanceAmount = money(Math.max(0, net - remaining));
    remaining = Math.max(0, remaining - net);
  }
  document.amountPaid = balances(document).applied;
}

function applyRefund(document, body) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents(amount)) || amount <= 0 || Math.abs(amount * 100 - cents(amount)) > 0.00001) fail("Enter a positive refund amount with at most two decimal places.");
  if (!["Extra Payment", "Cancellation"].includes(body.type)) fail("Choose a refund type.");
  if (!["Cash", "UPI", "Card", "Bank Transfer", "Cheque"].includes(body.method)) fail("Choose a valid refund method.");
  if (!String(body.notes || "").trim()) fail("A refund reason / note is required.");
  if (!body.date || !Number.isFinite(new Date(body.date).getTime())) fail("Enter a valid refund date.");
  if (new Date(body.date).getTime() > Date.now() + 86400000) fail("A recorded refund cannot be dated in the future.");
  if (!body.requestId || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) fail("Missing refund request identifier. Please reopen the refund window.");
  const before = balances(document);
  if (body.type === "Extra Payment" && document.status === "Cancelled") fail("Use Cancellation for a cancelled document.");
  const maximum = body.type === "Extra Payment" ? before.advance : before.received;
  if (cents(amount) > cents(maximum)) fail(`Maximum refundable amount is ${maximum.toFixed(2)}.`);
  const candidates = body.paymentId ? document.payments.filter(p => String(p._id) === String(body.paymentId)) : [...document.payments].reverse();
  if (!candidates.length) fail("The selected original payment was not found.");
  const available = candidates.reduce((sum, p) => sum + cents(p.amount) - cents(p.refundedAmount), 0);
  if (cents(amount) > available) fail("Refund exceeds the unrefunded amount of the selected payment.");
  let remaining = cents(amount);
  const allocations = [];
  for (const payment of candidates) {
    const part = Math.min(remaining, cents(payment.amount) - cents(payment.refundedAmount));
    if (part > 0) {
      payment.refundedAmount = money(cents(payment.refundedAmount) + part);
      allocations.push({ paymentId: payment._id, amount: money(part) });
      remaining -= part;
    }
  }
  allocate(document);
  return { before, after: balances(document), allocations };
}

module.exports = { balances, allocate, applyRefund };
