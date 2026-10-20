const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { balances, allocate, applyRefund } = require("../utils/refundAccounting");
const { logActivity } = require("../utils/auditLogger");

async function resolveDocument(req, session) {
  let kind = req.params.kind;
  if (!["orders", "sales"].includes(kind)) throw Object.assign(new Error("Invalid refund document type."), { status:400 });
  let document = await (kind === "orders" ? Order : Sale).findById(req.params.id).session(session || null);
  if (document?.convertedSale) {
    document = await Sale.findById(document.convertedSale).session(session || null);
    kind = "sales";
  }
  if (!document) throw Object.assign(new Error("Order or sale not found."), { status:404 });
  return { document, kind };
}

// Old records can have a paid total without an itemized receipt. Preserve it explicitly.
function ensureReceipts(document) {
  if (!document.payments.length && document.amountPaid > 0) document.payments.push({
    _id:document._id,
    amount:document.amountPaid, appliedAmount:document.amountPaid, paymentMode:"Cash",
    date:document.date, notes:"Legacy payment balance (original method not recorded)",
  });
  if (Math.abs(balances(document).applied - Number(document.amountPaid || 0)) > 0.005) throw Object.assign(new Error("The stored paid balance does not match the payment history. Reconcile the original receipts before refunding."), { status:409 });
}

exports.getRefunds = async (req, res) => {
  try {
    const { document, kind } = await resolveDocument(req);
    ensureReceipts(document);
    res.json({ success:true, data:{ document, kind, ...balances(document) } });
  } catch (error) { res.status(error.status || 500).json({ success:false, message:error.message }); }
};

exports.createRefund = async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success:false, message:"Only an admin can record refunds or cancel through refunds." });
  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      const { document, kind } = await resolveDocument(req, session);
      const existing = document.refunds.find(r => r.requestId === req.body.requestId);
      if (existing) {
        if (existing.amount !== Number(req.body.amount) || existing.type !== req.body.type || existing.notes !== String(req.body.notes || "").trim() || existing.method !== req.body.method || String(existing.paymentId || "") !== String(req.body.paymentId || "") || existing.date.getTime() !== new Date(req.body.date).getTime()) throw Object.assign(new Error("This request identifier was already used for a different refund. Reopen the window before recording another refund."), { status:409 });
        result = { document, kind, ...balances(document) };
        return;
      }
      ensureReceipts(document);
      const wasCancelled = document.status === "Cancelled";
      const previousPaid = document.amountPaid;
      const { before, after, allocations } = applyRefund(document, req.body);
      const cancelling = req.body.type === "Cancellation" && !wasCancelled;
      if (cancelling) {
        document.status = "Cancelled";
        if (kind === "sales") {
          for (const item of document.items) {
            const product = await Product.findById(item.product).session(session);
            if (!product) throw Object.assign(new Error("A sale product is missing. Restore it before cancelling so stock can be reconciled."), { status:409 });
            if (!product.warehouses.length && product.stock) product.warehouses.push({ warehouse:"Main Warehouse", stock:product.stock });
            const warehouse = String(item.warehouse || "Main Warehouse").trim();
            if (warehouse.includes(", ") && !product.warehouses.some(r => r.warehouse === warehouse)) throw Object.assign(new Error("This legacy sale used multiple warehouses without quantity allocations. Reconcile its warehouse quantities before cancelling."), { status:409 });
            const row = product.warehouses.find(r => r.warehouse.toLowerCase() === warehouse.toLowerCase());
            if (row) row.stock += item.qty;
            else product.warehouses.push({ warehouse, stock:item.qty });
            product.stock = product.warehouses.reduce((sum, r) => sum + r.stock, 0);
            await product.save({ session });
          }
        }
      }
      document.refunds.push({
        requestId:req.body.requestId, amount:Number(req.body.amount), type:req.body.type,
        method:req.body.method, date:new Date(req.body.date), notes:req.body.notes.trim(),
        paymentId:req.body.paymentId || undefined, allocations,
        recordedBy:req.user._id, recordedByName:req.user.name || req.user.username || "Admin",
      });
      await document.save({ session });
      if (document.customer) {
        const delta = { advanceBalance:after.advance-before.advance };
        if (kind === "sales" && !wasCancelled) {
          delta.totalReceived = cancelling ? -previousPaid : after.applied-previousPaid;
          if (cancelling) delta.totalBilled = -document.grandTotal;
        }
        const customer = await Customer.findById(document.customer).session(session);
        if (!customer) throw Object.assign(new Error("Customer not found. Refund was not recorded."), { status:409 });
        if ((customer.advanceBalance || 0) + delta.advanceBalance < -0.005) throw Object.assign(new Error("Customer advance has already been used or adjusted. Reconcile the advance before refunding."), { status:409 });
        for (const [key, value] of Object.entries(delta)) customer[key] = Math.round(((customer[key] || 0) + value) * 100) / 100;
        await customer.save({ session });
      }
      // A converted order and its sale represent the same receipts, not two refundable balances.
      if (kind === "sales" && document.sourceOrder) {
        const order = await Order.findById(document.sourceOrder).session(session);
        if (order) {
          if (document.status === "Cancelled") order.status = "Cancelled";
          for (const payment of order.payments) {
            const linked = document.payments.id(payment._id);
            if (linked) payment.refundedAmount = linked.refundedAmount;
          }
          order.refunds = document.refunds.map(r => r.toObject());
          allocate(order);
          await order.save({ session });
        }
      }
      result = { document, kind, ...balances(document) };
    });
    await logActivity(req, { action:"payment", entityType:result.kind === "sales" ? "Sale" : "Order", entityId:result.document._id,
      entityLabel:result.document.invoiceNo || result.document.orderNo, summary:`${req.body.type} refund recorded`, metadata:{ amount:req.body.amount, notes:req.body.notes, paymentId:req.body.paymentId, requestId:req.body.requestId } });
    res.json({ success:true, data:result, message:"Refund recorded. Original receipts and refund history have been preserved." });
  } catch (error) {
    const transactionUnavailable = /Transaction numbers are only allowed|replica set|does not support retryable writes/i.test(error.message);
    res.status(error.status || 500).json({ success:false, message:transactionUnavailable
      ? "Refunds require MongoDB transaction support (a replica set or Atlas). No refund was saved."
      : error.message });
  } finally { if (session) await session.endSession(); }
};

// Legacy mutation endpoints must not overwrite refund allocations or erase their audit trail.
exports.protectRefundHistory = kind => async (req, res, next) => {
  try {
    const document = await (kind === "orders" ? Order : Sale).findById(req.params.id || req.params.saleId);
    const linked = document?.convertedSale ? await Sale.findById(document.convertedSale) : null;
    if (document?.refunds?.length || linked?.refunds?.length) return res.status(409).json({ success:false,
      message:"This document has refunds. Its financial details and original receipts are locked to preserve refund history. You can still record further eligible refunds." });
    next();
  } catch (error) { res.status(500).json({ success:false, message:error.message }); }
};
