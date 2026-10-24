// One-time migration: round the grand total of documents saved before round-off
// existed, and keep customer/vendor ledgers in step with the new totals.
//
//   node scripts/roundOffExisting.js           -> dry run, prints planned changes
//   node scripts/roundOffExisting.js --apply   -> writes the changes
//
// Cancelled documents and documents with refunds are skipped (refund history is protected).
require("dotenv").config();
const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");
const r2 = (n) => Math.round((+n || 0) * 100) / 100;

function allocate(payments, total) {
  let remaining = total, applied = 0, advance = 0;
  payments.forEach((p) => {
    const received = Math.max(0, (+p.amount || 0) - (+p.refundedAmount || 0));
    p.appliedAmount = r2(Math.min(received, remaining));
    p.advanceAmount = r2(received - p.appliedAmount);
    remaining = r2(remaining - p.appliedAmount);
    applied += p.appliedAmount;
    advance += p.advanceAmount;
  });
  return { applied: r2(applied), advance: r2(advance) };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const plan = [];

  const pending = (col) => db.collection(col).find({ roundOff: { $exists: false } }).toArray();
  const rounding = (doc) => {
    const exact = r2(doc.grandTotal);
    const total = Math.round(exact);
    return { exact, total, roundOff: r2(total - exact) };
  };
  const skip = (doc) => doc.status === "Cancelled" || (doc.refunds || []).length > 0;

  for (const sale of await pending("sales")) {
    if (skip(sale)) { plan.push({ col: "sales", no: sale.invoiceNo, skipped: sale.status === "Cancelled" ? "cancelled" : "has refunds" }); continue; }
    const { exact, total, roundOff } = rounding(sale);
    const set = { grandTotal: total, roundOff };
    let advanceDelta = 0, newPaid;
    if ((sale.payments || []).length) {
      const oldAdvance = sale.payments.reduce((s, p) => s + (+p.advanceAmount || 0), 0);
      const { applied, advance } = allocate(sale.payments, total);
      set.payments = sale.payments;
      newPaid = applied;
      advanceDelta = r2(advance - oldAdvance);
    } else {
      newPaid = Math.min(total, +sale.amountPaid || 0);
      advanceDelta = r2((+sale.amountPaid || 0) - newPaid);
    }
    set.amountPaid = newPaid;
    set.amountDue = r2(Math.max(0, total - newPaid));
    set.status = newPaid >= total ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
    plan.push({
      col: "sales", no: sale.invoiceNo, exact, total, roundOff, paid: `${sale.amountPaid} -> ${newPaid}`, status: `${sale.status} -> ${set.status}`,
      write: async () => {
        await db.collection("sales").updateOne({ _id: sale._id }, { $set: set });
        if (sale.customer) await db.collection("customers").updateOne({ _id: sale.customer }, {
          $inc: { totalBilled: r2(total - sale.grandTotal), totalReceived: r2(newPaid - (+sale.amountPaid || 0)), advanceBalance: advanceDelta },
        });
      },
    });
  }

  for (const order of await pending("orders")) {
    if (skip(order)) { plan.push({ col: "orders", no: order.orderNo, skipped: order.status === "Cancelled" ? "cancelled" : "has refunds" }); continue; }
    const { exact, total, roundOff } = rounding(order);
    const set = { grandTotal: total, roundOff };
    let advanceDelta = 0;
    if (order.status === "Open" && (order.payments || []).length) {
      const oldAdvance = order.payments.reduce((s, p) => s + (+p.advanceAmount || 0), 0);
      const { applied, advance } = allocate(order.payments, total);
      set.payments = order.payments;
      set.amountPaid = applied;
      advanceDelta = r2(advance - oldAdvance);
    } else if ((order.payments || []).length) {
      // Converted orders: the linked sale carries the customer ledger, so only re-split the order's own receipts.
      set.payments = order.payments;
      set.amountPaid = allocate(order.payments, total).applied;
    } else {
      set.amountPaid = Math.min(total, +order.amountPaid || 0);
    }
    plan.push({
      col: "orders", no: order.orderNo, exact, total, roundOff, paid: `${order.amountPaid} -> ${set.amountPaid}`, status: order.status,
      write: async () => {
        await db.collection("orders").updateOne({ _id: order._id }, { $set: set });
        if (advanceDelta && order.customer) await db.collection("customers").updateOne({ _id: order.customer }, { $inc: { advanceBalance: advanceDelta } });
      },
    });
  }

  for (const quotation of await pending("quotations")) {
    const { exact, total, roundOff } = rounding(quotation);
    plan.push({
      col: "quotations", no: quotation.quotationNo, exact, total, roundOff,
      write: () => db.collection("quotations").updateOne({ _id: quotation._id }, {
        $set: { grandTotal: total, roundOff, amountPaid: Math.min(total, +quotation.amountPaid || 0) },
      }),
    });
  }

  for (const purchase of await pending("purchases")) {
    if (purchase.status === "Cancelled") { plan.push({ col: "purchases", no: purchase.purchaseNo, skipped: "cancelled" }); continue; }
    const { exact, total, roundOff } = rounding(purchase);
    const paidRaw = (purchase.payments || []).length
      ? purchase.payments.reduce((s, p) => s + (+p.amount || 0), 0)
      : (+purchase.amountPaid || 0);
    const newPaid = r2(Math.min(total, paidRaw));
    const status = newPaid >= total ? "Received" : newPaid > 0 ? "Partial" : "Pending";
    plan.push({
      col: "purchases", no: purchase.purchaseNo, exact, total, roundOff, paid: `${purchase.amountPaid} -> ${newPaid}`, status: `${purchase.status} -> ${status}`,
      write: async () => {
        await db.collection("purchases").updateOne({ _id: purchase._id }, { $set: { grandTotal: total, roundOff, amountPaid: newPaid, status } });
        await db.collection("vendors").updateOne({ _id: purchase.vendor }, {
          $inc: { totalPurchased: r2(total - purchase.grandTotal), totalPaid: r2(newPaid - (+purchase.amountPaid || 0)) },
        });
        const entry = await db.collection("vendorledgers").findOne({ vendor: purchase.vendor, invoiceNo: purchase.purchaseNo, type: "Purchase" });
        if (entry) {
          const ledgerStatus = (entry.paid || 0) >= total ? "Settled" : (entry.paid || 0) > 0 ? "Partial" : "Pending";
          await db.collection("vendorledgers").updateOne({ _id: entry._id }, { $set: { amount: total, status: ledgerStatus } });
        }
      },
    });
  }

  const changes = plan.filter((p) => !p.skipped && p.roundOff !== 0);
  const unchanged = plan.filter((p) => !p.skipped && p.roundOff === 0);
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} - ${changes.length} documents with paise, ${unchanged.length} already whole, ${plan.filter((p) => p.skipped).length} skipped\n`);
  changes.forEach(({ write, ...row }) => console.log(row));
  plan.filter((p) => p.skipped).forEach(({ col, no, skipped }) => console.log("SKIPPED", col, no, skipped));

  if (APPLY) {
    for (const p of plan.filter((p) => !p.skipped)) await p.write(); // whole totals still get roundOff: 0
    console.log("\nDone.");
  } else {
    console.log("\nNothing written. Re-run with --apply to save these changes.");
  }
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
