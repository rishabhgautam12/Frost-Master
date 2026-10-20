# Refund workflow

Orders and sales expose `GET/POST /api/sales/refunds/:kind/:id`, where kind is `orders` or `sales`. Authentication is supplied by the existing sales router mount; recording a refund requires admin role.

- Extra Payment returns only the overpayment; it does not reduce the invoice value or change stock.
- Cancellation cancels the entire document, reverses the sale ledger effects and restores sale stock once. It can refund some or all of the remaining receipts; later cancellation refunds return the remainder without another stock movement. This is not a partial product return or a GST credit-note implementation.
- Original receipt amounts remain unchanged. Refunded amounts and a separate immutable history record record the returned money, reason, method, date and actor. An optional original receipt reference caps the refund to that receipt's remaining funds; without a reference, allocation uses the latest unrefunded receipts first.
- Converted orders resolve to the linked sale. Shared receipt allocations and refund history are mirrored back to the order. Open-order refund history is carried into a later conversion.
- Documents and original receipts with refunds are protected from legacy edit/delete endpoints. Additional eligible refunds remain available. Paid-balance inconsistencies or already-used customer advances must be reconciled first.
- These actions record money already returned manually; they do not initiate a bank transfer.

## Deployment and checks

MongoDB **Atlas or a replica set supporting transactions is required**. Refunds fail without writing on standalone MongoDB; there is deliberately no non-transactional fallback. No data migration is needed for the new optional fields. Legacy paid totals without any itemized receipt are represented by a clearly labelled legacy receipt when the first refund is saved.

Run `node --test backend/tests/refundWorkflow.test.js backend/tests/orderDetailsPayments.test.js backend/tests/complaintWorkflow.test.js` and `npm.cmd run build` in frontend on Windows.

The tests exercise accounting and mocked controller workflows, not a live MongoDB transaction. Before deploying, use a non-production replica set to verify concurrent requests, transaction rollback, a converted order, and a sale cancellation restoring stock exactly once. Legacy sales with combined warehouse names but no per-warehouse quantities are blocked from cancellation refunds until warehouse quantities are reconciled.
